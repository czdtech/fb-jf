import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { chromium } from '@playwright/test'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

const root = process.cwd()
let baseDist = resolve(root, '../fb-base/dist')
const keepDist = resolve(root, '../fb-keep/dist')
const outDir = resolve(root, 'reports/visual-diff')

const defaultRoutes = [
  '/', '/zh/',
  '/games/', '/zh/games/', '/games/2/',
  '/popular-games/', '/trending-games/', '/new-games/',
  '/zh/popular-games/', '/zh/trending-games/', '/zh/new-games/',
  '/sprunki-dandys-world/', '/zh/sprunki-dandys-world/',
  '/sprunki-phase-1/', '/zh/sprunki-phase-1/',
  '/privacy/', '/zh/privacy/',
  '/terms-of-service/', '/zh/terms-of-service/',
  '/404.html'
]

// CLI: --routes=comma,separated or --file=routes.txt
const argRoutes = process.argv.find(a=>a.startsWith('--routes='))
const argFile = process.argv.find(a=>a.startsWith('--file='))
let routes = defaultRoutes
if (argRoutes){
  routes = argRoutes.split('=')[1].split(',').map(s=>s.trim()).filter(Boolean)
} else if (argFile){
  const fp = resolve(root, argFile.split('=')[1])
  routes = readFileSync(fp,'utf8').split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

function startServer(dist, port){
  const p = spawn('node', [resolve(root,'scripts/serve-dist.mjs'), dist, String(port)], { stdio: 'inherit' })
  return p
}

async function shot(page, url){
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(200)
  return await page.screenshot({ fullPage: true })
}

async function compare(imgA, imgB){
  const A = PNG.sync.read(imgA); const B = PNG.sync.read(imgB)
  const w = Math.max(A.width, B.width), h = Math.max(A.height, B.height)
  const pad = (src)=>{ const t=new PNG({width:w,height:h}); src.data.copy(t.data,0,0,src.data.length); return t }
  const a = pad(A), b = pad(B)
  const diff = new PNG({ width:w, height:h })
  const mismatched = pixelmatch(a.data, b.data, diff.data, w, h, { threshold: 0.1 })
  return { mismatched, pixels: w*h, diff: PNG.sync.write(diff) }
}

;(async () => {
  if (!existsSync(baseDist)) baseDist = resolve(root, 'dist')
  const basePort = 4011, keepPort = 4012
  const s1 = startServer(baseDist, basePort)
  const s2 = startServer(keepDist, keepPort)

  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1 })
  const base = await ctx.newPage(); const keep = await ctx.newPage()

  const summary = []
  const ensureDir = (fp) => {
    const parts = fp.split('/')
    let acc = ''
    for (const part of parts.slice(0,-1)){
      if (!part) continue
      acc += '/' + part
      try { if (!existsSync(acc)) mkdirSync(acc) } catch {}
    }
  }

  for (const route of routes){
    const urlA = `http://localhost:${basePort}${route}`
    const urlB = `http://localhost:${keepPort}${route}`
    try {
      const [imgA, imgB] = await Promise.all([shot(base, urlA), shot(keep, urlB)])
      const { mismatched, pixels, diff } = await compare(imgA, imgB)
      const ratio = pixels ? mismatched/pixels : 0
      summary.push({ route, pixels, mismatched, ratio })
      const safe = route.replace(/[^a-z0-9/_-]/gi,'_').replace(/\/+$/,'') || 'root'
      const basePath = join(outDir, safe)
      ensureDir(basePath)
      writeFileSync(basePath + '.base.png', imgA)
      writeFileSync(basePath + '.keep.png', imgB)
      writeFileSync(basePath + '.diff.png', diff)
      console.log(`${route} -> mismatch ${(ratio*100).toFixed(3)}% (${mismatched}/${pixels})`)
    } catch (e) {
      console.warn(`Failed ${route}: ${e.message}`)
      summary.push({ route, error: e.message })
    }
  }

  await browser.close(); s1.kill('SIGINT'); s2.kill('SIGINT')
  writeFileSync(join(outDir, 'summary.types.json'), JSON.stringify(summary, null, 2))
  console.log(`\nSaved summary to reports/visual-diff/summary.types.json`)
})().catch(err=>{ console.error(err); process.exit(1) })
