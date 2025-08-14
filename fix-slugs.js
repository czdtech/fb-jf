#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 批量修复多语言Content Collections的slug冲突问题
 * 为不同语言的文件添加语言前缀，确保slug唯一性
 */

const gamesDir = './src/content/games';
const supportedLanguages = ['de', 'es', 'fr', 'ja', 'ko', 'zh'];

function updateSlugInFile(filePath, newSlug) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 使用正则表达式替换slug行
    const updatedContent = content.replace(
      /^slug:\s*.+$/m,
      `slug: ${newSlug}`
    );
    
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`✅ Updated: ${filePath} -> slug: ${newSlug}`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function processLanguageDirectory(language) {
  const langDir = path.join(gamesDir, language);
  
  if (!fs.existsSync(langDir)) {
    console.log(`⚠️ Language directory not found: ${langDir}`);
    return;
  }
  
  const files = fs.readdirSync(langDir).filter(file => file.endsWith('.md'));
  console.log(`\n🔍 Processing ${language} files: ${files.length} found`);
  
  let successCount = 0;
  
  files.forEach(file => {
    const filePath = path.join(langDir, file);
    const gameSlug = path.basename(file, '.md');
    const newSlug = `${gameSlug}-${language}`; // 格式: ayocs-sprunkr-zh
    
    if (updateSlugInFile(filePath, newSlug)) {
      successCount++;
    }
  });
  
  console.log(`✅ ${language}: ${successCount}/${files.length} files updated`);
}

function processEnglishFiles() {
  const files = fs.readdirSync(gamesDir).filter(file => 
    file.endsWith('.md') && !supportedLanguages.includes(path.basename(file, '.md'))
  );
  
  console.log(`\n🔍 Processing English files: ${files.length} found`);
  
  let successCount = 0;
  
  files.forEach(file => {
    const filePath = path.join(gamesDir, file);
    const gameSlug = path.basename(file, '.md');
    const newSlug = `${gameSlug}-en`; // 格式: ayocs-sprunkr-en
    
    if (updateSlugInFile(filePath, newSlug)) {
      successCount++;
    }
  });
  
  console.log(`✅ English: ${successCount}/${files.length} files updated`);
}

function main() {
  console.log('🚀 Starting slug uniqueness fix for Content Collections');
  console.log('📁 Target directory:', path.resolve(gamesDir));
  
  // 处理英文文件（根目录）
  processEnglishFiles();
  
  // 处理所有其他语言
  supportedLanguages.forEach(language => {
    processLanguageDirectory(language);
  });
  
  console.log('\n🎉 Slug uniqueness fix completed!');
  console.log('ℹ️ All slugs now include language identifiers to ensure uniqueness');
  console.log('📝 Format: [game-name]-[language-code] (e.g., ayocs-sprunkr-en, ayocs-sprunkr-zh)');
}

// 运行脚本
main();

export { updateSlugInFile, processLanguageDirectory, processEnglishFiles };