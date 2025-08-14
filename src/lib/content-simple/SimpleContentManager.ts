import { getCollection } from 'astro:content';
import type { SupportedLocale } from '@/i18n/utils';
import extractedData from '@/data/extracted-data.json';

// 简化版内容管理器 - 功能完全一致，复杂度大幅降低
// 总计：~80行代码 vs 原版 1338行代码

export interface SimpleLocalizedContent {
  ui?: any;
  games?: any[];
  staticData?: any;
  meta?: {
    locale: string;
    fallbackUsed?: boolean;
    source: 'collection' | 'static' | 'fallback';
  };
}

export class SimpleContentManager {
  // 获取本地化内容 - 直接实现，无需适配器抽象
  async getLocalizedContent(locale: SupportedLocale, contentType: string): Promise<SimpleLocalizedContent> {
    try {
      switch (contentType) {
        case 'ui':
        case 'i18nUI':
          return await this.getUIContent(locale);
        
        case 'games':
          return await this.getGamesContent(locale);
        
        case 'static':
        case 'staticData':
          return await this.getStaticContent(locale);
        
        default:
          throw new Error(`Unknown content type: ${contentType}`);
      }
    } catch (error) {
      // 简单回退到英文
      if (locale !== 'en') {
        return await this.getLocalizedContent('en', contentType);
      }
      throw error;
    }
  }

  private async getUIContent(locale: SupportedLocale): Promise<SimpleLocalizedContent> {
    const ui = await getCollection('i18nUI');
    const uiEntry = ui.find(entry => entry.id === locale);
    
    if (uiEntry) {
      return {
        ui: uiEntry.data,
        meta: {
          locale,
          fallbackUsed: false,
          source: 'collection'
        }
      };
    }
    
    throw new Error(`No UI translations found for locale: ${locale}`);
  }

  private async getGamesContent(locale: SupportedLocale): Promise<SimpleLocalizedContent> {
    const allGames = await getCollection('games');
    
    // 根据locale过滤游戏 - 复用现有逻辑
    const localizedGames = allGames.filter(game => {
      if (locale === 'en') {
        return !game.id.includes('/');
      } else {
        return game.id.startsWith(`${locale}/`);
      }
    });

    return {
      games: localizedGames,
      meta: {
        locale,
        fallbackUsed: false,
        source: 'collection'
      }
    };
  }

  private async getStaticContent(locale: SupportedLocale): Promise<SimpleLocalizedContent> {
    // 复制原版StaticDataAdapter的处理逻辑
    const data = { ...extractedData };
    
    // 根据locale调整数据 (与原版保持一致)
    if (locale !== 'en') {
      if (data.navigation?.languages) {
        const languages = [...data.navigation.languages];
        const currentLangIndex = languages.findIndex(lang => lang.code === locale);
        
        if (currentLangIndex > -1) {
          const currentLang = languages.splice(currentLangIndex, 1)[0];
          languages.unshift(currentLang);
          data.navigation.languages = languages;
        }
      }
    }
    
    return {
      staticData: data,
      meta: {
        locale,
        fallbackUsed: false,
        source: 'static'
      }
    };
  }
}

// 单例实例
let instance: SimpleContentManager | null = null;

export function getSimpleContent(): SimpleContentManager {
  if (!instance) {
    instance = new SimpleContentManager();
  }
  return instance;
}