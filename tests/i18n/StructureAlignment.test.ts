/**
 * Structure Alignment Tests for i18n Game Content
 *
 * These tests mirror the behavior of scripts/validate-i18n-structure.mts
 * in a property-testing style, using the real markdown files on disk.
 *
 * Properties:
 * - For any urlstr that has both an English canonical game and a localized
 *   variant, the localized headings must contain the canonical headings
 *   as an ordered subsequence (same heading levels).
 *
 * Reference: docs/i18n/games-content-contract-v1.md
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import fc from 'fast-check';
import { defaultLocale, locales, type Locale as RoutingLocale } from '../../src/i18n/routing';
import {
  extractStructureSkeleton,
  localizedContainsCanonicalStructure,
} from '../../scripts/lib/structure-skeleton.mts';

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const TARGET_LOCALES = locales.filter((l) => l !== defaultLocale);

type Locale = RoutingLocale;

interface GameFile {
  filename: string;
  locale: Locale;
  urlstr: string;
  content: string;
}

async function loadGameFiles(): Promise<GameFile[]> {
  const files = await fs.readdir(GAMES_DIR);
  const mdFiles = files.filter((f) => f.endsWith('.md'));

  const results: GameFile[] = [];

  for (const filename of mdFiles) {
    const filePath = path.join(GAMES_DIR, filename);
    const raw = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(raw);

    const locale: Locale = (data.locale || 'en') as Locale;
    const urlstr: string =
      typeof data.urlstr === 'string' && data.urlstr.trim() !== ''
        ? data.urlstr
        : filename.replace(new RegExp(`\\.(${locales.join('|')})\\.md$`), '');

    results.push({
      filename,
      locale,
      urlstr,
      content,
    });
  }

  return results;
}

describe('I18n Structure Alignment', () => {
  it(
    'should keep localized game markdown structurally aligned with canonical English',
    async () => {
      const files = await loadGameFiles();

      // Build mapping urlstr -> { canonical, localized[] }
      const byUrlstr = new Map<
        string,
        { canonical: GameFile | null; localized: GameFile[] }
      >();

      for (const f of files) {
        if (!byUrlstr.has(f.urlstr)) {
          byUrlstr.set(f.urlstr, { canonical: null, localized: [] });
        }
        const bucket = byUrlstr.get(f.urlstr)!;

        if (f.locale === 'en') {
          bucket.canonical = f;
        } else {
          bucket.localized.push(f);
        }
      }

      // Collect all urlstr-locale pairs that actually have both versions
      const pairs: { urlstr: string; locale: Locale }[] = [];

      for (const [urlstr, bucket] of byUrlstr.entries()) {
        if (!bucket.canonical) continue;

        for (const loc of bucket.localized) {
          pairs.push({ urlstr, locale: loc.locale });
        }
      }

      if (pairs.length === 0) {
        console.warn(
          '⚠️  No localized game variants found for structure alignment test.'
        );
        return;
      }

      // Property: for any such pair, structures must be equal
      const arbPair = fc.constantFrom(...pairs);

      await fc.assert(
        fc.asyncProperty(arbPair, async ({ urlstr, locale }) => {
          const bucket = byUrlstr.get(urlstr)!;
          const canonical = bucket.canonical!;
          const localized = bucket.localized.find((g) => g.locale === locale)!;

          const sCanonical = extractStructureSkeleton(canonical.content).filter((n) => n.type === 'heading');
          const sLocalized = extractStructureSkeleton(localized.content).filter((n) => n.type === 'heading');

          const ok = localizedContainsCanonicalStructure(
            sCanonical,
            sLocalized
          );

          expect(ok).toBe(true);
        }),
        {
          numRuns: Math.min(50, pairs.length),
        }
      );
    },
    30000
  );
});
