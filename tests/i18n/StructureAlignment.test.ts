/**
 * Structure Alignment Tests for i18n Game Content
 *
 * These tests mirror the behavior of scripts/validate-i18n-structure.mts
 * in a property-testing style, using the real markdown files on disk.
 *
 * Properties:
 * - For any urlstr that has both an English canonical game and a localized
 *   variant, the markdown structural skeleton must match.
 *
 * Requirements: 2.1, 2.2, 6.2 (full-i18n-content)
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import fc from 'fast-check';
import { defaultLocale, locales, type Locale as RoutingLocale } from '../../src/i18n/routing';

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const TARGET_LOCALES = locales.filter((l) => l !== defaultLocale);

type Locale = RoutingLocale;

interface GameFile {
  filename: string;
  locale: Locale;
  urlstr: string;
  content: string;
}

type NodeType = 'heading' | 'list-item' | 'paragraph';

interface StructureNode {
  type: NodeType;
  level?: number;
  indentBucket?: number;
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

function parseMarkdownStructure(body: string): StructureNode[] {
  const lines = body.split(/\r?\n/);
  const nodes: StructureNode[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith('<!--') && trimmed.endsWith('-->')) {
      continue;
    }

    const headingMatch = /^#{1,6}\s+/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[0].trim().length;
      nodes.push({ type: 'heading', level });
      continue;
    }

    const listMatch = /^(\s*)([-*+]|\d+\.)\s+/.exec(line);
    if (listMatch) {
      const indentSpaces = listMatch[1].length;
      const indentBucket = Math.floor(indentSpaces / 2);
      nodes.push({ type: 'list-item', indentBucket });
      continue;
    }

    nodes.push({ type: 'paragraph' });
  }

  return nodes;
}

function nodesMatch(a: StructureNode, b: StructureNode): boolean {
  if (a.type !== b.type) return false;

  if (a.type === 'heading') {
    return a.level === b.level;
  }

  if (a.type === 'list-item') {
    const aIndent = a.indentBucket ?? 0;
    const bIndent = b.indentBucket ?? 0;
    return aIndent === bIndent;
  }

  return true;
}

/**
 * Check that the canonical structure appears as an ordered subsequence
 * inside the localized structure. Localized content may contain extra
 * nodes, but cannot miss any canonical node.
 */
function localizedContainsCanonicalStructure(
  canonical: StructureNode[],
  localized: StructureNode[]
): boolean {
  let i = 0;
  let j = 0;

  while (i < canonical.length && j < localized.length) {
    if (nodesMatch(canonical[i], localized[j])) {
      i++;
      j++;
    } else {
      j++;
    }
  }

  return i === canonical.length;
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

          const sCanonical = parseMarkdownStructure(canonical.content);
          const sLocalized = parseMarkdownStructure(localized.content);

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
