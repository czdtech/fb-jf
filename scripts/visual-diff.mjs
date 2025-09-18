import { execSync, spawn } from 'node:child_process'
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'
import { test as pwtest, expect, chromium } from '@playwright/test'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

const root = process.cwd()
let baseDist = resolve(root, '../fb-base/dist')
const keepDir = resolve(root, '../fb-keep/dist')
const outDir = resolve(root, 'reports/visual-diff')
const limit = Number((process.argv.find(a=>a.startsWith('--limit='))||'').split('=')[1] || '0')

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

function startServer(dist, port){
  const p = spawn('node', [resolve(root,'scripts/serve-dist.mjs'), dist, String(port)], { stdio: 'inherit' })
  return p
}

function collectRoutes(dist){
  const paths = []
  function walk(dir){
    for(const f of readdirSync(dir, { withFileTypes: true })){
      const p = join(dir, f.name)
      if (f.isDirectory()) walk(p)
      else if (f.isFile() && f.name.endsWith('.html')){
        let rel = relative(dist, p)
        rel = rel.replace(/\\/g,'/')
        if (rel.endsWith('index.html')){
          const url = '/' + rel.replace(/index.html$/, '')
          paths.push(url)
        } else {
          paths.push('/' + rel)
        }
      }
    }
  }
  walk(dist)
  // Remove duplicates and sort for stability
  return Array.from(new Set(paths)).sort()
}

async function shot(page, url){
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  // extra settle
  await page.waitForTimeout(200)
  return await page.screenshot({ fullPage: true })
}

async function comparePng(bufA, bufB){
  const imgA = PNG.sync.read(bufA)
  const imgB = PNG.sync.read(bufB)
  const w = Math.max(imgA.width, imgB.width)
  const h = Math.max(imgA.height, imgB.height)
  // normalize canvas sizes
  const a = new PNG({ width: w, height: h })
  const b = new PNG({ width: w, height: h })
  imgA.data.copy(a.data, 0, 0, imgA.data.length)
  imgB.data.copy(b.data, 0, 0, imgB.data.length)
  const diff = new PNG({ width: w, height: h })
  const mismatched = pixelmatch(a.data, b.data, diff.data, w, h, { threshold: 0.1 })
  return { mismatched, w, h, diff: PNG.sync.write(diff) }
}

(async () => {
  const basePort = 4011, keepPort = 4012
  // fallback: if fb-base not exists, use current dist
  if (!existsSync(baseDist)) baseDist = resolve(root, 'dist')
  const s1 = startServer(baseDist, basePort)
  const s2 = startServer(keepDir, keepPort)

  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1 })
  const base = await ctx.newPage()
  const keep = await ctx.newPage()

  const routes = collectRoutes(baseDist)
  const total = routes.length
  const runList = limit > 0 ? routes.slice(0, limit) : routes
  const results = []

  console.log(`Comparing ${runList.length}/${total} routes...`)
  for (const route of runList){
    const urlA = `http://localhost:${basePort}${route}`
    const urlB = `http://localhost:${keepPort}${route}`
    try {
      const [imgA, imgB] = await Promise.all([shot(base, urlA), shot(keep, urlB)])
      const { mismatched, w, h, diff } = await comparePng(imgA, imgB)
      const pixels = w*h
      const ratio = pixels ? mismatched / pixels : 0
      const rec = { route, pixels, mismatched, ratio }
      results.push(rec)
      if (mismatched > 0){
        const safe = route.replace(/[^a-z0-9/_-]/gi,'_').replace(/\/+$/,'') || 'root'
        const basePath = join(outDir, safe.replace(/\/+$/,'') || 'root')
        const dirParts = basePath.split('/')
        // ensure dir
        let acc = ''
        for(const part of dirParts.slice(0,-1)){
          acc += (acc?'/':'') + part
          if (!existsSync(acc)) mkdirSync(acc)
        }
        writeFileSync(basePath + '.base.png', imgA)
        writeFileSync(basePath + '.keep.png', imgB)
        writeFileSync(basePath + '.diff.png', diff)
      }
      console.log(`${route} -> mismatch ${(ratio*100).toFixed(3)}% (${mismatched}/${pixels})`)
    } catch (e){
      console.warn(`Failed ${route}:`, e.message)
      results.push({ route, error: e.message })
    }
  }

  await browser.close()
  s1.kill('SIGINT'); s2.kill('SIGINT')

  const summary = {
    total,
    compared: runList.length,
    diffs: results.filter(r=>r.mismatched>0).length,
    results
  }
  writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2))
  console.log(`\nSummary saved to ${join('reports/visual-diff','summary.json')}`)
})().catch(err=>{ console.error(err); process.exit(1) })
