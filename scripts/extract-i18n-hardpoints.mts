#!/usr/bin/env node
/**
 * Extract i18n hardpoints from game markdown files (src/content/games/*).
 *
 * Hardpoints:
 * - frontmatter hard-sync fields (subset)
 * - iframeSrc (frontmatter)
 * - controls key tokens (inlineCode inside `<!-- i18n:section:controls -->`)
 * - numeric tokens (text nodes inside allowed sections)
 * - FAQ ID sequence (HTML comments inside `<!-- i18n:section:faq -->`)
 *
 * Note: This script is report-oriented; CI gating is implemented separately.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { parseFaqIdFromHtmlComment, type FaqId } from './lib/faq-id-generator.mts';

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const SUPPORTED_LOCALES = ['en', 'zh', 'ja', 'es', 'fr', 'de', 'ko'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type SectionName =
  | 'introduction'
  | 'how-to-play'
  | 'rules'
  | 'tips'
  | 'controls'
  | 'faq'
  | (string & {});

export interface ExtractedHardpoints {
  slug: string;
  locale: Locale;
  filePath: string; // repo-relative
  frontmatter: Record<string, unknown>;
  iframeSrc: string | null;
  controls: {
    sectionFound: boolean;
    keyTokens: string[];
  };
  numbers: {
    sectionsFound: string[];
    tokens: string[];
    tokenCounts: Record<string, number>;
  };
  faq: {
    sectionFound: boolean;
    ids: FaqId[];
  };
}

const SECTION_MARKER_RE = /<!--\s*i18n:section:([a-z0-9-]+)\s*-->/i;
const ALLOWED_NUMBER_SECTIONS = new Set<string>(['how-to-play', 'rules', 'tips']);

const NUMBER_TOKEN_RE =
  /(?<![A-Za-z0-9_])(\d+(?:\.\d+)?(?:%|ms|s|sec|secs|min|mins|h|hr|hrs|x|fps|hz|px)?)(?![A-Za-z0-9_])/gi;

type MdastNode = {
  type: string;
  value?: string;
  children?: MdastNode[];
} & Record<string, unknown>;

function normalizeLocale(raw: unknown, fallback: string): Locale {
  const value = typeof raw === 'string' ? raw.trim() : '';
  const candidate = value || fallback;
  return (SUPPORTED_LOCALES.includes(candidate as Locale) ? candidate : 'en') as Locale;
}

function inferLocaleFromFilename(filePath: string): string {
  const m = /\.([a-z]{2})\.md$/i.exec(path.basename(filePath));
  return m ? m[1].toLowerCase() : 'en';
}

function inferSlugFromFilename(filePath: string): string {
  return path.basename(filePath).replace(/\.(en|zh|ja|es|fr|de|ko)\.md$/i, '');
}

function normalizeKeyToken(raw: string): string {
  const token = raw.trim();
  if (/^[a-z]$/i.test(token)) return token.toUpperCase();
  return token;
}

function normalizeFullwidthDigits(s: string): string {
  return s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xff10 + 0x30));
}

function normalizeNumberTextForExtraction(s: string): string {
  let out = normalizeFullwidthDigits(s);
  out = out.replace(/％/g, '%');
  // Normalize multiplication sign so "3×3" can yield an "3x" token.
  out = out.replace(/(\d)\s*×\s*(\d)/g, '$1x$2');
  // Normalize uppercase suffix variants to keep tokens stable.
  out = out.replace(/(\d)X\b/g, '$1x');
  return out;
}

function addCount(map: Record<string, number>, token: string): void {
  map[token] = (map[token] ?? 0) + 1;
}

function walk(node: MdastNode, visit: (n: MdastNode) => void): void {
  visit(node);
  const children = node.children;
  if (!children) return;
  for (const child of children) {
    walk(child, visit);
  }
}

function extractSectionMarker(node: MdastNode): string | null {
  if (node.type !== 'html') return null;
  const raw = typeof node.value === 'string' ? node.value : '';
  const match = SECTION_MARKER_RE.exec(raw);
  return match ? match[1].toLowerCase() : null;
}

export function extractHardpointsFromMarkdown(
  markdown: string,
  frontmatterData: Record<string, unknown>,
  options: { filePath: string }
): ExtractedHardpoints {
  const localeFromFilename = inferLocaleFromFilename(options.filePath);
  const locale = normalizeLocale(frontmatterData.locale, localeFromFilename);

  const slugFromFilename = inferSlugFromFilename(options.filePath);
  const slug =
    typeof frontmatterData.urlstr === 'string' && frontmatterData.urlstr.trim()
      ? frontmatterData.urlstr.trim()
      : slugFromFilename;

  const iframeSrc =
    typeof frontmatterData.iframeSrc === 'string' && frontmatterData.iframeSrc.trim()
      ? frontmatterData.iframeSrc.trim()
      : null;

  // Numbers that appear in the slug are often part of the game name (e.g., "2048", "2", "v09").
  // Treat them as non-hardpoint numbers so locales can mention the title without failing alignment.
  const ignoredPlainNumbers = new Set<string>();
  {
    const re = /\d+/g;
    let m: RegExpExecArray | null = null;
    while ((m = re.exec(slug))) {
      ignoredPlainNumbers.add(m[0]);
    }
  }

  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as MdastNode;

  let currentSection: string | null = null;
  let controlsSectionFound = false;
  let faqSectionFound = false;
  const numberSectionsFound = new Set<string>();

  const keyTokens: string[] = [];
  const numberTokens: string[] = [];
  const numberCounts: Record<string, number> = {};
  const faqIds: FaqId[] = [];

  const rootChildren = Array.isArray(tree.children) ? tree.children : [];

  for (const child of rootChildren) {
    const marker = extractSectionMarker(child);
    if (marker) {
      currentSection = marker;
      if (marker === 'controls') controlsSectionFound = true;
      if (marker === 'faq') faqSectionFound = true;
      if (ALLOWED_NUMBER_SECTIONS.has(marker)) numberSectionsFound.add(marker);
      continue;
    }

    if (!currentSection) continue;

    if (currentSection === 'controls') {
      walk(child, (n) => {
        if (n.type !== 'inlineCode') return;
        const raw = typeof n.value === 'string' ? n.value : '';
        const token = normalizeKeyToken(raw);
        if (!token) return;
        keyTokens.push(token);
      });
      continue;
    }

    if (ALLOWED_NUMBER_SECTIONS.has(currentSection)) {
      walk(child, (n) => {
        if (n.type !== 'text') return;
        const raw = typeof n.value === 'string' ? n.value : '';
        if (!raw) return;

        const normalized = normalizeNumberTextForExtraction(raw);

        NUMBER_TOKEN_RE.lastIndex = 0;
        let m: RegExpExecArray | null = null;
        while ((m = NUMBER_TOKEN_RE.exec(normalized))) {
          const token = m[1];

          // Skip plain single-digit numbers (too noisy across locales and often written as words in English).
          if (/^\d$/.test(token)) continue;
          // Skip plain numbers that appear in the slug (usually just part of the title).
          if (/^\d+$/.test(token) && ignoredPlainNumbers.has(token)) continue;
          // Avoid false positives where the trailing "s" is plural (e.g., "match-3s", "'4s'") rather than seconds.
          if (/^\d+s$/i.test(token)) {
            const start = typeof m.index === 'number' ? m.index : -1;
            const prev = start > 0 ? normalized[start - 1] : '';
            if (/[-‐‑–—'’]/.test(prev)) continue;
          }

          numberTokens.push(token);
          addCount(numberCounts, token);
        }
      });
      continue;
    }

    if (currentSection === 'faq') {
      walk(child, (n) => {
        if (n.type !== 'html') return;
        const raw = typeof n.value === 'string' ? n.value : '';
        const id = parseFaqIdFromHtmlComment(raw);
        if (id) faqIds.push(id);
      });
    }
  }

  return {
    slug,
    locale,
    filePath: options.filePath,
    frontmatter: frontmatterData,
    iframeSrc,
    controls: { sectionFound: controlsSectionFound, keyTokens },
    numbers: {
      sectionsFound: Array.from(numberSectionsFound.values()).sort(),
      tokens: numberTokens,
      tokenCounts: numberCounts,
    },
    faq: { sectionFound: faqSectionFound, ids: faqIds },
  };
}

export async function extractHardpointsFromFile(filePath: string): Promise<ExtractedHardpoints> {
  const raw = await fs.readFile(filePath, 'utf8');
  const { data, content } = matter(raw);
  const repoRel = path.relative(process.cwd(), filePath);
  return extractHardpointsFromMarkdown(content, data as Record<string, unknown>, { filePath: repoRel });
}

async function listGameMarkdownFiles(dir = GAMES_DIR): Promise<string[]> {
  const files = await fs.readdir(dir);
  return files
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(dir, f));
}

function printHumanReadable(result: ExtractedHardpoints): void {
  const controls = result.controls.keyTokens.length ? result.controls.keyTokens.join(', ') : '(none)';
  const faq = result.faq.ids.length ? `${result.faq.ids.length} ids` : '(none)';
  const numbers = Object.keys(result.numbers.tokenCounts).length
    ? Object.entries(result.numbers.tokenCounts)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([k, v]) => `${k}×${v}`)
        .join(', ')
    : '(none)';

  console.log(`- ${result.filePath}`);
  console.log(`  slug=${result.slug} locale=${result.locale}`);
  console.log(`  iframeSrc=${result.iframeSrc ?? '(missing)'}`);
  console.log(`  controls=${controls}`);
  console.log(`  numbers=${numbers}`);
  console.log(`  faq=${faq}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fileFlag = args.indexOf('--file');
  const jsonOutFlag = args.indexOf('--json-out');
  const pretty = args.includes('--pretty');

  const fileArg = fileFlag >= 0 ? args[fileFlag + 1] : null;
  const jsonOut = jsonOutFlag >= 0 ? args[jsonOutFlag + 1] : null;

  const files = fileArg ? [path.resolve(fileArg)] : await listGameMarkdownFiles(GAMES_DIR);
  const results: ExtractedHardpoints[] = [];

  for (const abs of files) {
    results.push(await extractHardpointsFromFile(abs));
  }

  if (jsonOut) {
    await fs.writeFile(jsonOut, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  }

  if (pretty || !jsonOut) {
    for (const r of results) printHumanReadable(r);
  }
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
