#!/usr/bin/env node
/**
 * Validate Chinese (zh) game markdown content for English residue regressions.
 *
 * Why baseline mode:
 * - 目前仓库内已有大量 zh 内容包含英文小标题/英文段落/括号英文对照；
 * - 直接“严格禁止”会让现有内容立刻全红，无法渐进治理。
 * - 因此默认采用“基线 + 回归检测”：允许现存问题，但不允许新增/变多。
 *
 * Scans: src/content/games/*.zh.md
 *
 * Flags (heuristics, for范围确认/回归门禁):
 * - templateHeadings: 常见英文模板小标题（Detailed Game Introduction / Controls Guide / FAQ 等）
 * - parentheticalEnglish: 括号 () / （） 中出现 >=2 个英文单词
 * - pureEnglishLines: 基本整行英文的段落/列表项
 * - englishQALines: FAQ 中的英文 Q:/A: 行
 *
 * Exit code:
 * - default: 1 if regressions vs baseline, else 0
 * - --strict: 1 if any match exists, else 0
 * - --no-baseline: always 0 (report-only)
 * - --update-baseline: write baseline and exit 0
 */

import fs from 'node:fs/promises';
import path from 'node:path';

type CountKey = 'templateHeadings' | 'parentheticalEnglish' | 'pureEnglishLines' | 'englishQALines';

type Counts = Record<CountKey, number>;

interface MatchLine {
  line: number;
  text: string;
  segments?: string[];
}

interface FileResult {
  file: string; // basename
  path: string; // repo-relative path
  urlstr?: string;
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
  'zh-english-mix-baseline.json'
);
const DEFAULT_REPORT_PATH = 'i18n-zh-english-mix-report.json';
const DEFAULT_CSV_PATH = 'i18n-zh-english-mix-report.csv';
const DEFAULT_URLS_PATH = 'i18n-zh-english-mix-report.urls.txt';

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');

function emptyCounts(): Counts {
  return {
    templateHeadings: 0,
    parentheticalEnglish: 0,
    pureEnglishLines: 0,
    englishQALines: 0,
  };
}

function addCounts(a: Counts, b: Counts): Counts {
  return {
    templateHeadings: a.templateHeadings + b.templateHeadings,
    parentheticalEnglish: a.parentheticalEnglish + b.parentheticalEnglish,
    pureEnglishLines: a.pureEnglishLines + b.pureEnglishLines,
    englishQALines: a.englishQALines + b.englishQALines,
  };
}

function hasAny(counts: Counts): boolean {
  return (
    counts.templateHeadings +
      counts.parentheticalEnglish +
      counts.pureEnglishLines +
      counts.englishQALines >
    0
  );
}

function sumTotal(counts: Counts): number {
  return (
    counts.templateHeadings +
    counts.parentheticalEnglish +
    counts.pureEnglishLines +
    counts.englishQALines
  );
}

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

    // quoted
    const dq = /^"([^"]+)"$/.exec(raw);
    if (dq) return dq[1];
    const sq = /^'([^']+)'$/.exec(raw);
    if (sq) return sq[1];

    // unquoted (strip trailing inline comment)
    const noComment = raw.replace(/\s+#.*$/, '').trim();
    return noComment || null;
  }

  return null;
}

const englishWordRe = /[A-Za-z][A-Za-z']{1,}/g; // >=2 chars
const englishLetterRe = /[A-Za-z]/g;
const cjkRe = /[\u4e00-\u9fff]/g;

function countMatches(re: RegExp, s: string): number {
  const m = s.match(re);
  return m ? m.length : 0;
}

function getEnglishWords(s: string): string[] {
  return s.match(englishWordRe) ?? [];
}

function findParenEnglishSegments(line: string): { raw: string; inside: string }[] {
  const segs: { raw: string; inside: string }[] = [];
  const re = /[（(]([^）)]*)[)）]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const inside = m[1] || '';
    const wordCount = getEnglishWords(inside).length;
    if (wordCount >= 2) {
      segs.push({ inside, raw: m[0] });
    }
  }
  return segs;
}

const templateHeadingMatchers: RegExp[] = [
  /\bDetailed Game Introduction\b/i,
  /\bGame Introduction\b/i,
  /\bOverview\b/i,
  /\bHow to Play\b/i,
  /\bGameplay Guide\b/i,
  /\bGameplay Strategy\b/i,
  /\bWalkthrough\b/i,
  /\bControls Guide\b/i,
  /\bControls\b/i,
  /\bFrequently Asked Questions\b/i,
  /\bTips and Strategies\b/i,
  /\bAdvanced Tips\b/i,
  /\bStrategy\s+and\s+Tips\b/i,
  /\bConclusion\b/i,
  /\bWrapping Up\b/i,
  /\bBottom Line\b/i,
  /\bTips\b/i,
];

function isHeading(line: string): boolean {
  return /^\s*#{1,6}\s+/.test(line);
}

function isListItem(line: string): boolean {
  return /^\s*(?:[-*+]|\d+\.)\s+/.test(line);
}

function isTemplateHeadingText(s: string): boolean {
  return templateHeadingMatchers.some((re) => re.test(s));
}

function normalizeHeadingText(s: string): string {
  // Strip common markdown emphasis and punctuation for exact-match checks like "FAQ".
  return s
    .replace(/^[#\s]+/, '')
    .replace(/[*_`]/g, '')
    .replace(/[()（）]/g, '')
    .replace(/[：:]+/g, '')
    .trim();
}

function detectLine(line: string): {
  templateHeading: boolean;
  parentheticalEnglish: { raw: string; inside: string }[];
  pureEnglishLine: boolean;
  englishQA: boolean;
} | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const englishWords = getEnglishWords(line);
  const englishWordCount = englishWords.length;
  const englishLetters = countMatches(englishLetterRe, line);
  const cjkCount = countMatches(cjkRe, line);

  const parentheticalEnglish = findParenEnglishSegments(line);
  const heading = isHeading(line);

  const looksMostlyEnglish =
    (englishLetters >= 20 && cjkCount <= 2) || (englishWordCount >= 8 && cjkCount <= 4);

  const templateHeading =
    heading &&
    (() => {
      const text = trimmed.replace(/^#{1,6}\s+/, '');
      // Avoid false positives like “常见问题（FAQ）” where only the abbreviation is English.
      const normalized = normalizeHeadingText(text);
      const isFaqOnly = /^faq$/i.test(normalized);

      return (
        isTemplateHeadingText(text) ||
        parentheticalEnglish.some((s) => isTemplateHeadingText(s.inside)) ||
        isFaqOnly
      );
    })();

  const englishQA = /\b(Q|A)\s*[:：]/.test(line) && englishWordCount >= 3 && cjkCount <= 2;

  const any = templateHeading || parentheticalEnglish.length > 0 || looksMostlyEnglish || englishQA;
  if (!any) return null;

  return {
    templateHeading,
    parentheticalEnglish,
    pureEnglishLine: looksMostlyEnglish && !heading, // headings are tracked separately
    englishQA,
  };
}

async function scanZhFile(
  absPath: string,
  relPath: string,
  maxSamplesPerCategory: number
): Promise<FileResult> {
  const raw = await fs.readFile(absPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const bodyStart = findFrontmatterEnd(lines);
  const urlstr = parseFrontmatterStringValue(lines, 'urlstr') ?? undefined;

  let inCodeFence = false;
  let inHtmlComment = false;

  const counts = emptyCounts();
  const samples: Record<CountKey, MatchLine[]> = {
    templateHeadings: [],
    parentheticalEnglish: [],
    pureEnglishLines: [],
    englishQALines: [],
  };

  for (let idx = bodyStart; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();

    // HTML comments (support multi-line)
    if (!inHtmlComment && trimmed.includes('<!--')) {
      inHtmlComment = true;
    }
    if (inHtmlComment) {
      if (trimmed.includes('-->')) {
        inHtmlComment = false;
      }
      continue;
    }

    // Code fences
    if (trimmed.startsWith('```')) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const info = detectLine(line);
    if (!info) continue;

    const lineNo = idx + 1; // 1-based

    if (info.templateHeading) {
      counts.templateHeadings += 1;
      if (samples.templateHeadings.length < maxSamplesPerCategory) {
        samples.templateHeadings.push({ line: lineNo, text: line });
      }
    }

    if (info.parentheticalEnglish.length > 0) {
      counts.parentheticalEnglish += 1;
      if (samples.parentheticalEnglish.length < maxSamplesPerCategory) {
        samples.parentheticalEnglish.push({
          line: lineNo,
          text: line,
          segments: info.parentheticalEnglish.map((s) => s.raw),
        });
      }
    }

    if (info.pureEnglishLine) {
      counts.pureEnglishLines += 1;
      if (samples.pureEnglishLines.length < maxSamplesPerCategory) {
        samples.pureEnglishLines.push({ line: lineNo, text: line });
      }
    }

    if (info.englishQA) {
      counts.englishQALines += 1;
      if (samples.englishQALines.length < maxSamplesPerCategory) {
        samples.englishQALines.push({ line: lineNo, text: line });
      }
    }
  }

  const total = sumTotal(counts);

  return {
    file: path.basename(relPath),
    path: relPath,
    urlstr,
    total,
    counts,
    samples,
  };
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
Validate zh English residue (baseline gate)

Usage:
  tsx scripts/validate-i18n-zh-english-mix.mts [options]

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
    // strict implies we don't care about baseline comparisons
    opts.noBaseline = true;
  }

  return opts;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);

  const allFiles = (await fs.readdir(GAMES_DIR))
    .filter((f) => f.endsWith('.zh.md'))
    .sort((a, b) => a.localeCompare(b));

  const results: FileResult[] = [];
  let totals = emptyCounts();
  let flaggedFiles = 0;

  for (const file of allFiles) {
    const absPath = path.join(GAMES_DIR, file);
    const relPath = path.join('src', 'content', 'games', file).replace(/\\/g, '/');
    const scanned = await scanZhFile(absPath, relPath, opts.maxSamplesPerCategory);
    if (scanned.total > 0) {
      flaggedFiles += 1;
      totals = addCounts(totals, scanned.counts);
      results.push(scanned);
    }
  }

  results.sort((a, b) => b.total - a.total || a.path.localeCompare(b.path));

  // Baseline handling
  let baseline: BaselineFile | null = null;
  let regressions: ScanReport['regressions'] = undefined;

  if (!opts.noBaseline && !opts.updateBaseline) {
    if (!(await fileExists(opts.baselinePath))) {
      console.error(`❌ Baseline not found: ${opts.baselinePath}`);
      console.error(`   Run: tsx ${path.join('scripts', 'validate-i18n-zh-english-mix.mts')} --update-baseline`);
      process.exitCode = 2;
      return;
    }
    const raw = await fs.readFile(opts.baselinePath, 'utf8');
    baseline = JSON.parse(raw) as BaselineFile;

    const baselineFiles = baseline.files ?? {};

    const fileToCounts = new Map<string, Counts>();
    for (const r of results) fileToCounts.set(r.path, r.counts);

    const deltas: Array<{ path: string; baseline: Counts; current: Counts }> = [];

    // Check current flagged files against baseline (per-category monotonic non-increase).
    for (const [relPath, currentCounts] of fileToCounts.entries()) {
      const baseCounts = baselineFiles[relPath] ?? emptyCounts();
      const regressed =
        currentCounts.templateHeadings > baseCounts.templateHeadings ||
        currentCounts.parentheticalEnglish > baseCounts.parentheticalEnglish ||
        currentCounts.pureEnglishLines > baseCounts.pureEnglishLines ||
        currentCounts.englishQALines > baseCounts.englishQALines;

      if (regressed) {
        deltas.push({ path: relPath, baseline: baseCounts, current: currentCounts });
      }
    }

    deltas.sort((a, b) => sumTotal(b.current) - sumTotal(a.current) || a.path.localeCompare(b.path));
    regressions = deltas.length > 0 ? deltas : undefined;
  }

  const report: ScanReport = {
    generatedAt: new Date().toISOString(),
    scope: 'src/content/games/*.zh.md',
    config: {
      maxSamplesPerCategory: opts.maxSamplesPerCategory,
      strict: opts.strict,
    },
    totals: {
      totalFiles: allFiles.length,
      flaggedFiles,
      counts: totals,
    },
    top20: results.slice(0, 20),
    files: results,
  };

  if (regressions) {
    report.regressions = regressions;
  }

  await writeJson(opts.reportPath, report);

  const csvRows: string[] = [];
  csvRows.push(
    toCsvRow([
      'file',
      'total',
      'templateHeadings',
      'parentheticalEnglish',
      'pureEnglishLines',
      'englishQALines',
    ])
  );
  for (const r of results) {
    csvRows.push(
      toCsvRow([
        r.path,
        r.total,
        r.counts.templateHeadings,
        r.counts.parentheticalEnglish,
        r.counts.pureEnglishLines,
        r.counts.englishQALines,
      ])
    );
  }
  await writeCsv(opts.csvPath, csvRows);

  // Convenience: URL list for quick spot-checking in browser (derived from frontmatter urlstr or fallback to filename).
  const urls = results.map((r) => {
    const slug =
      r.urlstr ??
      r.path.replace(/^src\/content\/games\//, '').replace(/\.zh\.md$/, '');
    return `/zh/${slug}/`;
  });
  await writeText(opts.urlsPath, urls.join('\n') + '\n');

  if (opts.updateBaseline) {
    const baselineOut: BaselineFile = {
      generatedAt: new Date().toISOString(),
      scope: 'src/content/games/*.zh.md',
      version: 1,
      files: Object.fromEntries(results.map((r) => [r.path, r.counts])),
      totals: {
        totalFiles: allFiles.length,
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
    const any = results.length > 0;
    if (any) {
      console.error(`❌ zh English residue found in ${results.length} files (strict mode).`);
      console.error(`   report: ${opts.reportPath}`);
      console.error(`   csv: ${opts.csvPath}`);
      console.error(`   urls: ${opts.urlsPath}`);
      process.exitCode = 1;
      return;
    }
    console.log(`✅ zh English residue check passed (strict mode).`);
    console.log(`   report: ${opts.reportPath}`);
    return;
  }

  if (opts.noBaseline) {
    console.log(`✅ zh English residue report generated (no-baseline).`);
    console.log(`   flagged files: ${flaggedFiles}/${allFiles.length}`);
    console.log(`   report: ${opts.reportPath}`);
    console.log(`   csv: ${opts.csvPath}`);
    console.log(`   urls: ${opts.urlsPath}`);
    return;
  }

  if (regressions && regressions.length > 0) {
    console.error(`❌ zh English residue REGRESSION detected: ${regressions.length} file(s).`);
    for (const r of regressions.slice(0, 10)) {
      console.error(
        `- ${r.path}: baseline=${JSON.stringify(r.baseline)} current=${JSON.stringify(r.current)}`
      );
    }
    if (regressions.length > 10) {
      console.error(`  ... and ${regressions.length - 10} more`);
    }
    console.error(`report: ${opts.reportPath}`);
    console.error(`csv: ${opts.csvPath}`);
    console.error(`urls: ${opts.urlsPath}`);
    process.exitCode = 1;
    return;
  }

  console.log(`✅ zh English residue check passed (baseline gate).`);
  console.log(`   flagged files: ${flaggedFiles}/${allFiles.length} (allowed to decrease over time)`);
  console.log(`   report: ${opts.reportPath}`);
  console.log(`   csv: ${opts.csvPath}`);
  console.log(`   urls: ${opts.urlsPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
