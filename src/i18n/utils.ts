import { getCollection } from 'astro:content';

export type SupportedLocale = 'en' | 'zh' | 'es' | 'fr' | 'de' | 'ja' | 'ko';

export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko'];
export const DEFAULT_LOCALE: SupportedLocale = 'en';

// 从URL获取当前语言
export function getCurrentLocale(url: URL): SupportedLocale {
  if (!url || !url.pathname) {
    return DEFAULT_LOCALE;
  }
  
  try {
    const pathname = url.pathname;
    const segments = pathname.split('/').filter(Boolean);
    
    if (segments.length === 0) {
      return DEFAULT_LOCALE;
    }
    
    const potentialLocale = segments[0];
    if (SUPPORTED_LOCALES.includes(potentialLocale as SupportedLocale)) {
      return potentialLocale as SupportedLocale;
    }
    
    return DEFAULT_LOCALE;
  } catch (error) {
    console.warn('Failed to parse current locale from URL', error);
    return DEFAULT_LOCALE;
  }
}

// 获取本地化路径
export function getLocalizedPath(locale: SupportedLocale, path: string = ''): string {
  if (locale === DEFAULT_LOCALE) {
    return path || '/';
  }
  return `/${locale}${path || ''}`;
}

// 语言显示名称映射
export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  zh: '中文',
  es: 'Español', 
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  ko: '한국어'
};

// 获取翻译内容
export async function getTranslation(locale: SupportedLocale, key?: string) {
  try {
    // 尝试从内容集合加载指定语言的UI翻译
    const ui = await getCollection('i18nUI');
    const uiEntry = ui.find(entry => entry.id === locale);
    
    if (uiEntry) {
      // 成功加载翻译内容
      const translationData = uiEntry.data;
      
      // 如果指定了key，返回特定的翻译项
      if (key) {
        return getNestedProperty(translationData, key);
      }
      
      return {
        ui: translationData,
        home: null
      };
    }
  } catch (error) {
    console.warn(`Failed to load translations for locale "${locale}":`, error);
  }
  
  // Fallback到英文
  if (locale !== DEFAULT_LOCALE) {
    try {
      const fallbackUI = await getCollection('i18nUI');
      const fallbackEntry = fallbackUI.find(entry => entry.id === DEFAULT_LOCALE);
      
      if (fallbackEntry) {
        const fallbackData = fallbackEntry.data;
        
        if (key) {
          return getNestedProperty(fallbackData, key);
        }
        
        return {
          ui: fallbackData,
          home: null
        };
      }
    } catch (fallbackError) {
      console.warn('Failed to load fallback translations:', fallbackError);
    }
  }
  
  // 最终fallback到硬编码默认值（仅用于极端错误情况）
  const defaultUI = {
    navigation: {
      home: 'Home',
      games: 'Games', 
      newGames: 'New Games',
      popularGames: 'Popular Games',
      trendingGames: 'Trending Games',
      aboutUs: 'About Us',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      language: 'Language'
    },
    meta: {
      title: 'FiddleBops - Play Music Creation Games Online',
      description: 'Create amazing music with FiddleBops! Interactive music creation games featuring fun characters and beats.',
      keywords: 'fiddlebops, music games, music creation, incredibox, sprunki, beat making'
    },
    hero: {
      title: 'Create Amazing Music with FiddleBops',
      subtitle: 'Interactive music creation games with fun characters and unlimited creativity',
      playNow: 'Play Now',
      learnMore: 'Learn More'
    },
    sections: {
      howToPlay: 'How to Play',
      newGames: 'New Games',
      popularGames: 'Popular Games',
      trendingGames: 'Trending Games', 
      about: 'About FiddleBops',
      videos: 'Video Tutorials'
    },
    games: {
      playNow: 'Play Now',
      loading: 'Loading...',
      error: 'Failed to load game',
      retry: 'Try Again',
      viewMore: 'View More Games',
      noGames: 'No games found',
      category: 'Category',
      rating: 'Rating'
    },
    common: {
      loading: 'Loading...',
      error: 'Something went wrong',
      retry: 'Try Again',
      back: 'Back',
      next: 'Next',
      previous: 'Previous', 
      close: 'Close',
      menu: 'Menu'
    },
    footer: {
      aboutUs: 'About Us',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      copyright: '© 2024 FiddleBops. All rights reserved.'
    }
  };

  if (key) {
    return getNestedProperty(defaultUI, key);
  }

  return {
    ui: defaultUI,
    home: null
  };
}

// 辅助函数：通过点分路径获取嵌套对象属性
function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

// 检查是否为RTL语言
export function isRTL(locale: SupportedLocale): boolean {
  return false; // 当前支持的语言都不是RTL
}

// 获取语言的方向属性
export function getLanguageDirection(locale: SupportedLocale): 'ltr' | 'rtl' {
  return isRTL(locale) ? 'rtl' : 'ltr';
}