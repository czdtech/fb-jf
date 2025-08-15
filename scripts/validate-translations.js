#!/usr/bin/env node

/**
 * 翻译完整性验证工具
 * 检查所有语言的翻译文件是否包含必需的键值
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 支持的语言
const SUPPORTED_LOCALES = ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko'];

// 翻译文件路径
const TRANSLATIONS_DIR = path.join(__dirname, '../src/content/i18nUI');

// 必需的翻译键
const REQUIRED_KEYS = [
  'navigation.home',
  'navigation.games', 
  'navigation.allGames',
  'navigation.newGames',
  'navigation.popularGames',
  'navigation.trendingGames',
  'navigation.aboutUs',
  'navigation.privacy',
  'navigation.terms',
  'navigation.language',
  'meta.title',
  'meta.description',
  'meta.keywords',
  'common.loading',
  'common.error',
  'common.retry',
  'common.back',
  'common.next',
  'common.previous',
  'common.close',
  'common.menu'
];

/**
 * 获取嵌套对象的值
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * 检查单个翻译文件
 */
function validateTranslationFile(locale) {
  const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
  
  if (!fs.existsSync(filePath)) {
    return {
      locale,
      exists: false,
      missing: REQUIRED_KEYS,
      errors: [`Translation file not found: ${filePath}`]
    };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const translations = JSON.parse(content);
    
    const missing = [];
    const errors = [];

    // 检查必需的键
    for (const key of REQUIRED_KEYS) {
      const value = getNestedValue(translations, key);
      if (value === undefined || value === null || value === '') {
        missing.push(key);
      }
    }

    return {
      locale,
      exists: true,
      missing,
      errors,
      totalKeys: REQUIRED_KEYS.length,
      foundKeys: REQUIRED_KEYS.length - missing.length
    };
  } catch (error) {
    return {
      locale,
      exists: true,
      missing: REQUIRED_KEYS,
      errors: [`Failed to parse JSON: ${error.message}`]
    };
  }
}

/**
 * 验证所有翻译文件
 */
function validateAllTranslations() {
  console.log('🔍 验证翻译文件完整性...\n');
  
  const results = [];
  let hasErrors = false;

  for (const locale of SUPPORTED_LOCALES) {
    const result = validateTranslationFile(locale);
    results.push(result);
    
    // 输出结果
    if (result.exists) {
      if (result.missing.length === 0 && result.errors.length === 0) {
        console.log(`✅ ${locale}: 完整 (${result.foundKeys}/${result.totalKeys} 键)`);
      } else {
        hasErrors = true;
        console.log(`❌ ${locale}: 不完整 (${result.foundKeys}/${result.totalKeys} 键)`);
        
        if (result.missing.length > 0) {
          console.log(`   缺失键: ${result.missing.join(', ')}`);
        }
        
        if (result.errors.length > 0) {
          console.log(`   错误: ${result.errors.join(', ')}`);
        }
      }
    } else {
      hasErrors = true;
      console.log(`❌ ${locale}: 文件不存在`);
    }
  }

  console.log('\n📊 验证总结:');
  
  const complete = results.filter(r => r.exists && r.missing.length === 0 && r.errors.length === 0);
  const incomplete = results.filter(r => !r.exists || r.missing.length > 0 || r.errors.length > 0);
  
  console.log(`✅ 完整的翻译: ${complete.length}/${SUPPORTED_LOCALES.length}`);
  console.log(`❌ 不完整的翻译: ${incomplete.length}/${SUPPORTED_LOCALES.length}`);
  
  if (hasErrors) {
    console.log('\n🚨 发现翻译问题，请修复后重新验证。');
    process.exit(1);
  } else {
    console.log('\n🎉 所有翻译文件验证通过！');
    process.exit(0);
  }
}

/**
 * 生成缺失的翻译文件模板
 */
function generateMissingTranslations() {
  console.log('🔧 生成缺失的翻译文件模板...\n');
  
  // 读取英文模板
  const enPath = path.join(TRANSLATIONS_DIR, 'en.json');
  if (!fs.existsSync(enPath)) {
    console.error('❌ 英文翻译文件不存在，无法生成模板');
    process.exit(1);
  }

  const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  
  for (const locale of SUPPORTED_LOCALES) {
    if (locale === 'en') continue;
    
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    
    if (!fs.existsSync(filePath)) {
      // 创建基于英文的模板
      const template = {
        ...enContent,
        meta: {
          ...enContent.meta,
          title: `FiddleBops - [${locale.toUpperCase()} Translation Needed]`,
          description: `[${locale.toUpperCase()} Translation Needed] ${enContent.meta.description}`,
        }
      };
      
      fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf8');
      console.log(`✅ 创建模板文件: ${locale}.json`);
    }
  }
  
  console.log('\n🎉 模板生成完成！请翻译标记为 [LOCALE Translation Needed] 的内容。');
}

// 命令行参数处理
const args = process.argv.slice(2);

if (args.includes('--generate') || args.includes('-g')) {
  generateMissingTranslations();
} else {
  validateAllTranslations();
}