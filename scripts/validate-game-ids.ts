/**
 * 游戏ID格式验证脚本
 * 确保所有游戏文件的ID格式符合规范
 * 英文游戏: {game-name}
 * 多语言游戏: {lang}-{game-name}
 */

import { getCollection } from 'astro:content';
import { validateGameIdFormat, SUPPORTED_LANGUAGES } from '../src/utils/content';

interface ValidationResult {
  valid: number;
  invalid: number;
  errors: Array<{
    file: string;
    id: string;
    error: string;
  }>;
  summary: Record<string, number>;
}

async function validateAllGameIds(): Promise<ValidationResult> {
  console.log('🔍 开始验证游戏ID格式...\n');
  
  const result: ValidationResult = {
    valid: 0,
    invalid: 0,
    errors: [],
    summary: { en: 0 }
  };
  
  // 初始化语言统计
  SUPPORTED_LANGUAGES.forEach(lang => {
    result.summary[lang] = 0;
  });

  try {
    const allGames = await getCollection('games');
    
    for (const game of allGames) {
      const validation = validateGameIdFormat(game.id);
      
      if (validation.isValid) {
        result.valid++;
        result.summary[validation.language]++;
        console.log(`✅ ${game.id} -> ${validation.language}:${validation.baseName}`);
      } else {
        result.invalid++;
        result.errors.push({
          file: game.id,
          id: game.id.replace(/\.md$/, ''),
          error: validation.error || 'Unknown error'
        });
        console.log(`❌ ${game.id} -> ERROR: ${validation.error}`);
      }
    }
    
  } catch (error) {
    console.error('获取游戏数据失败:', error);
    throw error;
  }

  return result;
}

async function generateValidationReport(): Promise<void> {
  try {
    const result = await validateAllGameIds();
    
    console.log('\n📊 验证结果统计:');
    console.log('='.repeat(50));
    console.log(`总文件数: ${result.valid + result.invalid}`);
    console.log(`有效文件: ${result.valid} ✅`);
    console.log(`无效文件: ${result.invalid} ❌`);
    console.log(`验证成功率: ${((result.valid / (result.valid + result.invalid)) * 100).toFixed(1)}%`);
    
    console.log('\n🌐 语言分布:');
    console.log('-'.repeat(30));
    Object.entries(result.summary).forEach(([lang, count]) => {
      if (count > 0) {
        console.log(`${lang.toUpperCase().padEnd(6)}: ${count.toString().padStart(3)} 个文件`);
      }
    });
    
    if (result.errors.length > 0) {
      console.log('\n🔴 错误详情:');
      console.log('-'.repeat(40));
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. 文件: ${error.file}`);
        console.log(`   ID: ${error.id}`);
        console.log(`   错误: ${error.error}\n`);
      });
      
      console.log('💡 修复建议:');
      console.log('- 英文游戏ID应使用格式: {game-name}');
      console.log('- 多语言游戏ID应使用格式: {lang}-{game-name}');
      console.log('- 支持的语言代码:', SUPPORTED_LANGUAGES.join(', '));
      console.log('- 只能包含小写字母、数字和连字符');
    } else {
      console.log('\n🎉 所有游戏ID格式都正确！');
    }
    
    // 检查是否有多语言游戏
    const hasMultilingualGames = SUPPORTED_LANGUAGES.some(lang => result.summary[lang] > 0);
    if (!hasMultilingualGames) {
      console.log('\n⚠️  注意: 未发现任何多语言游戏文件');
      console.log('   如果需要多语言支持，请创建格式为 {lang}-{game-name}.md 的文件');
    }
    
  } catch (error) {
    console.error('验证过程失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  generateValidationReport();
}

export { validateAllGameIds, generateValidationReport };