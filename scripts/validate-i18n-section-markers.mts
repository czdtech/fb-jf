#!/usr/bin/env node
/**
 * Validate i18n section markers presence across localized game markdown files.
 *
 * Why:
 * - Hardpoints extraction relies on `<!-- i18n:section:* -->` markers.
 * - Missing markers can make CI checks silently skip sections (numbers/controls/FAQ),
 *   which increases the chance of regressions slipping in.
 * - We use baseline mode by default: allow existing missing markers, but forbid new ones.
 *
 * Scope:
 * - src/content/games/*.md (per slug: <slug>.en.md vs <slug>.<locale>.md)
 *
 * Flags:
 * - --strict: fail on any missing marker
 * - --no-baseline: report-only (always exit 0)
 * - --update-baseline: snapshot current issues into baseline file and exit 0
 * - --baseline <path>: override baseline path
 * - --out <path>: report json path
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

type Locale = 'zh' | 'ja' | 'es' | 'fr' | 'de' | 'ko';
const TARGET_LOCALES: Locale[] = ['zh', 'ja', 'es', 'fr', 'de', 'ko'];

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');

const KNOWN_SECTIONS = new Set(['introduction', 'how-to-play', 'rules', 'tips', 'controls', 'faq']);
const SECTION_MARKER_RE = /<!--\s*i18n:section:([a-z0-9-]+)\s*-->/gi;

const DEFAULT_BASELINE_PATH = path.join(
  '.kiro',
  'specs',
  'i18n-hardpoints-alignment',
  'section-markers-baseline.json'
);

const DEFAULT_REPORT_PATH = 'i18n-section-markers-report.json';

type Mode = 'baseline' | 'strict' | 'report-only';

type Options = {
  mode: Mode;
  updateBaseline: boolean;
  baselinePath: string;
  out: string;
};

type BaselineEntry = {
  slug: string;
  locale: Locale;
  section: string;
  note?: string;
  addedAt?: string;
};

type BaselineFile = {
  version: string;
  updatedAt: string;
  entries: BaselineEntry[];
};

type IssuePair = {
  slug: string;
  locale: Locale;
  englishFile: string;
  localizedFile: string;
  missingSections: string[];
};

type Report = {
  generatedAt: string;
  scope: string;
  options: Omit<Options, 'baselinePath'> & { baselinePath: string };
  summary: {
    canonicalGames: number;
    checkedPairs: number;
    mismatchedPairs: number;
    missingEntries: number;
    byLocale: Record<Locale, { checkedPairs: number; mismatchedPairs: number; missingEntries: number }>;
    bySection: Record<string, number>;
  };
  regressions?: Array<{ slug: string; locale: Locale; section: string }>;
  pairs: IssuePair[];
};

function parseArgs(argv: string[]): Options {
  const args = argv.slice(2);

  const strict = args.includes('--strict');
  const noBaseline = args.includes('--no-baseline') || args.includes('--report-only');
  const updateBaseline = args.includes('--update-baseline');

  const baselineFlag = args.indexOf('--baseline');
  const outFlag = args.indexOf('--out');

  const baselinePath = baselineFlag >= 0 ? String(args[baselineFlag + 1] ?? '').trim() : DEFAULT_BASELINE_PATH;
  const out = outFlag >= 0 ? String(args[outFlag + 1] ?? '').trim() : DEFAULT_REPORT_PATH;

  const mode: Mode = noBaseline ? 'report-only' : strict ? 'strict' : 'baseline';

  return {
    mode,
    updateBaseline,
    baselinePath: baselinePath || DEFAULT_BASELINE_PATH,
    out: out || DEFAULT_REPORT_PATH,
  };
}

function keyOf(e: Pick<BaselineEntry, 'slug' | 'locale' | 'section'>): string {
  return `${e.slug}::${e.locale}::${e.section}`;
}

function extractMarkers(content: string): string[] {
  const out: string[] = [];
  SECTION_MARKER_RE.lastIndex = 0;
  let m: RegExpExecArray | null = null;
  while ((m = SECTION_MARKER_RE.exec(content))) {
    const name = (m[1] || '').toLowerCase();
    if (!KNOWN_SECTIONS.has(name)) continue;
    out.push(name);
  }
  return out;
}

function uniq(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of items) {
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

async function loadBaseline(filePath: string): Promise<BaselineFile> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<BaselineFile>;
    const entries = Array.isArray(parsed.entries) ? (parsed.entries as BaselineEntry[]) : [];
    return {
      version: String(parsed.version || '1.0'),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      entries: entries.filter((e) => e && typeof e.slug === 'string' && typeof e.locale === 'string' && typeof e.section === 'string'),
    };
  } catch (err) {
    if ((err as { code?: string }).code === 'ENOENT') {
      return { version: '1.0', updatedAt: new Date().toISOString(), entries: [] };
    }
    throw err;
  }
}

async function saveBaseline(filePath: string, baseline: BaselineFile): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(baseline, null, 2) + '\n', 'utf8');
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🏷️  I18n Section Marker Validation');
  console.log('═══════════════════════════════════════════════════════════\n');

  const files = (await fs.readdir(GAMES_DIR)).filter((f) => f.endsWith('.md'));
  const fileSet = new Set(files);
  const englishFiles = files.filter((f) => f.endsWith('.en.md'));

  const pairs: IssuePair[] = [];
  const byLocale: Report['summary']['byLocale'] = {
    zh: { checkedPairs: 0, mismatchedPairs: 0, missingEntries: 0 },
    ja: { checkedPairs: 0, mismatchedPairs: 0, missingEntries: 0 },
    es: { checkedPairs: 0, mismatchedPairs: 0, missingEntries: 0 },
    fr: { checkedPairs: 0, mismatchedPairs: 0, missingEntries: 0 },
    de: { checkedPairs: 0, mismatchedPairs: 0, missingEntries: 0 },
    ko: { checkedPairs: 0, mismatchedPairs: 0, missingEntries: 0 },
  };
  const bySection: Record<string, number> = {};

  for (const enFile of englishFiles) {
    const slug = enFile.replace(/\.en\.md$/i, '');
    const enAbs = path.join(GAMES_DIR, enFile);
    const enRaw = await fs.readFile(enAbs, 'utf8');
    const { content: enContent } = matter(enRaw);
    const enMarkers = uniq(extractMarkers(enContent));

    // If canonical has no known section markers, do not enforce marker presence in locales.
    if (enMarkers.length === 0) continue;

    for (const locale of TARGET_LOCALES) {
      const locFile = `${slug}.${locale}.md`;
      if (!fileSet.has(locFile)) continue;

      byLocale[locale].checkedPairs += 1;

      const locAbs = path.join(GAMES_DIR, locFile);
      const locRaw = await fs.readFile(locAbs, 'utf8');
      const { content: locContent } = matter(locRaw);
      const locMarkers = uniq(extractMarkers(locContent));

      const missing = enMarkers.filter((m) => !locMarkers.includes(m));
      if (missing.length === 0) continue;

      pairs.push({
        slug,
        locale,
        englishFile: path.join('src', 'content', 'games', enFile).replace(/\\/g, '/'),
        localizedFile: path.join('src', 'content', 'games', locFile).replace(/\\/g, '/'),
        missingSections: missing,
      });

      byLocale[locale].mismatchedPairs += 1;
      byLocale[locale].missingEntries += missing.length;
      for (const s of missing) {
        bySection[s] = (bySection[s] || 0) + 1;
      }
    }
  }

  pairs.sort((a, b) => {
    const byLocale = a.locale.localeCompare(b.locale);
    if (byLocale !== 0) return byLocale;
    return a.slug.localeCompare(b.slug);
  });

  const missingEntries = pairs.reduce((sum, p) => sum + p.missingSections.length, 0);

  const baseline = await loadBaseline(options.baselinePath);
  const baselineKeys = new Set(baseline.entries.map((e) => keyOf(e)));

  const currentEntries: BaselineEntry[] = [];
  for (const p of pairs) {
    for (const section of p.missingSections) {
      currentEntries.push({ slug: p.slug, locale: p.locale, section });
    }
  }

  const currentKeys = new Set(currentEntries.map((e) => keyOf(e)));
  const regressions = currentEntries.filter((e) => !baselineKeys.has(keyOf(e)));

  const report: Report = {
    generatedAt: new Date().toISOString(),
    scope: 'src/content/games',
    options: { ...options, baselinePath: options.baselinePath },
    summary: {
      canonicalGames: englishFiles.length,
      checkedPairs: Object.values(byLocale).reduce((sum, v) => sum + v.checkedPairs, 0),
      mismatchedPairs: pairs.length,
      missingEntries,
      byLocale,
      bySection,
    },
    ...(options.mode === 'baseline' ? { regressions: regressions.map(({ slug, locale, section }) => ({ slug, locale, section })) } : {}),
    pairs,
  };

  await writeJson(options.out, report);

  console.log(`Scope: ${report.scope}`);
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Report: ${options.out}`);
  console.log(`Mode: ${options.mode}${options.updateBaseline ? ' (+update-baseline)' : ''}`);
  console.log(`Canonical games (en): ${report.summary.canonicalGames}`);
  console.log(`Checked pairs: ${report.summary.checkedPairs}`);
  console.log(`Missing markers: pairs=${report.summary.mismatchedPairs} entries=${report.summary.missingEntries}`);
  console.log('');

  if (options.updateBaseline) {
    const now = new Date().toISOString();
    const nextEntries: BaselineEntry[] = currentEntries
      .map((e) => ({
        ...e,
        note: 'auto-baseline',
        addedAt: now,
      }))
      .sort((a, b) => keyOf(a).localeCompare(keyOf(b)));

    await saveBaseline(options.baselinePath, { version: '1.0', updatedAt: now, entries: nextEntries });
    console.log(`✅ Baseline updated: ${options.baselinePath}`);
    console.log(`   entries: ${baseline.entries.length} -> ${nextEntries.length}`);
    return;
  }

  if (options.mode === 'report-only') {
    console.log('ℹ️  report-only mode: always exit 0');
    return;
  }

  if (options.mode === 'strict') {
    if (pairs.length > 0) {
      console.error(`❌ Missing section markers detected (strict): ${missingEntries}`);
      process.exitCode = 1;
    } else {
      console.log('✅ No missing section markers (strict).');
    }
    return;
  }

  // baseline mode
  if (regressions.length > 0) {
    console.error(`❌ Regressions detected vs baseline: ${regressions.length}`);
    for (const r of regressions.slice(0, 30)) {
      console.error(`- [${r.locale}] ${r.slug}: missing ${r.section}`);
    }
    if (regressions.length > 30) console.error(`... and ${regressions.length - 30} more`);
    process.exitCode = 1;
    return;
  }

  console.log('✅ No regressions vs baseline.');

  // Helpful: show how many baseline issues remain (so we can track progress).
  const remaining = baseline.entries.filter((e) => currentKeys.has(keyOf(e)));
  console.log(`   baseline remaining: ${remaining.length} / ${baseline.entries.length}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});

