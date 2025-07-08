#!/usr/bin/env node

/**
 * 从现有的sitemap.xml提取所有游戏页面信息
 * 生成games-extended.json文件（包含完整的SEO和内容数据）
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const sitemapPath = path.join(projectRoot, 'public', 'sitemap.xml')
const outputPath = path.join(projectRoot, 'src', 'data', 'games-extended.json')

// 读取sitemap.xml
const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8')

// 解析游戏URL
const gameUrlRegex =
  /<loc>https:\/\/www\.playfiddlebops\.com\/([^\/]+)\/<\/loc>/g
const gameUrls = []
let match

while ((match = gameUrlRegex.exec(sitemapContent)) !== null) {
  const slug = match[1]

  // 排除特殊页面
  if (
    ![
      'games',
      'privacy',
      'terms-of-service',
      'zh',
      'de',
      'fr',
      'es',
      'ja',
      'ko',
    ].includes(slug)
  ) {
    gameUrls.push(slug)
  }
}

// 生成游戏数据结构（扩展版本）
const games = gameUrls.map((slug, index) => {
  // 从slug生成标题
  const title = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  // 确定分类
  let category = 'trending'
  if (
    [
      'sprunki-red-sun',
      'sprunki-abgerny',
      'sprunki-sonic',
      'fiddlebops',
    ].includes(slug)
  ) {
    category = 'popular'
  } else if (
    [
      'pikmin-no-sprunki',
      'the-haze-pixelbox',
      'yojou-sprunki-mustard',
      'sprunki-retake-bonus-characters',
    ].includes(slug)
  ) {
    category = 'new'
  }

  const description = `${title} is an exciting music creation game that lets you mix and match sounds to create unique musical compositions.`

  return {
    id: slug,
    slug: slug,
    title: title,
    description: description,
    image: `/${slug}.png`,
    iframe: `https://example.com/games/${slug}`, // 需要根据实际情况调整
    category: category,
    meta: {
      title: `${title} - Play ${title} Online`,
      description: description,
      canonical: `https://www.playfiddlebops.com/${slug}/`,
      ogImage: `https://www.playfiddlebops.com/${slug}.png`,
    },
    seo: {
      title: `${title} - Play ${title} Online`,
      description: description,
      keywords: `${title}, ${title} online`,
      canonical: `https://www.playfiddlebops.com/${slug}/`,
      ogImage: `https://www.playfiddlebops.com/${slug}.png`,
      schema: {
        name: `${title} - Play ${title} Online`,
        alternateName: 'playfiddlebops.com',
        url: `https://www.playfiddlebops.com/${slug}/`,
      },
    },
    rating: {
      score: 4.5 + Math.random() * 0.5, // 4.5-5.0 随机评分
      maxScore: 5,
      votes: Math.floor(200 + Math.random() * 500), // 200-700 随机投票数
      stars: 4,
    },
    breadcrumb: {
      home: 'home',
      current: title,
    },
    content: {
      other: {
        title: `About ${title}`,
        content: [
          {
            type: 'paragraph',
            text: `home > ${title}`,
          },
          {
            type: 'paragraph',
            text: description,
          },
          {
            type: 'paragraph',
            text: `${title} offers an innovative gaming experience that combines creativity with musical expression. Whether you're a casual player or a serious music enthusiast, this game provides endless entertainment possibilities.`,
          },
          {
            type: 'list',
            items: [
              {
                title: 'Easy to Learn',
                description:
                  'Simple drag-and-drop mechanics make it accessible for players of all skill levels.',
              },
              {
                title: 'Creative Freedom',
                description:
                  'Mix and match different sounds to create your unique musical compositions.',
              },
              {
                title: 'High-Quality Audio',
                description:
                  'Experience crisp, clear audio with professionally crafted sound effects.',
              },
              {
                title: 'Free to Play',
                description:
                  'Enjoy the full gaming experience without any cost or hidden fees.',
              },
            ],
          },
        ],
      },
    },
    pageType: 'traditional',
    isDemo: false,
  }
})

// 按分类分组
const gamesByCategory = {
  popular: games.filter(g => g.category === 'popular'),
  new: games.filter(g => g.category === 'new'),
  trending: games.filter(g => g.category === 'trending'),
}

// 输出结果（扩展版本）
const output = {
  categories: gamesByCategory,
  totalGames: games.length,
  allGames: games,
}

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))

console.log(`✅ 成功提取 ${games.length} 个游戏页面信息（扩展版本）`)
console.log(`📁 输出文件: ${outputPath}`)
console.log(`📊 分类统计:`)
console.log(`   - Popular: ${gamesByCategory.popular.length}`)
console.log(`   - New: ${gamesByCategory.new.length}`)
console.log(`   - Trending: ${gamesByCategory.trending.length}`)
