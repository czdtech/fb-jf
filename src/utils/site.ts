export function getSiteUrl(): string {
  const val = (typeof import !== 'undefined' && (import.meta as any)?.env?.PUBLIC_SITE_URL)
    || (typeof process !== 'undefined' && process?.env?.PUBLIC_SITE_URL)
    || 'https://www.playfiddlebops.com';
  return String(val).replace(/\/$/, '');
}

