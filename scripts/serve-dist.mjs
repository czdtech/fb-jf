import http from 'node:http'
import { createReadStream, statSync, existsSync } from 'node:fs'
import { resolve, join, extname } from 'node:path'

const distDir = resolve(process.argv[2] || 'dist')
const port = Number(process.argv[3] || 5000)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
}

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
    let filePath = resolve(distDir, '.' + urlPath)
    if (urlPath.endsWith('/')) filePath = join(filePath, 'index.html')
    if (!existsSync(filePath)) {
      res.statusCode = 404
      res.end('Not found')
      return
    }
    const stat = statSync(filePath)
    res.setHeader('Content-Length', stat.size)
    res.setHeader('Content-Type', MIME[extname(filePath)] || 'application/octet-stream')
    createReadStream(filePath).pipe(res)
  } catch (e) {
    res.statusCode = 500
    res.end('Server error')
  }
})

server.listen(port, () => {
  console.log(`Serving ${distDir} on http://localhost:${port}`)
})

