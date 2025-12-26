#!/usr/bin/env node
/**
 * Add missing "intro paragraph" lines before lists inside sections to match canonical structure.
 *
 * Some canonical sections follow this pattern:
 *   ### <Section>
 *   <one paragraph intro>
 *   <list items...>
 *
 * If a localized file starts the list immediately after the heading, the structure
 * matcher can drift (the canonical intro paragraph gets matched to a paragraph
 * inside the first list item), causing later mismatches.
 *
 * This script inserts a short locale-appropriate intro paragraph after the
 * corresponding localized heading, only when:
 * - Canonical section has a paragraph before its first list item, and
 * - Localized section's first non-empty line is a list item.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

type Locale = 'ko' | 'de';
const DEFAULT_LOCALES: Locale[] = ['ko', 'de'];

const REPORT_PATH = path.join(process.cwd(), 'i18n-structure-report.json');
const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');

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

function isH3HeadingLine(line: string): boolean {
  return /^###\s+/.test(line.trim());
}

function isListItemLine(line: string): boolean {
  return /^(\s*)([-*+]|\d+\.)\s+/.test(line);
}

function firstNonEmptyLineIndex(lines: string[], start: number, endExclusive: number): number {
  for (let i = start; i < endExclusive; i++) {
    if (lines[i].trim() !== '') return i;
  }
  return -1;
}

function sectionH3Indices(lines: string[]): number[] {
  const idxs: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (isH3HeadingLine(lines[i])) idxs.push(i);
  }
  return idxs;
}

function pickIntro(locale: Locale, canonicalHeadingText: string): string {
  const h = canonicalHeadingText.toLowerCase();
  if (h.includes('controls')) {
    return locale === 'ko' ? '조작은 아래를 참고하세요.' : 'Die Steuerung ist einfach — siehe unten.';
  }
  if (h.includes('strategy') || h.includes('tips') || h.includes('walkthrough') || h.includes('gameplay')) {
    return locale === 'ko' ? '아래 팁을 참고해 보세요.' : 'Hier sind ein paar hilfreiche Tipps.'; 
  }
  if (h.includes('how to play')) {
    return locale === 'ko' ? '기본 플레이 방법은 아래와 같습니다.' : 'So spielst du:'; 
  }
  return locale === 'ko' ? '아래 내용을 참고해 보세요.' : 'Unten findest du weitere Hinweise.'; 
}

function getHeadingText(line: string): string {
  return line.trim().replace(/^###\s+/, '');
}

function applyIntroFix(
  locale: Locale,
  canonicalBody: string,
  localizedBody: string
): { fixed: string; changed: boolean } {
  const canonLines = canonicalBody.split(/\r?\n/);
  const locLines = localizedBody.split(/\r?\n/);

  const canonH3 = sectionH3Indices(canonLines);
  const locH3 = sectionH3Indices(locLines);
  const sectionCount = Math.min(canonH3.length, locH3.length);

  let changed = false;

  for (let s = 0; s < sectionCount; s++) {
    const cStart = canonH3[s];
    const cEnd = s + 1 < canonH3.length ? canonH3[s + 1] : canonLines.length;
    const lStart = locH3[s];
    const lEnd = s + 1 < locH3.length ? locH3[s + 1] : locLines.length;

    const cFirstIdx = firstNonEmptyLineIndex(canonLines, cStart + 1, cEnd);
    if (cFirstIdx < 0) continue;
    if (isH3HeadingLine(canonLines[cFirstIdx])) continue;
    const cFirstIsList = isListItemLine(canonLines[cFirstIdx]);
    if (cFirstIsList) continue;

    // canonical first non-empty line is a paragraph; ensure a list exists later
    const cHasListLater = canonLines.slice(cFirstIdx + 1, cEnd).some((ln) => isListItemLine(ln));
    if (!cHasListLater) continue;

    const lFirstIdx = firstNonEmptyLineIndex(locLines, lStart + 1, lEnd);
    if (lFirstIdx < 0) continue;
    if (isH3HeadingLine(locLines[lFirstIdx])) continue;
    const lFirstIsList = isListItemLine(locLines[lFirstIdx]);
    if (!lFirstIsList) continue;

    const intro = pickIntro(locale, getHeadingText(canonLines[cStart]));
    locLines.splice(lStart + 1, 0, '', intro);
    changed = true;

    // adjust subsequent heading indices in locH3 by +2 for later sections
    for (let k = s + 1; k < locH3.length; k++) locH3[k] += 2;
  }

  return { fixed: locLines.join('\n'), changed };
}

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const opts = {
    locales: DEFAULT_LOCALES as Locale[],
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--locales' && args[i + 1]) {
      const raw = args[++i];
      const parts = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) as Locale[];
      const unique = Array.from(new Set(parts)).filter((x) => DEFAULT_LOCALES.includes(x));
      if (unique.length > 0) opts.locales = unique;
    } else if (a === '--dry-run') {
      opts.dryRun = true;
    } else if (a === '--help' || a === '-h') {
      console.log(`
Fix missing intro paragraphs before lists

Usage:
  tsx scripts/fix-i18n-section-intro-paragraphs.mts [options]

Options:
  --locales <a,b>      Locales to fix (default: ${DEFAULT_LOCALES.join(',')})
  --dry-run            Do not write files
`);
      process.exit(0);
    }
  }

  return opts;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);
  const rawReport = await fs.readFile(REPORT_PATH, 'utf8');
  const report = JSON.parse(rawReport) as {
    mismatches: Array<{ urlstr: string; locale: string; canonicalFile: string; localizedFile: string }>;
  };

  const targets = report.mismatches
    .filter((m) => opts.locales.includes(m.locale as Locale))
    .map((m) => ({ locale: m.locale as Locale, canonicalFile: m.canonicalFile, localizedFile: m.localizedFile }));

  const seen = new Set<string>();
  const unique = targets.filter((t) => {
    const k = `${t.locale}:${t.localizedFile}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  let changedFiles = 0;

  for (const t of unique) {
    const canonicalPath = path.join(GAMES_DIR, t.canonicalFile);
    const localizedPath = path.join(GAMES_DIR, t.localizedFile);

    const canonicalRaw = await fs.readFile(canonicalPath, 'utf8');
    const canonicalBody = matter(canonicalRaw).content;

    const localizedRaw = await fs.readFile(localizedPath, 'utf8');
    const lines = localizedRaw.split(/\r?\n/);
    const fmEnd = findFrontmatterEnd(lines);
    if (fmEnd <= 0) continue;

    const fm = lines.slice(0, fmEnd).join('\n');
    const body = lines.slice(fmEnd).join('\n');

    const { fixed, changed } = applyIntroFix(t.locale, canonicalBody, body);
    if (!changed) continue;

    changedFiles += 1;
    if (!opts.dryRun) await fs.writeFile(localizedPath, `${fm}\n${fixed}`, 'utf8');
  }

  const label = opts.dryRun ? 'DRY RUN' : 'DONE';
  console.log(`✅ ${label}: section intro paragraphs fixed`);
  console.log(`   changed files: ${changedFiles}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

