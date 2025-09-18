export function getSiteUrl(): string {
  const val = (typeof process !== 'undefined' && process?.env?.PUBLIC_SITE_URL)
    || 'https://www.playfiddlebops.com';
  return String(val).replace(/\/$/, '');
}
