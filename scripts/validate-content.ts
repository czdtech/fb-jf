#!/usr/bin/env tsx

/**
 * Content Validation Script
 * 构建时验证所有语言内容完整性
 */

import { getCollection } from 'astro:content';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/i18n/utils';
import * as fs from 'fs';
import * as path from 'path';

// 验证结果接口
interface ValidationResult {
  locale: SupportedLocale;
  contentType: string;
  isValid: boolean;
  missingKeys: string[];
  invalidValues: string[];
  warnings: string[];
  suggestions: string[];
  coverage: number; // 0-100 百分比
}

// 汇总报告接口
interface ValidationReport {
  timestamp: Date;
  isValid: boolean;
  totalLocales: number;
  validLocales: number;
  results: ValidationResult[];
  summary: {
    averageCoverage: number;
    criticalErrors: number;
    warningCount: number;
    suggestionCount: number;
  };
}

class ContentValidator {
  private reportDir = 'reports';
  private baselinePath = 'reports/content-baseline.json';
  
  // 关键内容键 - 这些键缺失会导致严重问题
  private criticalUIKeys = [
    'navigation.home',
    'navigation.games', 
    'meta.title',
    'meta.description',
    'hero.title',
    'sections.howToPlay',
    'games.playNow',
    'common.loading',
    'common.error'
  ];

  private criticalGameFields = [
    'title',
    'description', 
    'image',
    'iframe',
    'meta.title',
    'meta.description'
  ];

  private criticalStaticSections = [
    'navigation.main',
    'navigation.languages',
    'homepage.meta',
    'homepage.hero',
    'homepage.soundSamples'
  ];

  async validateAllContent(): Promise<ValidationReport> {
    console.log('🔍 Starting comprehensive content validation...');
    
    const results: ValidationResult[] = [];
    
    // 验证每种语言的内容
    for (const locale of SUPPORTED_LOCALES) {
      console.log(`📋 Validating ${locale}...`);
      
      // 验证UI翻译
      const uiResult = await this.validateUIContent(locale);
      results.push(uiResult);
      
      // 验证游戏内容
      const gameResult = await this.validateGameContent(locale);
      results.push(gameResult);
      
      // 验证静态数据
      const staticResult = await this.validateStaticContent(locale);
      results.push(staticResult);
    }
    
    // 生成汇总报告
    const report = this.generateReport(results);
    
    // 保存报告
    await this.saveReport(report);
    
    // 输出结果
    this.logReport(report);
    
    return report;
  }

  private async validateUIContent(locale: SupportedLocale): Promise<ValidationResult> {
    const result: ValidationResult = {
      locale,
      contentType: 'ui',
      isValid: true,
      missingKeys: [],
      invalidValues: [],
      warnings: [],
      suggestions: [],
      coverage: 0
    };

    try {
      const ui = await getCollection('i18nUI');
      const uiEntry = ui.find(entry => entry.id === locale);
      
      if (!uiEntry) {
        result.isValid = false;
        result.missingKeys.push('*'); // 整个文件缺失
        result.coverage = 0;
        result.suggestions.push(`Create UI translation file: src/content/i18nUI/${locale}.json`);
        return result;
      }

      const uiData = uiEntry.data;
      let validKeys = 0;
      let totalKeys = this.criticalUIKeys.length;

      // 检查关键UI键
      for (const keyPath of this.criticalUIKeys) {
        const value = this.getNestedValue(uiData, keyPath);
        
        if (value === undefined || value === null) {
          result.missingKeys.push(keyPath);
          result.isValid = false;
        } else if (typeof value === 'string' && value.trim() === '') {
          result.invalidValues.push(`${keyPath}: empty string`);
          result.warnings.push(`Empty value for key: ${keyPath}`);
        } else {
          validKeys++;
        }
      }

      // 检查可选但推荐的键
      const optionalKeys = [
        'about.description',
        'faq.title',
        'soundSamples.title',
        'videos.title'
      ];

      for (const keyPath of optionalKeys) {
        totalKeys++;
        const value = this.getNestedValue(uiData, keyPath);
        if (value !== undefined && value !== null) {
          validKeys++;
        } else {
          result.warnings.push(`Optional key missing: ${keyPath}`);
        }
      }

      result.coverage = (validKeys / totalKeys) * 100;

      // 添加建议
      if (result.coverage < 90) {
        result.suggestions.push('Consider adding missing UI translations to improve user experience');
      }

      if (result.missingKeys.length > 0) {
        result.suggestions.push('Add missing critical UI keys to prevent runtime errors');
      }

    } catch (error) {
      result.isValid = false;
      result.warnings.push(`Failed to load UI content: ${error}`);
      result.suggestions.push('Check UI content file syntax and structure');
    }

    return result;
  }

  private async validateGameContent(locale: SupportedLocale): Promise<ValidationResult> {
    const result: ValidationResult = {
      locale,
      contentType: 'games',
      isValid: true,
      missingKeys: [],
      invalidValues: [],
      warnings: [],
      suggestions: [],
      coverage: 0
    };

    try {
      const allGames = await getCollection('games');
      let localizedGames;

      if (locale === 'en') {
        localizedGames = allGames.filter(game => !game.id.includes('/'));
      } else {
        localizedGames = allGames.filter(game => game.id.startsWith(`${locale}/`));
      }

      if (localizedGames.length === 0) {
        result.warnings.push('No games found for this locale');
        result.coverage = 0;
        result.suggestions.push(`Create game content files in src/content/games/${locale}/`);
        return result;
      }

      let validFields = 0;
      let totalFields = localizedGames.length * this.criticalGameFields.length;

      for (const [gameIndex, game] of localizedGames.entries()) {
        const gameData = game.data;
        const gameId = game.id;

        for (const field of this.criticalGameFields) {
          const value = this.getNestedValue(gameData, field);
          
          if (value === undefined || value === null) {
            result.missingKeys.push(`${gameId}.${field}`);
            result.isValid = false;
          } else if (typeof value === 'string' && value.trim() === '') {
            result.invalidValues.push(`${gameId}.${field}: empty string`);
            result.warnings.push(`Empty value in game ${gameId}: ${field}`);
          } else {
            validFields++;
          }
        }

        // 验证URL格式
        if (gameData.iframe && !this.isValidUrl(gameData.iframe)) {
          result.invalidValues.push(`${gameId}.iframe: invalid URL format`);
          result.warnings.push(`Invalid iframe URL in ${gameId}`);
        }

        if (gameData.image && !this.isValidImagePath(gameData.image)) {
          result.warnings.push(`Potentially invalid image path in ${gameId}: ${gameData.image}`);
        }
      }

      result.coverage = totalFields > 0 ? (validFields / totalFields) * 100 : 100;

      // 添加建议
      if (result.coverage < 95) {
        result.suggestions.push('Ensure all games have complete metadata for better SEO and UX');
      }

    } catch (error) {
      result.isValid = false;
      result.warnings.push(`Failed to load games content: ${error}`);
      result.suggestions.push('Check game content files syntax and structure');
    }

    return result;
  }

  private async validateStaticContent(locale: SupportedLocale): Promise<ValidationResult> {
    const result: ValidationResult = {
      locale,
      contentType: 'static',
      isValid: true,
      missingKeys: [],
      invalidValues: [],
      warnings: [],
      suggestions: [],
      coverage: 0
    };

    try {
      const staticData = await getCollection('staticData');
      const staticEntry = staticData.find(entry => entry.id === locale);
      
      if (!staticEntry) {
        result.isValid = false;
        result.missingKeys.push('*'); // 整个文件缺失
        result.coverage = 0;
        result.suggestions.push(`Create static data file: src/content/staticData/${locale}.json`);
        return result;
      }

      const data = staticEntry.data;
      let validSections = 0;
      let totalSections = this.criticalStaticSections.length;

      // 检查关键静态数据部分
      for (const sectionPath of this.criticalStaticSections) {
        const value = this.getNestedValue(data, sectionPath);
        
        if (value === undefined || value === null) {
          result.missingKeys.push(sectionPath);
          result.isValid = false;
        } else if (Array.isArray(value) && value.length === 0) {
          result.warnings.push(`Empty array for: ${sectionPath}`);
        } else {
          validSections++;
        }
      }

      result.coverage = (validSections / totalSections) * 100;

      // 验证导航数据结构
      if (data.navigation?.main && Array.isArray(data.navigation.main)) {
        for (const [index, navItem] of data.navigation.main.entries()) {
          if (!navItem.label || !navItem.url) {
            result.invalidValues.push(`navigation.main[${index}]: missing label or url`);
            result.warnings.push(`Invalid navigation item at index ${index}`);
          }
        }
      }

      // 验证语言导航
      if (data.navigation?.languages && Array.isArray(data.navigation.languages)) {
        for (const [index, langItem] of data.navigation.languages.entries()) {
          if (!langItem.code || !langItem.label || !langItem.url) {
            result.invalidValues.push(`navigation.languages[${index}]: missing required fields`);
            result.warnings.push(`Invalid language item at index ${index}`);
          }
        }
      }

      // 验证音效样本数据
      if (data.homepage?.soundSamples && Array.isArray(data.homepage.soundSamples)) {
        for (const [index, sample] of data.homepage.soundSamples.entries()) {
          if (!sample.title || !sample.audio || !sample.category) {
            result.invalidValues.push(`homepage.soundSamples[${index}]: missing required fields`);
            result.warnings.push(`Incomplete sound sample at index ${index}`);
          }
        }
      }

    } catch (error) {
      result.isValid = false;
      result.warnings.push(`Failed to load static content: ${error}`);
      result.suggestions.push('Check static content file syntax and structure');
    }

    return result;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      // 检查相对路径
      return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
    }
  }

  private isValidImagePath(imagePath: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    return imageExtensions.some(ext => imagePath.toLowerCase().endsWith(ext));
  }

  private generateReport(results: ValidationResult[]): ValidationReport {
    const validResults = results.filter(r => r.isValid);
    const totalCoverage = results.reduce((sum, r) => sum + r.coverage, 0);
    const criticalErrors = results.filter(r => !r.isValid).length;
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    const totalSuggestions = results.reduce((sum, r) => sum + r.suggestions.length, 0);

    return {
      timestamp: new Date(),
      isValid: criticalErrors === 0,
      totalLocales: SUPPORTED_LOCALES.length,
      validLocales: validResults.length / 3, // 每个locale有3种内容类型
      results,
      summary: {
        averageCoverage: results.length > 0 ? totalCoverage / results.length : 0,
        criticalErrors,
        warningCount: totalWarnings,
        suggestionCount: totalSuggestions
      }
    };
  }

  private async saveReport(report: ValidationReport): Promise<void> {
    // 确保报告目录存在
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }

    // 保存详细报告
    const reportPath = path.join(this.reportDir, `content-validation-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    // 保存最新报告的链接
    const latestPath = path.join(this.reportDir, 'latest-validation.json');
    fs.writeFileSync(latestPath, JSON.stringify(report, null, 2), 'utf-8');

    // 生成人类可读的报告
    const readableReport = this.generateReadableReport(report);
    const readablePath = path.join(this.reportDir, 'content-validation-report.md');
    fs.writeFileSync(readablePath, readableReport, 'utf-8');

    console.log(`📄 Reports saved:`);
    console.log(`   - JSON: ${reportPath}`);
    console.log(`   - Markdown: ${readablePath}`);
  }

  private generateReadableReport(report: ValidationReport): string {
    const lines: string[] = [];
    
    lines.push(`# Content Validation Report`);
    lines.push(`Generated: ${report.timestamp.toISOString()}`);
    lines.push(``);
    
    lines.push(`## Summary`);
    lines.push(`- **Status**: ${report.isValid ? '✅ PASS' : '❌ FAIL'}`);
    lines.push(`- **Total Locales**: ${report.totalLocales}`);
    lines.push(`- **Average Coverage**: ${report.summary.averageCoverage.toFixed(1)}%`);
    lines.push(`- **Critical Errors**: ${report.summary.criticalErrors}`);
    lines.push(`- **Warnings**: ${report.summary.warningCount}`);
    lines.push(`- **Suggestions**: ${report.summary.suggestionCount}`);
    lines.push(``);

    // 按语言分组结果
    const resultsByLocale = new Map<SupportedLocale, ValidationResult[]>();
    for (const result of report.results) {
      if (!resultsByLocale.has(result.locale)) {
        resultsByLocale.set(result.locale, []);
      }
      resultsByLocale.get(result.locale)!.push(result);
    }

    lines.push(`## Results by Language`);
    lines.push(``);

    for (const [locale, localeResults] of resultsByLocale) {
      const localeValid = localeResults.every(r => r.isValid);
      const avgCoverage = localeResults.reduce((sum, r) => sum + r.coverage, 0) / localeResults.length;
      
      lines.push(`### ${locale.toUpperCase()} ${localeValid ? '✅' : '❌'}`);
      lines.push(`**Coverage**: ${avgCoverage.toFixed(1)}%`);
      lines.push(``);

      for (const result of localeResults) {
        lines.push(`#### ${result.contentType}`);
        lines.push(`- Status: ${result.isValid ? '✅ Valid' : '❌ Invalid'}`);
        lines.push(`- Coverage: ${result.coverage.toFixed(1)}%`);
        
        if (result.missingKeys.length > 0) {
          lines.push(`- Missing Keys: ${result.missingKeys.join(', ')}`);
        }
        
        if (result.warnings.length > 0) {
          lines.push(`- Warnings:`);
          for (const warning of result.warnings) {
            lines.push(`  - ${warning}`);
          }
        }
        
        if (result.suggestions.length > 0) {
          lines.push(`- Suggestions:`);
          for (const suggestion of result.suggestions) {
            lines.push(`  - ${suggestion}`);
          }
        }
        
        lines.push(``);
      }
    }

    return lines.join('\n');
  }

  private logReport(report: ValidationReport): void {
    console.log('\n📊 Validation Results:');
    console.log(`   Status: ${report.isValid ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Average Coverage: ${report.summary.averageCoverage.toFixed(1)}%`);
    console.log(`   Critical Errors: ${report.summary.criticalErrors}`);
    console.log(`   Warnings: ${report.summary.warningCount}`);
    
    if (!report.isValid) {
      console.log('\n❌ Critical Issues Found:');
      
      const failedResults = report.results.filter(r => !r.isValid);
      for (const result of failedResults) {
        console.log(`   ${result.locale}/${result.contentType}: ${result.missingKeys.length} missing keys`);
      }
    }
    
    console.log('\n📄 Detailed reports saved to ./reports/');
  }
}

// CLI工具函数
export async function validateContent(): Promise<boolean> {
  const validator = new ContentValidator();
  
  try {
    const report = await validator.validateAllContent();
    
    // 在CI环境中，如果验证失败则退出
    if (process.env.CI === 'true' && !report.isValid) {
      console.error('💥 Content validation failed in CI environment');
      process.exit(1);
    }
    
    return report.isValid;
  } catch (error) {
    console.error('❌ Content validation error:', error);
    
    if (process.env.CI === 'true') {
      process.exit(1);
    }
    
    return false;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  validateContent().then(isValid => {
    process.exit(isValid ? 0 : 1);
  });
}

export { ContentValidator };