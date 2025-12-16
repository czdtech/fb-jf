/**
 * i18n routing + locale helpers (no translation dictionaries).
 *
 * Keep this module dependency-free so client-side scripts can import locale/path
 * logic without pulling the full translation JSON bundle.
 */
export const locales = ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko'] as const;
export type Locale = typeof locales[number];

export const defaultLocale: Locale = 'en';

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Detect locale from URL pathname.
 * Example: "/zh/game-name/" -> "zh", "/game-name/" -> "en"
 */
export function getLocaleFromPath(pathname: string): Locale {
  const segments = pathname.replace(/^\//, '').split('/');
  const firstSegment = segments[0];

  if (isValidLocale(firstSegment)) {
    return firstSegment;
  }

  return defaultLocale;
}

/**
 * Prefix a site-relative path with locale (except default locale).
 *
 * - getLocalizedPath('/slug/', 'en') -> '/slug/'
 * - getLocalizedPath('/slug/', 'zh') -> '/zh/slug/'
 * - getLocalizedPath('/', 'zh') -> '/zh/'
 */
export function getLocalizedPath(path: string, locale: Locale): string {
  const cleanPath = path.replace(/^\//, '');

  if (locale === defaultLocale) {
    return `/${cleanPath}`;
  }

  return `/${locale}/${cleanPath}`;
}

/**
 * Map HTML lang attributes or component-level lang props to our internal Locale.
 *
 * Examples:
 * - "zh-CN" -> "zh"
 * - "en-US" -> "en"
 * - "es" -> "es"
 *
 * Unknown or empty values fall back to defaultLocale ("en").
 */
export function getLocaleFromLangAttr(langAttr: string | undefined): Locale {
  if (!langAttr) return defaultLocale;

  const normalized = langAttr.trim().replace(/_/g, '-').toLowerCase();
  const base = normalized.split('-')[0];

  return isValidLocale(base) ? (base as Locale) : defaultLocale;
}


