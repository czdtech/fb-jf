import { ContentManager, initContentManager, getContentManager } from './ContentManager';
import { UIContentAdapter } from './adapters/UIContentAdapter';
import { GameContentAdapter } from './adapters/GameContentAdapter';  
import { StaticDataAdapter } from './adapters/StaticDataAdapter';
import { FallbackStrategy, getFallbackStrategy } from './FallbackStrategy';
import type { SupportedLocale } from '@/i18n/utils';

// 内容管理器单例实例
let contentManager: ContentManager | null = null;

/**
 * 初始化内容管理系统
 * 这个函数应该在应用启动时调用一次
 */
export function initContentSystem(): ContentManager {
  if (contentManager) {
    return contentManager;
  }

  // 创建回退策略实例
  const fallbackStrategy = getFallbackStrategy();
  
  // 初始化内容管理器
  contentManager = initContentManager(fallbackStrategy);
  
  // 注册适配器
  contentManager.registerAdapter(new UIContentAdapter());
  contentManager.registerAdapter(new GameContentAdapter());
  contentManager.registerAdapter(new StaticDataAdapter());
  
  console.log('✅ Content management system initialized');
  
  return contentManager;
}

/**
 * 获取内容管理器实例
 */
export function getContent(): ContentManager {
  if (!contentManager) {
    return initContentSystem();
  }
  return contentManager;
}

/**
 * 预热内容缓存
 * 在构建时或应用启动时预加载关键内容
 */
export async function warmupContent(locales?: SupportedLocale[]): Promise<void> {
  const manager = getContent();
  const strategy = getFallbackStrategy();
  
  const targetLocales = locales || ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko'];
  const criticalKeys = [
    'ui.navigation',
    'ui.meta',
    'ui.hero',
    'ui.sections',
    'ui.common',
    'static.navigation',
    'static.homepage.meta',
    'static.homepage.hero'
  ];
  
  console.log('🔥 Warming up content cache...');
  
  try {
    await strategy.warmupCache(targetLocales, criticalKeys);
    
    // 预加载每种语言的UI内容
    const uiPromises = targetLocales.map(async (locale) => {
      try {
        await manager.getLocalizedContent(locale, 'ui');
      } catch (error) {
        console.warn(`⚠️ Failed to preload UI for ${locale}:`, error);
      }
    });
    
    await Promise.allSettled(uiPromises);
    
    console.log('✅ Content warmup completed');
  } catch (error) {
    console.warn('⚠️ Content warmup failed:', error);
  }
}

/**
 * 清理过期缓存
 */
export function cleanupContent(): void {
  const manager = getContent();
  const strategy = getFallbackStrategy();
  
  manager.clearCache();
  strategy.cleanupCache();
  
  console.log('🧹 Content cache cleaned up');
}

/**
 * 获取缓存统计信息
 */
export function getContentStats() {
  const manager = getContent();
  const strategy = getFallbackStrategy();
  
  return {
    manager: manager.getCacheStats(),
    fallback: strategy.getCacheStats()
  };
}

/**
 * 验证特定语言的内容完整性
 */
export async function validateLocaleContent(locale: SupportedLocale): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const manager = getContent();
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // 验证UI内容
    const uiValidation = await manager.validateContentCompleteness(locale);
    if (!uiValidation.isValid) {
      errors.push(...uiValidation.missingKeys.map(key => `UI missing: ${key}`));
      warnings.push(...uiValidation.warnings);
    }
    
    // 检查基本内容是否可以加载
    const contentTypes = ['ui', 'games', 'static'];
    for (const type of contentTypes) {
      try {
        await manager.getLocalizedContent(locale, type);
      } catch (error) {
        errors.push(`Failed to load ${type} for ${locale}: ${error}`);
      }
    }
  } catch (error) {
    errors.push(`Content validation failed for ${locale}: ${error}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// 导出适配器类，方便扩展
export {
  UIContentAdapter,
  GameContentAdapter,
  StaticDataAdapter,
  FallbackStrategy
};

// 导出内容管理器类型
export type {
  IContentManager,
  IContentAdapter,
  IFallbackStrategy,
  LocalizedContent,
  ValidationResult,
  CachedContent
} from './ContentManager';