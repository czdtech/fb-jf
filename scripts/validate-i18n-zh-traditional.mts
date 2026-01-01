#!/usr/bin/env node
/**
 * Validate Chinese (zh) content for Traditional Chinese residue regressions.
 *
 * Goal:
 * - /zh 作为 zh-CN（简体）站点输出，避免“简繁混用”。
 * - 使用 OpenCC（t -> cn）做检测：若转换后文本发生变化，则视为繁体/异体残留。
 *
 * Scans (zh-facing content):
 * - src/content/games/*.zh.md
 * - src/pages/zh 下所有 .astro（递归）
 * - src/components 下所有 *.zh.astro（递归）
 * - src/i18n/zh.json
 *
 * Exit code:
 * - default: 1 if regressions vs baseline, else 0
 * - --strict: 1 if any match exists, else 0
 * - --no-baseline: always 0 (report-only)
 * - --update-baseline: write baseline and exit 0
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import * as OpenCC from 'opencc-js';

type CountKey = 'changedLines';
type Counts = Record<CountKey, number>;

interface MatchLine {
  line: number;
  before: string;
  after: string;
}

interface FileResult {
  file: string; // basename
  path: string; // repo-relative path
  urlstr?: string;
  total: number;
  counts: Counts;
  samples: MatchLine[];
}

interface BaselineFile {
  generatedAt: string;
  scope: string;
  version: number;
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
  config: {
    maxSamplesPerFile: number;
    strict: boolean;
  };
  totals: {
    totalFiles: number;
    flaggedFiles: number;
    counts: Counts;
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
  'config',
  'i18n',
  'baselines',
  'zh-traditional-baseline.json'
);
const DEFAULT_REPORT_PATH = 'i18n-zh-traditional-mix-report.json';
const DEFAULT_CSV_PATH = 'i18n-zh-traditional-mix-report.csv';
const DEFAULT_URLS_PATH = 'i18n-zh-traditional-mix-report.urls.txt';

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const PAGES_ZH_DIR = path.join(process.cwd(), 'src', 'pages', 'zh');
const COMPONENTS_DIR = path.join(process.cwd(), 'src', 'components');
const I18N_ZH_JSON = path.join(process.cwd(), 'src', 'i18n', 'zh.json');

const converter = OpenCC.Converter({ from: 't', to: 'cn' });

function stabilize(input: string): string {
  let cur = input;
  for (let i = 0; i < 5; i++) {
    const next = converter(cur);
    if (next === cur) return cur;
    cur = next;
  }
  return cur;
}

function emptyCounts(): Counts {
  return { changedLines: 0 };
}

function addCounts(a: Counts, b: Counts): Counts {
  return { changedLines: a.changedLines + b.changedLines };
}

function stripBom(s: string): string {
  return s.replace(/^\uFEFF/, '');
}

function parseFrontmatterStringValue(lines: string[], key: string): string | null {
  if (lines.length === 0) return null;
  const first = stripBom(lines[0]).trim();
  if (first !== '---') return null;

  const keyRe = new RegExp(`^\\s*${key}\\s*:\\s*(.+?)\\s*$`);
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') break;

    const m = keyRe.exec(line);
    if (!m) continue;

    const raw = m[1].trim();
    if (!raw) return null;

    const dq = /^"([^"]+)"$/.exec(raw);
    if (dq) return dq[1];
    const sq = /^'([^']+)'$/.exec(raw);
    if (sq) return sq[1];

    const noComment = raw.replace(/\s+#.*$/, '').trim();
    return noComment || null;
  }

  return null;
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

function scanTextLines(
  lines: string[],
  maxSamplesPerFile: number
): { counts: Counts; samples: MatchLine[] } {
  const counts = emptyCounts();
  const samples: MatchLine[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const before = lines[idx];
    const after = stabilize(before);
    if (before === after) continue;

    counts.changedLines += 1;
    if (samples.length < maxSamplesPerFile) {
      samples.push({ line: idx + 1, before, after });
    }
  }

  return { counts, samples };
}

async function scanGameMarkdownFile(
  absPath: string,
  relPath: string,
  maxSamplesPerFile: number
): Promise<FileResult> {
  const raw = await fs.readFile(absPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const urlstr = parseFrontmatterStringValue(lines, 'urlstr') ?? undefined;
  const { counts, samples } = scanTextLines(lines, maxSamplesPerFile);
  const total = counts.changedLines;

  return { file: path.basename(relPath), path: relPath, urlstr, total, counts, samples };
}

async function scanTextFile(
  absPath: string,
  relPath: string,
  maxSamplesPerFile: number
): Promise<FileResult> {
  const raw = await fs.readFile(absPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const { counts, samples } = scanTextLines(lines, maxSamplesPerFile);
  const total = counts.changedLines;
  return { file: path.basename(relPath), path: relPath, total, counts, samples };
}

async function scanZhJsonFile(
  absPath: string,
  relPath: string,
  maxSamplesPerFile: number
): Promise<FileResult> {
  const raw = await fs.readFile(absPath, 'utf8');
  const json = JSON.parse(raw) as unknown;

  const counts = emptyCounts();
  const samples: MatchLine[] = [];

  function walk(value: unknown, keyPath: string[]) {
    if (typeof value === 'string') {
      // languages labels are intentionally native names (non-zh text), do not convert or flag.
      if (keyPath.length >= 1 && keyPath[0] === 'languages') return;

      const before = value;
      const after = stabilize(before);
      if (before === after) return;

      counts.changedLines += 1;
      if (samples.length < maxSamplesPerFile) {
        samples.push({
          line: 1,
          before: `[${keyPath.join('.')}] ${before}`,
          after: `[${keyPath.join('.')}] ${after}`,
        });
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, [...keyPath, String(i)]));
      return;
    }

    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        walk(v, [...keyPath, k]);
      }
    }
  }

  walk(json, []);

  const total = counts.changedLines;
  return { file: path.basename(relPath), path: relPath, total, counts, samples };
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
    maxSamplesPerFile: 5,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--baseline' && args[i + 1]) {
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
      if (Number.isFinite(n) && n >= 0) opts.maxSamplesPerFile = Math.floor(n);
    } else if (a === '--help' || a === '-h') {
      console.log(`
Validate zh Traditional residue (baseline gate)

Usage:
  tsx scripts/validate-i18n-zh-traditional.mts [options]

Options:
  --baseline <path>        Baseline JSON (default: ${DEFAULT_BASELINE_PATH})
  --report <path>          Output report JSON (default: ${DEFAULT_REPORT_PATH})
  --csv <path>             Output report CSV summary (default: ${DEFAULT_CSV_PATH})
  --urls <path>            Output report URLs list (default: ${DEFAULT_URLS_PATH})
  --no-baseline            Report-only (never fail)
  --update-baseline        Overwrite baseline with current scan (never fail)
  --strict                 Fail if ANY match exists (ignore baseline)
  --max-samples <n>        Samples per file in JSON (default: 5)
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

  const gameFiles = (await fs.readdir(GAMES_DIR))
    .filter((f) => f.endsWith('.zh.md'))
    .sort((a, b) => a.localeCompare(b));

  const pageAstroFiles = await walkFilesRecursive(
    PAGES_ZH_DIR,
    (rel) => rel.startsWith('src/pages/zh/') && rel.endsWith('.astro')
  );

  const componentZhAstroFiles = await walkFilesRecursive(
    COMPONENTS_DIR,
    (rel) => rel.startsWith('src/components/') && rel.endsWith('.zh.astro')
  );

  const hasI18nZhJson = await fileExists(I18N_ZH_JSON);

  const totalFilesScanned =
    gameFiles.length + pageAstroFiles.length + componentZhAstroFiles.length + (hasI18nZhJson ? 1 : 0);

  const results: FileResult[] = [];
  let totals = emptyCounts();
  let flaggedFiles = 0;

  for (const file of gameFiles) {
    const absPath = path.join(GAMES_DIR, file);
    const relPath = path.join('src', 'content', 'games', file).replace(/\\/g, '/');
    const scanned = await scanGameMarkdownFile(absPath, relPath, opts.maxSamplesPerFile);
    if (scanned.total > 0) {
      flaggedFiles += 1;
      totals = addCounts(totals, scanned.counts);
      results.push(scanned);
    }
  }

  for (const absPath of pageAstroFiles) {
    const relPath = path.relative(process.cwd(), absPath).replace(/\\/g, '/');
    const scanned = await scanTextFile(absPath, relPath, opts.maxSamplesPerFile);
    if (scanned.total > 0) {
      flaggedFiles += 1;
      totals = addCounts(totals, scanned.counts);
      results.push(scanned);
    }
  }

  for (const absPath of componentZhAstroFiles) {
    const relPath = path.relative(process.cwd(), absPath).replace(/\\/g, '/');
    const scanned = await scanTextFile(absPath, relPath, opts.maxSamplesPerFile);
    if (scanned.total > 0) {
      flaggedFiles += 1;
      totals = addCounts(totals, scanned.counts);
      results.push(scanned);
    }
  }

  if (hasI18nZhJson) {
    const relPath = path.relative(process.cwd(), I18N_ZH_JSON).replace(/\\/g, '/');
    const scanned = await scanZhJsonFile(I18N_ZH_JSON, relPath, opts.maxSamplesPerFile);
    if (scanned.total > 0) {
      flaggedFiles += 1;
      totals = addCounts(totals, scanned.counts);
      results.push(scanned);
    }
  }

  results.sort((a, b) => b.total - a.total || a.path.localeCompare(b.path));

  let regressions: ScanReport['regressions'] = undefined;

  if (!opts.noBaseline && !opts.updateBaseline) {
    if (!(await fileExists(opts.baselinePath))) {
      console.error(`❌ Baseline not found: ${opts.baselinePath}`);
      console.error(
        `   Run: tsx ${path.join('scripts', 'validate-i18n-zh-traditional.mts')} --update-baseline`
      );
      process.exitCode = 2;
      return;
    }

    const raw = await fs.readFile(opts.baselinePath, 'utf8');
    const baseline = JSON.parse(raw) as BaselineFile;

    const baselineFiles = baseline.files ?? {};
    const fileToCounts = new Map<string, Counts>();
    for (const r of results) fileToCounts.set(r.path, r.counts);

    const deltas: Array<{ path: string; baseline: Counts; current: Counts }> = [];
    for (const [relPath, currentCounts] of fileToCounts.entries()) {
      const baseCounts = baselineFiles[relPath] ?? emptyCounts();
      if (currentCounts.changedLines > baseCounts.changedLines) {
        deltas.push({ path: relPath, baseline: baseCounts, current: currentCounts });
      }
    }

    deltas.sort((a, b) => b.current.changedLines - a.current.changedLines || a.path.localeCompare(b.path));
    regressions = deltas.length > 0 ? deltas : undefined;
  }

  const report: ScanReport = {
    generatedAt: new Date().toISOString(),
    scope:
      'src/content/games/*.zh.md + src/pages/zh/**/*.astro + src/components/**/*.zh.astro + src/i18n/zh.json',
    config: {
      maxSamplesPerFile: opts.maxSamplesPerFile,
      strict: opts.strict,
    },
    totals: {
      totalFiles: totalFilesScanned,
      flaggedFiles,
      counts: totals,
    },
    top20: results.slice(0, 20),
    files: results,
  };

  if (regressions) report.regressions = regressions;

  await writeJson(opts.reportPath, report);

  const csvRows: string[] = [];
  csvRows.push(toCsvRow(['file', 'total', 'changedLines']));
  for (const r of results) {
    csvRows.push(toCsvRow([r.path, r.total, r.counts.changedLines]));
  }
  await writeCsv(opts.csvPath, csvRows);

  const refs = results.map((r) => {
    if (r.path.startsWith('src/content/games/') && r.path.endsWith('.zh.md')) {
      const slug =
        r.urlstr ?? r.path.replace(/^src\/content\/games\//, '').replace(/\.zh\.md$/, '');
      return `/zh/${slug}/`;
    }

    if (r.path.startsWith('src/pages/zh/') && r.path.endsWith('.astro')) {
      const page = r.path.replace(/^src\/pages\//, '').replace(/\.astro$/, '');
      if (page === 'zh/index') return '/zh/';
      return `/${page.replace(/\/index$/, '')}/`;
    }

    return `FILE:${r.path}`;
  });
  await writeText(opts.urlsPath, refs.join('\n') + '\n');

  if (opts.updateBaseline) {
    const baselineOut: BaselineFile = {
      generatedAt: new Date().toISOString(),
      scope:
        'src/content/games/*.zh.md + src/pages/zh/**/*.astro + src/components/**/*.zh.astro + src/i18n/zh.json',
      version: 1,
      files: Object.fromEntries(results.map((r) => [r.path, r.counts])),
      totals: {
        totalFiles: totalFilesScanned,
        flaggedFiles,
        counts: totals,
      },
    };
    await writeJson(opts.baselinePath, baselineOut);
    console.log(`✅ Baseline updated: ${opts.baselinePath}`);
    console.log(`   (report: ${opts.reportPath}, csv: ${opts.csvPath})`);
    return;
  }

  if (opts.strict) {
    if (results.length > 0) {
      console.error(`❌ zh Traditional residue found in ${results.length} files (strict mode).`);
      console.error(`   report: ${opts.reportPath}`);
      console.error(`   csv: ${opts.csvPath}`);
      console.error(`   urls: ${opts.urlsPath}`);
      process.exitCode = 1;
      return;
    }
    console.log(`✅ zh Traditional residue check passed (strict mode).`);
    console.log(`   report: ${opts.reportPath}`);
    return;
  }

  if (opts.noBaseline) {
    console.log(`✅ zh Traditional residue report generated (no-baseline).`);
    console.log(`   flagged files: ${flaggedFiles}/${totalFilesScanned}`);
    console.log(`   report: ${opts.reportPath}`);
    console.log(`   csv: ${opts.csvPath}`);
    console.log(`   urls: ${opts.urlsPath}`);
    return;
  }

  if (regressions && regressions.length > 0) {
    console.error(`❌ zh Traditional residue REGRESSION detected: ${regressions.length} file(s).`);
    for (const r of regressions.slice(0, 10)) {
      console.error(
        `- ${r.path}: baseline=${JSON.stringify(r.baseline)} current=${JSON.stringify(r.current)}`
      );
    }
    if (regressions.length > 10) console.error(`  ... and ${regressions.length - 10} more`);
    console.error(`report: ${opts.reportPath}`);
    console.error(`csv: ${opts.csvPath}`);
    console.error(`urls: ${opts.urlsPath}`);
    process.exitCode = 1;
    return;
  }

  console.log(`✅ zh Traditional residue check passed (baseline gate).`);
  console.log(`   flagged files: ${flaggedFiles}/${totalFilesScanned} (allowed to decrease over time)`);
  console.log(`   report: ${opts.reportPath}`);
  console.log(`   csv: ${opts.csvPath}`);
  console.log(`   urls: ${opts.urlsPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
