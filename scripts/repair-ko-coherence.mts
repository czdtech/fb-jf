#!/usr/bin/env node
/**
 * KO content coherence repair for markdown game pages.
 *
 * Focused fixes:
 * - Remove empty/stray FAQ headings created by previous residue cleanup
 *   (heuristic: FAQ section contains no '?' at all)
 * - Reattach indented “continuation lines” that were separated by such headings
 * - Remove empty headings with no body
 * - Remove empty list markers like "-" / "1."
 * - Collapse excessive blank lines
 *
 * This script is intentionally conservative: it does not invent new content.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import fg from 'fast-glob';

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

function headingLevel(line: string): number | null {
  const m = /^\s*(#{1,6})\s+/.exec(line);
  return m ? m[1].length : null;
}

function isHeading(line: string): boolean {
  return headingLevel(line) != null;
}

function normalizeHeadingText(line: string): string {
  return line
    .replace(/^\s*#{1,6}\s+/, '')
    .trim()
    .replace(/^\*{1,3}\s*/, '')
    .replace(/\s*\*{1,3}$/, '')
    .replace(/^\*{2}\s*/, '')
    .replace(/\s*\*{2}$/, '')
    .trim();
}

function isFaqHeading(line: string): boolean {
  if (!isHeading(line)) return false;
  const t = normalizeHeadingText(line);
  return /자주\s*묻는\s*질문/i.test(t) && /FAQ/i.test(t);
}

function isEmptyListMarker(line: string): boolean {
  return /^\s*[-*+]\s*$/.test(line) || /^\s*\d+\.\s*$/.test(line);
}

function isContinuationLine(line: string): boolean {
  if (/^\s*$/.test(line)) return false;
  if (/^\s*```/.test(line)) return false;
  if (/^\s*>/.test(line)) return false;
  // Indented non-list text
  if (/^\s{2,}/.test(line)) {
    const t = line.trimStart();
    if (/^[-*+]\s+/.test(t)) return false;
    if (/^\d+\.\s+/.test(t)) return false;
    if (/^#{1,6}\s+/.test(t)) return false;
    return true;
  }
  return false;
}

function collapseBlankLines(lines: string[], maxConsecutive = 2): string[] {
  const out: string[] = [];
  let blanks = 0;
  for (const line of lines) {
    if (line.trim() === '') {
      blanks += 1;
      if (blanks > maxConsecutive) continue;
      out.push('');
      continue;
    }
    blanks = 0;
    out.push(line);
  }
  return out;
}

function removeEmptyHeadings(lines: string[], bodyStart: number): { lines: string[]; removed: number } {
  const out: string[] = [];
  let removed = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (i < bodyStart || !isHeading(line)) {
      out.push(line);
      continue;
    }

    const lvl = headingLevel(line) ?? 3;
    // Find next non-empty line
    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') j++;

    if (j >= lines.length) {
      removed += 1;
      // drop trailing blanks too
      while (out.length > 0 && out[out.length - 1]?.trim() === '') out.pop();
      continue;
    }

    const next = lines[j] ?? '';
    const nextLvl = headingLevel(next);

    // Empty if next meaningful content is a same-or-higher heading
    if (nextLvl != null && nextLvl <= lvl) {
      removed += 1;
      continue;
    }

    out.push(line);
  }

  return { lines: out, removed };
}

function fixFaqNoQuestionMark(lines: string[], bodyStart: number): {
  lines: string[];
  removedFaqHeadings: number;
  mergedContinuations: number;
} {
  const out: string[] = [];
  let removedFaqHeadings = 0;
  let mergedContinuations = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (i < bodyStart || !isFaqHeading(line)) {
      out.push(line);
      continue;
    }

    const lvl = headingLevel(line) ?? 3;

    // Determine FAQ section bounds
    let end = i + 1;
    while (end < lines.length) {
      const hl = headingLevel(lines[end] ?? '');
      if (hl != null && hl <= lvl) break;
      end++;
    }

    const section = lines.slice(i + 1, end);
    const hasQm = section.some((l) => l.includes('?'));

    if (hasQm) {
      out.push(line);
      continue;
    }

    // Remove this FAQ heading and re-home its lines (mostly stray continuations)
    removedFaqHeadings += 1;

    for (const s of section) {
      if (s.trim() === '') continue;

      if (isContinuationLine(s) && out.length > 0) {
        // Merge into previous non-empty line
        let k = out.length - 1;
        while (k >= 0 && out[k].trim() === '') k--;
        if (k >= 0) {
          out[k] = out[k].replace(/\s+$/, '') + ' ' + s.trim();
          mergedContinuations += 1;
          continue;
        }
      }

      out.push(s.trimStart());
    }

    i = end - 1;
  }

  return { lines: out, removedFaqHeadings, mergedContinuations };
}

function fixQaSpacing(lines: string[], bodyStart: number): { lines: string[]; removedBlankBetweenQa: number } {
  const out: string[] = [];
  let removedBlankBetweenQa = 0;

  const qRe = /^\s*(?:[-*+]\s*)?(?:\*{0,2})?Q\s*[:：.]/i;
  const aRe = /^\s*(?:[-*+]\s*)?(?:\*{0,2})?A\s*[:：.]/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (i < bodyStart || !qRe.test(line)) {
      out.push(line);
      continue;
    }

    out.push(line);

    // Remove blank lines between Q and immediate A
    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') j++;
    if (j < lines.length && aRe.test(lines[j] ?? '')) {
      removedBlankBetweenQa += j - (i + 1);
      out.push(lines[j] ?? '');
      i = j;
    }
  }

  return { lines: out, removedBlankBetweenQa };
}

async function fixFile(rel: string): Promise<{
  changed: boolean;
  removedFaqHeadings: number;
  mergedContinuations: number;
  removedEmptyHeadings: number;
  removedBlankBetweenQa: number;
}> {
  const abs = path.join(process.cwd(), rel);
  const raw = await fs.readFile(abs, 'utf8');
  const originalLines = raw.split(/\r?\n/);
  const bodyStart = findFrontmatterEnd(originalLines);

  // Basic cleanup
  let lines = originalLines.filter((l, idx) => idx < bodyStart || !isEmptyListMarker(l));

  // Main fix: remove empty FAQ blocks and reattach continuation lines
  const faqFixed = fixFaqNoQuestionMark(lines, bodyStart);
  lines = faqFixed.lines;

  // Remove headings that became empty
  const headingsFixed = removeEmptyHeadings(lines, bodyStart);
  lines = headingsFixed.lines;

  // Tighten Q/A spacing where applicable
  const qaFixed = fixQaSpacing(lines, bodyStart);
  lines = qaFixed.lines;

  // Normalize blank lines
  lines = collapseBlankLines(lines, 2);

  // Trim trailing blank lines
  while (lines.length > 0 && lines[lines.length - 1]?.trim() === '') lines.pop();

  const next = lines.join('\n') + '\n';
  const changed = next !== raw;
  if (changed) await fs.writeFile(abs, next, 'utf8');

  return {
    changed,
    removedFaqHeadings: faqFixed.removedFaqHeadings,
    mergedContinuations: faqFixed.mergedContinuations,
    removedEmptyHeadings: headingsFixed.removed,
    removedBlankBetweenQa: qaFixed.removedBlankBetweenQa,
  };
}

async function main() {
  const files = await fg(['src/content/games/*.ko.md'], { dot: false });
  files.sort((a: string, b: string) => a.localeCompare(b));

  let changedFiles = 0;
  let removedFaqHeadings = 0;
  let mergedContinuations = 0;
  let removedEmptyHeadings = 0;
  let removedBlankBetweenQa = 0;

  for (const f of files) {
    const r = await fixFile(f);
    if (r.changed) changedFiles += 1;
    removedFaqHeadings += r.removedFaqHeadings;
    mergedContinuations += r.mergedContinuations;
    removedEmptyHeadings += r.removedEmptyHeadings;
    removedBlankBetweenQa += r.removedBlankBetweenQa;
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      { files: files.length, changedFiles, removedFaqHeadings, mergedContinuations, removedEmptyHeadings, removedBlankBetweenQa },
      null,
      2
    )
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

