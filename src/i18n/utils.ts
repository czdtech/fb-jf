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

import {
  defaultLocale,
  getLocaleFromLangAttr,
  getLocaleFromPath,
  getLocalizedPath,
  isValidLocale,
  locales,
  type Locale,
} from './routing';

export {
  defaultLocale,
  getLocaleFromLangAttr,
  getLocaleFromPath,
  getLocalizedPath,
  isValidLocale,
  locales,
};
export type { Locale };

// Type for translation keys (nested object paths)
type TranslationKey = string;

// Type for translations object
type Translations = typeof en;

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
 * Get all available locales with their native names
 * @returns Array of locale objects with code and native name
 */
export function getAvailableLocales() {
  return locales.map(locale => ({
    code: locale,
    name: t(locale, 'languages.' + locale)
  }));
}
