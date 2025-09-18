/**
 * Pagination URL generation tests
 * - Verifies trailing slash normalization
 * - Verifies locale prefix handling (en vs zh)
 */

jest.mock('astro:i18n', () => ({
  getRelativeLocaleUrl: (locale: string, path: string) => {
    // Normalize input path to always start with '/'
    const p = path.startsWith('/') ? path : `/${path}`;
    return locale === 'en' ? p : `/${locale}${p}`;
  },
}), { virtual: true });

import { buildPageUrl, generateSEOPagination } from '@/utils/pagination';

describe('pagination URL generation', () => {
  test('buildPageUrl: en locale with trailing slash', () => {
    expect(buildPageUrl('/games', 1, 'en')).toBe('/games/');
    expect(buildPageUrl('/games', 2, 'en')).toBe('/games/2/');
  });

  test('buildPageUrl: zh locale with trailing slash and prefix', () => {
    expect(buildPageUrl('/games', 1, 'zh')).toBe('/zh/games/');
    expect(buildPageUrl('/games', 3, 'zh')).toBe('/zh/games/3/');
  });

  test('generateSEOPagination: canonical equals current page URL', () => {
    const meta1 = generateSEOPagination('/popular-games', 1, 5, 'en');
    expect(meta1.canonical).toBe('/popular-games/');
    expect(meta1.prev).toBeUndefined();
    expect(meta1.next).toBe('/popular-games/2/');

    const meta2 = generateSEOPagination('/popular-games', 2, 5, 'zh');
    expect(meta2.canonical).toBe('/zh/popular-games/2/');
    expect(meta2.prev).toBe('/zh/popular-games/');
    expect(meta2.next).toBe('/zh/popular-games/3/');
  });
});

