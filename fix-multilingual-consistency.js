#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 批量修复多语言内容一致性问题
 * 以英文版本为基准，同步其他语言版本的数据
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

function parseMarkdownFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    
    if (!frontmatterMatch) {
      throw new Error('No frontmatter found');
    }
    
    return {
      frontmatter: frontmatterMatch[1],
      body: content.substring(frontmatterMatch[0].length),
      fullContent: content
    };
  } catch (error) {
    console.error(`❌ Error parsing ${filePath}:`, error.message);
    return null;
  }
}

function updateFieldInFrontmatter(frontmatter, fieldPath, newValue) {
  const lines = frontmatter.split('\n');
  const keys = fieldPath.split('.');
  
  if (keys.length === 1) {
    // 简单字段
    const fieldName = keys[0];
    let found = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith(`${fieldName}:`)) {
        lines[i] = `${fieldName}: ${newValue}`;
        found = true;
        break;
      }
    }
    
    if (!found) {
      lines.push(`${fieldName}: ${newValue}`);
    }
  } else if (keys.length === 2) {
    // 嵌套字段 (如 rating.score)
    const parentField = keys[0];
    const childField = keys[1];
    let inRatingSection = false;
    let found = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith(`${parentField}:`)) {
        inRatingSection = true;
        continue;
      }
      
      if (inRatingSection && line.startsWith('  ') && line.includes(`${childField}:`)) {
        lines[i] = `  ${childField}: ${newValue}`;
        found = true;
        break;
      }
      
      if (inRatingSection && !line.startsWith('  ') && line.trim() !== '') {
        inRatingSection = false;
      }
    }
    
    if (!found) {
      // 添加到rating部分
      let ratingIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith(`${parentField}:`)) {
          ratingIndex = i;
          break;
        }
      }
      
      if (ratingIndex === -1) {
        lines.push(`${parentField}:`);
        lines.push(`  ${childField}: ${newValue}`);
      } else {
        lines.splice(ratingIndex + 1, 0, `  ${childField}: ${newValue}`);
      }
    }
  }
  
  return lines.join('\n');
}

function getFieldValue(frontmatter, fieldPath) {
  const keys = fieldPath.split('.');
  const lines = frontmatter.split('\n');
  
  if (keys.length === 1) {
    const fieldName = keys[0];
    for (const line of lines) {
      if (line.startsWith(`${fieldName}:`)) {
        return line.substring(line.indexOf(':') + 1).trim();
      }
    }
  } else if (keys.length === 2) {
    const parentField = keys[0];
    const childField = keys[1];
    let inSection = false;
    
    for (const line of lines) {
      if (line.startsWith(`${parentField}:`)) {
        inSection = true;
        continue;
      }
      
      if (inSection && line.startsWith('  ') && line.includes(`${childField}:`)) {
        return line.substring(line.indexOf(':') + 1).trim();
      }
      
      if (inSection && !line.startsWith('  ') && line.trim() !== '') {
        inSection = false;
      }
    }
  }
  
  return undefined;
}

function fixGameConsistency(gameName) {
  console.log(`\n🔧 Fixing ${gameName}:`);
  
  // 读取英文版作为基准
  const englishPath = path.join(gamesDir, `${gameName}.md`);
  if (!fs.existsSync(englishPath)) {
    console.log(`  ⚠️ English version not found: ${englishPath}`);
    return false;
  }
  
  const englishFile = parseMarkdownFile(englishPath);
  if (!englishFile) {
    console.log(`  ❌ Failed to parse English version`);
    return false;
  }
  
  let totalFixed = 0;
  
  // 修复所有其他语言版本
  for (const lang of supportedLanguages) {
    const langPath = path.join(gamesDir, lang, `${gameName}.md`);
    
    if (!fs.existsSync(langPath)) {
      console.log(`  ⚠️ ${lang.toUpperCase()} version not found`);
      continue;
    }
    
    const langFile = parseMarkdownFile(langPath);
    if (!langFile) {
      console.log(`  ❌ ${lang.toUpperCase()}: Failed to parse`);
      continue;
    }
    
    let updated = false;
    let updatedFrontmatter = langFile.frontmatter;
    
    // 检查并修复每个字段
    for (const field of consistentFields) {
      const englishValue = getFieldValue(englishFile.frontmatter, field);
      const langValue = getFieldValue(langFile.frontmatter, field);
      
      if (englishValue && englishValue !== langValue) {
        updatedFrontmatter = updateFieldInFrontmatter(updatedFrontmatter, field, englishValue);
        updated = true;
        console.log(`  ✅ ${lang.toUpperCase()} ${field}: "${langValue}" → "${englishValue}"`);
      }
    }
    
    // 写入文件
    if (updated) {
      const newContent = `---\n${updatedFrontmatter}\n---${langFile.body}`;
      fs.writeFileSync(langPath, newContent, 'utf8');
      totalFixed++;
    }
  }
  
  console.log(`  📊 Fixed ${totalFixed} files`);
  return totalFixed > 0;
}

function main() {
  console.log('🚀 Starting multilingual content consistency fixes');
  console.log('📁 Target directory:', path.resolve(gamesDir));
  
  // 获取所有英文游戏文件
  const englishFiles = fs.readdirSync(gamesDir)
    .filter(file => file.endsWith('.md'))
    .map(file => path.basename(file, '.md'));
  
  console.log(`\n📊 Found ${englishFiles.length} games to fix`);
  
  let totalGamesFixed = 0;
  
  for (const gameName of englishFiles) {
    if (fixGameConsistency(gameName)) {
      totalGamesFixed++;
    }
  }
  
  console.log(`\n📈 Fix Summary:`);
  console.log(`🔧 Games with fixes applied: ${totalGamesFixed}`);
  console.log(`📊 Total games: ${englishFiles.length}`);
  
  console.log('\n🎉 Consistency fixes completed!');
  console.log('💡 Run validate-multilingual-consistency.js to verify fixes');
}

// 运行脚本
main();

export { fixGameConsistency, parseMarkdownFile, updateFieldInFrontmatter };