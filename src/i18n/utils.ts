/**
 * i18n Utility Functions
 * Translation system for FiddleBops
 * 
 * Requirements: 6.4
 */

// Import all translation files
import en from './en.json';
import zh from './zh.json';
import es from './es.json';
import fr from './fr.json';
import de from './de.json';
import ja from './ja.json';
import ko from './ko.json';

// Type for translation keys (nested object paths)
type TranslationKey = string;

// Type for translations object
type Translations = typeof en;

// Supported locales
export const locales = ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko'] as const;
export type Locale = typeof locales[number];

// Default locale
export const defaultLocale: Locale = 'en';

// Translation dictionary
const translations: Record<Locale, Translations> = {
  en,
  zh,
  es,
  fr,
  de,
  ja,
  ko
};

/**
 * Get nested value from object using dot notation path
 * @param obj - Object to search
 * @param path - Dot notation path (e.g., "nav.home")
 * @returns Value at path or undefined
 */
function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Get translation for a key in the specified locale
 * @param locale - Target locale
 * @param key - Translation key in dot notation (e.g., "nav.home")
 * @param fallback - Optional fallback text if key not found
 * @returns Translated string
 */
export function t(locale: Locale, key: TranslationKey, fallback?: string): string {
  // Get translations for the locale
  const localeTranslations = translations[locale] || translations[defaultLocale];
  
  // Get the translation value
  const value = getNestedValue(localeTranslations, key);
  
  // Return value, fallback, or key itself
  return value || fallback || key;
}

/**
 * Create a translation function bound to a specific locale
 * Useful for components that know their locale
 * @param locale - Target locale
 * @returns Translation function for that locale
 */
export function useTranslations(locale: Locale) {
  return (key: TranslationKey, fallback?: string) => t(locale, key, fallback);
}

/**
 * Get locale from URL path
 * @param pathname - URL pathname (e.g., "/zh/game-name")
 * @returns Detected locale or default locale
 */
export function getLocaleFromPath(pathname: string): Locale {
  // Remove leading slash and get first segment
  const segments = pathname.replace(/^\//, '').split('/');
  const firstSegment = segments[0];
  
  // Check if first segment is a valid locale
  if (locales.includes(firstSegment as Locale)) {
    return firstSegment as Locale;
  }
  
  return defaultLocale;
}

/**
 * Get localized path for a URL
 * @param path - Base path (e.g., "/game-name")
 * @param locale - Target locale
 * @returns Localized path (e.g., "/zh/game-name" or "/game-name" for default locale)
 */
export function getLocalizedPath(path: string, locale: Locale): string {
  // Remove leading slash
  const cleanPath = path.replace(/^\//, '');
  
  // For default locale, return path as-is
  if (locale === defaultLocale) {
    return `/${cleanPath}`;
  }
  
  // For other locales, prefix with locale
  return `/${locale}/${cleanPath}`;
}

/**
 * Get all available locales with their native names
 * @returns Array of locale objects with code and native name
 */
export function getAvailableLocales() {
  return locales.map(locale => ({
    code: locale,
    name: t(locale, 'languages.' + locale)
  }));
}

/**
 * Check if a locale is valid
 * @param locale - Locale code to check
 * @returns True if locale is supported
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}
