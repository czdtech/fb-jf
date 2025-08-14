#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 标准化多语言Content Collections的slug格式
 * 统一为 {lang}-{game-name} 格式
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
    const newSlug = `${language}-${gameSlug}`; // 格式: zh-ayocs-sprunkr
    
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
    // 英文版保持原格式，不加前缀
    
    console.log(`ℹ️ English file kept as-is: ${gameSlug}`);
    successCount++;
  });
  
  console.log(`✅ English: ${successCount}/${files.length} files processed`);
}

function main() {
  console.log('🚀 Starting slug standardization for Content Collections');
  console.log('📁 Target directory:', path.resolve(gamesDir));
  console.log('📝 Target format: {lang}-{game-name} (e.g., zh-ayocs-sprunkr, de-sprunki-craft)');
  
  // 处理英文文件（根目录）
  processEnglishFiles();
  
  // 处理所有其他语言
  supportedLanguages.forEach(language => {
    processLanguageDirectory(language);
  });
  
  console.log('\n🎉 Slug standardization completed!');
  console.log('ℹ️ All non-English slugs now use {lang}-{game-name} format');
}

// 运行脚本
main();

export { updateSlugInFile, processLanguageDirectory, processEnglishFiles };