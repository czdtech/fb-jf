#!/usr/bin/env node
/**
 * Compare i18n hardpoints between canonical English and localized variants.
 *
 * This is report-oriented and does not implement CI gating. CI gating is a
 * separate script that can consume this report + baseline.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import {
  extractHardpointsFromMarkdown,
  type ExtractedHardpoints,
  type Locale,
} from './extract-i18n-hardpoints.mts';

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const TARGET_LOCALES: Locale[] = ['zh', 'ja', 'es', 'fr', 'de', 'ko'];

type DiffKind = 'iframeSrc' | 'controlsKeys' | 'faqOrder' | 'numbers' | 'frontmatter' | 'orphan';

export interface DiffItem {
  kind: DiffKind;
  field?: string;
  expected: unknown;
  actual: unknown;
  fingerprint: string;
}

export interface HardpointsDiff {
  slug: string;
  locale: Locale;
  englishFile: string;
  localizedFile: string;
  isAligned: boolean;
  differences: DiffItem[];
}

export interface DiffReport {
  generatedAt: string;
  scope: string;
  summary: {
    totalSlugs: number;
    checkedPairs: number;
    alignedPairs: number;
    mismatchedPairs: number;
    missingPairs: number;
    orphanLocalizedFiles: number;
    byLocale: Record<string, { aligned: number; mismatched: number; missing: number }>;
    byKind: Record<string, number>;
  };
  orphans: Array<{ file: string; slug: string; locale: Locale }>;
  pairs: HardpointsDiff[];
}

function sha1(value: unknown): string {
  return crypto.createHash('sha1').update(JSON.stringify(value)).digest('hex');
}

function fingerprint(diff: Omit<DiffItem, 'fingerprint'>): string {
  return sha1(diff).slice(0, 12);
}

function normalizeHardSyncValue(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return JSON.stringify(value);
}

function isHardSyncKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (lower === 'urlstr') return true;
  if (lower === 'iframesrc') return true;
  if (lower === 'thumbnail') return true;
  if (lower === 'releasedate') return true;
  if (lower === 'score') return true;

  return (
    lower.endsWith('url') ||
    lower.endsWith('urls') ||
    lower.endsWith('src') ||
    lower.endsWith('path')
  );
}

function getHardSyncFrontmatter(
  frontmatter: Record<string, unknown>
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(frontmatter)) {
    if (!isHardSyncKey(k)) continue;
    out[k] = normalizeHardSyncValue(v);
  }

  // Ensure canonical keys appear even if missing (so we can diff missing/extra).
  for (const required of ['urlstr', 'iframeSrc', 'thumbnail', 'releaseDate', 'score']) {
    if (!(required in out)) {
      out[required] = null;
    }
  }

  return out;
}

function setEq(a: string[], b: string[]): { ok: boolean; missing: string[]; extra: string[] } {
  const sa = new Set(a);
  const sb = new Set(b);
  const missing = Array.from(sa).filter((x) => !sb.has(x)).sort();
  const extra = Array.from(sb).filter((x) => !sa.has(x)).sort();
  return { ok: missing.length === 0 && extra.length === 0, missing, extra };
}

function countsEq(a: Record<string, number>, b: Record<string, number>): boolean {
  const ak = Object.keys(a).sort();
  const bk = Object.keys(b).sort();
  if (ak.length !== bk.length) return false;
  for (let i = 0; i < ak.length; i++) {
    if (ak[i] !== bk[i]) return false;
    if (a[ak[i]] !== b[bk[i]]) return false;
  }
  return true;
}

export function diffHardpoints(english: ExtractedHardpoints, localized: ExtractedHardpoints): DiffItem[] {
  const diffs: DiffItem[] = [];

  // iframeSrc
  if ((english.iframeSrc ?? null) !== (localized.iframeSrc ?? null)) {
    const d = {
      kind: 'iframeSrc' as const,
      expected: english.iframeSrc,
      actual: localized.iframeSrc,
    };
    diffs.push({ ...d, fingerprint: fingerprint(d) });
  }

  // controls keys: set equality
  const controlsEq = setEq(english.controls.keyTokens, localized.controls.keyTokens);
  if (!controlsEq.ok) {
    const d = {
      kind: 'controlsKeys' as const,
      expected: english.controls.keyTokens,
      actual: localized.controls.keyTokens,
    };
    diffs.push({ ...d, fingerprint: fingerprint(d) });
  }

  // numbers: multiset equality
  const enCounts = english.numbers.tokenCounts;
  const locCounts = localized.numbers.tokenCounts;
  if (!countsEq(enCounts, locCounts)) {
    const d = {
      kind: 'numbers' as const,
      expected: enCounts,
      actual: locCounts,
    };
    diffs.push({ ...d, fingerprint: fingerprint(d) });
  }

  // faq: sequence equality (order matters)
  const enFaq = english.faq.ids;
  const locFaq = localized.faq.ids;
  if (enFaq.length !== locFaq.length || enFaq.some((id, i) => id !== locFaq[i])) {
    const d = {
      kind: 'faqOrder' as const,
      expected: enFaq,
      actual: locFaq,
    };
    diffs.push({ ...d, fingerprint: fingerprint(d) });
  }

  // frontmatter hard-sync
  const enFm = getHardSyncFrontmatter(english.frontmatter);
  const locFm = getHardSyncFrontmatter(localized.frontmatter);

  const keys = Array.from(new Set([...Object.keys(enFm), ...Object.keys(locFm)])).sort();
  for (const k of keys) {
    // Avoid duplicate reporting: iframeSrc has its own dedicated hardpoint.
    if (k.toLowerCase() === 'iframesrc') continue;
    const expected = k in enFm ? enFm[k] : null;
    const actual = k in locFm ? locFm[k] : null;
    if (expected !== actual) {
      const d = {
        kind: 'frontmatter' as const,
        field: k,
        expected,
        actual,
      };
      diffs.push({ ...d, fingerprint: fingerprint(d) });
    }
  }

  return diffs;
}

function inferSlugFromFilename(filePath: string): string {
  return path.basename(filePath).replace(/\.(en|zh|ja|es|fr|de|ko)\.md$/i, '');
}

function inferLocaleFromFilename(filePath: string): Locale {
  const m = /\.([a-z]{2})\.md$/i.exec(path.basename(filePath));
  const loc = m ? (m[1].toLowerCase() as Locale) : 'en';
  return loc;
}

async function readGameFile(absPath: string): Promise<{ data: Record<string, unknown>; content: string }> {
  const raw = await fs.readFile(absPath, 'utf8');
  const { data, content } = matter(raw);
  return { data: data as Record<string, unknown>, content };
}

async function buildReport(): Promise<DiffReport> {
  const files = (await fs.readdir(GAMES_DIR))
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(GAMES_DIR, f));

  const bySlug = new Map<string, Map<Locale, string>>();
  const orphans: Array<{ file: string; slug: string; locale: Locale }> = [];

  for (const abs of files) {
    const slug = inferSlugFromFilename(abs);
    const locale = inferLocaleFromFilename(abs);
    if (!bySlug.has(slug)) bySlug.set(slug, new Map());
    bySlug.get(slug)!.set(locale, abs);
  }

  for (const [slug, map] of bySlug.entries()) {
    if (map.has('en')) continue;
    for (const [locale, abs] of map.entries()) {
      if (locale === 'en') continue;
      orphans.push({ file: path.relative(process.cwd(), abs), slug, locale });
    }
  }

  const pairs: HardpointsDiff[] = [];
  const byLocale: Record<string, { aligned: number; mismatched: number; missing: number }> = {};
  const byKind: Record<string, number> = {};

  let checkedPairs = 0;
  let alignedPairs = 0;
  let mismatchedPairs = 0;
  let missingPairs = 0;

  for (const locale of TARGET_LOCALES) {
    byLocale[locale] = { aligned: 0, mismatched: 0, missing: 0 };
  }

  for (const [slug, map] of bySlug.entries()) {
    const enAbs = map.get('en');
    if (!enAbs) continue;

    const enRel = path.relative(process.cwd(), enAbs);
    const enRaw = await readGameFile(enAbs);
    const enExtracted = extractHardpointsFromMarkdown(enRaw.content, enRaw.data, { filePath: enRel });

    for (const locale of TARGET_LOCALES) {
      const locAbs = map.get(locale);
      const locRel = locAbs ? path.relative(process.cwd(), locAbs) : '';

      if (!locAbs) {
        missingPairs++;
        byLocale[locale].missing++;
        continue;
      }

      checkedPairs++;
      const locRaw = await readGameFile(locAbs);
      const locExtracted = extractHardpointsFromMarkdown(locRaw.content, locRaw.data, { filePath: locRel });

      const differences = diffHardpoints(enExtracted, locExtracted);
      const isAligned = differences.length === 0;

      if (isAligned) {
        alignedPairs++;
        byLocale[locale].aligned++;
      } else {
        mismatchedPairs++;
        byLocale[locale].mismatched++;
      }

      for (const d of differences) {
        byKind[d.kind] = (byKind[d.kind] ?? 0) + 1;
      }

      pairs.push({
        slug,
        locale,
        englishFile: enRel,
        localizedFile: locRel,
        isAligned,
        differences,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    scope: 'src/content/games',
    summary: {
      totalSlugs: Array.from(bySlug.keys()).length,
      checkedPairs,
      alignedPairs,
      mismatchedPairs,
      missingPairs,
      orphanLocalizedFiles: orphans.length,
      byLocale,
      byKind,
    },
    orphans,
    pairs,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const outFlag = args.indexOf('--out');
  const out = outFlag >= 0 ? args[outFlag + 1] : null;

  const report = await buildReport();
  if (out) {
    await fs.writeFile(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  // Human-readable summary
  console.log(`Scope: ${report.scope}`);
  console.log(`Generated: ${report.generatedAt}`);
  console.log(
    `Pairs: checked=${report.summary.checkedPairs} aligned=${report.summary.alignedPairs} mismatched=${report.summary.mismatchedPairs} missing=${report.summary.missingPairs}`
  );
  console.log(`Orphans: ${report.summary.orphanLocalizedFiles}`);
  console.log('By locale:');
  for (const [loc, s] of Object.entries(report.summary.byLocale)) {
    console.log(`- ${loc}: aligned=${s.aligned} mismatched=${s.mismatched} missing=${s.missing}`);
  }
  console.log('By kind:');
  for (const [k, v] of Object.entries(report.summary.byKind).sort((a, b) => b[1] - a[1])) {
    console.log(`- ${k}: ${v}`);
  }
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
