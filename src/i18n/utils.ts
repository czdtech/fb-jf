import { getCollection } from "astro:content";

export type SupportedLocale = "en" | "zh" | "es" | "fr" | "de" | "ja" | "ko";

export const SUPPORTED_LOCALES: SupportedLocale[] = [
  "en",
  "zh",
  "es",
  "fr",
  "de",
  "ja",
  "ko",
];
export const DEFAULT_LOCALE: SupportedLocale = "en";

// 从URL获取当前语言
export function getCurrentLocale(url: URL): SupportedLocale {
  if (!url || !url.pathname) {
    return DEFAULT_LOCALE;
  }

  try {
    const pathname = url.pathname;
    const segments = pathname.split("/").filter(Boolean);

    if (segments.length === 0) {
      return DEFAULT_LOCALE;
    }

    const potentialLocale = segments[0];
    if (SUPPORTED_LOCALES.includes(potentialLocale as SupportedLocale)) {
      return potentialLocale as SupportedLocale;
    }

    return DEFAULT_LOCALE;
  } catch (error) {
    console.warn("Failed to parse current locale from URL", error);
    return DEFAULT_LOCALE;
  }
}

// 获取本地化路径
export function getLocalizedPath(
  locale: SupportedLocale,
  path: string = ""
): string {
  if (locale === DEFAULT_LOCALE) {
    return path || "/";
  }
  return `/${locale}${path || ""}`;
}

// 语言显示名称映射
export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: "English",
  zh: "中文",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  ja: "日本語",
  ko: "한국어",
};

// 获取翻译内容
export async function getTranslation(locale: SupportedLocale, key?: string) {
  try {
    // 尝试从内容集合加载指定语言的UI翻译
    const ui = await getCollection("i18nUI");
    const uiEntry = ui.find((entry) => entry.id === locale);

    if (uiEntry) {
      // 成功加载翻译内容
      const translationData = uiEntry.data;

      // 如果指定了key，返回特定的翻译项
      if (key) {
        const value = getNestedProperty(translationData, key);
        if (value !== undefined) {
          return value;
        }
        // Key在主要语言环境中缺失 - 尝试fallback
      } else {
        return {
          ui: translationData,
          home: null,
        };
      }
    }
  } catch (error) {
    // 只在开发环境显示详细错误信息
    if (import.meta.env.DEV) {
      console.warn(`Failed to load translations for locale "${locale}":`, error);
    }
  }

  // Fallback到英文
  if (locale !== DEFAULT_LOCALE) {
    try {
      const fallbackUI = await getCollection("i18nUI");
      const fallbackEntry = fallbackUI.find(
        (entry) => entry.id === DEFAULT_LOCALE
      );

      if (fallbackEntry) {
        const fallbackData = fallbackEntry.data;

        if (key) {
          const value = getNestedProperty(fallbackData, key);
          if (value !== undefined) {
            return value;
          }
          // Key在英文中也缺失，返回 fallback 值
          return getDefaultTranslation(key);
        }

        return {
          ui: fallbackData,
          home: null,
        };
      }
    } catch (fallbackError) {
      if (import.meta.env.DEV) {
        console.warn("Failed to load fallback translations:", fallbackError);
      }
    }
  }

  // 最终fallback：返回默认值或空对象
  if (key) {
    return getDefaultTranslation(key);
  }
  
  return { 
    ui: getDefaultUITranslations(), 
    home: null 
  };
}

// 获取默认翻译值（当所有翻译都失败时的fallback）
function getDefaultTranslation(key: string): string {
  const defaultTranslations: Record<string, string> = {
    'navigation.home': 'Home',
    'navigation.games': 'Games',
    'navigation.allGames': 'All Games',
    'navigation.newGames': 'New Games',
    'navigation.popularGames': 'Popular Games',
    'navigation.trendingGames': 'Trending Games',
    'navigation.aboutUs': 'About Us',
    'navigation.privacy': 'Privacy Policy',
    'navigation.terms': 'Terms of Service',
    'navigation.language': 'Language',
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.retry': 'Try Again',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.close': 'Close',
    'common.menu': 'Menu',
  };
  
  return defaultTranslations[key] || key.split('.').pop() || 'Missing Translation';
}

// 获取默认UI翻译结构
function getDefaultUITranslations() {
  return {
    navigation: {
      home: 'Home',
      games: 'Games',
      allGames: 'All Games',
      newGames: 'New Games',
      popularGames: 'Popular Games',
      trendingGames: 'Trending Games',
      aboutUs: 'About Us',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      language: 'Language',
    },
    common: {
      loading: 'Loading...',
      error: 'Something went wrong',
      retry: 'Try Again',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      close: 'Close',
      menu: 'Menu',
    },
    meta: {
      title: 'FiddleBops',
      description: 'Create amazing music with FiddleBops!',
      keywords: 'fiddlebops, music games, music creation',
    },
  };
}
function throwTranslationError(
  locale: SupportedLocale,
  key?: string,
  fallbackAttempted: boolean = false
): never {
  const errorContext = {
    requestedLocale: locale,
    requestedKey: key,
    fallbackAttempted,
    availableLocales: SUPPORTED_LOCALES,
    timestamp: new Date().toISOString(),
  };

  let errorMessage = `Translation missing: `;

  if (key) {
    errorMessage += `Key "${key}" not found for locale "${locale}"`;
    if (fallbackAttempted) {
      errorMessage += ` (also missing in English fallback)`;
    }
  } else {
    errorMessage += `Default locale '${locale}' translation file could not be loaded from Content Collections`;
    if (fallbackAttempted) {
      errorMessage += ` (English fallback also unavailable)`;
    }
  }

  errorMessage += `\n\nTo fix this:\n`;
  if (key) {
    errorMessage += `1. Add missing key "${key}" to src/content/i18nUI/${locale}.json\n`;
    errorMessage += `2. Ensure the key exists in src/content/i18nUI/en.json for fallback\n`;
  } else {
    errorMessage += `1. Create missing translation file: src/content/i18nUI/${locale}.json\n`;
    errorMessage += `2. Copy structure from src/content/i18nUI/en.json and translate content\n`;
  }

  errorMessage += `\nError Context: ${JSON.stringify(errorContext, null, 2)}`;

  // 在生产构建中，退出进程以使构建失败
  if (import.meta.env.PROD) {
    console.error(errorMessage);
    process.exit(1);
  }

  throw new Error(errorMessage);
}

// 辅助函数：通过点分路径获取嵌套对象属性
function getNestedProperty(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

// 检查是否为RTL语言
export function isRTL(locale: SupportedLocale): boolean {
  return false; // 当前支持的语言都不是RTL
}

// 获取语言的方向属性
export function getLanguageDirection(locale: SupportedLocale): "ltr" | "rtl" {
  return isRTL(locale) ? "rtl" : "ltr";
}
