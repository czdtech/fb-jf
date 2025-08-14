#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 多语言内容一致性验证工具
 * 检查所有语言版本的数据一致性
 */

const gamesDir = './src/content/games';
const supportedLanguages = ['de', 'es', 'fr', 'ja', 'ko', 'zh'];

// 需要保持一致的字段
const consistentFields = [
  'category',
  'rating.score',
  'rating.maxScore', 
  'rating.votes',
  'rating.stars',
  'image',
  'iframe'
];

// 游戏的预期分类映射
const expectedCategories = {
  'sprunki-interactive-beta': 'trending',
  'sprunki-retake-bonus-characters': 'new',
  'the-haze-pixelbox': 'new',
  'yojou-sprunki-mustard': 'new'
};

function parseMarkdownFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    
    if (!frontmatterMatch) {
      throw new Error('No frontmatter found');
    }
    
    const frontmatter = frontmatterMatch[1];
    const data = {};
    
    // 简单的YAML解析
    const lines = frontmatter.split('\n');
    let currentKey = '';
    let isMultilineValue = false;
    
    for (const line of lines) {
      if (line.trim() === '') continue;
      
      if (line.startsWith('  ') && currentKey && isMultilineValue) {
        // 继续处理多行值
        continue;
      }
      
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0 && !line.startsWith(' ')) {
        currentKey = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        
        if (value === '>-' || value === '>') {
          isMultilineValue = true;
          data[currentKey] = 'multiline';
        } else if (value) {
          isMultilineValue = false;
          data[currentKey] = value;
        }
      } else if (line.startsWith('  ') && currentKey) {
        // 嵌套属性
        const nestedKey = line.substring(2, line.indexOf(':')).trim();
        const nestedValue = line.substring(line.indexOf(':') + 1).trim();
        
        if (!data[currentKey] || typeof data[currentKey] === 'string') {
          data[currentKey] = {};
        }
        data[currentKey][nestedKey] = nestedValue;
      }
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Error parsing ${filePath}:`, error.message);
    return null;
  }
}

function getFieldValue(data, fieldPath) {
  const keys = fieldPath.split('.');
  let value = data;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  
  return value;
}

function validateSlugFormat(slug, expectedLanguage) {
  if (expectedLanguage === 'en') {
    // 英文版不应有语言前缀
    return !supportedLanguages.some(lang => slug.startsWith(`${lang}-`));
  } else {
    // 其他语言应该有正确的语言前缀
    return slug.startsWith(`${expectedLanguage}-`);
  }
}

function validateConsistencyForGame(gameName) {
  console.log(`\n🔍 Validating ${gameName}:`);
  
  // 读取英文版作为基准
  const englishPath = path.join(gamesDir, `${gameName}.md`);
  if (!fs.existsSync(englishPath)) {
    console.log(`  ⚠️ English version not found: ${englishPath}`);
    return false;
  }
  
  const englishData = parseMarkdownFile(englishPath);
  if (!englishData) {
    console.log(`  ❌ Failed to parse English version`);
    return false;
  }
  
  // 验证英文版slug格式
  if (!validateSlugFormat(englishData.slug || '', 'en')) {
    console.log(`  ❌ English slug format incorrect: ${englishData.slug}`);
  } else {
    console.log(`  ✅ English slug format correct: ${englishData.slug}`);
  }
  
  let allValid = true;
  
  // 检查所有其他语言版本
  for (const lang of supportedLanguages) {
    const langPath = path.join(gamesDir, lang, `${gameName}.md`);
    
    if (!fs.existsSync(langPath)) {
      console.log(`  ⚠️ ${lang.toUpperCase()} version not found`);
      continue;
    }
    
    const langData = parseMarkdownFile(langPath);
    if (!langData) {
      console.log(`  ❌ ${lang.toUpperCase()}: Failed to parse`);
      allValid = false;
      continue;
    }
    
    // 验证slug格式
    if (!validateSlugFormat(langData.slug || '', lang)) {
      console.log(`  ❌ ${lang.toUpperCase()} slug format incorrect: ${langData.slug}`);
      allValid = false;
    }
    
    // 验证一致性字段
    for (const field of consistentFields) {
      const englishValue = getFieldValue(englishData, field);
      const langValue = getFieldValue(langData, field);
      
      if (englishValue !== langValue) {
        console.log(`  ❌ ${lang.toUpperCase()} ${field} mismatch: "${englishValue}" !== "${langValue}"`);
        allValid = false;
      }
    }
    
    // 检查预期分类
    if (expectedCategories[gameName]) {
      const expectedCategory = expectedCategories[gameName];
      const actualCategory = langData.category;
      
      if (actualCategory !== expectedCategory) {
        console.log(`  ❌ ${lang.toUpperCase()} category should be "${expectedCategory}", got "${actualCategory}"`);
        allValid = false;
      }
    }
  }
  
  if (allValid) {
    console.log(`  ✅ All versions are consistent`);
  }
  
  return allValid;
}

function main() {
  console.log('🚀 Starting multilingual content consistency validation');
  console.log('📁 Target directory:', path.resolve(gamesDir));
  
  // 获取所有英文游戏文件
  const englishFiles = fs.readdirSync(gamesDir)
    .filter(file => file.endsWith('.md'))
    .map(file => path.basename(file, '.md'));
  
  console.log(`\n📊 Found ${englishFiles.length} games to validate`);
  
  let validCount = 0;
  let invalidCount = 0;
  
  for (const gameName of englishFiles) {
    if (validateConsistencyForGame(gameName)) {
      validCount++;
    } else {
      invalidCount++;
    }
  }
  
  console.log(`\n📈 Validation Summary:`);
  console.log(`✅ Valid: ${validCount}`);
  console.log(`❌ Invalid: ${invalidCount}`);
  console.log(`📊 Total: ${validCount + invalidCount}`);
  
  if (invalidCount > 0) {
    console.log('\n🔧 Issues found! Please fix the inconsistencies above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All content is consistent across languages!');
  }
}

// 运行脚本
main();

export { validateConsistencyForGame, parseMarkdownFile, getFieldValue };