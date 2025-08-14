#!/usr/bin/env tsx

/**
 * 游戏 Slug 语言前缀标准化脚本 v2.0
 * 
 * 新策略：使用语言前缀 slug 来避免内容集合冲突
 * - 英文游戏：保持基础 slug (例如 "ayocs-sprunkr") 
 * - 其他语言：使用语言前缀 (例如 "zh-ayocs-sprunkr", "es-ayocs-sprunkr")
 * 
 * 这确保了每个语言版本都有唯一的 slug，避免了 Astro 内容集合混乱，
 * 同时保持 URL 路径的正确性。
 */

import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { glob } from 'glob'

// 支持的语言代码
const SUPPORTED_LOCALES = ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko']

// 提取基础slug的函数（移除旧的语言后缀）
function extractBaseSlug(fullSlug: string): string {
  const match = fullSlug.match(/^(.+)-(en|zh|es|fr|de|ja|ko)$/)
  return match ? match[1] : fullSlug
}

// 从文件路径推断语言
function inferLanguageFromPath(filePath: string): string {
  // 检查文件路径是否包含语言文件夹
  const pathSegments = filePath.split('/')
  const gamesIndex = pathSegments.findIndex(segment => segment === 'games')
  
  if (gamesIndex >= 0 && gamesIndex < pathSegments.length - 1) {
    const nextSegment = pathSegments[gamesIndex + 1]
    if (SUPPORTED_LOCALES.includes(nextSegment) && nextSegment !== 'en') {
      return nextSegment
    }
  }
  
  // 默认为英文
  return 'en'
}

// 根据语言生成正确的 slug
function generateLanguageSlug(baseSlug: string, language: string): string {
  return language === 'en' ? baseSlug : `${language}-${baseSlug}`
}

// 处理单个游戏文件
async function processGameFile(filePath: string): Promise<{
  processed: boolean
  originalSlug?: string
  newSlug?: string
  language?: string
  error?: string
}> {
  try {
    console.log(`📄 处理文件: ${filePath}`)
    
    const content = await fs.readFile(filePath, 'utf-8')
    const language = inferLanguageFromPath(filePath)
    
    // 使用正则匹配frontmatter中的slug字段
    const slugMatch = content.match(/^slug:\s*(.+)$/m)
    
    if (!slugMatch) {
      return { processed: false, error: 'No slug field found' }
    }
    
    const originalSlug = slugMatch[1].trim().replace(/['"]/g, '')
    
    // 提取基础 slug（移除任何现有的语言后缀）
    const baseSlug = extractBaseSlug(originalSlug)
    
    // 生成语言特定的 slug
    const expectedSlug = generateLanguageSlug(baseSlug, language)
    
    if (originalSlug === expectedSlug) {
      console.log(`  ✅ 跳过 - slug已经正确: ${originalSlug} (${language})`)
      return { processed: false, originalSlug, language }
    }
    
    // 替换slug字段
    const updatedContent = content.replace(
      /^slug:\s*.+$/m,
      `slug: ${expectedSlug}`
    )
    
    // 写入更新后的内容
    await fs.writeFile(filePath, updatedContent, 'utf-8')
    
    console.log(`  ✅ 更新完成 (${language}): ${originalSlug} -> ${expectedSlug}`)
    
    return { 
      processed: true, 
      originalSlug, 
      newSlug: expectedSlug,
      language
    }
    
  } catch (error) {
    console.error(`  ❌ 处理失败: ${error}`)
    return { 
      processed: false, 
      error: error instanceof Error ? error.message : String(error) 
    }
  }
}

// 主处理函数
async function main() {
  console.log('🚀 开始游戏 Slug 语言前缀标准化处理...')
  console.log('📝 新策略：使用语言前缀避免内容集合冲突')
  console.log('   - 英文: ayocs-sprunkr')
  console.log('   - 中文: zh-ayocs-sprunkr')
  console.log('   - 其他: {lang}-{baseSlug}')
  console.log()
  
  // 查找所有游戏文件
  const gameFiles = await glob('src/content/games/**/*.md', {
    cwd: process.cwd(),
    absolute: true
  })
  
  console.log(`📊 找到 ${gameFiles.length} 个游戏文件`)
  
  const results = {
    total: gameFiles.length,
    processed: 0,
    skipped: 0,
    errors: 0,
    changes: [] as Array<{file: string, originalSlug: string, newSlug: string, language: string}>,
    languageStats: {} as Record<string, number>
  }
  
  // 处理每个文件
  for (const file of gameFiles) {
    const result = await processGameFile(file)
    
    if (result.language) {
      results.languageStats[result.language] = (results.languageStats[result.language] || 0) + 1
    }
    
    if (result.error) {
      results.errors++
      console.error(`❌ ${file}: ${result.error}`)
    } else if (result.processed) {
      results.processed++
      results.changes.push({
        file: file.replace(process.cwd() + '/', ''),
        originalSlug: result.originalSlug!,
        newSlug: result.newSlug!,
        language: result.language!
      })
    } else {
      results.skipped++
    }
  }
  
  // 输出处理结果
  console.log('\n📊 处理完成！统计结果:')
  console.log(`  总文件数: ${results.total}`)
  console.log(`  已处理: ${results.processed}`)
  console.log(`  已跳过: ${results.skipped}`)
  console.log(`  出错: ${results.errors}`)
  
  console.log('\n🌍 语言分布:')
  for (const [lang, count] of Object.entries(results.languageStats)) {
    console.log(`  ${lang}: ${count} 个文件`)
  }
  
  if (results.changes.length > 0) {
    console.log('\n📝 具体变更:')
    results.changes.forEach(change => {
      console.log(`  ${change.file} (${change.language}): ${change.originalSlug} -> ${change.newSlug}`)
    })
  }
  
  if (results.errors > 0) {
    console.error('\n❌ 存在错误，请检查上述输出')
    process.exit(1)
  }
  
  console.log('\n✅ 所有文件处理完成！')
  console.log('\n📝 下一步建议:')
  console.log('1. 更新 i18n.ts 中的 slug 处理逻辑')
  console.log('2. 运行构建测试: npm run build')
  console.log('3. 验证所有语言页面内容正确')
}

// 执行脚本 (ESM兼容)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ 脚本执行失败:', error)
    process.exit(1)
  })
}

export { main, processGameFile, extractBaseSlug, generateLanguageSlug, inferLanguageFromPath }