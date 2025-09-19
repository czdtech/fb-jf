/**
 * Page-level hreflang generation test (unit-level using utility)
 */
import { SUPPORTED_LOCALES } from '@/i18n/utils';
import { generateHreflangLinks } from '@/utils/hreflang';

describe('generateHreflangLinks', () => {
  test('produces a link for each supported locale for a given base path', () => {
    const SITE_URL = 'https://www.playfiddlebops.com';
    const languages = SUPPORTED_LOCALES.map((code) => ({ code, label: code.toUpperCase(), url: '' }));
    const links = generateHreflangLinks(languages as any, '/incredibox/', SITE_URL);
    // Our helper uses x-default for EN
    const map = new Map(links.map((l: any) => [l.code, l.url]));
    for (const code of SUPPORTED_LOCALES) {
      const key = code === 'en' ? 'x-default' : code;
      const expected = code === 'en' ? `${SITE_URL}/incredibox/` : `${SITE_URL}/${code}/incredibox/`;
      expect(map.get(key)).toBe(expected);
    }
  });
});
