import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { extractHardpointsFromMarkdown } from '../../scripts/extract-i18n-hardpoints.mts';

const FIXTURES_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'i18n-hardpoints');

async function extractFromFixture(relPath: string) {
  const abs = path.join(FIXTURES_DIR, relPath);
  const raw = await fs.readFile(abs, 'utf8');
  const { data, content } = matter(raw);
  return extractHardpointsFromMarkdown(content, data as Record<string, unknown>, {
    filePath: relPath,
  });
}

describe('Hardpoints - extractor', () => {
  it('extracts controls keys, numbers multiset, and faq ids from a valid file', async () => {
    const res = await extractFromFixture('valid/simple-game.en.md');

    expect(res.slug).toBe('simple-game');
    expect(res.locale).toBe('en');
    expect(res.iframeSrc).toBe('https://example.com/simple-game');

    expect(res.controls.sectionFound).toBe(true);
    expect(res.controls.keyTokens).toEqual(['W', 'A', 'S', 'D', 'Space']);

    expect(res.numbers.tokenCounts).toEqual({ '3': 1, '10s': 1, '100%': 1 });
    expect(res.faq.ids).toEqual(['faq:simple-game:what-is-this-11111111']);
  });

  it('returns empty hardpoints when markers are missing', async () => {
    const res = await extractFromFixture('edge-cases/missing-markers.en.md');

    expect(res.controls.sectionFound).toBe(false);
    expect(res.controls.keyTokens).toEqual([]);
    expect(res.numbers.tokens).toEqual([]);
    expect(res.faq.sectionFound).toBe(false);
    expect(res.faq.ids).toEqual([]);
  });

  it('does not extract numbers outside allowed sections', async () => {
    const res = await extractFromFixture('edge-cases/numbers-outside-section.en.md');
    expect(res.numbers.tokens).toEqual([]);
    expect(res.numbers.tokenCounts).toEqual({});
  });

  it('ignores ordered list ordinals by extracting numbers from text nodes only', async () => {
    const res = await extractFromFixture('valid/nested-lists.en.md');
    expect(res.controls.keyTokens).toEqual(['W', 'A', 'S', 'D', 'Shift', 'Mouse1', 'Click']);

    // Should include only in-text numeric tokens (not "1." or "2." list ordinals).
    expect(res.numbers.tokenCounts).toEqual({ '60s': 1, '10x': 1 });
  });
});

