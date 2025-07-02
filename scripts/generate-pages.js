#!/usr/bin/env node

/**
 * 批量生成游戏页面脚本
 * 使用统一模板生成所有游戏页面
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const pagesDir = path.join(projectRoot, 'src', 'pages');
const gamesListPath = path.join(projectRoot, 'src', 'data', 'games-list.json');

// 游戏页面模板
const gamePageTemplate = `---
import GamePageLayout from '@/layouts/GamePageLayout.astro';

// 导入数据
import extractedData from '@/data/extracted-data.json';

const { navigation, games } = extractedData;

// 游戏数据
const gameData = {
  id: "{{GAME_ID}}",
  slug: "{{GAME_SLUG}}",
  title: "{{GAME_TITLE}}",
  description: "{{GAME_DESCRIPTION}}",
  image: "{{GAME_IMAGE}}",
  iframe: "{{GAME_IFRAME}}",
  category: "{{GAME_CATEGORY}}",
  meta: {
    title: "{{META_TITLE}}",
    description: "{{META_DESCRIPTION}}",
    canonical: "{{META_CANONICAL}}",
    ogImage: "{{META_OG_IMAGE}}"
  },
  content: {
    breadcrumb: "home > {{GAME_TITLE}}",
    mainHeading: "About {{GAME_TITLE}}",
    sections: [
      {
        type: "paragraph",
        content: "{{GAME_DESCRIPTION}}"
      }
    ]
  }
};

// 多语言配置
const hreflangLinks = navigation.languages.map(lang => ({
  code: lang.code === 'en' ? 'x-default' : lang.code,
  url: \`https://www.playfiddlebops.com\${lang.url}\`
}));
---

<GamePageLayout 
  game={gameData}
  navigation={navigation.main}
  languages={navigation.languages}
  popularGames={games.popular}
  newGames={games.new}
  trendingGames={games.trending}
  hreflang={hreflangLinks}
/>

<style>
/* 游戏页面特定样式 */
.game-iframe-sprunki {
  background-image: linear-gradient(rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.3)), url({{GAME_IMAGE}});
}
</style>`;

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
    .replace(/{{META_OG_IMAGE}}/g, game.meta.ogImage);
}

// 生成单个游戏页面
function generateGamePage(game) {
  const pageContent = replaceTemplateVars(gamePageTemplate, game);
  const fileName = \`\${game.slug}.astro\`;
  const filePath = path.join(pagesDir, fileName);
  
  // 备份原文件
  if (fs.existsSync(filePath)) {
    const backupPath = path.join(pagesDir, \`\${game.slug}.astro.bak\`);
    fs.copyFileSync(filePath, backupPath);
    console.log(\`📋 已备份原文件: \${fileName}\`);
  }
  
  fs.writeFileSync(filePath, pageContent);
  console.log(\`✅ 生成页面: \${fileName}\`);
}

// 主函数
function main() {
  console.log('🚀 开始批量生成游戏页面...');
  
  // 读取游戏列表
  if (!fs.existsSync(gamesListPath)) {
    console.error('❌ 游戏列表文件不存在，请先运行 extract-games.js');
    process.exit(1);
  }
  
  const gamesData = JSON.parse(fs.readFileSync(gamesListPath, 'utf-8'));
  const games = gamesData.allGames;
  
  console.log(\`📊 总共需要生成 \${games.length} 个游戏页面\`);
  
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
      console.error(\`❌ 生成 \${game.slug} 页面失败:`, error.message);
    }
  });
  
  console.log('🎉 批量生成完成！');
  console.log(\`📁 生成位置: \${pagesDir}\`);
  console.log('💡 提示: 原文件已备份为 .bak 文件');
}

// 如果直接运行此脚本
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  main();
}