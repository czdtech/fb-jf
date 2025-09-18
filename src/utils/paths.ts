export const LOCALES = ["en", "zh", "es", "fr", "de", "ja", "ko"] as const;

export function deriveBaseSlug(idOrSlug: string): string {
  if (!idOrSlug) return "";
  const p = idOrSlug.replace(/\.md$/, "");
  const m = p.match(/^(en|zh|es|fr|de|ja|ko)[\/-](.+)$/);
  return m ? m[2] : p;
}

export function localizedPath(baseSlug: string, locale: string) {
  return locale === "en" ? `/${baseSlug}/` : `/${locale}/${baseSlug}/`;
}
