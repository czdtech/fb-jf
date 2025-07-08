#!/usr/bin/env node

/**
 * 批量生成游戏页面脚本
 * 使用 games-extended.json 数据
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const pagesDir = path.join(projectRoot, 'src', 'pages')
const gamesDataPath = path.join(
  projectRoot,
  'src',
  'data',
  'games-extended.json'
)

// 注意：这个脚本现在主要用于参考，实际页面通过动态路由 [slug].astro 生成
// 由于我们已经使用动态路由，静态页面生成变成可选项

// 替换模板变量
function replaceTemplateVars(template, game) {
  return template
    .replace(/{{GAME_ID}}/g, game.id)
    .replace(/{{GAME_SLUG}}/g, game.slug)
    .replace(/{{GAME_TITLE}}/g, game.title)
    .replace(/{{GAME_DESCRIPTION}}/g, game.description)
    .replace(/{{GAME_IMAGE}}/g, game.image)
    .replace(/{{GAME_IFRAME}}/g, game.iframe)
    .replace(/{{GAME_CATEGORY}}/g, game.category)
    .replace(/{{META_TITLE}}/g, game.meta.title)
    .replace(/{{META_DESCRIPTION}}/g, game.meta.description)
    .replace(/{{META_CANONICAL}}/g, game.meta.canonical)
    .replace(/{{META_OG_IMAGE}}/g, game.meta.ogImage)
}

// 生成单个游戏页面
function generateGamePage(game) {
  // 简单的页面模板，重定向到动态路由
  const pageContent = `---
// 此页面已迁移到动态路由 [slug].astro
// 自动重定向到新的页面结构
---

<script>
  // 重定向到动态路由页面
  window.location.href = '/${game.slug}/';
</script>

<!-- 备用内容，以防JavaScript被禁用 -->
<meta http-equiv="refresh" content="0; url=/${game.slug}/">
<p>页面已迁移，如果没有自动跳转，请<a href="/${game.slug}/">点击这里</a>。</p>
`

  const fileName = `${game.slug}.astro`
  const filePath = path.join(pagesDir, fileName)

  // 备份原文件
  if (fs.existsSync(filePath)) {
    const backupPath = path.join(pagesDir, `${game.slug}.astro.bak`)
    fs.copyFileSync(filePath, backupPath)
    console.log(`📋 已备份原文件: ${fileName}`)
  }

  fs.writeFileSync(filePath, pageContent)
  console.log(`✅ 生成重定向页面: ${fileName}`)
}

// 主函数
function main() {
  console.log('🚀 开始处理游戏页面...')

  // 读取游戏数据
  if (!fs.existsSync(gamesDataPath)) {
    console.error('❌ 游戏数据文件不存在，请先运行 extract-games.js')
    process.exit(1)
  }

  const gamesData = JSON.parse(fs.readFileSync(gamesDataPath, 'utf-8'))
  const games = gamesData.allGames

  console.log(`📊 发现 ${games.length} 个游戏`)
  console.log('💡 注意：页面现在通过动态路由 [slug].astro 生成')
  console.log('💡 如需生成静态重定向页面，取消下面代码的注释')

  // 取消注释以生成重定向页面
  /*
  // 创建备份目录
  const backupDir = path.join(pagesDir, 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 生成所有游戏页面
  games.forEach((game, index) => {
    try {
      generateGamePage(game);
    } catch (error) {
      console.error(`❌ 生成 ${game.slug} 页面失败:`, error.message);
    }
  });

  console.log('🎉 重定向页面生成完成！');
  console.log(`📁 生成位置: ${pagesDir}`);
  console.log('💡 提示: 原文件已备份为 .bak 文件');
  */
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
