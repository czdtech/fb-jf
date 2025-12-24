#!/usr/bin/env node
/**
 * Validate zh-CN wording for dispreferred (港澳台) terms.
 *
 * Why baseline mode:
 * - 历史内容可能存在少量“港台用词”；不应一次性把主流程卡死。
 * - 默认采用“基线 + 回归检测”：允许现存问题，但不允许新增/变多。
 *
 * Scope:
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

type CountKey =
  | 'benju'
  | 'touguo'
  | 'yizhao'
  | 'huashu'
  | 'tuoye'
  | 'yingmu'
  | 'mobileDevice'
  | 'audio';

type Counts = Record<CountKey, number>;

interface MatchLine {
  line: number;
  text: string;
}

interface FileResult {
  file: string; // basename
  path: string; // repo-relative path
  total: number;
  counts: Counts;
  samples: Record<CountKey, MatchLine[]>;
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
    maxSamplesPerCategory: number;
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
  '.kiro',
  'specs',
  'i18n-style-harmonization-lite',
  'zh-cn-wording-baseline.json'
);
const DEFAULT_REPORT_PATH = 'i18n-zh-cn-wording-report.json';
const DEFAULT_CSV_PATH = 'i18n-zh-cn-wording-report.csv';
const DEFAULT_URLS_PATH = 'i18n-zh-cn-wording-report.urls.txt';

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const PAGES_ZH_DIR = path.join(process.cwd(), 'src', 'pages', 'zh');
const COMPONENTS_DIR = path.join(process.cwd(), 'src', 'components');
const I18N_ZH_JSON = path.join(process.cwd(), 'src', 'i18n', 'zh.json');

const TERM_DEFS: Array<{ key: CountKey; re: RegExp; label: string }> = [
  { key: 'benju', re: /本局/g, label: '本局' },
  { key: 'touguo', re: /透过/g, label: '透过' },
  { key: 'yizhao', re: /依照/g, label: '依照' },
  { key: 'huashu', re: /滑鼠/g, label: '滑鼠' },
  { key: 'tuoye', re: /拖曳/g, label: '拖曳' },
  { key: 'yingmu', re: /萤幕/g, label: '萤幕' },
  { key: 'mobileDevice', re: /行动装置/g, label: '行动装置' },
  { key: 'audio', re: /音讯/g, label: '音讯' },
];

function emptyCounts(): Counts {
  return {
    benju: 0,
    touguo: 0,
    yizhao: 0,
    huashu: 0,
    tuoye: 0,
    yingmu: 0,
    mobileDevice: 0,
    audio: 0,
  };
}

function addCounts(a: Counts, b: Counts): Counts {
  return {
    benju: a.benju + b.benju,
    touguo: a.touguo + b.touguo,
    yizhao: a.yizhao + b.yizhao,
    huashu: a.huashu + b.huashu,
    tuoye: a.tuoye + b.tuoye,
    yingmu: a.yingmu + b.yingmu,
    mobileDevice: a.mobileDevice + b.mobileDevice,
    audio: a.audio + b.audio,
  };
}

function sumTotal(c: Counts): number {
  return (
    c.benju +
    c.touguo +
    c.yizhao +
    c.huashu +
    c.tuoye +
    c.yingmu +
    c.mobileDevice +
    c.audio
  );
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

  return out;
}

function countMatches(re: RegExp, s: string): number {
  const m = s.match(re);
  return m ? m.length : 0;
}

async function scanZhFile(
  absPath: string,
  relPath: string,
  maxSamplesPerCategory: number
): Promise<FileResult> {
  const raw = await fs.readFile(absPath, 'utf8');
  const lines = raw.split(/\r?\n/);

  const counts = emptyCounts();
  const samples: Record<CountKey, MatchLine[]> = {
    benju: [],
    touguo: [],
    yizhao: [],
    huashu: [],
    tuoye: [],
    yingmu: [],
    mobileDevice: [],
    audio: [],
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    for (const def of TERM_DEFS) {
      const n = countMatches(def.re, line);
      if (n <= 0) continue;
      counts[def.key] += n;
      if (samples[def.key].length < maxSamplesPerCategory) {
        samples[def.key].push({ line: idx + 1, text: line });
      }
    }
  }

  const total = sumTotal(counts);
  return { file: path.basename(relPath), path: relPath, total, counts, samples };
}

function pageRelPathToUrl(relPath: string): string | null {
  if (!relPath.startsWith('src/pages/zh/') || !relPath.endsWith('.astro')) return null;
  if (relPath.includes('[')) return null; // dynamic route

  const withoutPrefix = relPath.replace(/^src\/pages/, '');
  const withoutExt = withoutPrefix.replace(/\.astro$/, '');
  if (withoutExt === '/zh/index') return '/zh/';
  if (withoutExt.endsWith('/index')) return `${withoutExt.replace(/\/index$/, '')}/`;
  return `${withoutExt}/`;
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
    maxSamplesPerCategory: 5,
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
      if (Number.isFinite(n) && n >= 0) opts.maxSamplesPerCategory = Math.floor(n);
    } else if (a === '--help' || a === '-h') {
      console.log(`
Validate zh-CN wording residue (baseline gate)

Usage:
  tsx scripts/validate-i18n-zh-cn-wording.mts [options]

Options:
  --baseline <path>        Baseline JSON (default: ${DEFAULT_BASELINE_PATH})
  --report <path>          Output report JSON (default: ${DEFAULT_REPORT_PATH})
  --csv <path>             Output report CSV summary (default: ${DEFAULT_CSV_PATH})
  --urls <path>            Output report URLs list (default: ${DEFAULT_URLS_PATH})
  --no-baseline            Report-only (never fail)
  --update-baseline        Overwrite baseline with current scan (never fail)
  --strict                 Fail if ANY match exists (ignore baseline)
  --max-samples <n>        Samples per category in JSON (default: 5)
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

  const pageFiles = await walkFilesRecursive(
    PAGES_ZH_DIR,
    (rel) => rel.startsWith('src/pages/zh/') && rel.endsWith('.astro')
  );
  const componentFiles = await walkFilesRecursive(
    COMPONENTS_DIR,
    (rel) => rel.startsWith('src/components/') && rel.endsWith('.zh.astro')
  );
  const hasI18n = await fileExists(I18N_ZH_JSON);
  const totalFilesScanned = gameFiles.length + pageFiles.length + componentFiles.length + (hasI18n ? 1 : 0);

  const results: FileResult[] = [];
  let totals = emptyCounts();
  let flaggedFiles = 0;

  for (const file of gameFiles) {
    const absPath = path.join(GAMES_DIR, file);
    const relPath = path.join('src', 'content', 'games', file).replace(/\\/g, '/');
    const scanned = await scanZhFile(absPath, relPath, opts.maxSamplesPerCategory);
    if (scanned.total > 0) {
      flaggedFiles += 1;
      totals = addCounts(totals, scanned.counts);
      results.push(scanned);
    }
  }

  for (const absPath of pageFiles) {
    const relPath = path.relative(process.cwd(), absPath).replace(/\\/g, '/');
    const scanned = await scanZhFile(absPath, relPath, opts.maxSamplesPerCategory);
    if (scanned.total > 0) {
      flaggedFiles += 1;
      totals = addCounts(totals, scanned.counts);
      results.push(scanned);
    }
  }

  for (const absPath of componentFiles) {
    const relPath = path.relative(process.cwd(), absPath).replace(/\\/g, '/');
    const scanned = await scanZhFile(absPath, relPath, opts.maxSamplesPerCategory);
    if (scanned.total > 0) {
      flaggedFiles += 1;
      totals = addCounts(totals, scanned.counts);
      results.push(scanned);
    }
  }

  if (hasI18n) {
    const relPath = path.join('src', 'i18n', 'zh.json').replace(/\\/g, '/');
    const scanned = await scanZhFile(I18N_ZH_JSON, relPath, opts.maxSamplesPerCategory);
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
        `   Run: tsx ${path.join('scripts', 'validate-i18n-zh-cn-wording.mts')} --update-baseline`
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
      const regressed =
        currentCounts.benju > baseCounts.benju ||
        currentCounts.touguo > baseCounts.touguo ||
        currentCounts.yizhao > baseCounts.yizhao ||
        currentCounts.huashu > baseCounts.huashu ||
        currentCounts.tuoye > baseCounts.tuoye ||
        currentCounts.yingmu > baseCounts.yingmu ||
        currentCounts.mobileDevice > baseCounts.mobileDevice ||
        currentCounts.audio > baseCounts.audio;

      if (regressed) deltas.push({ path: relPath, baseline: baseCounts, current: currentCounts });
    }

    deltas.sort((a, b) => sumTotal(b.current) - sumTotal(a.current) || a.path.localeCompare(b.path));
    regressions = deltas.length > 0 ? deltas : undefined;
  }

  const report: ScanReport = {
    generatedAt: new Date().toISOString(),
    scope: 'src/content/games/*.zh.md + src/pages/zh/**/*.astro + src/components/**/*.zh.astro + src/i18n/zh.json',
    config: {
      maxSamplesPerCategory: opts.maxSamplesPerCategory,
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
  csvRows.push(
    toCsvRow([
      'file',
      'total',
      'benju',
      'touguo',
      'yizhao',
      'huashu',
      'tuoye',
      'yingmu',
      'mobileDevice',
      'audio',
    ])
  );
  for (const r of results) {
    csvRows.push(
      toCsvRow([
        r.path,
        r.total,
        r.counts.benju,
        r.counts.touguo,
        r.counts.yizhao,
        r.counts.huashu,
        r.counts.tuoye,
        r.counts.yingmu,
        r.counts.mobileDevice,
        r.counts.audio,
      ])
    );
  }
  await writeCsv(opts.csvPath, csvRows);

  const refs = results.map((r) => {
    if (r.path.startsWith('src/content/games/') && r.path.endsWith('.zh.md')) {
      const slug = r.path.replace(/^src\/content\/games\//, '').replace(/\.zh\.md$/, '');
      return `/zh/${slug}/`;
    }
    const pageUrl = pageRelPathToUrl(r.path);
    if (pageUrl) return pageUrl;
    return r.path;
  });
  await writeText(opts.urlsPath, refs.join('\n') + '\n');

  if (opts.updateBaseline) {
    const baselineOut: BaselineFile = {
      generatedAt: new Date().toISOString(),
      scope: 'src/content/games/*.zh.md + src/pages/zh/**/*.astro + src/components/**/*.zh.astro + src/i18n/zh.json',
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
      console.error(`❌ zh-CN wording residue found in ${results.length} files (strict mode).`);
      console.error(`   report: ${opts.reportPath}`);
      console.error(`   csv: ${opts.csvPath}`);
      console.error(`   urls: ${opts.urlsPath}`);
      process.exitCode = 1;
      return;
    }
    console.log(`✅ zh-CN wording check passed (strict mode).`);
    console.log(`   report: ${opts.reportPath}`);
    return;
  }

  if (opts.noBaseline) {
    console.log(`✅ zh-CN wording report generated (no-baseline).`);
    console.log(`   flagged files: ${flaggedFiles}/${totalFilesScanned}`);
    console.log(`   report: ${opts.reportPath}`);
    console.log(`   csv: ${opts.csvPath}`);
    console.log(`   urls: ${opts.urlsPath}`);
    return;
  }

  if (regressions && regressions.length > 0) {
    console.error(`❌ zh-CN wording REGRESSION detected: ${regressions.length} file(s).`);
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

  console.log(`✅ zh-CN wording check passed (baseline gate).`);
  console.log(`   flagged files: ${flaggedFiles}/${totalFilesScanned} (allowed to decrease over time)`);
  console.log(`   report: ${opts.reportPath}`);
  console.log(`   csv: ${opts.csvPath}`);
  console.log(`   urls: ${opts.urlsPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
