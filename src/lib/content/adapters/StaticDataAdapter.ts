import type { SupportedLocale } from '@/i18n/utils';
import type { IContentAdapter, ValidationResult } from '../ContentManager';
import extractedData from '@/data/extracted-data.json';

// 静态数据适配器
export class StaticDataAdapter implements IContentAdapter {
  readonly name = 'StaticDataAdapter';
  readonly supportedTypes = ['static', 'staticData', 'extracted'];

  async load(locale: SupportedLocale, type: string): Promise<any> {
    try {
      // 当前从extracted-data.json加载，未来将从Content Collections加载
      const data = extractedData;
      
      // 根据locale处理数据
      return this.localizeStaticData(data, locale);
    } catch (error) {
      throw new Error(`Failed to load static data for ${locale}: ${error}`);
    }
  }

  validate(content: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      missingKeys: [],
      warnings: [],
      suggestions: []
    };

    // 验证静态数据的必需部分
    const requiredSections = [
      'navigation',
      'homepage',
      'seoTemplates'
    ];

    for (const section of requiredSections) {
      if (!content[section]) {
        result.isValid = false;
        result.missingKeys.push(section);
      }
    }

    // 验证导航数据
    if (content.navigation) {
      if (!content.navigation.main || !Array.isArray(content.navigation.main)) {
        result.warnings.push('Missing or invalid navigation.main array');
      }
      
      if (!content.navigation.languages || !Array.isArray(content.navigation.languages)) {
        result.warnings.push('Missing or invalid navigation.languages array');
      }
    }

    // 验证首页数据
    if (content.homepage) {
      const homeRequiredSections = ['meta', 'hero', 'soundSamples'];
      
      for (const section of homeRequiredSections) {
        if (!content.homepage[section]) {
          result.warnings.push(`Missing homepage.${section}`);
        }
      }

      // 验证soundSamples数组
      if (content.homepage.soundSamples) {
        if (!Array.isArray(content.homepage.soundSamples)) {
          result.warnings.push('homepage.soundSamples should be an array');
        } else if (content.homepage.soundSamples.length === 0) {
          result.warnings.push('homepage.soundSamples is empty');
        }
      }

      // 验证videos数组
      if (content.homepage.videos && !Array.isArray(content.homepage.videos)) {
        result.warnings.push('homepage.videos should be an array');
      }
    }

    if (!result.isValid) {
      result.suggestions.push('Ensure all required static data sections are present');
    }

    return result;
  }

  normalize(content: any): any {
    // 标准化静态数据
    const normalized = { ...content };

    // 标准化导航数据
    if (normalized.navigation) {
      normalized.navigation = this.normalizeNavigation(normalized.navigation);
    }

    // 标准化首页数据
    if (normalized.homepage) {
      normalized.homepage = this.normalizeHomepage(normalized.homepage);
    }

    return normalized;
  }

  private localizeStaticData(data: any, locale: SupportedLocale): any {
    // 目前返回原始数据，未来可以根据locale返回不同的静态数据
    // 这里可以实现特定语言的数据覆盖逻辑
    
    const localized = { ...data };
    
    // 可以根据locale调整某些静态内容
    if (locale !== 'en') {
      // 示例：调整语言选择器中的当前语言位置
      if (localized.navigation?.languages) {
        const languages = [...localized.navigation.languages];
        const currentLangIndex = languages.findIndex(lang => lang.code === locale);
        
        if (currentLangIndex > -1) {
          // 将当前语言移到前面（可选的UX优化）
          const currentLang = languages.splice(currentLangIndex, 1)[0];
          languages.unshift(currentLang);
          localized.navigation.languages = languages;
        }
      }
    }
    
    return localized;
  }

  private normalizeNavigation(navigation: any): any {
    const normalized = { ...navigation };

    // 标准化主导航
    if (normalized.main && Array.isArray(normalized.main)) {
      normalized.main = normalized.main.map((item: any) => ({
        ...item,
        label: item.label?.trim(),
        url: this.normalizeUrl(item.url)
      }));
    }

    // 标准化语言导航
    if (normalized.languages && Array.isArray(normalized.languages)) {
      normalized.languages = normalized.languages.map((item: any) => ({
        ...item,
        label: item.label?.trim(),
        url: this.normalizeUrl(item.url),
        code: item.code?.trim().toLowerCase()
      }));
    }

    return normalized;
  }

  private normalizeHomepage(homepage: any): any {
    const normalized = { ...homepage };

    // 标准化元数据
    if (normalized.meta) {
      normalized.meta = {
        ...normalized.meta,
        title: normalized.meta.title?.trim(),
        description: normalized.meta.description?.trim(),
        keywords: normalized.meta.keywords?.trim()
      };
    }

    // 标准化hero部分
    if (normalized.hero) {
      normalized.hero = {
        ...normalized.hero,
        title: normalized.hero.title?.trim(),
        description: normalized.hero.description?.trim()
      };
    }

    // 标准化音效样本数据
    if (normalized.soundSamples && Array.isArray(normalized.soundSamples)) {
      normalized.soundSamples = normalized.soundSamples.map((sample: any) => ({
        ...sample,
        title: sample.title?.trim(),
        image: this.normalizeUrl(sample.image),
        audio: this.normalizeUrl(sample.audio),
        category: sample.category?.trim()
      }));
    }

    // 标准化视频数据
    if (normalized.videos && Array.isArray(normalized.videos)) {
      normalized.videos = normalized.videos.map((video: any) => ({
        ...video,
        name: video.name?.trim(),
        description: video.description?.trim(),
        publisher: video.publisher?.trim(),
        thumbnailUrl: this.normalizeUrl(video.thumbnailUrl),
        embedUrl: this.normalizeUrl(video.embedUrl),
        contentUrl: this.normalizeUrl(video.contentUrl)
      }));
    }

    return normalized;
  }

  private normalizeUrl(url?: string): string {
    if (!url) return '';
    
    const trimmed = url.trim();
    
    // 如果是相对路径，确保以/开头
    if (!trimmed.startsWith('http') && !trimmed.startsWith('/') && !trimmed.startsWith('.')) {
      return `/${trimmed}`;
    }
    
    return trimmed;
  }

  // 辅助方法：获取特定类型的静态数据
  async getNavigationData(locale: SupportedLocale): Promise<any> {
    const data = await this.load(locale, 'static');
    return data.navigation;
  }

  async getHomepageData(locale: SupportedLocale): Promise<any> {
    const data = await this.load(locale, 'static');
    return data.homepage;
  }

  async getSEOTemplates(): Promise<any> {
    const data = await this.load('en', 'static'); // SEO模板不需要本地化
    return data.seoTemplates;
  }
}