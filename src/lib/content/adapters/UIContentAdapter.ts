import { getCollection } from 'astro:content';
import type { SupportedLocale } from '@/i18n/utils';
import type { IContentAdapter, ValidationResult } from '../ContentManager';

// UI 内容适配器
export class UIContentAdapter implements IContentAdapter {
  readonly name = 'UIContentAdapter';
  readonly supportedTypes = ['ui', 'i18nUI'];

  async load(locale: SupportedLocale, type: string): Promise<any> {
    try {
      const ui = await getCollection('i18nUI');
      const uiEntry = ui.find(entry => entry.id === locale);
      
      if (!uiEntry) {
        throw new Error(`No UI translations found for locale: ${locale}`);
      }
      
      return uiEntry.data;
    } catch (error) {
      throw new Error(`Failed to load UI content for ${locale}: ${error}`);
    }
  }

  validate(content: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      missingKeys: [],
      warnings: [],
      suggestions: []
    };

    // 必需的顶级键
    const requiredKeys = [
      'navigation',
      'meta', 
      'hero',
      'sections',
      'games',
      'common',
      'footer'
    ];

    for (const key of requiredKeys) {
      if (!content[key]) {
        result.isValid = false;
        result.missingKeys.push(key);
      }
    }

    // 验证导航结构
    if (content.navigation) {
      const navKeys = ['home', 'games', 'aboutUs'];
      for (const key of navKeys) {
        if (!content.navigation[key]) {
          result.warnings.push(`Missing navigation.${key}`);
        }
      }
    }

    // 验证元数据
    if (content.meta) {
      const metaKeys = ['title', 'description', 'keywords'];
      for (const key of metaKeys) {
        if (!content.meta[key]) {
          result.warnings.push(`Missing meta.${key}`);
        }
      }
    }

    if (!result.isValid) {
      result.suggestions.push('Ensure all required UI translation keys are present');
    }

    return result;
  }

  normalize(content: any): any {
    // 确保所有字符串都被正确处理
    return this.normalizeStrings(content);
  }

  private normalizeStrings(obj: any): any {
    if (typeof obj === 'string') {
      return obj.trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.normalizeStrings(item));
    }
    
    if (obj && typeof obj === 'object') {
      const normalized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        normalized[key] = this.normalizeStrings(value);
      }
      return normalized;
    }
    
    return obj;
  }
}