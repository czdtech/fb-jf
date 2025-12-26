#!/usr/bin/env node
/**
 * Validate non-English locales for terminology consistency regressions.
 *
 * Why baseline mode:
 * - “术语统一”会逐步扩展规则；不应一次性把所有历史内容卡死；
 * - 因此默认采用“基线 + 回归检测”：允许现存问题，但不允许新增/变多。
 *
 * Locales (default):
 * - ja, ko, es, fr, de
 *
 * Rules source (per locale):
 * - docs/i18n/terminology.{locale}.json
 *
 * Scans (per locale):
 * - src/content/games/*.{locale}.md
 * - src/pages/{locale} 下所有 .astro（递归）
 * - src/components 下所有 *.{locale}.astro（递归）
 * - src/i18n/{locale}.json
 *
 * Exit code:
 * - default: 1 if regressions vs baseline, else 0
 * - --strict: 1 if any match exists, else 0
 * - --no-baseline: always 0 (report-only)
 * - --update-baseline: write baseline and exit 0
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

type Locale = 'ja' | 'ko' | 'es' | 'fr' | 'de';
const DEFAULT_LOCALES: Locale[] = ['ja', 'ko', 'es', 'fr', 'de'];

type RuleKind = 'plain' | 'regex';

interface TerminologyRule {
  id: string;
  kind: RuleKind;
  from: string;
  to?: string;
  flags?: string;
  note?: string;
}

interface RuleFile {
  locale: Locale;
  version: number;
  rules: TerminologyRule[];
}

interface MatchRef {
  line?: number;
  keyPath?: string;
  text: string;
}

type Counts = Record<string, number>; // key: rule id

interface FileResult {
  locale: Locale;
  file: string; // basename
  path: string; // repo-relative path
  total: number;
  counts: Counts;
  samples: Record<string, MatchRef[]>;
}

interface BaselineFile {
  generatedAt: string;
  scope: string;
  version: number;
  locales: Locale[];
  rulesHash: string;
  files: Record<string, Counts>; // key: repo-relative path
  totals: {
    totalFiles: number;
    flaggedFiles: number;
    counts: Counts;
  };
}

interface ScanReport {
  generatedAt: string;
  scope: string;
  locales: Locale[];
  rulesHash: string;
  config: {
    maxSamplesPerRule: number;
    strict: boolean;
  };
  totals: {
    totalFiles: number;
    flaggedFiles: number;
    counts: Counts;
    byLocale: Record<Locale, { totalFiles: number; flaggedFiles: number; counts: Counts }>;
  };
  regressions?: Array<{
    path: string;
    baseline: Counts;
    current: Counts;
  }>;
  top20: FileResult[];
  files: FileResult[];
}

const DEFAULT_BASELINE_PATH = path.join(
  '.kiro',
  'specs',
  'i18n-style-harmonization-lite',
  'terminology-baseline.json'
);
const DEFAULT_REPORT_PATH = 'i18n-terminology-report.json';
const DEFAULT_CSV_PATH = 'i18n-terminology-report.csv';
const DEFAULT_URLS_PATH = 'i18n-terminology-report.urls.txt';

const RULES_DIR = path.join(process.cwd(), 'docs', 'i18n');
const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const PAGES_DIR = path.join(process.cwd(), 'src', 'pages');
const COMPONENTS_DIR = path.join(process.cwd(), 'src', 'components');
const I18N_DIR = path.join(process.cwd(), 'src', 'i18n');

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

function toCsvRow(values: Array<string | number>): string {
  return values
    .map((v) => {
      const s = String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    })
    .join(',');
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function writeCsv(filePath: string, rows: string[]): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, rows.join('\n') + '\n', 'utf8');
}

async function writeText(filePath: string, text: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, text, 'utf8');
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function walkFilesRecursive(
  rootDir: string,
  filter: (repoRelPath: string) => boolean
): Promise<string[]> {
  const out: string[] = [];

  async function walk(absDir: string): Promise<void> {
    const entries = await fs.readdir(absDir, { withFileTypes: true });
    for (const e of entries) {
      const abs = path.join(absDir, e.name);
      if (e.isDirectory()) {
        await walk(abs);
        continue;
      }
      const rel = path.relative(process.cwd(), abs).replace(/\\/g, '/');
      if (filter(rel)) out.push(abs);
    }
  }

  try {
    await walk(rootDir);
  } catch (err) {
    if ((err as { code?: string }).code === 'ENOENT') return [];
    throw err;
  }

  out.sort((a, b) => a.localeCompare(b));
  return out;
}

function ensureGlobalFlags(flags: string | undefined): string {
  const f = flags ?? 'g';
  return f.includes('g') ? f : `${f}g`;
}

type CompiledRule =
  | { id: string; kind: 'plain'; from: string }
  | { id: string; kind: 'regex'; re: RegExp };

function compileRules(rules: TerminologyRule[]): CompiledRule[] {
  return rules.map((r) => {
    if (r.kind === 'plain') return { id: r.id, kind: 'plain', from: r.from };
    const flags = ensureGlobalFlags(r.flags);
    return { id: r.id, kind: 'regex', re: new RegExp(r.from, flags) };
  });
}

function countPlain(needle: string, haystack: string): number {
  if (!needle) return 0;
  let idx = 0;
  let count = 0;
  while (true) {
    const hit = haystack.indexOf(needle, idx);
    if (hit < 0) break;
    count += 1;
    idx = hit + needle.length;
  }
  return count;
}

function countRuleInText(rule: CompiledRule, text: string): number {
  if (!text) return 0;
  if (rule.kind === 'plain') return countPlain(rule.from, text);
  const m = text.match(rule.re);
  return m ? m.length : 0;
}

function emptyCounts(ruleIds: string[]): Counts {
  const out: Counts = {};
  for (const id of ruleIds) out[id] = 0;
  return out;
}

function addCounts(a: Counts, b: Counts): Counts {
  const out: Counts = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] ?? 0) + v;
  return out;
}

function sumTotal(counts: Counts): number {
  let total = 0;
  for (const v of Object.values(counts)) total += v;
  return total;
}

function stripInlineCodeSegments(line: string): string {
  const parts = line.split(/(`+)/);
  let inCode = false;
  let out = '';
  for (const p of parts) {
    if (p.startsWith('`')) {
      inCode = !inCode;
      out += p;
      continue;
    }
    out += inCode ? p.replace(/./g, ' ') : p;
  }
  return out;
}

function scanLinesForRules(
  lines: string[],
  lineOffset: number,
  compiled: CompiledRule[],
  maxSamplesPerRule: number,
  opts?: { markdown?: boolean }
): { counts: Counts; samples: Record<string, MatchRef[]> } {
  const ruleIds = compiled.map((r) => r.id);
  const counts = emptyCounts(ruleIds);
  const samples: Record<string, MatchRef[]> = {};
  for (const id of ruleIds) samples[id] = [];

  let inCodeFence = false;
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNo = lineOffset + i + 1;

    if (opts?.markdown) {
      if (/^\s*```/.test(rawLine)) {
        inCodeFence = !inCodeFence;
        continue;
      }
      if (inCodeFence) continue;
    }

    const line = opts?.markdown ? stripInlineCodeSegments(rawLine) : rawLine;

    for (const r of compiled) {
      const n = countRuleInText(r, line);
      if (n <= 0) continue;
      counts[r.id] = (counts[r.id] ?? 0) + n;
      if (samples[r.id].length < maxSamplesPerRule) samples[r.id].push({ line: lineNo, text: rawLine });
    }
  }

  return { counts, samples };
}

function scanMarkdownWithFrontmatter(
  raw: string,
  compiled: CompiledRule[],
  maxSamplesPerRule: number
): { counts: Counts; samples: Record<string, MatchRef[]> } {
  const lines = raw.split(/\r?\n/);
  const fmEnd = findFrontmatterEnd(lines);
  if (fmEnd <= 0) return scanLinesForRules(lines, 0, compiled, maxSamplesPerRule, { markdown: true });

  const ruleIds = compiled.map((r) => r.id);
  let counts = emptyCounts(ruleIds);
  const samples: Record<string, MatchRef[]> = {};
  for (const id of ruleIds) samples[id] = [];

  const fmLines = lines.slice(0, fmEnd);
  const bodyLines = lines.slice(fmEnd);

  let inDescBlock = false;
  let descIndent: string | null = null;

  for (let i = 0; i < fmLines.length; i++) {
    const line = fmLines[i];
    const lineNo = i + 1;

    if (line.trim() === '---') continue;

    const titleMatch = /^\s*title\s*:\s*(.+?)\s*$/.exec(line);
    if (titleMatch) {
      const v = titleMatch[1] ?? '';
      for (const r of compiled) {
        const n = countRuleInText(r, v);
        if (n <= 0) continue;
        counts[r.id] = (counts[r.id] ?? 0) + n;
        if (samples[r.id].length < maxSamplesPerRule) samples[r.id].push({ line: lineNo, text: line });
      }
      continue;
    }

    const descMatch = /^\s*description\s*:\s*(.*)\s*$/.exec(line);
    if (descMatch) {
      const rest = (descMatch[1] ?? '').trim();
      if (!rest) continue;

      const isBlock = /^[>|]/.test(rest);
      if (!isBlock) {
        for (const r of compiled) {
          const n = countRuleInText(r, rest);
          if (n <= 0) continue;
          counts[r.id] = (counts[r.id] ?? 0) + n;
          if (samples[r.id].length < maxSamplesPerRule) samples[r.id].push({ line: lineNo, text: line });
        }
        continue;
      }

      inDescBlock = true;
      descIndent = null;
      continue;
    }

    if (inDescBlock) {
      if (line.trim() === '---') {
        inDescBlock = false;
        descIndent = null;
        continue;
      }

      if (descIndent === null) {
        const m = /^(\s+)\S/.exec(line);
        if (!m) {
          if (line.trim() === '') continue;
          inDescBlock = false;
          continue;
        }
        descIndent = m[1];
      }

      if (!line.startsWith(descIndent)) {
        inDescBlock = false;
        descIndent = null;
        continue;
      }

      for (const r of compiled) {
        const n = countRuleInText(r, line);
        if (n <= 0) continue;
        counts[r.id] = (counts[r.id] ?? 0) + n;
        if (samples[r.id].length < maxSamplesPerRule) samples[r.id].push({ line: lineNo, text: line });
      }
    }
  }

  const bodyScan = scanLinesForRules(bodyLines, fmEnd, compiled, maxSamplesPerRule, { markdown: true });
  counts = addCounts(counts, bodyScan.counts);
  for (const [id, rows] of Object.entries(bodyScan.samples)) {
    if (!samples[id]) samples[id] = [];
    for (const s of rows) {
      if (samples[id].length >= maxSamplesPerRule) break;
      samples[id].push(s);
    }
  }

  return { counts, samples };
}

function scanAstroSkippingFrontmatter(
  raw: string,
  compiled: CompiledRule[],
  maxSamplesPerRule: number
): { counts: Counts; samples: Record<string, MatchRef[]> } {
  const lines = raw.split(/\r?\n/);
  const fmEnd = findFrontmatterEnd(lines);
  const scanLines = fmEnd > 0 ? lines.slice(fmEnd) : lines;
  const offset = fmEnd > 0 ? fmEnd : 0;
  return scanLinesForRules(scanLines, offset, compiled, maxSamplesPerRule);
}

function scanJsonValues(
  raw: string,
  compiled: CompiledRule[],
  maxSamplesPerRule: number
): { counts: Counts; samples: Record<string, MatchRef[]> } {
  const ruleIds = compiled.map((r) => r.id);
  const counts = emptyCounts(ruleIds);
  const samples: Record<string, MatchRef[]> = {};
  for (const id of ruleIds) samples[id] = [];

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const lineScan = scanLinesForRules(raw.split(/\r?\n/), 0, compiled, maxSamplesPerRule);
    return lineScan;
  }

  function walk(v: unknown, keyPath: string): void {
    if (typeof v === 'string') {
      for (const r of compiled) {
        const n = countRuleInText(r, v);
        if (n <= 0) continue;
        counts[r.id] = (counts[r.id] ?? 0) + n;
        if (samples[r.id].length < maxSamplesPerRule) samples[r.id].push({ keyPath, text: v });
      }
      return;
    }
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) walk(v[i], `${keyPath}[${i}]`);
      return;
    }
    if (v && typeof v === 'object') {
      for (const [k, child] of Object.entries(v as Record<string, unknown>)) {
        const next = keyPath ? `${keyPath}.${k}` : k;
        walk(child, next);
      }
    }
  }

  walk(parsed, '');
  return { counts, samples };
}

function pageRelPathToUrl(locale: Locale, relPath: string): string | null {
  if (!relPath.startsWith(`src/pages/${locale}/`) || !relPath.endsWith('.astro')) return null;
  if (relPath.includes('[')) return null;

  const withoutPrefix = relPath.replace(/^src\/pages/, '');
  const withoutExt = withoutPrefix.replace(/\.astro$/, '');
  if (withoutExt === `/${locale}/index`) return `/${locale}/`;
  if (withoutExt.endsWith('/index')) return `${withoutExt.replace(/\/index$/, '')}/`;
  return `${withoutExt}/`;
}

async function loadRuleFile(locale: Locale): Promise<RuleFile> {
  const abs = path.join(RULES_DIR, `terminology.${locale}.json`);
  const raw = await fs.readFile(abs, 'utf8');
  const parsed = JSON.parse(raw) as RuleFile;
  if (!parsed || parsed.locale !== locale || !Array.isArray(parsed.rules)) {
    throw new Error(`Invalid terminology rules file: ${abs}`);
  }
  return parsed;
}

function hashRuleFiles(files: RuleFile[]): string {
  const payload = JSON.stringify(
    files
      .slice()
      .sort((a, b) => a.locale.localeCompare(b.locale))
      .map((f) => ({ locale: f.locale, version: f.version, rules: f.rules }))
  );
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 12);
}

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const opts = {
    baselinePath: DEFAULT_BASELINE_PATH,
    reportPath: DEFAULT_REPORT_PATH,
    csvPath: DEFAULT_CSV_PATH,
    urlsPath: DEFAULT_URLS_PATH,
    noBaseline: false,
    updateBaseline: false,
    strict: false,
    maxSamplesPerRule: 5,
    locales: DEFAULT_LOCALES as Locale[],
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
    } else if (a === '--baseline' && args[i + 1]) {
      opts.baselinePath = args[++i];
    } else if (a === '--report' && args[i + 1]) {
      opts.reportPath = args[++i];
    } else if (a === '--csv' && args[i + 1]) {
      opts.csvPath = args[++i];
    } else if (a === '--urls' && args[i + 1]) {
      opts.urlsPath = args[++i];
    } else if (a === '--no-baseline') {
      opts.noBaseline = true;
    } else if (a === '--update-baseline') {
      opts.updateBaseline = true;
    } else if (a === '--strict') {
      opts.strict = true;
    } else if (a === '--max-samples' && args[i + 1]) {
      const n = Number(args[++i]);
      if (Number.isFinite(n) && n >= 0) opts.maxSamplesPerRule = Math.floor(n);
    } else if (a === '--help' || a === '-h') {
      console.log(`
Validate other locales terminology (baseline gate)

Usage:
  tsx scripts/validate-i18n-terminology.mts [options]

Options:
  --locales <a,b,c>        Locales to scan (default: ${DEFAULT_LOCALES.join(',')})
  --baseline <path>        Baseline JSON (default: ${DEFAULT_BASELINE_PATH})
  --report <path>          Output report JSON (default: ${DEFAULT_REPORT_PATH})
  --csv <path>             Output report CSV (default: ${DEFAULT_CSV_PATH})
  --urls <path>            Output report URLs list (default: ${DEFAULT_URLS_PATH})
  --no-baseline            Report-only (never fail)
  --update-baseline        Overwrite baseline with current scan (never fail)
  --strict                 Fail if ANY match exists (ignore baseline)
  --max-samples <n>        Samples per rule in JSON (default: 5)
`);
      process.exit(0);
    }
  }

  if (opts.strict) {
    opts.noBaseline = true;
  }

  return opts;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);

  const ruleFiles: RuleFile[] = [];
  const compiledByLocale = new Map<Locale, CompiledRule[]>();
  const ruleIdsAll = new Set<string>();

  for (const locale of opts.locales) {
    const rf = await loadRuleFile(locale);
    ruleFiles.push(rf);
    const compiled = compileRules(rf.rules ?? []);
    compiledByLocale.set(locale, compiled);
    for (const r of compiled) ruleIdsAll.add(r.id);
  }

  const rulesHash = hashRuleFiles(ruleFiles);
  const allRuleIds = Array.from(ruleIdsAll).sort((a, b) => a.localeCompare(b));

  const results: FileResult[] = [];
  let totals = emptyCounts(allRuleIds);
  let flaggedFiles = 0;
  let totalFilesScanned = 0;

  const byLocale: ScanReport['totals']['byLocale'] = {
    ja: { totalFiles: 0, flaggedFiles: 0, counts: emptyCounts(allRuleIds) },
    ko: { totalFiles: 0, flaggedFiles: 0, counts: emptyCounts(allRuleIds) },
    es: { totalFiles: 0, flaggedFiles: 0, counts: emptyCounts(allRuleIds) },
    fr: { totalFiles: 0, flaggedFiles: 0, counts: emptyCounts(allRuleIds) },
    de: { totalFiles: 0, flaggedFiles: 0, counts: emptyCounts(allRuleIds) },
  };

  for (const locale of opts.locales) {
    const compiled = compiledByLocale.get(locale) ?? [];

    const gameFiles = (await fs.readdir(GAMES_DIR))
      .filter((f) => f.endsWith(`.${locale}.md`))
      .sort((a, b) => a.localeCompare(b));

    const pageAstroFiles = await walkFilesRecursive(
      path.join(PAGES_DIR, locale),
      (rel) => rel.startsWith(`src/pages/${locale}/`) && rel.endsWith('.astro')
    );

    const componentLocaleAstroFiles = await walkFilesRecursive(
      COMPONENTS_DIR,
      (rel) => rel.startsWith('src/components/') && rel.endsWith(`.${locale}.astro`)
    );

    const localeJsonAbs = path.join(I18N_DIR, `${locale}.json`);
    const hasLocaleJson = await fileExists(localeJsonAbs);

    const localeTotal =
      gameFiles.length + pageAstroFiles.length + componentLocaleAstroFiles.length + (hasLocaleJson ? 1 : 0);
    byLocale[locale].totalFiles = localeTotal;
    totalFilesScanned += localeTotal;

    for (const file of gameFiles) {
      const absPath = path.join(GAMES_DIR, file);
      const relPath = path.join('src', 'content', 'games', file).replace(/\\/g, '/');
      const raw = await fs.readFile(absPath, 'utf8');
      const scanned = scanMarkdownWithFrontmatter(raw, compiled, opts.maxSamplesPerRule);
      const total = sumTotal(scanned.counts);
      if (total > 0) {
        flaggedFiles += 1;
        byLocale[locale].flaggedFiles += 1;
        totals = addCounts(totals, scanned.counts);
        byLocale[locale].counts = addCounts(byLocale[locale].counts, scanned.counts);
        results.push({
          locale,
          file,
          path: relPath,
          total,
          counts: scanned.counts,
          samples: scanned.samples,
        });
      }
    }

    for (const absPath of pageAstroFiles) {
      const relPath = path.relative(process.cwd(), absPath).replace(/\\/g, '/');
      const raw = await fs.readFile(absPath, 'utf8');
      const scanned = scanAstroSkippingFrontmatter(raw, compiled, opts.maxSamplesPerRule);
      const total = sumTotal(scanned.counts);
      if (total > 0) {
        flaggedFiles += 1;
        byLocale[locale].flaggedFiles += 1;
        totals = addCounts(totals, scanned.counts);
        byLocale[locale].counts = addCounts(byLocale[locale].counts, scanned.counts);
        results.push({
          locale,
          file: path.basename(relPath),
          path: relPath,
          total,
          counts: scanned.counts,
          samples: scanned.samples,
        });
      }
    }

    for (const absPath of componentLocaleAstroFiles) {
      const relPath = path.relative(process.cwd(), absPath).replace(/\\/g, '/');
      const raw = await fs.readFile(absPath, 'utf8');
      const scanned = scanAstroSkippingFrontmatter(raw, compiled, opts.maxSamplesPerRule);
      const total = sumTotal(scanned.counts);
      if (total > 0) {
        flaggedFiles += 1;
        byLocale[locale].flaggedFiles += 1;
        totals = addCounts(totals, scanned.counts);
        byLocale[locale].counts = addCounts(byLocale[locale].counts, scanned.counts);
        results.push({
          locale,
          file: path.basename(relPath),
          path: relPath,
          total,
          counts: scanned.counts,
          samples: scanned.samples,
        });
      }
    }

    if (hasLocaleJson) {
      const relPath = path.relative(process.cwd(), localeJsonAbs).replace(/\\/g, '/');
      const raw = await fs.readFile(localeJsonAbs, 'utf8');
      const scanned = scanJsonValues(raw, compiled, opts.maxSamplesPerRule);
      const total = sumTotal(scanned.counts);
      if (total > 0) {
        flaggedFiles += 1;
        byLocale[locale].flaggedFiles += 1;
        totals = addCounts(totals, scanned.counts);
        byLocale[locale].counts = addCounts(byLocale[locale].counts, scanned.counts);
        results.push({
          locale,
          file: path.basename(relPath),
          path: relPath,
          total,
          counts: scanned.counts,
          samples: scanned.samples,
        });
      }
    }
  }

  results.sort((a, b) => b.total - a.total || a.path.localeCompare(b.path));

  let regressions: ScanReport['regressions'] = undefined;

  if (!opts.noBaseline && !opts.updateBaseline) {
    if (!(await fileExists(opts.baselinePath))) {
      console.error(`❌ Baseline not found: ${opts.baselinePath}`);
      console.error(`   Run: tsx ${path.join('scripts', 'validate-i18n-terminology.mts')} --update-baseline`);
      process.exitCode = 2;
      return;
    }

    const raw = await fs.readFile(opts.baselinePath, 'utf8');
    const baseline = JSON.parse(raw) as BaselineFile;

    if (baseline.rulesHash && baseline.rulesHash !== rulesHash) {
      console.error(`❌ Baseline rulesHash mismatch: baseline=${baseline.rulesHash} current=${rulesHash}`);
      console.error(`   Run: tsx ${path.join('scripts', 'validate-i18n-terminology.mts')} --update-baseline`);
      process.exitCode = 2;
      return;
    }

    const baselineFiles = baseline.files ?? {};
    const deltas: Array<{ path: string; baseline: Counts; current: Counts }> = [];

    for (const r of results) {
      const baseCounts = baselineFiles[r.path] ?? emptyCounts(allRuleIds);
      let regressed = false;
      for (const id of allRuleIds) {
        const cur = r.counts[id] ?? 0;
        const base = baseCounts[id] ?? 0;
        if (cur > base) {
          regressed = true;
          break;
        }
      }
      if (regressed) deltas.push({ path: r.path, baseline: baseCounts, current: r.counts });
    }

    deltas.sort((a, b) => sumTotal(b.current) - sumTotal(a.current) || a.path.localeCompare(b.path));
    regressions = deltas.length > 0 ? deltas : undefined;
  }

  const report: ScanReport = {
    generatedAt: new Date().toISOString(),
    scope:
      'src/content/games/*.{ja,ko,es,fr,de}.md + src/pages/{ja,ko,es,fr,de}/**/*.astro + src/components/**/*.{ja,ko,es,fr,de}.astro + src/i18n/{ja,ko,es,fr,de}.json',
    locales: opts.locales,
    rulesHash,
    config: { maxSamplesPerRule: opts.maxSamplesPerRule, strict: opts.strict },
    totals: {
      totalFiles: totalFilesScanned,
      flaggedFiles,
      counts: totals,
      byLocale,
    },
    top20: results.slice(0, 20),
    files: results,
  };

  if (regressions) report.regressions = regressions;

  await writeJson(opts.reportPath, report);

  const csvRows: string[] = [];
  csvRows.push(toCsvRow(['locale', 'path', 'total', ...allRuleIds]));
  for (const r of results) {
    const row = [r.locale, r.path, r.total, ...allRuleIds.map((id) => r.counts[id] ?? 0)];
    csvRows.push(toCsvRow(row));
  }
  await writeCsv(opts.csvPath, csvRows);

  const urls: string[] = [];
  for (const r of results) {
    const url = pageRelPathToUrl(r.locale, r.path);
    if (url) urls.push(url);
  }
  await writeText(opts.urlsPath, urls.sort().join('\n') + (urls.length ? '\n' : ''));

  if (opts.updateBaseline) {
    const baseline: BaselineFile = {
      generatedAt: new Date().toISOString(),
      scope: report.scope,
      version: 1,
      locales: opts.locales,
      rulesHash,
      files: Object.fromEntries(results.map((r) => [r.path, r.counts])),
      totals: {
        totalFiles: totalFilesScanned,
        flaggedFiles,
        counts: totals,
      },
    };
    await writeJson(opts.baselinePath, baseline);
    console.log(`✅ Baseline updated: ${opts.baselinePath}`);
    return;
  }

  if (opts.strict) {
    if (flaggedFiles > 0) {
      console.error(`❌ Terminology matches found: ${flaggedFiles} files`);
      process.exitCode = 1;
      return;
    }
    console.log('✅ Terminology check passed (strict)');
    return;
  }

  if (regressions && regressions.length > 0) {
    console.error(`❌ Terminology regressions: ${regressions.length} files`);
    process.exitCode = 1;
    return;
  }

  console.log('✅ Terminology check passed (baseline gate)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

