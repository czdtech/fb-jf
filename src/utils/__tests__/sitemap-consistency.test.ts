/**
 * Sitemap consistency test
 * - Ensures every EN base slug has 7-locale <url> entries
 */

import { SUPPORTED_LOCALES } from '@/i18n/utils';
import * as sitemap from '@/pages/sitemap.xml';
import { getCollection } from 'astro:content';

jest.mock('astro:content');

describe('sitemap detail URLs', () => {
  beforeAll(() => {
    process.env.PUBLIC_SITE_URL = 'https://www.playfiddlebops.com';
    // Minimal Response polyfill for Node test runtime
    (globalThis as any).Response = class {
      constructor(private _body: string) {}
      async text() { return this._body; }
    } as any;
  });

  test('includes all locales for each english base slug', async () => {
    const games = [
      { id: 'incredibox.md', data: { slug: 'incredibox', title: 'Incredibox' } },
      { id: 'en/sprunki-retake.md', data: { slug: 'sprunki-retake', title: 'Sprunki Retake' } },
    ];
    (getCollection as unknown as jest.Mock).mockResolvedValue(games);

    const res = await (sitemap as any).GET();
    const xml = await res.text();

    const baseSlugs = ['incredibox', 'sprunki-retake'];
    for (const slug of baseSlugs) {
      for (const locale of SUPPORTED_LOCALES) {
        const expected =
          locale === 'en'
            ? `https://www.playfiddlebops.com/${slug}/`
            : `https://www.playfiddlebops.com/${locale}/${slug}/`;
        expect(xml).toContain(`<loc>${expected}</loc>`);
      }
    }
  });
});
