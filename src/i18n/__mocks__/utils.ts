// Mock for i18n utils to avoid import.meta issues in tests
export const SUPPORTED_LOCALES = [
  "en",
  "zh",
  "es",
  "fr",
  "de",
  "ja",
  "ko",
] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE = "en" as const;

export async function getTranslations() {
  return { ui: {}, home: null };
}

export function getNestedProperty(obj: any, key: string) {
  return obj?.[key];
}
