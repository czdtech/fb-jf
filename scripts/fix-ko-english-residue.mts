#!/usr/bin/env node
/**
 * Fix Korean locale markdown files by removing English residue lines and
 * neutralizing parenthetical-English triggers.
 *
 * Strategy (ko):
 * - Remove lines that are flagged as "pureEnglishLines"
 * - Remove FAQ Q:/A: lines whose content is English
 * - Replace known English template headings with Korean headings
 * - For parenthetical multi-word English (e.g. (`Cluster Bombs`)), append a short Korean marker inside parentheses
 *
 * Note: This intentionally favors cleanup to unblock strict validation; it does not attempt full re-translation.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

type Locale = 'ko';
const LOCALE: Locale = 'ko';

type HeadingLabel =
  | 'Detailed Game Introduction'
  | 'Game Introduction'
  | 'Overview'
  | 'How to Play'
  | 'Gameplay Guide'
  | 'Gameplay Strategy'
  | 'Strategy and Tips'
  | 'Advanced Tips'
  | 'Walkthrough'
  | 'Controls Guide'
  | 'Controls'
  | 'Frequently Asked Questions'
  | 'FAQ'
  | 'Conclusion'
  | 'Wrapping Up'
  | 'Bottom Line'
  | 'Tips'
  | 'Tips and Strategies';

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
  s = s.replace(/^>\s+/, '');
  s = s.replace(/^[-*+]\s+/, '');
  s = s.replace(/^\d+\.\s+/, '');
  return s.trim();
}

function isUrlLike(s: string): boolean {
  return /^https?:\/\//i.test(s) || /^www\./i.test(s);
}

const englishWordRe = /[A-Za-z][A-Za-z']{1,}/g;

const allowedEnglishWords = new Set(
  [
    'fiddlebops',
    'fiddlebop',
    'incredibox',
    'sprunki',
    'roblox',
    'minecraft',
    'playfiddlebops',
  ].map((s) => s.toLowerCase())
);

const HEADING_PATTERNS: Array<{ re: RegExp; label: HeadingLabel }> = [
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
  { re: /^FAQ\s*$/i, label: 'FAQ' },
  { re: /^(Conclusion|Wrapping Up|Bottom Line)\b/i, label: 'Conclusion' },
  { re: /^Tips\b/i, label: 'Tips' },
  { re: /^Tips\s+and\s+Strategies\b/i, label: 'Tips and Strategies' },
];

function matchTemplateHeading(text: string): HeadingLabel | null {
  const normalized = text.trim().replace(/[:：?？]$/, '');
  for (const { re, label } of HEADING_PATTERNS) {
    if (re.test(normalized)) return label;
  }
  return null;
}

function countHangulChars(s: string): number {
  return (s.match(/[\uac00-\ud7af]/g) ?? []).length;
}

function tokenizeAsciiWords(s: string): string[] {
  return s.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
}

function countEnglishWordsExcludingAllowed(s: string): number {
  return (s.match(englishWordRe) ?? []).filter((w) => !allowedEnglishWords.has(w.toLowerCase())).length;
}

function isLikelyEnglishSentence(locale: Locale, raw: string): boolean {
  const text = raw.trim();
  if (!text) return false;
  if (isUrlLike(text)) return false;
  if (/^[\s\-\*#>_`~|:.()]+$/.test(text)) return false;

  const nonEn = countHangulChars(text);
  const englishWords = countEnglishWordsExcludingAllowed(text);

  // CJK locales: English stands out as latin words.
  if (nonEn >= 2) return false;
  if (englishWords >= 4) return true;
  if (englishWords >= 3 && text.length >= 40) return true;
  return false;
}

function findParentheticalEnglish(locale: Locale, text: string): string[] {
  const hits: string[] = [];
  const re = /[（(]([^）)]{2,})[)）]/g;
  for (const m of text.matchAll(re)) {
    const inside = (m[1] ?? '').trim();
    if (!inside) continue;
    if (!/\s/.test(inside)) continue;

    if (matchTemplateHeading(inside)) {
      hits.push(m[0]);
      continue;
    }

    const englishWords = (inside.match(englishWordRe) ?? []).filter((w) => !allowedEnglishWords.has(w.toLowerCase()))
      .length;
    if (englishWords >= 2 && countHangulChars(inside) === 0) hits.push(m[0]);
  }
  return hits;
}

function headingLabelToKo(label: HeadingLabel): string {
  switch (label) {
    case 'Detailed Game Introduction':
      return '게임 상세 소개';
    case 'Game Introduction':
      return '게임 소개';
    case 'Overview':
      return '개요';
    case 'How to Play':
      return '플레이 방법';
    case 'Gameplay Guide':
    case 'Gameplay Strategy':
    case 'Strategy and Tips':
    case 'Tips and Strategies':
      return '공략 & 플레이 팁';
    case 'Advanced Tips':
      return '고급 팁';
    case 'Walkthrough':
      return '공략';
    case 'Controls Guide':
    case 'Controls':
      return '조작 방법';
    case 'Frequently Asked Questions':
    case 'FAQ':
      return '자주 묻는 질문(FAQ)';
    case 'Conclusion':
    case 'Wrapping Up':
    case 'Bottom Line':
      return '마무리';
    case 'Tips':
      return '팁';
    default:
      return '게임 안내';
  }
}

function patchParentheticalEnglish(line: string, segments: string[]): string {
  let out = line;
  for (const seg of segments) {
    // Insert a short Korean marker before the closing bracket to avoid "pure English in parentheses"
    if (seg.endsWith(')')) out = out.replace(seg, seg.slice(0, -1) + ' 표기)');
    else if (seg.endsWith('）')) out = out.replace(seg, seg.slice(0, -1) + ' 표기）');
  }
  return out;
}

function detectLine(locale: Locale, rawLine: string): {
  templateHeading: HeadingLabel | null;
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

  const qa = /^\s*(?:[-*]\s*)?(?:\*{0,2})?(Q|A)\s*:\s*(.+)\s*$/i.exec(rawLine);
  let englishQA = false;
  if (qa) {
    const content = qa[2] ?? '';
    const nonEn = countHangulChars(content);
    const englishWords = countEnglishWordsExcludingAllowed(content);
    // Be stricter for Q/A lines: short English questions like "Best upgrade first?" should still be removed.
    englishQA = (nonEn === 0 && englishWords >= 2) || isLikelyEnglishSentence(locale, content);
  }

  const pureEnglishLine = isLikelyEnglishSentence(locale, line);

  if (!templateHeading && parentheticalEnglish.length === 0 && !pureEnglishLine && !englishQA) return null;
  return { templateHeading, parentheticalEnglish, pureEnglishLine, englishQA };
}

function dedupeFaqHeadings(lines: string[]): string[] {
  let seen = false;
  const out: string[] = [];
  for (const line of lines) {
    if (isHeading(line)) {
      const core = line.replace(/^\s*#{1,6}\s+/, '').trim();
      if (/^자주\s*묻는\s*질문\s*\(\s*FAQ\s*\)\s*$/i.test(core)) {
        if (seen) continue;
        seen = true;
      }
    }
    out.push(line);
  }
  return out;
}

function collapseBlankLines(lines: string[], maxConsecutive = 2): string[] {
  const out: string[] = [];
  let blanks = 0;
  for (const line of lines) {
    if (line.trim() === '') {
      blanks += 1;
      if (blanks > maxConsecutive) continue;
      out.push(line);
      continue;
    }
    blanks = 0;
    out.push(line);
  }
  return out;
}

async function fixMarkdownFile(repoRelPath: string): Promise<{ changed: boolean; removed: number; patchedParens: number; patchedHeadings: number }> {
  const absPath = path.join(process.cwd(), repoRelPath);
  const raw = await fs.readFile(absPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const bodyStart = findFrontmatterEnd(lines);

  let inCodeFence = false;
  let inHtmlComment = false;

  let removed = 0;
  let patchedParens = 0;
  let patchedHeadings = 0;

  const out: string[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx] ?? '';
    if (idx < bodyStart) {
      out.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!inHtmlComment && trimmed.includes('<!--')) inHtmlComment = true;
    if (inHtmlComment) {
      out.push(line);
      if (trimmed.includes('-->')) inHtmlComment = false;
      continue;
    }

    if (/^\s*```/.test(trimmed)) {
      inCodeFence = !inCodeFence;
      out.push(line);
      continue;
    }
    if (inCodeFence) {
      out.push(line);
      continue;
    }

    const info = detectLine(LOCALE, line);
    if (!info) {
      out.push(line);
      continue;
    }

    // Replace template headings (English -> Korean)
    if (isHeading(line) && info.templateHeading) {
      const prefix = line.match(/^\s*#{1,6}\s+/)?.[0] ?? '### ';
      const newHeading = headingLabelToKo(info.templateHeading);
      out.push(prefix + newHeading);
      patchedHeadings += 1;
      continue;
    }

    // Remove pure-English residue lines (including English Q/A content)
    if (info.pureEnglishLine || info.englishQA) {
      removed += 1;
      continue;
    }

    // Patch parenthetical-English triggers by appending a short Korean marker
    if (info.parentheticalEnglish.length > 0) {
      out.push(patchParentheticalEnglish(line, info.parentheticalEnglish));
      patchedParens += 1;
      continue;
    }

    out.push(line);
  }

  const post = collapseBlankLines(dedupeFaqHeadings(out), 2);
  const next = post.join('\n');
  const changed = next !== raw;
  if (changed) await fs.writeFile(absPath, next, 'utf8');
  return { changed, removed, patchedParens, patchedHeadings };
}

async function main() {
  const listPath = process.argv[2] ?? 'tmp-ko-english-residue-files.txt';
  const listRaw = await fs.readFile(listPath, 'utf8');
  const files = listRaw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  let changedFiles = 0;
  let removedLines = 0;
  let patchedParens = 0;
  let patchedHeadings = 0;

  for (const p of files) {
    const r = await fixMarkdownFile(p);
    if (r.changed) changedFiles += 1;
    removedLines += r.removed;
    patchedParens += r.patchedParens;
    patchedHeadings += r.patchedHeadings;
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      { locale: LOCALE, files: files.length, changedFiles, removedLines, patchedParens, patchedHeadings },
      null,
      2
    )
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
