import type { CollectionEntry } from 'astro:content';
import type { SupportedLocale } from '@/i18n/utils';

// 定义内容类型
export interface LocalizedContent {
  ui?: any;
  games?: CollectionEntry<'games'>[];
  staticData?: any;
  meta?: {
    locale: string;
    fallbackUsed?: boolean;
    source: 'collection' | 'static' | 'fallback';
  };
}

// 内容验证结果
export interface ValidationResult {
  isValid: boolean;
  missingKeys: string[];
  warnings: string[];
  suggestions: string[];
}

// 内容缓存项
export interface CachedContent {
  data: any;
  timestamp: number;
  ttl: number;
}

// 统一内容管理器接口
export interface IContentManager {
  // 获取本地化内容
  getLocalizedContent(locale: SupportedLocale, contentType: string): Promise<LocalizedContent>;
  
  // 获取回退内容
  getFallbackContent(contentType: string): Promise<any>;
  
  // 验证内容完整性
  validateContentCompleteness(locale: SupportedLocale): Promise<ValidationResult>;
  
  // 获取缓存内容
  getCachedContent(key: string): CachedContent | null;
  
  // 设置缓存内容
  setCachedContent(key: string, content: any, ttl?: number): void;
  
  // 预加载内容
  preloadContent(locale: SupportedLocale, keys: string[]): Promise<void>;
  
  // 清理缓存
  clearCache(pattern?: string): void;
}

// 内容适配器接口
export interface IContentAdapter<T = any> {
  // 适配器名称
  readonly name: string;
  
  // 支持的内容类型
  readonly supportedTypes: string[];
  
  // 加载内容
  load(locale: SupportedLocale, type: string): Promise<T>;
  
  // 验证内容结构
  validate(content: T): ValidationResult;
  
  // 标准化内容格式
  normalize(content: T): T;
}

// 回退策略接口
export interface IFallbackStrategy {
  // 获取回退链
  getFallbackChain(locale: SupportedLocale): SupportedLocale[];
  
  // 解析内容
  resolve(locale: SupportedLocale, key: string): Promise<any>;
  
  // 检查内容是否存在
  exists(locale: SupportedLocale, key: string): Promise<boolean>;
}

// 内容管理器实现
export class ContentManager implements IContentManager {
  private cache = new Map<string, CachedContent>();
  private adapters = new Map<string, IContentAdapter>();
  private fallbackStrategy: IFallbackStrategy;
  
  constructor(fallbackStrategy: IFallbackStrategy) {
    this.fallbackStrategy = fallbackStrategy;
  }
  
  // 注册内容适配器
  registerAdapter(adapter: IContentAdapter): void {
    adapter.supportedTypes.forEach(type => {
      this.adapters.set(type, adapter);
    });
  }
  
  // 获取内容适配器
  private getAdapter(contentType: string): IContentAdapter | null {
    return this.adapters.get(contentType) || null;
  }
  
  // 生成缓存键
  private getCacheKey(locale: SupportedLocale, contentType: string): string {
    return `${locale}:${contentType}`;
  }
  
  async getLocalizedContent(locale: SupportedLocale, contentType: string): Promise<LocalizedContent> {
    const cacheKey = this.getCacheKey(locale, contentType);
    
    // 检查缓存
    const cached = this.getCachedContent(cacheKey);
    if (cached && Date.now() < cached.timestamp + cached.ttl) {
      return cached.data;
    }
    
    const adapter = this.getAdapter(contentType);
    if (!adapter) {
      throw new Error(`No adapter found for content type: ${contentType}`);
    }
    
    try {
      // 尝试加载指定语言的内容
      const content = await adapter.load(locale, contentType);
      const normalizedContent = adapter.normalize(content);
      
      const result: LocalizedContent = {
        [contentType]: normalizedContent,
        meta: {
          locale,
          fallbackUsed: false,
          source: 'collection'
        }
      };
      
      // 缓存结果
      this.setCachedContent(cacheKey, result);
      
      return result;
    } catch (error) {
      // 使用回退策略
      return this.getFallbackContentWithStrategy(locale, contentType);
    }
  }
  
  private async getFallbackContentWithStrategy(locale: SupportedLocale, contentType: string): Promise<LocalizedContent> {
    const fallbackChain = this.fallbackStrategy.getFallbackChain(locale);
    
    for (const fallbackLocale of fallbackChain) {
      try {
        const adapter = this.getAdapter(contentType);
        if (adapter) {
          const content = await adapter.load(fallbackLocale, contentType);
          const normalizedContent = adapter.normalize(content);
          
          return {
            [contentType]: normalizedContent,
            meta: {
              locale: fallbackLocale,
              fallbackUsed: true,
              source: fallbackLocale === 'en' ? 'fallback' : 'collection'
            }
          };
        }
      } catch (error) {
        continue; // 尝试下一个回退语言
      }
    }
    
    throw new Error(`Failed to load content for type "${contentType}" with any fallback strategy`);
  }
  
  async getFallbackContent(contentType: string): Promise<any> {
    const adapter = this.getAdapter(contentType);
    if (!adapter) {
      throw new Error(`No adapter found for content type: ${contentType}`);
    }
    
    return adapter.load('en', contentType);
  }
  
  async validateContentCompleteness(locale: SupportedLocale): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      missingKeys: [],
      warnings: [],
      suggestions: []
    };
    
    // 验证每种内容类型
    for (const [contentType, adapter] of this.adapters) {
      try {
        const content = await adapter.load(locale, contentType);
        const validation = adapter.validate(content);
        
        if (!validation.isValid) {
          result.isValid = false;
          result.missingKeys.push(...validation.missingKeys);
          result.warnings.push(...validation.warnings);
        }
      } catch (error) {
        result.isValid = false;
        result.missingKeys.push(`${contentType}:*`);
        result.warnings.push(`Failed to load ${contentType} for locale ${locale}: ${error}`);
        result.suggestions.push(`Create content file for ${contentType} in locale ${locale}`);
      }
    }
    
    return result;
  }
  
  getCachedContent(key: string): CachedContent | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    // 检查是否过期
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached;
  }
  
  setCachedContent(key: string, content: any, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data: content,
      timestamp: Date.now(),
      ttl
    });
  }
  
  async preloadContent(locale: SupportedLocale, keys: string[]): Promise<void> {
    const promises = keys.map(async (key) => {
      try {
        await this.getLocalizedContent(locale, key);
      } catch (error) {
        console.warn(`Failed to preload ${key} for ${locale}:`, error);
      }
    });
    
    await Promise.all(promises);
  }
  
  clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  
  // 获取缓存统计
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    for (const cached of this.cache.values()) {
      if (now > cached.timestamp + cached.ttl) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }
    
    return {
      total: this.cache.size,
      valid: validEntries,
      expired: expiredEntries,
      hitRate: this.cache.size > 0 ? (validEntries / this.cache.size) * 100 : 0
    };
  }
}

// 单例内容管理器实例
let contentManagerInstance: ContentManager | null = null;

export function getContentManager(): ContentManager {
  if (!contentManagerInstance) {
    throw new Error('ContentManager not initialized. Call initContentManager() first.');
  }
  return contentManagerInstance;
}

export function initContentManager(fallbackStrategy: IFallbackStrategy): ContentManager {
  if (contentManagerInstance) {
    return contentManagerInstance;
  }
  
  contentManagerInstance = new ContentManager(fallbackStrategy);
  return contentManagerInstance;
}