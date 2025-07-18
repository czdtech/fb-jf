#!/usr/bin/env node

/**
 * 补全游戏缺失内容脚本
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

console.log('🔍 开始补全游戏缺失内容...')

// 加载游戏数据
let gamesData
try {
  gamesData = JSON.parse(fs.readFileSync(gamesDataPath, 'utf8'))
  console.log(`📁 成功加载游戏数据，共 ${gamesData.allGames.length} 个游戏`)
} catch (error) {
  console.error('❌ 读取游戏数据失败:', error.message)
  process.exit(1)
}

// 需要补全的游戏 (根据验证结果)
const gamesToComplete = [
  'fiddlebops-fix',
  'fiddlebops-polos',
  'fiddlebops-sprunksters-remix',
  'fiddlebops-sprunkbop',
  'sprunki-parasite-parasprunki-15',
  'ayocs-sprunkr',
  'sprunki-pyramixed-version',
  'sprunki-squid-remix',
  'sprunki-1996',
  'incredibox-sprunksters',
  'sprunki-maker',
  'sprunki-phase-8',
  'sprunki-rotrizi-5',
  'sprunki-retake-bonus-characters',
  'yojou-sprunki-mustard',
  'sprunki-eggs-mix',
]

// 检查并修复描述截断问题
function fixDescriptionTruncation(game) {
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
        game.description === pattern || game.description.endsWith(pattern)
    )
  ) {
    // 使用SEO描述作为完整描述
    if (
      game.seo &&
      game.seo.description &&
      game.seo.description !== game.description
    ) {
      console.log(`🔧 修复描述截断: ${game.title}`)
      game.description = game.seo.description
      game.meta.description = game.seo.description
      return true
    }
  }
  return false
}

// 检查缺失content的游戏
function checkMissingContent(game) {
  const missing = []
  if (!game.content) {
    missing.push('全部content')
    return missing
  }

  if (!game.content.introduction) missing.push('introduction')
  if (!game.content.features) missing.push('features')
  if (!game.content.gameplay) missing.push('gameplay')

  return missing
}

// 内容模板
function createIntroduction(gameTitle, description) {
  return {
    title: `What is ${gameTitle}?`,
    content: [
      {
        type: 'paragraph',
        text:
          description ||
          `${gameTitle} is an innovative music creation game that offers players a unique and engaging experience in the world of rhythm and beats.`,
      },
    ],
  }
}

function createFeatures(gameTitle) {
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
}

function createGameplay(gameTitle) {
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
}

// 处理所有游戏
let completedCount = 0
let skippedCount = 0

gamesData.allGames.forEach(game => {
  if (gamesToComplete.includes(game.slug)) {
    // 首先修复描述问题
    const descriptionFixed = fixDescriptionTruncation(game)

    const missing = checkMissingContent(game)

    if (missing.length === 0 && !descriptionFixed) {
      console.log(`⏭️  跳过 ${game.title} - 内容已完整`)
      skippedCount++
      return
    }

    if (descriptionFixed) {
      console.log(`🔧 已修复 ${game.title} 的描述截断问题`)
    }

    if (missing.length > 0) {
      console.log(`🔧 处理 ${game.title} - 缺失: ${missing.join(', ')}`)

      // 确保content对象存在
      if (!game.content) {
        game.content = {}
      }

      // 补全缺失字段
      if (!game.content.introduction) {
        game.content.introduction = createIntroduction(
          game.title,
          game.description
        )
      }

      if (!game.content.features) {
        game.content.features = createFeatures(game.title)
      }

      if (!game.content.gameplay) {
        game.content.gameplay = createGameplay(game.title)
      }
    }

    completedCount++
    console.log(`✅ 完成补全: ${game.title}`)
  }
})

if (completedCount > 0) {
  // 保存更新后的数据
  try {
    fs.writeFileSync(gamesDataPath, JSON.stringify(gamesData, null, 2), 'utf8')
    console.log(`\n🎉 成功补全 ${completedCount} 个游戏的缺失内容！`)
    console.log(`⏭️  跳过 ${skippedCount} 个已完整游戏`)
    console.log('已更新文件:', gamesDataPath)
  } catch (error) {
    console.error('❌ 保存文件失败:', error.message)
    process.exit(1)
  }
} else {
  console.log('\n📋 所有指定游戏的内容都已完整，无需补全')
}
