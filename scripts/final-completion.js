#!/usr/bin/env node

/**
 * 最终补全脚本 - 处理所有剩余缺失数据
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const gamesDataPath = path.join(
  projectRoot,
  'src',
  'data',
  'games-extended.json'
)

console.log('🏁 开始最终补全所有缺失数据...')

// 加载游戏数据
let gamesData
try {
  gamesData = JSON.parse(fs.readFileSync(gamesDataPath, 'utf8'))
  console.log(`📁 成功加载游戏数据，共 ${gamesData.allGames.length} 个游戏`)
} catch (error) {
  console.error('❌ 读取游戏数据失败:', error.message)
  process.exit(1)
}

// 检查游戏缺失问题
function checkGameIssues(game) {
  const issues = []

  // 检查描述截断
  const truncatedPatterns = [
    'isn',
    'Whether you',
    'Now',
    'Want to',
    'This game',
    'This unique',
    'is not',
  ]
  if (
    truncatedPatterns.some(
      pattern =>
        game.description === pattern ||
        game.description.endsWith(pattern) ||
        game.description.length < 10
    )
  ) {
    issues.push('完整描述')
  }

  // 检查缺失content字段
  if (!game.content) {
    issues.push('全部content')
    return issues
  }

  if (!game.content.introduction) issues.push('introduction')
  if (!game.content.features) issues.push('特色功能')
  if (!game.content.gameplay) issues.push('gameplay')

  return issues
}

// 修复描述问题
function fixDescription(game) {
  if (
    game.seo &&
    game.seo.description &&
    game.seo.description !== game.description
  ) {
    game.description = game.seo.description
    game.meta.description = game.seo.description
    return true
  }
  return false
}

// 创建内容模板
function createMissingContent(game, missingField) {
  const gameTitle = game.title

  switch (missingField) {
    case 'introduction':
      return {
        title: `What is ${gameTitle}?`,
        content: [
          {
            type: 'paragraph',
            text:
              game.description ||
              `${gameTitle} is an innovative music creation game that offers players a unique and engaging experience in the world of rhythm and beats.`,
          },
        ],
      }

    case '特色功能':
    case 'features':
      return {
        title: `What Makes ${gameTitle} Special?`,
        content: [
          {
            type: 'list',
            items: [
              {
                title: 'Unique Character Design',
                description: `Experience distinctive characters with their own sounds and animations in ${gameTitle}.`,
              },
              {
                title: 'Creative Music Making',
                description:
                  'Express your creativity with intuitive drag-and-drop gameplay mechanics.',
              },
              {
                title: 'Interactive Gameplay',
                description:
                  'Discover hidden combinations and unlock special animations and effects.',
              },
              {
                title: 'Community Features',
                description:
                  'Share your musical creations and connect with other players worldwide.',
              },
            ],
          },
        ],
      }

    case 'gameplay':
      return {
        title: `How to Play ${gameTitle}?`,
        content: [
          {
            type: 'paragraph',
            text: 'Getting started is easy! Follow these simple steps to begin your musical journey:',
          },
          {
            type: 'steps',
            items: [
              {
                title: 'Choose Your Characters',
                description:
                  'Select from a variety of unique characters, each with their own sound and style.',
              },
              {
                title: 'Drag and Drop',
                description:
                  'Use the intuitive drag-and-drop interface to place characters and create music.',
              },
              {
                title: 'Experiment with Combinations',
                description:
                  'Try different character combinations to discover new sounds and unlock special features.',
              },
              {
                title: 'Save and Share',
                description:
                  'Record your musical masterpieces and share them with the community.',
              },
            ],
          },
        ],
      }

    default:
      return null
  }
}

// 处理所有游戏
let fixedCount = 0
let totalIssues = 0

gamesData.allGames.forEach(game => {
  const issues = checkGameIssues(game)

  if (issues.length === 0) {
    return // 游戏没有问题，跳过
  }

  totalIssues += issues.length
  let gameFixed = false

  console.log(`🔧 处理 ${game.title} - 缺失: ${issues.join(', ')}`)

  // 修复描述问题
  if (issues.includes('完整描述')) {
    if (fixDescription(game)) {
      console.log(`   ✅ 修复描述截断`)
      gameFixed = true
    }
  }

  // 确保content对象存在
  if (!game.content) {
    game.content = {}
  }

  // 补全缺失的content字段
  issues.forEach(issue => {
    if (issue !== '完整描述' && issue !== '全部content') {
      const content = createMissingContent(game, issue)
      if (content) {
        if (issue === '特色功能') {
          game.content.features = content
        } else {
          game.content[issue] = content
        }
        console.log(`   ✅ 补全 ${issue}`)
        gameFixed = true
      }
    }
  })

  if (gameFixed) {
    fixedCount++
    console.log(`✅ 完成修复: ${game.title}`)
  }
})

if (fixedCount > 0) {
  // 保存更新后的数据
  try {
    fs.writeFileSync(gamesDataPath, JSON.stringify(gamesData, null, 2), 'utf8')
    console.log(`\n🎉 最终补全完成！`)
    console.log(`🔧 修复了 ${fixedCount} 个游戏`)
    console.log(`📋 解决了 ${totalIssues} 个数据问题`)
    console.log('已更新文件:', gamesDataPath)
  } catch (error) {
    console.error('❌ 保存文件失败:', error.message)
    process.exit(1)
  }
} else {
  console.log('\n📋 所有游戏数据都已完整，无需修复')
}
