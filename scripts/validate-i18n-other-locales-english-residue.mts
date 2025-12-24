#!/usr/bin/env node
/**
 * Validate non-English locales for English residue regressions.
 *
 * Why baseline mode:
 * - 目前部分非中文语言存在“英文小标题/英文段落/英文 Q&A”等残留；
 * - 直接严格禁止会让现有内容立刻全红，无法渐进治理；
 * - 因此默认采用“基线 + 回归检测”：允许现存问题，但不允许新增/变多。
 *
 * Locales (default):
 * - ja, ko, es, fr, de
 *
 * Scans (per locale):
 * - src/content/games/*.{locale}.md
 * - src/pages/{locale} 下所有 .astro（递归）
 * - src/components 下所有 *.{locale}.astro（递归）
 * - src/i18n/{locale}.json
 *
 * Flags (heuristics):
 * - templateHeadings: 英文模板小标题（How to Play / Controls / FAQ / ...）
 * - parentheticalEnglish: 括号 () / （） 中出现“明显英文片段”
 * - pureEnglishLines: 基本整行英文的段落/列表项
 * - englishQALines: FAQ 中的英文 Q:/A: 行（内容为英文）
 *
 * Exit code:
 * - default: 1 if regressions vs baseline, else 0
 * - --strict: 1 if any match exists, else 0
 * - --no-baseline: always 0 (report-only)
 * - --update-baseline: write baseline and exit 0
 */

import fs from 'node:fs/promises';
import path from 'node:path';

type Locale = 'ja' | 'ko' | 'es' | 'fr' | 'de';
const DEFAULT_LOCALES: Locale[] = ['ja', 'ko', 'es', 'fr', 'de'];

type CountKey = 'templateHeadings' | 'parentheticalEnglish' | 'pureEnglishLines' | 'englishQALines';
type Counts = Record<CountKey, number>;

interface MatchLine {
  line: number;
  text: string;
  segments?: string[];
}

interface FileResult {
  locale: Locale;
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
  locales: Locale[];
  config: {
    maxSamplesPerCategory: number;
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
  'other-locales-english-residue-baseline.json'
);
const DEFAULT_REPORT_PATH = 'i18n-other-locales-english-residue-report.json';
const DEFAULT_CSV_PATH = 'i18n-other-locales-english-residue-report.csv';
const DEFAULT_URLS_PATH = 'i18n-other-locales-english-residue-report.urls.txt';

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const PAGES_DIR = path.join(process.cwd(), 'src', 'pages');
const COMPONENTS_DIR = path.join(process.cwd(), 'src', 'components');
const I18N_DIR = path.join(process.cwd(), 'src', 'i18n');

function emptyCounts(): Counts {
  return { templateHeadings: 0, parentheticalEnglish: 0, pureEnglishLines: 0, englishQALines: 0 };
}

function addCounts(a: Counts, b: Counts): Counts {
  return {
    templateHeadings: a.templateHeadings + b.templateHeadings,
    parentheticalEnglish: a.parentheticalEnglish + b.parentheticalEnglish,
    pureEnglishLines: a.pureEnglishLines + b.pureEnglishLines,
    englishQALines: a.englishQALines + b.englishQALines,
  };
}

function sumTotal(c: Counts): number {
  return c.templateHeadings + c.parentheticalEnglish + c.pureEnglishLines + c.englishQALines;
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

const englishWordRe = /[A-Za-z][A-Za-z']{1,}/g;
const englishStopwords = new Set(
  [
    'the',
    'and',
    'or',
    'to',
    'of',
    'in',
    'on',
    'for',
    'with',
    'without',
    'from',
    'by',
    'as',
    'at',
    'is',
    'are',
    'be',
    'can',
    'will',
    'should',
    'you',
    'your',
    'it',
    'this',
    'that',
    'these',
    'those',
    'how',
    'what',
    'why',
    'when',
    'where',
  ].map((s) => s.toLowerCase())
);

const targetStopwords: Record<Exclude<Locale, 'ja' | 'ko'>, Set<string>> = {
  es: new Set(
    [
      'el',
      'la',
      'los',
      'las',
      'de',
      'del',
      'y',
      'o',
      'en',
      'para',
      'con',
      'por',
      'que',
      'un',
      'una',
      'unos',
      'unas',
      'como',
      'más',
      'menos',
    ].map((s) => s.toLowerCase())
  ),
  fr: new Set(
    [
      'le',
      'la',
      'les',
      'des',
      'de',
      'du',
      'et',
      'ou',
      'en',
      'pour',
      'avec',
      'sans',
      'que',
      'un',
      'une',
      'dans',
      'ce',
      'cette',
      'ces',
    ].map((s) => s.toLowerCase())
  ),
  de: new Set(
    [
      'der',
      'die',
      'das',
      'und',
      'oder',
      'zu',
      'von',
      'mit',
      'für',
      'im',
      'in',
      'auf',
      'ist',
      'sind',
      'ein',
      'eine',
      'nicht',
      'dass',
      'als',
    ].map((s) => s.toLowerCase())
  ),
};

const allowedEnglishWords = new Set(
  [
    // Brands / product names
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

const HEADING_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /^Detailed Game Introduction\b/i, label: 'Detailed Game Introduction' },
  { re: /^Game Introduction\b/i, label: 'Game Introduction' },
  { re: /^Overview\b/i, label: 'Overview' },
  { re: /^How to Play\b/i, label: 'How to Play' },
  { re: /^Gameplay Guide\b/i, label: 'Gameplay Guide' },
  { re: /^Gameplay Strategy\b/i, label: 'Gameplay Strategy' },
  { re: /^Strategy\s+and\s+Tips\b/i, label: 'Strategy and Tips' },
  { re: /^Advanced Tips\b/i, label: 'Advanced Tips' },
  { re: /^Walkthrough\b/i, label: 'Walkthrough' },
  { re: /^Controls Guide\b/i, label: 'Controls Guide' },
  { re: /^Controls\b/i, label: 'Controls' },
  { re: /^(Frequently Asked Questions|Frequently Asked Questions\s*\(FAQ\))\b/i, label: 'Frequently Asked Questions' },
  // Only flag plain "FAQ" headings, not localized phrases like "FAQ sur ..."
  { re: /^FAQ\s*$/i, label: 'FAQ' },
  { re: /^(Conclusion|Wrapping Up|Bottom Line)\b/i, label: 'Conclusion' },
  { re: /^Tips\b/i, label: 'Tips' },
  { re: /^Tips\s+and\s+Strategies\b/i, label: 'Tips and Strategies' },
];

function isHeading(line: string): boolean {
  return /^\s*#{1,6}\s+/.test(line);
}

function unwrapWholeEmphasis(s: string): { core: string; wrap: string } {
  const trimmed = s.trim();
  const m = /^(\*{1,3})([^*][\s\S]*?)\1$/.exec(trimmed);
  if (!m) return { core: trimmed, wrap: '' };
  return { core: m[2].trim(), wrap: m[1] };
}

function normalizeLineForContentScan(line: string): string {
  let s = line.trim();
  // remove markdown list / quote prefixes
  s = s.replace(/^>\s+/, '');
  s = s.replace(/^[-*+]\s+/, '');
  s = s.replace(/^\d+\.\s+/, '');
  return s.trim();
}

function isUrlLike(s: string): boolean {
  return /^https?:\/\//i.test(s) || /^www\./i.test(s);
}

function countEnglishStopwordTokens(words: string[]): number {
  let n = 0;
  for (const w of words) if (englishStopwords.has(w)) n += 1;
  return n;
}

function countTargetStopwordTokens(locale: Locale, words: string[]): number {
  if (locale === 'ja' || locale === 'ko') return 0;
  const set = targetStopwords[locale];
  let n = 0;
  for (const w of words) if (set.has(w)) n += 1;
  return n;
}

function tokenizeAsciiWords(s: string): string[] {
  return s.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
}

function countNonEnglishChars(locale: Locale, s: string): number {
  if (locale === 'ja') return (s.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g) ?? []).length;
  if (locale === 'ko') return (s.match(/[\uac00-\ud7af]/g) ?? []).length;
  // latin locales treat non-english as 0 here
  return 0;
}

function isLikelyEnglishSentence(locale: Locale, raw: string): boolean {
  const text = raw.trim();
  if (!text) return false;
  if (isUrlLike(text)) return false;
  if (/^[\s\-\*#>_`~|:.()]+$/.test(text)) return false;

  // ignore lines that are just brand words / tokens
  const asciiWords = tokenizeAsciiWords(text);
  const significant = asciiWords.filter((w) => !allowedEnglishWords.has(w));

  if (locale === 'ja' || locale === 'ko') {
    const nonEn = countNonEnglishChars(locale, text);
    const englishWords = (text.match(englishWordRe) ?? []).filter((w) => !allowedEnglishWords.has(w.toLowerCase()))
      .length;

    // CJK locales: English stands out as latin words.
    if (nonEn >= 2) return false;
    if (englishWords >= 4) return true;
    if (englishWords >= 3 && text.length >= 40) return true;
    return false;
  }

  // Latin locales: use stopword scoring to detect English paragraphs.
  if (asciiWords.length < 8) return false;

  const enStop = countEnglishStopwordTokens(asciiWords);
  const localStop = countTargetStopwordTokens(locale, asciiWords);

  // Require at least one very common English stopword to avoid false positives on names.
  const hasStrongEn =
    asciiWords.includes('the') ||
    asciiWords.includes('and') ||
    asciiWords.includes('to') ||
    asciiWords.includes('you') ||
    asciiWords.includes('your') ||
    asciiWords.includes('with');

  if (!hasStrongEn) return false;

  // If the line contains mostly branded tokens, don't flag.
  if (significant.length <= 3) return false;

  return enStop >= 3 && enStop >= localStop + 2;
}

function matchTemplateHeading(text: string): string | null {
  const normalized = text.trim().replace(/[:：?？]$/, '');
  for (const { re, label } of HEADING_PATTERNS) {
    if (re.test(normalized)) return label;
  }
  return null;
}

function findParentheticalEnglish(locale: Locale, text: string): string[] {
  const hits: string[] = [];
  const re = /[（(]([^）)]{2,})[)）]/g;
  for (const m of text.matchAll(re)) {
    const inside = (m[1] ?? '').trim();
    if (!inside) continue;

    // Only consider multi-word phrases (avoid common abbreviations like (FAQ)/(AI)/(FPS)/(Co-op)).
    if (!/\s/.test(inside)) continue;

    // High confidence: contains one of known template headings (multi-word).
    if (matchTemplateHeading(inside)) {
      hits.push(m[0]);
      continue;
    }

    if (locale === 'ja' || locale === 'ko') {
      const englishWords = (inside.match(englishWordRe) ?? []).filter(
        (w) => !allowedEnglishWords.has(w.toLowerCase())
      ).length;
      if (englishWords >= 2 && countNonEnglishChars(locale, inside) === 0) hits.push(m[0]);
      continue;
    }

    // latin locales: only flag if it looks like an English sentence fragment
    if (isLikelyEnglishSentence(locale, inside) && inside.length >= 20) hits.push(m[0]);
  }
  return hits;
}

function detectLine(locale: Locale, rawLine: string): {
  templateHeading: string | null;
  parentheticalEnglish: string[];
  pureEnglishLine: boolean;
  englishQA: boolean;
} | null {
  const line = normalizeLineForContentScan(rawLine);
  if (!line) return null;
  if (isUrlLike(line)) return null;

  const headingCandidate = rawLine.trim().replace(/^\s*#{1,6}\s+/, '').trim();
  const { core: headingCore } = unwrapWholeEmphasis(headingCandidate);
  const templateHeading = matchTemplateHeading(headingCore);
  const parentheticalEnglish = findParentheticalEnglish(locale, line);

  // Q/A: only flag when the content part is English.
  const qa = /^\s*(?:[-*]\s*)?(?:\*{0,2})?(Q|A)\s*:\s*(.+)\s*$/i.exec(rawLine);
  const englishQA = Boolean(qa && isLikelyEnglishSentence(locale, qa[2] ?? ''));

  const pureEnglishLine = isLikelyEnglishSentence(locale, line);

  if (!templateHeading && parentheticalEnglish.length === 0 && !pureEnglishLine && !englishQA) return null;

  return { templateHeading, parentheticalEnglish, pureEnglishLine, englishQA };
}

async function scanMarkdownFile(
  locale: Locale,
  absPath: string,
  relPath: string,
  maxSamplesPerCategory: number
): Promise<FileResult> {
  const raw = await fs.readFile(absPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const bodyStart = findFrontmatterEnd(lines);
  const urlstr = parseFrontmatterStringValue(lines, 'urlstr') ?? undefined;

  const counts = emptyCounts();
  const samples: Record<CountKey, MatchLine[]> = {
    templateHeadings: [],
    parentheticalEnglish: [],
    pureEnglishLines: [],
    englishQALines: [],
  };

  let inCodeFence = false;
  let inHtmlComment = false;

  for (let idx = bodyStart; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();

    if (!inHtmlComment && trimmed.includes('<!--')) inHtmlComment = true;
    if (inHtmlComment) {
      if (trimmed.includes('-->')) inHtmlComment = false;
      continue;
    }

    if (/^\s*```/.test(trimmed)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const info = detectLine(locale, line);
    if (!info) continue;

    const lineNo = idx + 1;
    const textOut = line.trimEnd();

    if (isHeading(line) && info.templateHeading) {
      counts.templateHeadings += 1;
      if (samples.templateHeadings.length < maxSamplesPerCategory) {
        samples.templateHeadings.push({ line: lineNo, text: textOut });
      }
    }

    if (info.parentheticalEnglish.length > 0) {
      counts.parentheticalEnglish += 1;
      if (samples.parentheticalEnglish.length < maxSamplesPerCategory) {
        samples.parentheticalEnglish.push({
          line: lineNo,
          text: textOut,
          segments: info.parentheticalEnglish,
        });
      }
    }

    if (info.pureEnglishLine) {
      counts.pureEnglishLines += 1;
      if (samples.pureEnglishLines.length < maxSamplesPerCategory) {
        samples.pureEnglishLines.push({ line: lineNo, text: textOut });
      }
    }

    if (info.englishQA) {
      counts.englishQALines += 1;
      if (samples.englishQALines.length < maxSamplesPerCategory) {
        samples.englishQALines.push({ line: lineNo, text: textOut });
      }
    }
  }

  return {
    locale,
    file: path.basename(relPath),
    path: relPath,
    urlstr,
    total: sumTotal(counts),
    counts,
    samples,
  };
}

function stripInlineAstroText(s: string): string {
  return s.replace(/\{[^}]*\}/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractInlineHtmlTextSegments(line: string): string[] {
  const segs: string[] = [];
  const re = />([^<>]+)</g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) segs.push(m[1]);
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

async function scanAstroFile(
  locale: Locale,
  absPath: string,
  relPath: string,
  maxSamplesPerCategory: number
): Promise<FileResult> {
  const raw = await fs.readFile(absPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const bodyStart = findFrontmatterEnd(lines);

  const counts = emptyCounts();
  const samples: Record<CountKey, MatchLine[]> = {
    templateHeadings: [],
    parentheticalEnglish: [],
    pureEnglishLines: [],
    englishQALines: [],
  };

  let inHtmlComment = false;
  let inScript = false;
  let inStyle = false;
  let headingLevel: number | null = null;
  let inOpenTag = false;

  for (let idx = bodyStart; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();

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

    const lineNo = idx + 1;

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
      const info = detectLine(locale, text);
      if (!info) continue;

      if (headingLevel != null && info.templateHeading) {
        // Heading context is higher confidence.
        counts.templateHeadings += 1;
        if (samples.templateHeadings.length < maxSamplesPerCategory) {
          samples.templateHeadings.push({ line: lineNo, text });
        }
      } else if (info.templateHeading) {
        counts.templateHeadings += 1;
        if (samples.templateHeadings.length < maxSamplesPerCategory) {
          samples.templateHeadings.push({ line: lineNo, text });
        }
      }

      if (info.parentheticalEnglish.length > 0) {
        counts.parentheticalEnglish += 1;
        if (samples.parentheticalEnglish.length < maxSamplesPerCategory) {
          samples.parentheticalEnglish.push({ line: lineNo, text, segments: info.parentheticalEnglish });
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

  return {
    locale,
    file: path.basename(relPath),
    path: relPath,
    total: sumTotal(counts),
    counts,
    samples,
  };
}

async function scanLocaleJsonFile(
  locale: Locale,
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
      // languages labels are intentionally multiple native names
      if (keyPath.length >= 1 && keyPath[0] === 'languages') return;

      const text = value.trim();
      if (!text) return;

      for (const line of text.split(/\r?\n/)) {
        const info = detectLine(locale, line);
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
              segments: info.parentheticalEnglish,
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

  return {
    locale,
    file: path.basename(relPath),
    path: relPath,
    total: sumTotal(counts),
    counts,
    samples,
  };
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
    locales: DEFAULT_LOCALES as Locale[],
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
    } else if (a === '--locales' && args[i + 1]) {
      const raw = args[++i];
      const parts = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) as Locale[];
      const unique = Array.from(new Set(parts)).filter((x) => DEFAULT_LOCALES.includes(x));
      if (unique.length > 0) opts.locales = unique;
    } else if (a === '--help' || a === '-h') {
      console.log(`
Validate other locales for English residue (baseline gate)

Usage:
  tsx scripts/validate-i18n-other-locales-english-residue.mts [options]

Options:
  --locales <a,b,c>        Locales to scan (default: ${DEFAULT_LOCALES.join(',')})
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

  const results: FileResult[] = [];
  let totals = emptyCounts();
  let flaggedFiles = 0;
  let totalFilesScanned = 0;

  const byLocale: ScanReport['totals']['byLocale'] = {
    ja: { totalFiles: 0, flaggedFiles: 0, counts: emptyCounts() },
    ko: { totalFiles: 0, flaggedFiles: 0, counts: emptyCounts() },
    es: { totalFiles: 0, flaggedFiles: 0, counts: emptyCounts() },
    fr: { totalFiles: 0, flaggedFiles: 0, counts: emptyCounts() },
    de: { totalFiles: 0, flaggedFiles: 0, counts: emptyCounts() },
  };

  for (const locale of opts.locales) {
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
      const scanned = await scanMarkdownFile(locale, absPath, relPath, opts.maxSamplesPerCategory);
      if (scanned.total > 0) {
        flaggedFiles += 1;
        byLocale[locale].flaggedFiles += 1;
        totals = addCounts(totals, scanned.counts);
        byLocale[locale].counts = addCounts(byLocale[locale].counts, scanned.counts);
        results.push(scanned);
      }
    }

    for (const absPath of pageAstroFiles) {
      const relPath = path.relative(process.cwd(), absPath).replace(/\\/g, '/');
      const scanned = await scanAstroFile(locale, absPath, relPath, opts.maxSamplesPerCategory);
      if (scanned.total > 0) {
        flaggedFiles += 1;
        byLocale[locale].flaggedFiles += 1;
        totals = addCounts(totals, scanned.counts);
        byLocale[locale].counts = addCounts(byLocale[locale].counts, scanned.counts);
        results.push(scanned);
      }
    }

    for (const absPath of componentLocaleAstroFiles) {
      const relPath = path.relative(process.cwd(), absPath).replace(/\\/g, '/');
      const scanned = await scanAstroFile(locale, absPath, relPath, opts.maxSamplesPerCategory);
      if (scanned.total > 0) {
        flaggedFiles += 1;
        byLocale[locale].flaggedFiles += 1;
        totals = addCounts(totals, scanned.counts);
        byLocale[locale].counts = addCounts(byLocale[locale].counts, scanned.counts);
        results.push(scanned);
      }
    }

    if (hasLocaleJson) {
      const relPath = path.relative(process.cwd(), localeJsonAbs).replace(/\\/g, '/');
      const scanned = await scanLocaleJsonFile(locale, localeJsonAbs, relPath, opts.maxSamplesPerCategory);
      if (scanned.total > 0) {
        flaggedFiles += 1;
        byLocale[locale].flaggedFiles += 1;
        totals = addCounts(totals, scanned.counts);
        byLocale[locale].counts = addCounts(byLocale[locale].counts, scanned.counts);
        results.push(scanned);
      }
    }
  }

  results.sort((a, b) => b.total - a.total || a.path.localeCompare(b.path));

  // Baseline handling
  let regressions: ScanReport['regressions'] = undefined;

  if (!opts.noBaseline && !opts.updateBaseline) {
    if (!(await fileExists(opts.baselinePath))) {
      console.error(`❌ Baseline not found: ${opts.baselinePath}`);
      console.error(
        `   Run: tsx ${path.join('scripts', 'validate-i18n-other-locales-english-residue.mts')} --update-baseline`
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
        currentCounts.templateHeadings > baseCounts.templateHeadings ||
        currentCounts.parentheticalEnglish > baseCounts.parentheticalEnglish ||
        currentCounts.pureEnglishLines > baseCounts.pureEnglishLines ||
        currentCounts.englishQALines > baseCounts.englishQALines;
      if (regressed) deltas.push({ path: relPath, baseline: baseCounts, current: currentCounts });
    }

    deltas.sort((a, b) => sumTotal(b.current) - sumTotal(a.current) || a.path.localeCompare(b.path));
    regressions = deltas.length > 0 ? deltas : undefined;
  }

  const report: ScanReport = {
    generatedAt: new Date().toISOString(),
    scope:
      'src/content/games/*.{ja,ko,es,fr,de}.md + src/pages/{ja,ko,es,fr,de}/**/*.astro + src/components/**/*.{ja,ko,es,fr,de}.astro + src/i18n/{ja,ko,es,fr,de}.json',
    locales: opts.locales,
    config: { maxSamplesPerCategory: opts.maxSamplesPerCategory, strict: opts.strict },
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
  csvRows.push(
    toCsvRow([
      'locale',
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
        r.locale,
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

  const refs = results.map((r) => {
    if (r.path.startsWith('src/content/games/') && r.path.endsWith(`.${r.locale}.md`)) {
      const slug = r.urlstr ?? r.path.replace(/^src\/content\/games\//, '').replace(new RegExp(`\\.${r.locale}\\.md$`), '');
      return `/${r.locale}/${slug}/`;
    }

    if (r.path.startsWith(`src/pages/${r.locale}/`) && r.path.endsWith('.astro')) {
      const page = r.path.replace(/^src\/pages\//, '').replace(/\.astro$/, '');
      const out = `/${page.replace(/\/index$/, '')}/`;
      return out.replace(/\/{2,}/g, '/');
    }

    return `FILE:${r.path}`;
  });
  await writeText(opts.urlsPath, refs.join('\n') + '\n');

  if (opts.updateBaseline) {
    const baselineOut: BaselineFile = {
      generatedAt: new Date().toISOString(),
      scope: report.scope,
      version: 1,
      files: Object.fromEntries(results.map((r) => [r.path, r.counts])),
      totals: { totalFiles: totalFilesScanned, flaggedFiles, counts: totals },
    };
    await writeJson(opts.baselinePath, baselineOut);
    console.log(`✅ Baseline updated: ${opts.baselinePath}`);
    console.log(`   (report: ${opts.reportPath}, csv: ${opts.csvPath})`);
    return;
  }

  if (opts.strict) {
    if (results.length > 0) {
      console.error(`❌ English residue found in ${results.length} files (strict mode).`);
      console.error(`   report: ${opts.reportPath}`);
      console.error(`   csv: ${opts.csvPath}`);
      console.error(`   urls: ${opts.urlsPath}`);
      process.exitCode = 1;
      return;
    }
    console.log(`✅ English residue check passed (strict mode).`);
    console.log(`   report: ${opts.reportPath}`);
    return;
  }

  if (opts.noBaseline) {
    console.log(`✅ English residue report generated (no-baseline).`);
    console.log(`   flagged files: ${flaggedFiles}/${totalFilesScanned}`);
    console.log(`   report: ${opts.reportPath}`);
    console.log(`   csv: ${opts.csvPath}`);
    console.log(`   urls: ${opts.urlsPath}`);
    return;
  }

  if (regressions && regressions.length > 0) {
    console.error(`❌ English residue REGRESSION detected: ${regressions.length} file(s).`);
    for (const r of regressions.slice(0, 10)) {
      console.error(`- ${r.path}: baseline=${JSON.stringify(r.baseline)} current=${JSON.stringify(r.current)}`);
    }
    if (regressions.length > 10) console.error(`  ... and ${regressions.length - 10} more`);
    console.error(`report: ${opts.reportPath}`);
    console.error(`csv: ${opts.csvPath}`);
    console.error(`urls: ${opts.urlsPath}`);
    process.exitCode = 1;
    return;
  }

  console.log(`✅ English residue check passed (baseline gate).`);
  console.log(`   flagged files: ${flaggedFiles}/${totalFilesScanned} (allowed to decrease over time)`);
  console.log(`   report: ${opts.reportPath}`);
  console.log(`   csv: ${opts.csvPath}`);
  console.log(`   urls: ${opts.urlsPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
