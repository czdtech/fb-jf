#!/usr/bin/env node

/**
 * 内容质量优化脚本
 * 为游戏内容添加更具体、更个性化的描述
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

console.log('🎨 开始优化游戏内容质量...')

// 加载游戏数据
let gamesData
try {
  gamesData = JSON.parse(fs.readFileSync(gamesDataPath, 'utf8'))
  console.log(`📁 成功加载游戏数据，共 ${gamesData.allGames.length} 个游戏`)
} catch (error) {
  console.error('❌ 读取游戏数据失败:', error.message)
  process.exit(1)
}

// 游戏特定的增强内容
const gameSpecificContent = {
  'fiddlebops-fix': {
    introduction: {
      title: 'What is Fiddlebops Fix?',
      content: [
        {
          type: 'paragraph',
          text: 'Fiddlebops Fix represents the ultimate refinement of the beloved music creation experience. This enhanced version takes everything players loved about the original and elevates it with improved stability, enhanced audio quality, and refined gameplay mechanics that make every session smoother and more enjoyable.',
        },
        {
          type: 'paragraph',
          text: "What sets Fiddlebops Fix apart is its seamless blend of musical creativity and interactive storytelling. You're not just creating beats – you're crafting narratives, building communities, and exploring a universe where every note you play shapes the world around you. The 'Fix' in the name represents both technical improvements and the perfect balance of features that players have been waiting for.",
        },
      ],
    },
    features: {
      title: 'What Makes Fiddlebops Fix the Ultimate Experience?',
      content: [
        {
          type: 'list',
          items: [
            {
              title: 'Enhanced Audio Engine',
              description:
                'Experience crystal-clear sound quality with improved audio processing that makes every beat, melody, and effect shine with professional clarity.',
            },
            {
              title: 'Expanded Character Roster',
              description:
                "Meet exclusive Fiddlebops Fix characters you won't find anywhere else, each bringing unique sounds and animations to your musical palette.",
            },
            {
              title: 'Interactive Story Mode',
              description:
                'Dive into choice-driven storylines where your musical decisions shape compelling narratives and unlock new creative possibilities.',
            },
            {
              title: 'Community Hub Integration',
              description:
                'Connect with fellow creators through built-in sharing tools, collaborative features, and a vibrant community ecosystem.',
            },
            {
              title: 'Performance Optimizations',
              description:
                'Enjoy lag-free gameplay with optimized performance that ensures smooth operation across all devices and platforms.',
            },
          ],
        },
      ],
    },
  },

  'sprunki-abgerny': {
    features: {
      title: "What's So Special About Sprunki Abgerny?",
      content: [
        {
          type: 'paragraph',
          text: "Sprunki Abgerny isn't just a regular music game, it's a tribute to ancient cultures and an exploration of the endless possibilities of music. Here, you can not only create music, but also feel the heritage and fusion of cultures.",
        },
        {
          type: 'list',
          items: [
            {
              title: 'Become a Tribal Leader',
              description:
                'Lead your tribe of beatboxers and use your musical talent to make them play awe-inspiring melodies that echo through time.',
            },
            {
              title: 'Explore Primal Sounds',
              description:
                'The game is full of tribal rhythms, didgeridoos, and soulful chants, allowing you to fully experience the charm of Australian Aboriginal music.',
            },
            {
              title: 'Showcase Your Creativity',
              description:
                'Unleash your creativity with a variety of unique sound effects and percussive elements, creating unique musical works that honor ancient traditions.',
            },
            {
              title: 'Authentic Cultural Elements',
              description:
                'Experience carefully crafted sound samples and visual designs that respectfully honor Aboriginal musical traditions while celebrating their rich heritage.',
            },
            {
              title: 'Dynamic Soundscaping',
              description:
                'Watch as your compositions evolve with environmental sounds that transport you to the heart of ancient landscapes and sacred grounds.',
            },
          ],
        },
      ],
    },
  },

  'sprunki-sonic': {
    introduction: {
      title: 'What is Sprunki Sonic?',
      content: [
        {
          type: 'paragraph',
          text: 'Ever thought about Sonic playing music? Sprunki Sonic gives you the answer! This incredible Incredibox mod, created by LittleJimmyGaming123 and Kirby-PRO-189, perfectly combines the high-speed world of Sonic the Hedgehog with innovative music creation, letting you harness the power of speed in your musical compositions.',
        },
        {
          type: 'paragraph',
          text: 'Whether you are a rhythm game lover or a loyal fan of the Sonic series, Sprunki Sonic offers the perfect fusion of both worlds. Experience the thrill of creating lightning-fast beats with iconic Sonic characters, each bringing their unique personality and sound signature to your musical adventures. This game is easy to learn but difficult to master, making it perfect for players of all skill levels.',
        },
      ],
    },
    features: {
      title: 'What Makes Sprunki Sonic Lightning Fast?',
      content: [
        {
          type: 'list',
          items: [
            {
              title: 'Iconic Sonic Characters',
              description:
                'Play with Sonic, Tails, Knuckles, Amy, Metal Sonic, and more - each character brings unique sounds and super-fast animations to your musical creations.',
            },
            {
              title: 'Speed-Themed Sound Effects',
              description:
                'Experience high-energy beats, whoosh effects, and signature Sonic sounds that capture the essence of blazing through Green Hill Zone.',
            },
            {
              title: 'Ring Collection Mechanics',
              description:
                'Collect musical rings as you create perfect combinations, unlocking special Sonic-themed bonuses and power-ups.',
            },
            {
              title: 'Zone-Based Environments',
              description:
                'Create music across different Sonic zones, each with its own visual style and environmental sound effects.',
            },
            {
              title: 'Chaos Emerald Unlocks',
              description:
                'Discover hidden combinations to unlock Chaos Emerald effects that transform your musical experience with special powers.',
            },
          ],
        },
      ],
    },
  },
}

// 通用增强模板
const enhancedTemplates = {
  fiddlebopsFamily: {
    gameplay: {
      title: 'How to Master the Fiddlebops Experience?',
      content: [
        {
          type: 'paragraph',
          text: "The Fiddlebops experience is designed to be intuitive yet deeply rewarding. Here's your guide to becoming a master creator:",
        },
        {
          type: 'steps',
          items: [
            {
              title: 'Assemble Your Musical Crew',
              description:
                'Browse through the diverse cast of characters, each with unique sounds and animations. Take time to understand their personalities and musical signatures.',
            },
            {
              title: 'Layer Your Composition',
              description:
                'Use the drag-and-drop interface to build complex musical layers. Start with a solid rhythm foundation, then add melodies and effects.',
            },
            {
              title: 'Discover Hidden Combinations',
              description:
                "Experiment with character pairings to unlock special animations, bonus tracks, and secret sound effects that aren't immediately obvious.",
            },
            {
              title: 'Craft Your Story',
              description:
                'Use the interactive elements to shape narratives - your musical choices will influence character development and story progression.',
            },
            {
              title: 'Share and Collaborate',
              description:
                'Join the community to share your creations, participate in challenges, and collaborate with other musicians to create something extraordinary.',
            },
          ],
        },
      ],
    },
  },

  sprunkiFamily: {
    gameplay: {
      title: 'How to Create Sprunki Magic?',
      content: [
        {
          type: 'paragraph',
          text: 'Sprunki games offer a unique approach to music creation with their distinctive visual style and innovative mechanics:',
        },
        {
          type: 'steps',
          items: [
            {
              title: 'Choose Your Sprunki Squad',
              description:
                'Select from a variety of uniquely designed Sprunki characters, each with their own special sounds and visual effects.',
            },
            {
              title: 'Build Musical Layers',
              description:
                'Drag characters onto the stage to create layered compositions. Watch as each character comes alive with distinctive animations.',
            },
            {
              title: 'Unlock Special Modes',
              description:
                'Discover hidden character combinations that trigger special visual modes and unlock bonus content exclusive to this mod.',
            },
            {
              title: 'Master the Mechanics',
              description:
                'Learn advanced techniques like timing-based interactions and character-specific bonuses to create more complex compositions.',
            },
            {
              title: 'Explore and Experiment',
              description:
                "There's no wrong way to play - experiment freely with different combinations to discover your own unique sound signature.",
            },
          ],
        },
      ],
    },
  },
}

function enhanceGameContent(game) {
  let enhanced = false

  // 检查是否有游戏特定的增强内容
  if (gameSpecificContent[game.slug]) {
    const specific = gameSpecificContent[game.slug]

    // 增强introduction
    if (specific.introduction) {
      game.content.introduction = specific.introduction
      enhanced = true
      console.log(`🎨 增强 ${game.title} 的introduction`)
    }

    // 增强features
    if (specific.features) {
      game.content.features = specific.features
      enhanced = true
      console.log(`🎨 增强 ${game.title} 的features`)
    }

    // 增强gameplay
    if (specific.gameplay) {
      game.content.gameplay = specific.gameplay
      enhanced = true
      console.log(`🎨 增强 ${game.title} 的gameplay`)
    }
  }

  // 应用家族模板
  if (game.slug.includes('fiddlebops') && !game.content.gameplay) {
    game.content.gameplay = enhancedTemplates.fiddlebopsFamily.gameplay
    enhanced = true
    console.log(`🎨 应用Fiddlebops家族模板到 ${game.title}`)
  }

  if (game.slug.includes('sprunki') && !enhanced) {
    // 为Sprunki游戏应用增强的gameplay模板
    if (!game.content.gameplay || game.content.gameplay.content.length < 2) {
      game.content.gameplay = enhancedTemplates.sprunkiFamily.gameplay
      enhanced = true
      console.log(`🎨 应用Sprunki家族模板到 ${game.title}`)
    }
  }

  return enhanced
}

// 处理指定游戏
const gamesToEnhance = [
  'fiddlebops-fix',
  'fiddlebops-polos',
  'fiddlebops-sprunkbop',
  'sprunki-abgerny',
  'sprunki-sonic',
  'sprunki-maker',
  'sprunki-1996',
  'ayocs-sprunkr',
]

let enhancedCount = 0

gamesData.allGames.forEach(game => {
  if (gamesToEnhance.includes(game.slug)) {
    const enhanced = enhanceGameContent(game)
    if (enhanced) {
      enhancedCount++
      console.log(`✅ 增强完成: ${game.title}`)
    } else {
      console.log(`⏭️  跳过 ${game.title} - 无需增强`)
    }
  }
})

if (enhancedCount > 0) {
  // 保存更新后的数据
  try {
    fs.writeFileSync(gamesDataPath, JSON.stringify(gamesData, null, 2), 'utf8')
    console.log(`\n🎉 成功增强 ${enhancedCount} 个游戏的内容质量！`)
    console.log('已更新文件:', gamesDataPath)
  } catch (error) {
    console.error('❌ 保存文件失败:', error.message)
    process.exit(1)
  }
} else {
  console.log('\n📋 所有指定游戏的内容质量都已达标，无需增强')
}
