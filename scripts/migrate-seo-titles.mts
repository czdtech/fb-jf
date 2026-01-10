#!/usr/bin/env node
/**
 * Migrate game markdown titles:
 * - `title` becomes the clean display title (H1/UI)
 * - `seoTitle` becomes the localized SEO <title> (ends with "| FiddleBops")
 *
 * Default: dry-run (no writes).
 *
 * Usage:
 *   npx tsx scripts/migrate-seo-titles.mts
 *   npx tsx scripts/migrate-seo-titles.mts --write
 *   npx tsx scripts/migrate-seo-titles.mts --write --report=scripts/snapshots/seo-title-migration.json
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { buildGameSeoTitle, stripEmoji, toLocale } from '../src/lib/seo-title';
import type { Locale } from '../src/i18n/routing';

type Report = {
  totalFiles: number;
  changedFiles: number;
  unchangedFiles: number;
  errorFiles: number;
  flaggedFiles: number;
  samples: Array<{
    file: string;
    locale: Locale;
    fromTitle: string;
    toTitle: string;
    toSeoTitle: string;
  }>;
  flagged: Array<{
    file: string;
    locale: Locale;
    fromTitle: string;
    toTitle: string;
    reasons: string[];
  }>;
  errors: Array<{ file: string; error: string }>;
};

const args = process.argv.slice(2);
const write = args.includes('--write');
const reportArg = args.find((a) => a.startsWith('--report='));
const reportPath = reportArg ? reportArg.slice('--report='.length) : null;

const MAX_SAMPLES = 30;
const MAX_FLAGGED = 200;
const MAX_ERRORS = 50;

function normalizeWhitespace(input: string): string {
  return String(input ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripKnownSuffixes(input: string): string {
  let s = String(input ?? '');

  // Remove trailing brand suffix variants.
  s = s.replace(/\s*[|｜]\s*FiddleBops\s*$/i, '');

  // Remove trailing old site suffixes (only at end).
  s = s.replace(/\s*-\s*FiddleBops\s*Game\s*World\s*$/i, '');
  s = s.replace(/\s*-\s*FiddleBops\s*游戏世界\s*$/i, '');
  s = s.replace(/\s*-\s*FiddleBops\s*ゲームワールド\s*$/i, '');
  s = s.replace(/\s*-\s*FiddleBops\s*게임\s*월드\s*$/i, '');
  s = s.replace(/\s*-\s*Sprunki\s*Game\s*World\s*$/i, '');
  s = s.replace(/\s*-\s*Incredibox\s*Game\s*World\s*$/i, '');

  return normalizeWhitespace(s);
}

function splitOnTitleSeparator(input: string): { value: string; didSplit: boolean } {
  const s = String(input ?? '');
  const idx = s.indexOf(' - ');
  if (idx === -1) return { value: s, didSplit: false };
  return { value: s.slice(0, idx), didSplit: true };
}

function stripTrailingCta(input: string): { value: string; didStrip: boolean } {
  const s = normalizeWhitespace(input);
  if (!s) return { value: s, didStrip: false };

  const rules: Array<{ re: RegExp; replaceWith: string }> = [
    // Chinese CTA without separator
    { re: /^(.+?)\s*(?:在线玩|在线畅玩|線上|线上)\s+.*$/i, replaceWith: '$1' },
    // Spanish CTA without separator
    { re: /^(.+?)\s+Juega\b[\s\S]*$/i, replaceWith: '$1' },
    // Generic English-ish CTA
    { re: /^(.*?)\s+\bPlay\b\s+.*?\bOnline\b\s*$/i, replaceWith: '$1' },
    // Spanish CTA without separator
    { re: /^(.*?)\s+en\s+l[ií]nea\s*$/i, replaceWith: '$1' },
    // French CTA without separator
    { re: /^(.*?)\s+en\s+ligne\s*$/i, replaceWith: '$1' },
    // German CTA without separator
    { re: /^(.*?)\s+online\s+spielen\s*$/i, replaceWith: '$1' },
    // Korean CTA without separator
    { re: /^(.*?)\s+온라인\s*플레이\s*$/i, replaceWith: '$1' },
    { re: /^(.*?)\s+온라인\s*$/i, replaceWith: '$1' },
    // Japanese CTA without separator
    { re: /^(.*?)をオンラインでプレイ\s*$/i, replaceWith: '$1' },
  ];

  for (const rule of rules) {
    const next = s.replace(rule.re, rule.replaceWith);
    if (next !== s) {
      return { value: normalizeWhitespace(next), didStrip: true };
    }
  }

  return { value: s, didStrip: false };
}

function dedupeRepeatedHalves(input: string): { value: string; didDedupe: boolean } {
  const s = normalizeWhitespace(input);
  if (!s) return { value: s, didDedupe: false };
  const parts = s.split(' ');
  if (parts.length < 2 || parts.length % 2 !== 0) return { value: s, didDedupe: false };

  const half = parts.length / 2;
  const left = parts.slice(0, half).join(' ');
  const right = parts.slice(half).join(' ');

  const key = (x: string) => x.toLowerCase().replace(/\s+/g, ' ').trim();
  if (key(left) === key(right)) {
    return { value: left, didDedupe: true };
  }
  return { value: s, didDedupe: false };
}

function cleanDisplayTitle(locale: Locale, rawTitle: string): { title: string; reasons: string[] } {
  const reasons: string[] = [];
  let s = String(rawTitle ?? '');
  const before = s;

  s = stripEmoji(s);
  if (s !== before) reasons.push('stripEmoji');

  s = stripKnownSuffixes(s);

  const split = splitOnTitleSeparator(s);
  s = split.value;
  if (split.didSplit) reasons.push('splitOnHyphenSeparator');

  const cta = stripTrailingCta(s);
  s = cta.value;
  if (cta.didStrip) reasons.push('stripTrailingCta');

  const dedupe = dedupeRepeatedHalves(s);
  s = dedupe.value;
  if (dedupe.didDedupe) reasons.push('dedupeRepeatedHalves');

  // Locale-specific light cleanup: prefer not leaving dangling punctuation.
  s = s.replace(/[|｜-]\s*$/g, '').trim();

  // Final safety: never return an empty display title.
  if (!s) {
    reasons.push('emptyAfterClean');
    // Fall back to the emoji-stripped raw title (better than empty).
    s = stripEmoji(rawTitle).trim();
  }

  // If the result still looks like SEO boilerplate, flag it for review (don’t auto-destroy).
  const suspicious = /(\bplay\b|\bonline\b|무료|gratis|en\s+l[ií]nea|en\s+ligne|online\s+spielen|在线|線上|ゲームワールド|게임\s*월드|\|\s*fiddlebops)/i;
  if (suspicious.test(s)) reasons.push('stillLooksLikeSeoBoilerplate');

  return { title: normalizeWhitespace(s), reasons };
}

function sortKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const preferred = [
    'locale',
    'title',
    'seoTitle',
    'description',
    'iframeSrc',
    'thumbnail',
    'urlstr',
    'tags',
    'modType',
    'featured',
    'featuredRank',
    'sidebarNew',
    'sidebarPopular',
    'score',
    'developer',
    'releaseDate',
  ];

  const out: Record<string, unknown> = {};
  for (const k of preferred) if (k in obj) out[k] = obj[k];
  for (const k of Object.keys(obj).sort()) if (!(k in out)) out[k] = obj[k];
  return out;
}

async function writeReport(report: Report): Promise<void> {
  if (!reportPath) return;
  const fullPath = path.isAbsolute(reportPath) ? reportPath : path.join(process.cwd(), reportPath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`wrote report: ${path.relative(process.cwd(), fullPath)}`);
}

async function main(): Promise<void> {
  const files = await fg('src/content/games/**/*.md', { dot: false });
  files.sort();

  const report: Report = {
    totalFiles: files.length,
    changedFiles: 0,
    unchangedFiles: 0,
    errorFiles: 0,
    flaggedFiles: 0,
    samples: [],
    flagged: [],
    errors: [],
  };

  for (const rel of files) {
    const filePath = path.join(process.cwd(), rel);
    let raw: string;
    try {
      raw = await fs.readFile(filePath, 'utf8');
    } catch (err) {
      report.errorFiles += 1;
      if (report.errors.length < MAX_ERRORS) {
        report.errors.push({ file: rel, error: err instanceof Error ? err.message : String(err) });
      }
      continue;
    }

    let parsed;
    try {
      parsed = matter(raw);
    } catch (err) {
      report.errorFiles += 1;
      if (report.errors.length < MAX_ERRORS) {
        report.errors.push({ file: rel, error: err instanceof Error ? err.message : String(err) });
      }
      continue;
    }

    const data = (parsed.data || {}) as Record<string, unknown>;
    const locale = toLocale(typeof data.locale === 'string' ? data.locale : undefined);

    const fromTitle = normalizeWhitespace(String(data.title ?? ''));
    if (!fromTitle) {
      report.flaggedFiles += 1;
      if (report.flagged.length < MAX_FLAGGED) {
        report.flagged.push({
          file: rel,
          locale,
          fromTitle,
          toTitle: fromTitle,
          reasons: ['missingTitle'],
        });
      }
      report.unchangedFiles += 1;
      continue;
    }

    const cleaned = cleanDisplayTitle(locale, fromTitle);
    const toTitle = cleaned.title;
    const toSeoTitle = buildGameSeoTitle(locale, toTitle);

    const nextData = {
      ...data,
      title: toTitle,
      seoTitle: toSeoTitle,
    };

    const sorted = sortKeys(nextData);
    const nextRaw = matter.stringify(parsed.content, sorted);
    const changed = nextRaw !== raw;

    if (cleaned.reasons.includes('stillLooksLikeSeoBoilerplate')) {
      report.flaggedFiles += 1;
      if (report.flagged.length < MAX_FLAGGED) {
        report.flagged.push({ file: rel, locale, fromTitle, toTitle, reasons: cleaned.reasons });
      }
    }

    if (changed) {
      report.changedFiles += 1;
      if (report.samples.length < MAX_SAMPLES) {
        report.samples.push({ file: rel, locale, fromTitle, toTitle, toSeoTitle });
      }
      if (write) {
        await fs.writeFile(filePath, nextRaw, 'utf8');
      }
    } else {
      report.unchangedFiles += 1;
    }
  }

  const mode = write ? 'WRITE' : 'DRY-RUN';
  console.log(`migrate-seo-titles (${mode})`);
  console.log(`   total:     ${report.totalFiles}`);
  console.log(`   changed:   ${report.changedFiles}`);
  console.log(`   unchanged: ${report.unchangedFiles}`);
  console.log(`   errors:    ${report.errorFiles}`);
  console.log(`   flagged:   ${report.flaggedFiles}`);

  if (report.samples.length) {
    console.log('\nSample changes:');
    for (const s of report.samples) {
      console.log(`- ${s.file} [${s.locale}]`);
      console.log(`  title:    "${s.fromTitle}" -> "${s.toTitle}"`);
      console.log(`  seoTitle: "${s.toSeoTitle}"`);
    }
  }

  if (report.flagged.length) {
    console.log(`\nFlagged (first ${report.flagged.length}/${report.flaggedFiles}):`);
    for (const f of report.flagged) {
      console.log(`- ${f.file} [${f.locale}]: ${f.reasons.join(', ')}`);
      console.log(`  from: "${f.fromTitle}"`);
      console.log(`  to:   "${f.toTitle}"`);
    }
  }

  if (report.errors.length) {
    console.log(`\nErrors (first ${report.errors.length}/${report.errorFiles}):`);
    for (const e of report.errors) console.log(`- ${e.file}: ${e.error}`);
  }

  await writeReport(report);

  // Exit non-zero if we failed to read/parse anything.
  if (report.errorFiles > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});

