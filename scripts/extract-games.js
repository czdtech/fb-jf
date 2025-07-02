#!/usr/bin/env node

/**
 * 从现有的sitemap.xml提取所有游戏页面信息
 * 生成games-list.json文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const sitemapPath = path.join(projectRoot, 'public', 'sitemap.xml');
const outputPath = path.join(projectRoot, 'src', 'data', 'games-list.json');

// 读取sitemap.xml
const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');

// 解析游戏URL
const gameUrlRegex = /<loc>https:\/\/www\.playfiddlebops\.com\/([^\/]+)\/<\/loc>/g;
const gameUrls = [];
let match;

while ((match = gameUrlRegex.exec(sitemapContent)) !== null) {
  const slug = match[1];
  
  // 排除特殊页面
  if (!['games', 'privacy', 'terms-of-service', 'zh', 'de', 'fr', 'es', 'ja', 'ko'].includes(slug)) {
    gameUrls.push(slug);
  }
}

// 生成游戏数据结构
const games = gameUrls.map(slug => {
  // 从slug生成标题 
  const title = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // 确定分类
  let category = 'trending';
  if (['sprunki-red-sun', 'sprunki-abgerny', 'sprunki-sonic', 'fiddlebops'].includes(slug)) {
    category = 'popular';
  } else if (['pikmin-no-sprunki', 'the-haze-pixelbox', 'yojou-sprunki-mustard', 'sprunki-retake-bonus-characters'].includes(slug)) {
    category = 'new';
  }
  
  return {
    id: slug,
    slug: slug,
    title: title,
    description: `${title} is an exciting music creation game that lets you mix and match sounds to create unique musical compositions.`,
    image: `/${slug}.png`,
    iframe: `https://example.com/games/${slug}`, // 需要根据实际情况调整
    category: category,
    meta: {
      title: `${title} - Play ${title} Online`,
      description: `${title} is an exciting music creation game that lets you mix and match sounds to create unique musical compositions.`,
      canonical: `https://www.playfiddlebops.com/${slug}/`,
      ogImage: `https://www.playfiddlebops.com/${slug}.png`
    }
  };
});

// 按分类分组
const gamesByCategory = {
  popular: games.filter(g => g.category === 'popular'),
  new: games.filter(g => g.category === 'new'),
  trending: games.filter(g => g.category === 'trending')
};

// 输出结果
const output = {
  totalGames: games.length,
  categories: gamesByCategory,
  allGames: games
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`✅ 成功提取 ${games.length} 个游戏页面信息`);
console.log(`📁 输出文件: ${outputPath}`);
console.log(`📊 分类统计:`);
console.log(`   - Popular: ${gamesByCategory.popular.length}`);
console.log(`   - New: ${gamesByCategory.new.length}`);
console.log(`   - Trending: ${gamesByCategory.trending.length}`);