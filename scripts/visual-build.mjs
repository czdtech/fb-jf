import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = process.cwd()
let baseDir = resolve(root, '../fb-base')
const keepDir = resolve(root, '../fb-keep')

function run(cmd, cwd) { console.log(`[${cwd}] $ ${cmd}`); execSync(cmd, { stdio: 'inherit', cwd }) }

// if fb-base does not exist, use current repo as base
try {
  // install and build base
  run('npm i --no-audit --no-fund', baseDir)
  run('npm run -s build', baseDir)
} catch {
  baseDir = root
  run('npm i --no-audit --no-fund', baseDir)
  run('npm run -s build', baseDir)
}

// install and build keep
run('npm i --no-audit --no-fund', keepDir)
run('npm run -s build', keepDir)

console.log('\nBuild finished for both checkouts')
