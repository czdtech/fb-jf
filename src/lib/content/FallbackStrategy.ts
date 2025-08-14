import type { SupportedLocale } from '@/i18n/utils';
import type { IFallbackStrategy } from './ContentManager';
import { getCollection } from 'astro:content';

// 回退配置
export const fallbackConfig: Record<string, SupportedLocale[]> = {
  // 中文变体回退到中文，然后英文
  'zh-TW': ['zh', 'en'],
  'zh-HK': ['zh', 'en'],
  
  // 西班牙语变体回退到西班牙语，然后英文
  'es-MX': ['es', 'en'],
  'es-AR': ['es', 'en'],
  
  // 法语变体回退到法语，然后英文
  'fr-CA': ['fr', 'en'],
  'fr-BE': ['fr', 'en'],
  
  // 德语变体回退到德语，然后英文
  'de-AT': ['de', 'en'],
  'de-CH': ['de', 'en'],
  
  // 葡萄牙语变体回退到西班牙语（相似语言），然后英文
  'pt': ['es', 'en'],
  'pt-BR': ['pt', 'es', 'en'],
  
  // 意大利语回退到西班牙语（相似语言），然后英文
  'it': ['es', 'en'],
  
  // 荷兰语回退到德语（相似语言），然后英文
  'nl': ['de', 'en'],
  
  // 俄语回退到英文
  'ru': ['en'],
  
  // 阿拉伯语回退到英文
  'ar': ['en'],
  
  // 印地语回退到英文
  'hi': ['en'],
  
  // 其他亚洲语言
  'th': ['en'],
  'vi': ['en'],
  'id': ['en'],
  'ms': ['en']
};

// 回退策略实现
export class FallbackStrategy implements IFallbackStrategy {
  private cache = new Map<string, any>();
  private cacheTimeout = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 获取给定语言的回退链
   * @param locale 目标语言
   * @returns 回退语言链，包含目标语言本身
   */
  getFallbackChain(locale: SupportedLocale): SupportedLocale[] {
    // 基本回退链：[目标语言, 语言族, 英文]
    const chain: SupportedLocale[] = [locale];
    
    // 添加配置的回退语言
    if (fallbackConfig[locale]) {
      chain.push(...fallbackConfig[locale]);
    } else if (locale !== 'en') {
      // 如果没有特定配置，默认回退到英文
      chain.push('en');
    }
    
    // 去重并保持顺序
    return [...new Set(chain)] as SupportedLocale[];
  }

  /**
   * 解析内容，使用回退策略
   * @param locale 目标语言
   * @param key 内容键
   * @returns 解析的内容
   */
  async resolve(locale: SupportedLocale, key: string): Promise<any> {
    const cacheKey = `${locale}:${key}`;
    
    // 检查缓存
    const cached = this.getCachedContent(cacheKey);
    if (cached) {
      return cached;
    }
    
    const fallbackChain = this.getFallbackChain(locale);
    const errors: Array<{ locale: SupportedLocale; error: any }> = [];
    
    for (const fallbackLocale of fallbackChain) {
      try {
        const content = await this.loadContent(fallbackLocale, key);
        
        if (content !== null && content !== undefined) {
          // 缓存成功的结果
          this.setCachedContent(cacheKey, {
            data: content,
            resolvedLocale: fallbackLocale,
            fallbackUsed: fallbackLocale !== locale,
            timestamp: Date.now()
          });
          
          return content;
        }
      } catch (error) {
        errors.push({ locale: fallbackLocale, error });
        continue;
      }
    }
    
    // 所有回退都失败了
    const errorMessage = `Failed to resolve content for key "${key}" with any fallback strategy`;
    const errorDetails = {
      requestedLocale: locale,
      attemptedLocales: fallbackChain,
      errors: errors
    };
    
    console.error(errorMessage, errorDetails);
    throw new Error(`${errorMessage}. Attempted locales: ${fallbackChain.join(', ')}`);
  }

  /**
   * 检查内容是否存在
   * @param locale 语言
   * @param key 内容键
   * @returns 是否存在
   */
  async exists(locale: SupportedLocale, key: string): Promise<boolean> {
    try {
      await this.loadContent(locale, key);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 加载特定语言和键的内容
   * @param locale 语言
   * @param key 内容键
   * @returns 内容
   */
  private async loadContent(locale: SupportedLocale, key: string): Promise<any> {
    // 解析内容键，支持点分路径
    const [contentType, ...keyPath] = key.split('.');
    
    switch (contentType) {
      case 'ui':
      case 'i18nUI':
        return this.loadUIContent(locale, keyPath);
        
      case 'games':
        return this.loadGamesContent(locale, keyPath);
        
      case 'static':
      case 'staticData':
        return this.loadStaticContent(locale, keyPath);
        
      default:
        throw new Error(`Unknown content type: ${contentType}`);
    }
  }

  /**
   * 加载UI内容
   */
  private async loadUIContent(locale: SupportedLocale, keyPath: string[]): Promise<any> {
    try {
      const ui = await getCollection('i18nUI');
      const uiEntry = ui.find(entry => entry.id === locale);
      
      if (!uiEntry) {
        throw new Error(`No UI translations found for locale: ${locale}`);
      }
      
      let content = uiEntry.data;
      
      // 如果有键路径，深入获取
      for (const key of keyPath) {
        if (content && typeof content === 'object' && key in content) {
          content = content[key];
        } else {
          throw new Error(`Key path not found: ${keyPath.join('.')}`);
        }
      }
      
      return content;
    } catch (error) {
      throw new Error(`Failed to load UI content for ${locale}: ${error}`);
    }
  }

  /**
   * 加载游戏内容
   */
  private async loadGamesContent(locale: SupportedLocale, keyPath: string[]): Promise<any> {
    try {
      const allGames = await getCollection('games');
      
      // 根据locale过滤游戏
      const localizedGames = allGames.filter(game => {
        if (locale === 'en') {
          return !game.id.includes('/');
        } else {
          return game.id.startsWith(`${locale}/`);
        }
      });
      
      if (keyPath.length === 0) {
        return localizedGames;
      }
      
      // 如果指定了游戏ID或索引
      const [gameIdentifier, ...remainingPath] = keyPath;
      
      let targetGame;
      if (/^\d+$/.test(gameIdentifier)) {
        // 数字索引
        const index = parseInt(gameIdentifier);
        targetGame = localizedGames[index];
      } else {
        // 游戏ID或slug
        targetGame = localizedGames.find(game => 
          game.id.includes(gameIdentifier) || 
          game.data.slug === gameIdentifier
        );
      }
      
      if (!targetGame) {
        throw new Error(`Game not found: ${gameIdentifier}`);
      }
      
      // 继续深入路径
      let content = targetGame;
      for (const key of remainingPath) {
        if (content && typeof content === 'object' && key in content) {
          content = (content as any)[key];
        } else {
          throw new Error(`Key path not found in game: ${remainingPath.join('.')}`);
        }
      }
      
      return content;
    } catch (error) {
      throw new Error(`Failed to load games content for ${locale}: ${error}`);
    }
  }

  /**
   * 加载静态内容
   */
  private async loadStaticContent(locale: SupportedLocale, keyPath: string[]): Promise<any> {
    try {
      const staticData = await getCollection('staticData');
      const staticEntry = staticData.find(entry => entry.id === locale);
      
      if (!staticEntry) {
        throw new Error(`No static data found for locale: ${locale}`);
      }
      
      let content = staticEntry.data;
      
      // 深入键路径
      for (const key of keyPath) {
        if (content && typeof content === 'object' && key in content) {
          content = content[key];
        } else {
          throw new Error(`Key path not found: ${keyPath.join('.')}`);
        }
      }
      
      return content;
    } catch (error) {
      throw new Error(`Failed to load static content for ${locale}: ${error}`);
    }
  }

  /**
   * 获取缓存内容
   */
  private getCachedContent(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * 设置缓存内容
   */
  private setCachedContent(key: string, content: any): void {
    this.cache.set(key, {
      data: content,
      timestamp: Date.now()
    });
  }

  /**
   * 清理过期缓存
   */
  public cleanupCache(): void {
    const now = Date.now();
    
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  public getCacheStats(): { size: number; hitRate: number } {
    const size = this.cache.size;
    const hitRate = size > 0 ? (size / (size + 1)) * 100 : 0; // 简化的命中率计算
    
    return { size, hitRate };
  }

  /**
   * 预热缓存 - 预加载关键内容
   */
  public async warmupCache(locales: SupportedLocale[], criticalKeys: string[]): Promise<void> {
    console.log(`🔥 Warming up cache for ${locales.length} locales with ${criticalKeys.length} keys...`);
    
    const promises: Promise<void>[] = [];
    
    for (const locale of locales) {
      for (const key of criticalKeys) {
        promises.push(
          this.resolve(locale, key)
            .then(() => {
              // 成功预加载
            })
            .catch(error => {
              console.warn(`⚠️ Failed to preload ${key} for ${locale}:`, error.message);
            })
        );
      }
    }
    
    await Promise.allSettled(promises);
    console.log(`✅ Cache warmup completed. Cache size: ${this.cache.size}`);
  }
}

// 创建单例实例
let fallbackStrategyInstance: FallbackStrategy | null = null;

export function getFallbackStrategy(): FallbackStrategy {
  if (!fallbackStrategyInstance) {
    fallbackStrategyInstance = new FallbackStrategy();
  }
  return fallbackStrategyInstance;
}

// 导出常用的回退检查工具
export class FallbackUtils {
  /**
   * 检查语言是否需要回退
   */
  static needsFallback(locale: SupportedLocale, supportedLocales: SupportedLocale[]): boolean {
    return !supportedLocales.includes(locale);
  }

  /**
   * 获取最佳匹配语言
   */
  static getBestMatch(
    requestedLocale: string, 
    supportedLocales: SupportedLocale[]
  ): SupportedLocale {
    // 完全匹配
    if (supportedLocales.includes(requestedLocale as SupportedLocale)) {
      return requestedLocale as SupportedLocale;
    }
    
    // 语言族匹配（例如 zh-TW -> zh）
    const languageFamily = requestedLocale.split('-')[0];
    const familyMatch = supportedLocales.find(locale => locale.startsWith(languageFamily));
    if (familyMatch) {
      return familyMatch;
    }
    
    // 默认回退到英文
    return 'en';
  }

  /**
   * 检查回退链是否有效
   */
  static validateFallbackChain(chain: SupportedLocale[]): boolean {
    return chain.length > 0 && chain.includes('en');
  }
}