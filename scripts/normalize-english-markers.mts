#!/usr/bin/env node
/**
 * Normalize canonical English game pages by adding:
 * - section markers: <!-- i18n:section:... -->
 * - FAQ ID markers: <!-- i18n:faq:id=... -->
 *
 * Scope: src/content/games/*.en.md
 *
 * Modes:
 * - --dry-run: report stats only, no file changes
 * - --conservative: skip ambiguous insertions
 * - --offset/--limit: batch processing for reviewable commits
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { generateFaqId, parseFaqIdFromHtmlComment } from './lib/faq-id-generator.mts';

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');

type SectionKey = 'introduction' | 'how-to-play' | 'rules' | 'tips' | 'controls' | 'faq';

type NormalizeOptions = {
  dryRun: boolean;
  conservative: boolean;
  offset: number;
  limit: number | null;
};

type FileChange = {
  file: string; // repo-relative
  slug: string;
  changed: boolean;
  addedSectionMarkers: SectionKey[];
  addedFaqIds: number;
  skippedReasons: string[];
};

type Stats = {
  totalFiles: number;
  scannedFiles: number;
  changedFiles: number;
  addedSectionMarkers: number;
  addedFaqIds: number;
  skippedFiles: number;
  skippedReasons: Record<string, number>;
};

const SECTION_MARKER_LINE = (name: SectionKey) => `<!-- i18n:section:${name} -->`;

function stripBom(s: string): string {
  return s.replace(/^\uFEFF/, '');
}

function findFrontmatterEnd(lines: string[]): number {
  if (lines.length === 0) return 0;
  const first = stripBom(lines[0]).trim();
  if (first !== '---') return 0;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return i + 1;
  }
  return 0;
}

function parseArgs(argv: string[]): NormalizeOptions {
  const args = argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const conservative = args.includes('--conservative');

  const offsetFlag = args.indexOf('--offset');
  const limitFlag = args.indexOf('--limit');

  const offset = offsetFlag >= 0 ? Number(args[offsetFlag + 1]) : 0;
  const limit = limitFlag >= 0 ? Number(args[limitFlag + 1]) : null;

  return {
    dryRun,
    conservative,
    offset: Number.isFinite(offset) && offset >= 0 ? offset : 0,
    limit: limit != null && Number.isFinite(limit) && limit > 0 ? limit : null,
  };
}

function stripHeadingText(raw: string): string {
  return raw
    .trim()
    .replace(/^#+\s+/, '')
    .replace(/[*_`]/g, '')
    .replace(/["']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findHeadingLines(lines: string[]): Array<{ index: number; level: number; text: string }> {
  const out: Array<{ index: number; level: number; text: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = /^(#{1,6})\s+/.exec(line.trim());
    if (!m) continue;
    out.push({ index: i, level: m[1].length, text: stripHeadingText(line) });
  }
  return out;
}

function classifyHeadingToSection(text: string): SectionKey | null {
  const t = text.toLowerCase();
  if (
    t.includes('controls') ||
    t.includes('control scheme') ||
    t.includes('how to control') ||
    t.includes('operation guide') ||
    (t.includes('operation') && t.includes('guide'))
  ) {
    return 'controls';
  }
  if (t.includes('faq') || t.includes('frequently asked')) return 'faq';
  if (t.includes('introduction') || t.includes('overview') || t === 'about' || t.startsWith('about ')) {
    return 'introduction';
  }
  if (t.includes('how to play')) return 'how-to-play';
  if (t.includes('rules')) return 'rules';
  if (t.includes('tips') || t.includes('strategy') || t.includes('walkthrough') || t.includes('gameplay')) {
    return 'tips';
  }
  return null;
}

function hasSectionMarker(lines: string[], section: SectionKey): boolean {
  const marker = SECTION_MARKER_LINE(section);
  return lines.some((l) => l.trim() === marker);
}

function findUniqueHeadingIndex(
  headings: Array<{ index: number; text: string }>,
  section: SectionKey
): number | null {
  const matches = headings
    .filter((h) => classifyHeadingToSection(h.text) === section)
    .map((h) => h.index);
  if (matches.length === 1) return matches[0];
  return null;
}

function findIntroFallbackIndex(lines: string[]): number | null {
  // If there is non-heading content before the first heading, treat it as introduction.
  const firstHeading = lines.findIndex((l) => /^\s*#{1,6}\s+/.test(l));
  const end = firstHeading === -1 ? lines.length : firstHeading;
  let hasIntroContent = false;
  for (let i = 0; i < end; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    if (t.startsWith('<!--') && t.endsWith('-->')) continue;
    hasIntroContent = true;
    break;
  }
  if (!hasIntroContent) return null;

  // Insert before the first meaningful line (preserve leading blank lines).
  for (let i = 0; i < end; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    return i;
  }
  return 0;
}

function computeGameplaySectionTarget(
  headings: Array<{ index: number; text: string }>
): { section: SectionKey; index: number } | null {
  // Prefer the most specific marker when possible.
  const order: SectionKey[] = ['how-to-play', 'rules', 'tips'];
  for (const section of order) {
    const idx = findUniqueHeadingIndex(headings, section);
    if (idx != null) return { section, index: idx };
  }
  return null;
}

function isFaqIdLine(line: string): boolean {
  return Boolean(parseFaqIdFromHtmlComment(line.trim()));
}

function extractBoldNumberQuestion(line: string): string | null {
  const trimmed = line.trim();
  const m = /^\*\*\s*\d+\.\s*(.+?)\s*\*\*\s*$/.exec(trimmed);
  return m ? m[1].trim() : null;
}

function extractBoldQ(line: string): string | null {
  const trimmed = line.trim();
  const m = /^\*\*\s*Q:\s*(.+?)\s*\*\*\s*$/.exec(trimmed);
  return m ? m[1].trim() : null;
}

function extractListQuestion(line: string): { indent: string; bullet: string; question: string } | null {
  const m = /^(\s*)([-*+])\s+Q:\s*(.+?)\s*$/.exec(line);
  if (!m) return null;
  return { indent: m[1], bullet: m[2], question: m[3].trim() };
}

function extractInlineQaListItem(
  line: string
): { indent: string; bullet: string; text: string; questionText: string } | null {
  const m = /^(\s*)([-*+])\s+(.+?)\s*$/.exec(line);
  if (!m) return null;
  const indent = m[1];
  const bullet = m[2];
  const text = m[3].trim();
  if (!text.includes('?')) return null;
  const q = text.split('?')[0].trim();
  if (!q) return null;
  return { indent, bullet, text, questionText: `${q}?` };
}

function extractIndentedQLine(line: string): string | null {
  const m = /^\s{2,}Q:\s*(.+?)\s*$/.exec(line);
  return m ? m[1].trim() : null;
}

function countExistingFaqIds(lines: string[], start: number, end: number): number {
  let count = 0;
  for (let i = start; i < end; i++) {
    if (isFaqIdLine(lines[i])) count++;
  }
  return count;
}

function findFaqRange(
  lines: string[],
  headings: Array<{ index: number; level: number; text: string }>
): { start: number; end: number; level: number } | null {
  const faqHeading = headings.find((h) => classifyHeadingToSection(h.text) === 'faq');
  if (!faqHeading) return null;

  let end = lines.length;
  for (const h of headings) {
    if (h.index <= faqHeading.index) continue;
    if (h.level <= faqHeading.level) {
      end = h.index;
      break;
    }
  }

  return { start: faqHeading.index, end, level: faqHeading.level };
}

function applySectionMarkers(
  lines: string[],
  headings: Array<{ index: number; level: number; text: string }>,
  options: { conservative: boolean }
): { nextLines: string[]; added: SectionKey[]; skippedReasons: string[] } {
  const added: SectionKey[] = [];
  const skippedReasons: string[] = [];

  const headingLite = headings.map((h) => ({ index: h.index, text: h.text }));

  const required: SectionKey[] = ['introduction', 'controls', 'faq'];
  const inserts: Array<{ index: number; line: string }> = [];

  for (const section of required) {
    if (hasSectionMarker(lines, section)) continue;
    let idx: number | null = findUniqueHeadingIndex(headingLite, section);

    // Introduction fallback: treat pre-heading content as introduction.
    if (idx == null && section === 'introduction') {
      idx = findIntroFallbackIndex(lines);
    }

    if (idx == null) {
      skippedReasons.push(`missing-or-ambiguous-heading:${section}`);
      continue;
    }

    inserts.push({ index: idx, line: SECTION_MARKER_LINE(section) });
    added.push(section);
  }

  // Gameplay section: pick one of how-to-play/rules/tips if none exist.
  if (!hasSectionMarker(lines, 'how-to-play') && !hasSectionMarker(lines, 'rules') && !hasSectionMarker(lines, 'tips')) {
    const target = computeGameplaySectionTarget(headingLite);
    if (!target) {
      skippedReasons.push('missing-or-ambiguous-heading:gameplay');
    } else {
      inserts.push({ index: target.index, line: SECTION_MARKER_LINE(target.section) });
      added.push(target.section);
    }
  }

  if (options.conservative) {
    // In conservative mode, if we couldn't resolve all required sections, do nothing.
    const missingRequired = required.filter((s) => !hasSectionMarker(lines, s) && !added.includes(s));
    if (missingRequired.length > 0) {
      return { nextLines: lines, added: [], skippedReasons };
    }
  }

  // Apply inserts from bottom to top to keep indices stable.
  const nextLines = lines.slice();
  for (const ins of inserts.sort((a, b) => b.index - a.index)) {
    // If marker already exists immediately above, do not insert.
    const prev = ins.index - 1 >= 0 ? nextLines[ins.index - 1].trim() : '';
    if (prev === ins.line) continue;
    nextLines.splice(ins.index, 0, ins.line);
  }

  return { nextLines, added, skippedReasons };
}

function applyFaqIds(
  lines: string[],
  slug: string,
  faqRange: { start: number; end: number },
  options: { conservative: boolean }
): { nextLines: string[]; addedCount: number; skippedReasons: string[] } {
  const skippedReasons: string[] = [];
  const nextLines = lines.slice();

  const existingIds = new Set<string>();
  for (let i = faqRange.start; i < faqRange.end; i++) {
    const id = parseFaqIdFromHtmlComment(nextLines[i].trim());
    if (id) existingIds.add(id);
  }

  let addedCount = 0;

  // Scan inside FAQ range, updating nextLines in-place.
  for (let i = faqRange.start + 1; i < faqRange.end; i++) {
    const line = nextLines[i];

    // If this is already a standalone FAQ ID line (non-list style), just track it.
    const existing = parseFaqIdFromHtmlComment(line.trim());
    if (existing) {
      existingIds.add(existing);
      continue;
    }

    // Bold numbered questions: insert standalone comment above the question line.
    const boldQ = extractBoldNumberQuestion(line);
    if (boldQ) {
      const prevNonEmpty = (() => {
        for (let j = i - 1; j > faqRange.start; j--) {
          const t = nextLines[j].trim();
          if (!t) continue;
          return t;
        }
        return '';
      })();

      if (isFaqIdLine(prevNonEmpty)) {
        continue;
      }

      const id = generateFaqId(slug, boldQ, { existingIds });
      existingIds.add(id);
      nextLines.splice(i, 0, `<!-- i18n:faq:id=${id} -->`);
      addedCount++;
      faqRange.end++;
      i++;
      continue;
    }

    // Bold Q: questions ("**Q: ...**") — insert standalone comment above.
    const boldPrefixedQ = extractBoldQ(line);
    if (boldPrefixedQ) {
      const prevNonEmpty = (() => {
        for (let j = i - 1; j > faqRange.start; j--) {
          const t = nextLines[j].trim();
          if (!t) continue;
          return t;
        }
        return '';
      })();

      if (isFaqIdLine(prevNonEmpty)) {
        continue;
      }

      const id = generateFaqId(slug, boldPrefixedQ, { existingIds });
      existingIds.add(id);
      nextLines.splice(i, 0, `<!-- i18n:faq:id=${id} -->`);
      addedCount++;
      faqRange.end++;
      i++;
      continue;
    }

    // List-style Q: transform "- Q: ..." into:
    // - <!-- i18n:faq:id=... -->
    //   Q: ...
    const listQ = extractListQuestion(line);
    if (listQ) {
      // Conservative: ensure the next non-empty line after this question looks like an answer ("A:").
      if (options.conservative) {
        let ok = false;
        for (let j = i + 1; j < faqRange.end; j++) {
          const t = nextLines[j].trim();
          if (!t) continue;
          if (/^A:\s+/i.test(t)) ok = true;
          break;
        }
        if (!ok) {
          skippedReasons.push('faq-list-question-without-answer');
          continue;
        }
      }

      const id = generateFaqId(slug, listQ.question, { existingIds });
      existingIds.add(id);

      const commentLine = `${listQ.indent}${listQ.bullet} <!-- i18n:faq:id=${id} -->`;
      const qLine = `${listQ.indent}  Q: ${listQ.question}`;

      // Replace current line with comment line, insert qLine after.
      nextLines.splice(i, 1, commentLine, qLine);
      addedCount++;
      faqRange.end += 1;
      i += 1;
      continue;
    }

    // Inline Q+A in a single list item:
    // - Question? Answer...
    const inlineQa = extractInlineQaListItem(line);
    if (inlineQa) {
      const id = generateFaqId(slug, inlineQa.questionText, { existingIds });
      existingIds.add(id);

      const commentLine = `${inlineQa.indent}${inlineQa.bullet} <!-- i18n:faq:id=${id} -->`;
      const textLine = `${inlineQa.indent}  ${inlineQa.text}`;

      nextLines.splice(i, 1, commentLine, textLine);
      addedCount++;
      faqRange.end += 1;
      i += 1;
      continue;
    }

    // If we see an indented "Q:" line (already transformed), ensure the previous line has an ID comment.
    const indentedQ = extractIndentedQLine(line);
    if (indentedQ) {
      const prev = nextLines[i - 1]?.trim() || '';
      if (!isFaqIdLine(prev)) {
        skippedReasons.push('faq-indented-q-without-id');
      }
    }
  }

  return { nextLines, addedCount, skippedReasons };
}

async function normalizeEnglishFile(
  absPath: string,
  options: NormalizeOptions
): Promise<{ change: FileChange; nextRaw: string | null }> {
  const repoRel = path.relative(process.cwd(), absPath);
  const raw = await fs.readFile(absPath, 'utf8');
  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;
  const slug =
    typeof data.urlstr === 'string' && data.urlstr.trim()
      ? data.urlstr.trim()
      : path.basename(absPath).replace(/\.en\.md$/i, '');

  const rawLines = raw.split(/\r?\n/);
  const fmEnd = findFrontmatterEnd(rawLines);
  const frontmatterLines = rawLines.slice(0, fmEnd);
  const contentLines = rawLines.slice(fmEnd);

  const lines = contentLines;
  const headings = findHeadingLines(lines);

  const sectionResult = applySectionMarkers(lines, headings, { conservative: options.conservative });
  let nextLines = sectionResult.nextLines;

  const faqRange = findFaqRange(nextLines, findHeadingLines(nextLines));
  let addedFaqIds = 0;
  const skippedReasons = [...sectionResult.skippedReasons];

  if (!faqRange) {
    skippedReasons.push('missing-faq-heading');
  } else {
    // If FAQ IDs already exist, skip generation (idempotent), but still allow inserting missing ones.
    const existingCount = countExistingFaqIds(nextLines, faqRange.start, faqRange.end);
    const faqResult = applyFaqIds(
      nextLines,
      slug,
      { start: faqRange.start, end: faqRange.end },
      { conservative: options.conservative }
    );
    nextLines = faqResult.nextLines;
    addedFaqIds = faqResult.addedCount;
    skippedReasons.push(...faqResult.skippedReasons);

    // Conservative: if FAQ had no IDs and we couldn't add any, mark as skipped.
    if (options.conservative && existingCount === 0 && addedFaqIds === 0) {
      skippedReasons.push('faq-unmodified-in-conservative');
    }
  }

  const nextContent = nextLines.join('\n');
  const changed = nextContent !== lines.join('\n');

  const change: FileChange = {
    file: repoRel,
    slug,
    changed,
    addedSectionMarkers: sectionResult.added,
    addedFaqIds,
    skippedReasons,
  };

  if (!changed) {
    return { change, nextRaw: null };
  }

  const nextRaw = `${frontmatterLines.concat(nextLines).join('\n')}\n`;
  return { change, nextRaw };
}

async function listEnglishGameFiles(): Promise<string[]> {
  const files = await fs.readdir(GAMES_DIR);
  return files
    .filter((f) => f.endsWith('.en.md'))
    .sort((a, b) => a.localeCompare(b))
    .map((f) => path.join(GAMES_DIR, f));
}

function bump(stat: Record<string, number>, key: string): void {
  stat[key] = (stat[key] ?? 0) + 1;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv);
  const all = await listEnglishGameFiles();
  const totalFiles = all.length;

  const slice = (() => {
    const start = Math.min(options.offset, all.length);
    const end = options.limit == null ? all.length : Math.min(start + options.limit, all.length);
    return all.slice(start, end);
  })();

  const stats: Stats = {
    totalFiles,
    scannedFiles: slice.length,
    changedFiles: 0,
    addedSectionMarkers: 0,
    addedFaqIds: 0,
    skippedFiles: 0,
    skippedReasons: {},
  };

  const changes: FileChange[] = [];

  for (const abs of slice) {
    const { change, nextRaw } = await normalizeEnglishFile(abs, options);
    changes.push(change);

    if (change.changed) {
      stats.changedFiles++;
      stats.addedSectionMarkers += change.addedSectionMarkers.length;
      stats.addedFaqIds += change.addedFaqIds;
    }

    if (change.skippedReasons.length) {
      stats.skippedFiles++;
      for (const r of change.skippedReasons) bump(stats.skippedReasons, r);
    }

    if (!options.dryRun && nextRaw != null) {
      await fs.writeFile(abs, nextRaw, 'utf8');
    }
  }

  // Output summary + top skipped.
  console.log(`Scope: ${path.relative(process.cwd(), GAMES_DIR)} (*.en.md)`);
  console.log(`Mode: dryRun=${options.dryRun} conservative=${options.conservative}`);
  console.log(`Batch: offset=${options.offset} limit=${options.limit ?? 'ALL'} (${slice.length}/${totalFiles})`);
  console.log('');
  console.log(`Changed files: ${stats.changedFiles}`);
  console.log(`Added section markers: ${stats.addedSectionMarkers}`);
  console.log(`Added FAQ IDs: ${stats.addedFaqIds}`);
  console.log(`Files needing manual review: ${stats.skippedFiles}`);

  const topSkipped = Object.entries(stats.skippedReasons).sort((a, b) => b[1] - a[1]).slice(0, 20);
  if (topSkipped.length) {
    console.log('\nTop skip reasons:');
    for (const [k, v] of topSkipped) console.log(`- ${k}: ${v}`);
  }

  const needsReview = changes
    .filter((c) => c.skippedReasons.length)
    .slice(0, 50)
    .map((c) => `- ${c.file}: ${Array.from(new Set(c.skippedReasons)).join(', ')}`);

  if (needsReview.length) {
    console.log('\nSample files needing manual review (first 50):');
    for (const line of needsReview) console.log(line);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
