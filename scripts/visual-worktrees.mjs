import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const baseBranch = process.env.VIS_BASE_BRANCH || 'homepage-redesign-v2'
const keepBranch = process.env.VIS_KEEP_BRANCH || 'refactor-fixes-keep-20250916'
const baseDir = resolve(root, '../fb-base')
const keepDir = resolve(root, '../fb-keep')

function run(cmd, opts={}) { console.log(cmd); execSync(cmd, { stdio: 'inherit', ...opts }) }

// create worktrees if missing
try {
  if (!existsSync(baseDir)) {
    // 如果当前仓库就是 baseBranch，则无需新增 worktree
    const head = execSync('git rev-parse --abbrev-ref HEAD', { cwd: root }).toString().trim()
    if (head === baseBranch) {
      console.log(`[info] current workspace is base branch (${baseBranch}); skip adding fb-base`)
    } else {
      run(`git worktree add ${baseDir} ${baseBranch}`)
    }
  } else {
    console.log(`[skip] worktree exists: ${baseDir}`)
  }
} catch(e) {
  console.warn('[warn] skip base worktree:', e.message)
}

if (!existsSync(keepDir)) {
  run(`git worktree add ${keepDir} ${keepBranch}`)
} else {
  console.log(`[skip] worktree exists: ${keepDir}`)
}

console.log('\nWorktrees ready:')
console.log('BASE:', baseDir)
console.log('KEEP:', keepDir)
