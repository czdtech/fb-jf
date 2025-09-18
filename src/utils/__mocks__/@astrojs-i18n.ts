// Mock for Astro i18n in tests
export const SUPPORTED_LOCALES = [
  "en",
  "zh",
  "es",
  "fr",
  "de",
  "ja",
  "ko",
] as const;
export const DEFAULT_LOCALE = "en";

// Mock getTranslations that doesn't use import.meta
export async function getTranslations() {
  return { ui: {}, home: null };
}

export function getNestedProperty(obj: any, key: string) {
  return obj?.[key];
}
