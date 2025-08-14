#!/usr/bin/env tsx

/**
 * 测试单个文件的slug标准化处理
 * 用于验证脚本逻辑是否正确
 */

import { processGameFile } from './normalize-game-slugs'

async function testSingleFile() {
  console.log('🧪 测试单文件处理效果...')
  
  // 测试英文游戏文件
  const testFile = 'src/content/games/ayocs-sprunkr.md'
  console.log(`\n测试文件: ${testFile}`)
  
  const result = await processGameFile(testFile)
  console.log('处理结果:', result)
  
  // 读取处理后的文件内容来验证
  const fs = require('fs').promises
  const content = await fs.readFile(testFile, 'utf-8')
  
  const slugMatch = content.match(/^slug:\s*(.+)$/m)
  if (slugMatch) {
    console.log(`当前文件的slug: ${slugMatch[1].trim()}`)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testSingleFile().catch(console.error)
}