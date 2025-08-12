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
    console.warn(`Failed to load translations for locale "${locale}":`, error);
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
          // Key在英文中也缺失
          const errorContext = {
            requestedLocale: locale,
            requestedKey: key,
            fallbackAttempted: true,
          };
          const msg = `Translation missing: Key "${key}" not found for locale "${locale}" (also missing in English fallback)`;
          if (import.meta.env.DEV) {
            throw new Error(msg + `\nContext: ${JSON.stringify(errorContext)}`);
          } else {
            console.error(msg, errorContext);
            return undefined;
          }
        }

        return {
          ui: fallbackData,
          home: null,
        };
      }
    } catch (fallbackError) {
      console.warn("Failed to load fallback translations:", fallbackError);
    }
  }

  // 生产环境不失败构建：记录错误并回退到空对象
  const errorContext = {
    requestedLocale: locale,
    requestedKey: key,
    fallbackAttempted: locale !== DEFAULT_LOCALE,
  };
  const msg = key
    ? `Translation missing: Key "${key}" not found for locale "${locale}"`
    : `Translation file missing for locale "${locale}"`;
  if (import.meta.env.DEV) {
    throw new Error(msg + `\nContext: ${JSON.stringify(errorContext)}`);
  } else {
    console.error(msg, errorContext);
    return { ui: {}, home: null } as any;
  }
}

// 错误抛出函数：用于fail-fast策略
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
