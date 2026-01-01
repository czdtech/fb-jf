#!/usr/bin/env node
/**
 * Validate Chinese (zh) content for English residue regressions.
 *
 * Why baseline mode:
 * - 目前仓库内已有大量 zh 内容包含英文小标题/英文段落/括号英文对照；
 * - 直接“严格禁止”会让现有内容立刻全红，无法渐进治理。
 * - 因此默认采用“基线 + 回归检测”：允许现存问题，但不允许新增/变多。
 *
 * Scans (zh-facing content):
 * - src/content/games/*.zh.md
 * - src/pages/zh 下所有 .astro（递归）
 * - src/components 下所有 *.zh.astro（递归）
 * - src/i18n/zh.json
 *
 * Flags (heuristics, for范围确认/回归门禁):
 * - templateHeadings: 英文小标题（常见模板/通用英文标题）
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
  'config',
  'i18n',
  'baselines',
  'zh-english-mix-baseline.json'
);
const DEFAULT_REPORT_PATH = 'i18n-zh-english-mix-report.json';
const DEFAULT_CSV_PATH = 'i18n-zh-english-mix-report.csv';
const DEFAULT_URLS_PATH = 'i18n-zh-english-mix-report.urls.txt';

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const PAGES_ZH_DIR = path.join(process.cwd(), 'src', 'pages', 'zh');
const COMPONENTS_DIR = path.join(process.cwd(), 'src', 'components');
const I18N_ZH_JSON = path.join(process.cwd(), 'src', 'i18n', 'zh.json');

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

const allowedEnglishWords = new Set(
  [
    // Brands / product names (keep English)
    'fiddlebops',
    'fiddlebop',
    'incredibox',
    'sprunki',
    'roblox',
    'minecraft',
    // Site name
    'playfiddlebops',
  ].map((s) => s.toLowerCase())
);

function countMatches(re: RegExp, s: string): number {
  const m = s.match(re);
  return m ? m.length : 0;
}

function getEnglishWords(s: string): string[] {
  return s.match(englishWordRe) ?? [];
}

function isAllowedEnglishToken(word: string): boolean {
  const lower = word.toLowerCase();
  if (allowedEnglishWords.has(lower)) return true;

  // Common acronyms / shorthand (keep English)
  if (/^[A-Z]{2,5}$/.test(word)) return true; // e.g., GIF, FPS, NPC
  if (/^[A-Z]{1,3}\d{1,3}$/.test(word)) return true; // e.g., 4K

  return false;
}

function hasDisallowedEnglishWord(words: string[]): boolean {
  for (const w of words) {
    if (!isAllowedEnglishToken(w)) return true;
  }
  return false;
}

function findParenEnglishSegments(line: string): { raw: string; inside: string }[] {
  const segs: { raw: string; inside: string }[] = [];
  const re = /[（(]([^）)]*)[)）]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const inside = m[1] || '';
    const words = getEnglishWords(inside);
    if (words.length >= 2 && hasDisallowedEnglishWord(words)) {
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

function detectLine(
  line: string,
  ctx?: {
    forceHeading?: boolean;
  }
): {
  templateHeading: boolean;
  parentheticalEnglish: { raw: string; inside: string }[];
  pureEnglishLine: boolean;
  englishQA: boolean;
} | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Ignore pure URL / email lines (legal pages and references may legitimately contain them).
  if (/^(https?:\/\/|www\.)\S+$/i.test(trimmed)) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;

  const englishWords = getEnglishWords(line);
  const englishWordCount = englishWords.length;
  const englishLetters = countMatches(englishLetterRe, line);
  const cjkCount = countMatches(cjkRe, line);

  const parentheticalEnglish = findParenEnglishSegments(line);
  const heading = ctx?.forceHeading ?? isHeading(line);

  const hasDisallowedWord = hasDisallowedEnglishWord(englishWords);

  // Short labels like "Beat 1" / "Bonus 1" should be treated as residue even if they don't hit
  // the long-line thresholds.
  const shortEnglishLabelWithNumber =
    /\b\d+\b/.test(line) &&
    englishWordCount >= 1 &&
    cjkCount <= 1 &&
    englishLetters >= 3 &&
    hasDisallowedWord;

  const looksMostlyEnglish =
    (hasDisallowedWord && ((englishLetters >= 30 && cjkCount <= 2) || (englishWordCount >= 8 && cjkCount <= 4))) ||
    shortEnglishLabelWithNumber;

  const templateHeading =
    heading &&
    (() => {
      const text = trimmed.replace(/^#{1,6}\s+/, '');
      // Avoid false positives like “常见问题（FAQ）” where only the abbreviation is English.
      const normalized = normalizeHeadingText(text);
      const isFaqOnly = /^faq$/i.test(normalized);

      const headingWords = getEnglishWords(text);
      const headingEnglishLetters = countMatches(englishLetterRe, text);
      const headingCjk = countMatches(cjkRe, text);
      const headingHasDisallowed = hasDisallowedEnglishWord(headingWords);

      const looksMostlyEnglishHeading =
        headingHasDisallowed &&
        headingCjk <= 1 &&
        (isTemplateHeadingText(text) ||
          headingEnglishLetters >= 8 ||
          headingWords.length >= 2 ||
          (headingWords.length >= 1 && /\b\d+\b/.test(text) && headingEnglishLetters >= 3));

      return (
        looksMostlyEnglishHeading ||
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

    // Allowlist: control key alignment line is expected to contain
    // keyboard/mouse tokens in English (e.g., `W` `A` `Spacebar`).
    if (/^\s*-\s*按键(?:（对齐）|\(对齐\))\s*[:：]/.test(line)) {
      continue;
    }

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

async function walkFilesRecursive(dir: string, predicate: (rel: string) => boolean): Promise<string[]> {
  const out: string[] = [];

  async function walk(absDir: string) {
    let entries: Array<import('node:fs').Dirent>;
    try {
      entries = await fs.readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const ent of entries) {
      const abs = path.join(absDir, ent.name);
      if (ent.isDirectory()) {
        await walk(abs);
        continue;
      }
      if (!ent.isFile()) continue;

      const rel = path.relative(process.cwd(), abs).replace(/\\/g, '/');
      if (predicate(rel)) out.push(abs);
    }
  }

  await walk(dir);
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

function stripInlineAstroText(s: string): string {
  return s.replace(/\{[^}]*\}/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractInlineHtmlTextSegments(line: string): string[] {
  const segs: string[] = [];
  const re = />([^<>]+)</g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    segs.push(m[1]);
  }
  return segs;
}

function isProbablyAstroCodeLine(trimmed: string): boolean {
  const s = trimmed.trim();
  if (!s) return true;
  if (/^[{}()[\]]/.test(s)) return true;
  if (
    s.startsWith('const ') ||
    s.startsWith('let ') ||
    s.startsWith('var ') ||
    s.startsWith('return ') ||
    s.startsWith('if ') ||
    s.startsWith('for ') ||
    s.startsWith('while ') ||
    s.startsWith('switch ') ||
    s.startsWith('case ') ||
    s.startsWith('break') ||
    s.startsWith('continue') ||
    s.startsWith('export ') ||
    s.startsWith('import ')
  ) {
    return true;
  }
  if (s.includes('=>') || s.endsWith(';')) return true;
  if (/^[A-Za-z_$][\w$]*\s*=\s*/.test(s)) return true;
  return false;
}

function shouldSkipInternalLinkText(line: string, text: string): boolean {
  if (!/<a\b/i.test(line)) return false;
  // Only skip internal links (likely game slugs); keep external links visible for QA.
  if (!/href\s*=\s*"\//i.test(line)) return false;
  if (countMatches(cjkRe, text) > 0) return false;
  const words = getEnglishWords(text);
  if (words.length === 0) return false;
  // If it contains a known brand token, treat it as a proper-noun title.
  return words.some((w) => allowedEnglishWords.has(w.toLowerCase()));
}

async function scanAstroFile(
  absPath: string,
  relPath: string,
  maxSamplesPerCategory: number
): Promise<FileResult> {
  const raw = await fs.readFile(absPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const bodyStart = findFrontmatterEnd(lines);

  let inHtmlComment = false;
  let inScript = false;
  let inStyle = false;
  let headingLevel: number | null = null;
  let inOpenTag = false;

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
    if (!inHtmlComment && trimmed.includes('<!--')) inHtmlComment = true;
    if (inHtmlComment) {
      if (trimmed.includes('-->')) inHtmlComment = false;
      continue;
    }

    // Script/style blocks (avoid flagging code)
    if (!inScript && /<script\b/i.test(trimmed)) inScript = true;
    if (inScript) {
      if (/<\/script>/i.test(trimmed)) inScript = false;
      continue;
    }

    if (!inStyle && /<style\b/i.test(trimmed)) inStyle = true;
    if (inStyle) {
      if (/<\/style>/i.test(trimmed)) inStyle = false;
      continue;
    }

    // Track heading blocks (<h1> ... </h1>) even if the text is on a separate line.
    const openHeading = /<h([1-6])\b/i.exec(trimmed);
    if (openHeading) headingLevel = Number(openHeading[1]);
    const closeHeading = headingLevel ? new RegExp(`</h${headingLevel}>`, 'i').test(trimmed) : false;

    const lineNo = idx + 1; // 1-based

    // Skip multi-line tag attributes (not visible content).
    if (inOpenTag) {
      if (trimmed.includes('>')) inOpenTag = false;
      if (closeHeading) headingLevel = null;
      continue;
    }
    if (trimmed.startsWith('<') && !trimmed.includes('>')) {
      inOpenTag = true;
      continue;
    }

    const segments = extractInlineHtmlTextSegments(line).map((s) => stripInlineAstroText(s));
    const toScan: string[] = [];
    for (const s of segments) {
      if (!s) continue;
      if (shouldSkipInternalLinkText(line, s)) continue;
      toScan.push(s);
    }

    // Also scan standalone text lines inside multi-line <p>/<li>/<h*> blocks.
    if (toScan.length === 0) {
      const plain = stripInlineAstroText(trimmed);
      if (plain && !/[<>]/.test(plain) && !isProbablyAstroCodeLine(plain)) {
        toScan.push(plain);
      }
    }

    for (const text of toScan) {
      const info = detectLine(text, { forceHeading: headingLevel != null });
      if (!info) continue;

      if (info.templateHeading) {
        counts.templateHeadings += 1;
        if (samples.templateHeadings.length < maxSamplesPerCategory) {
          samples.templateHeadings.push({ line: lineNo, text });
        }
      }

      if (info.parentheticalEnglish.length > 0) {
        counts.parentheticalEnglish += 1;
        if (samples.parentheticalEnglish.length < maxSamplesPerCategory) {
          samples.parentheticalEnglish.push({
            line: lineNo,
            text,
            segments: info.parentheticalEnglish.map((s) => s.raw),
          });
        }
      }

      if (info.pureEnglishLine) {
        counts.pureEnglishLines += 1;
        if (samples.pureEnglishLines.length < maxSamplesPerCategory) {
          samples.pureEnglishLines.push({ line: lineNo, text });
        }
      }

      if (info.englishQA) {
        counts.englishQALines += 1;
        if (samples.englishQALines.length < maxSamplesPerCategory) {
          samples.englishQALines.push({ line: lineNo, text });
        }
      }
    }

    if (closeHeading) headingLevel = null;
  }

  const total = sumTotal(counts);
  return {
    file: path.basename(relPath),
    path: relPath,
    total,
    counts,
    samples,
  };
}

async function scanZhJsonFile(
  absPath: string,
  relPath: string,
  maxSamplesPerCategory: number
): Promise<FileResult> {
  const raw = await fs.readFile(absPath, 'utf8');
  const json = JSON.parse(raw) as unknown;

  const counts = emptyCounts();
  const samples: Record<CountKey, MatchLine[]> = {
    templateHeadings: [],
    parentheticalEnglish: [],
    pureEnglishLines: [],
    englishQALines: [],
  };

  function walk(value: unknown, keyPath: string[]) {
    if (typeof value === 'string') {
      // language labels are intentionally non-Chinese (native names)
      if (keyPath.length >= 1 && keyPath[0] === 'languages') return;

      const text = value.trim();
      if (!text) return;

      // Treat each line in a value as its own scan unit.
      for (const line of text.split(/\r?\n/)) {
        const info = detectLine(line);
        if (!info) continue;

        const pseudoLine = 1;
        const label = `[${keyPath.join('.')}] ${line}`;

        if (info.templateHeading) {
          counts.templateHeadings += 1;
          if (samples.templateHeadings.length < maxSamplesPerCategory) {
            samples.templateHeadings.push({ line: pseudoLine, text: label });
          }
        }

        if (info.parentheticalEnglish.length > 0) {
          counts.parentheticalEnglish += 1;
          if (samples.parentheticalEnglish.length < maxSamplesPerCategory) {
            samples.parentheticalEnglish.push({
              line: pseudoLine,
              text: label,
              segments: info.parentheticalEnglish.map((s) => s.raw),
            });
          }
        }

        if (info.pureEnglishLine) {
          counts.pureEnglishLines += 1;
          if (samples.pureEnglishLines.length < maxSamplesPerCategory) {
            samples.pureEnglishLines.push({ line: pseudoLine, text: label });
          }
        }

        if (info.englishQA) {
          counts.englishQALines += 1;
          if (samples.englishQALines.length < maxSamplesPerCategory) {
            samples.englishQALines.push({ line: pseudoLine, text: label });
          }
        }
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

  const total = sumTotal(counts);
  return {
    file: path.basename(relPath),
    path: relPath,
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

  // zh game markdown files
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

  // zh pages (*.astro)
  for (const absPath of pageAstroFiles) {
    const relPath = path.relative(process.cwd(), absPath).replace(/\\/g, '/');
    const scanned = await scanAstroFile(absPath, relPath, opts.maxSamplesPerCategory);
    if (scanned.total > 0) {
      flaggedFiles += 1;
      totals = addCounts(totals, scanned.counts);
      results.push(scanned);
    }
  }

  // zh components (*.zh.astro)
  for (const absPath of componentZhAstroFiles) {
    const relPath = path.relative(process.cwd(), absPath).replace(/\\/g, '/');
    const scanned = await scanAstroFile(absPath, relPath, opts.maxSamplesPerCategory);
    if (scanned.total > 0) {
      flaggedFiles += 1;
      totals = addCounts(totals, scanned.counts);
      results.push(scanned);
    }
  }

  // zh UI strings (zh.json)
  if (hasI18nZhJson) {
    const relPath = path.relative(process.cwd(), I18N_ZH_JSON).replace(/\\/g, '/');
    const scanned = await scanZhJsonFile(I18N_ZH_JSON, relPath, opts.maxSamplesPerCategory);
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
    scope:
      'src/content/games/*.zh.md + src/pages/zh/**/*.astro + src/components/**/*.zh.astro + src/i18n/zh.json',
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

  // Convenience: quick spot-check references (routes or file paths).
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
    console.log(`   flagged files: ${flaggedFiles}/${totalFilesScanned}`);
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
  console.log(
    `   flagged files: ${flaggedFiles}/${totalFilesScanned} (allowed to decrease over time)`
  );
  console.log(`   report: ${opts.reportPath}`);
  console.log(`   csv: ${opts.csvPath}`);
  console.log(`   urls: ${opts.urlsPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
