import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { extractHardpointsFromMarkdown } from '../../scripts/extract-i18n-hardpoints.mts';
import { diffHardpoints } from '../../scripts/report-i18n-hardpoints-diff.mts';

const FIXTURES_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'i18n-hardpoints');

async function extractFixture(relPath: string) {
  const abs = path.join(FIXTURES_DIR, relPath);
  const raw = await fs.readFile(abs, 'utf8');
  const { data, content } = matter(raw);
  return extractHardpointsFromMarkdown(content, data as Record<string, unknown>, { filePath: relPath });
}

describe('Hardpoints - diff reporter', () => {
  it('detects iframeSrc mismatch', async () => {
    const en = await extractFixture('valid/simple-game.en.md');
    const zh = await extractFixture('mismatched/different-iframe.zh.md');
    const diffs = diffHardpoints(en, zh);

    expect(diffs.some((d) => d.kind === 'iframeSrc')).toBe(true);
    // Ensure no controls mismatch in this fixture.
    expect(diffs.some((d) => d.kind === 'controlsKeys')).toBe(false);
  });

  it('detects extra controls token', async () => {
    const en = await extractFixture('valid/simple-game.en.md');
    const zh = await extractFixture('mismatched/extra-controls.zh.md');
    const diffs = diffHardpoints(en, zh);

    expect(diffs.some((d) => d.kind === 'controlsKeys')).toBe(true);
    expect(diffs.some((d) => d.kind === 'iframeSrc')).toBe(false);
  });

  it('detects faq order mismatch (order matters)', async () => {
    const en = await extractFixture('valid/complex-faq.en.md');
    const zh = await extractFixture('mismatched/reordered-faq.zh.md');
    const diffs = diffHardpoints(en, zh);

    expect(diffs.some((d) => d.kind === 'faqOrder')).toBe(true);
  });
});

