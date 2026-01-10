#!/usr/bin/env node
/**
 * Validate game markdown titles after SEO title migration.
 *
 * Checks:
 * - `title` (display title) should be clean: no emoji, no brand suffix, no old "Game World" suffix,
 *   and no obvious SEO boilerplate tokens.
 * - `seoTitle` must exist, end with "| FiddleBops", and contain no emoji / "Game World".
 *
 * Usage:
 *   npx tsx scripts/validate-seo-titles.mts
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { toLocale } from '../src/lib/seo-title';
import type { Locale } from '../src/i18n/routing';

type Issue = {
  file: string;
  locale: Locale;
  field: 'title' | 'seoTitle';
  value: string;
  message: string;
};

const EMOJI_RE = /\p{Extended_Pictographic}/u;
const BRAND_SUFFIX_RE = /[|｜]\s*FiddleBops\s*$/i;
const OLD_SITE_RE = /(Game\s*World|游戏世界|ゲームワールド|게임\s*월드)/i;

function normalizeWhitespace(input: string): string {
  return String(input ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsEmoji(input: string): boolean {
  return EMOJI_RE.test(String(input ?? ''));
}

function looksLikeSeoBoilerplate(locale: Locale, title: string): boolean {
  const s = normalizeWhitespace(title).toLowerCase();
  if (!s) return false;

  // Universal obvious markers.
  if (s.includes('| fiddlebops')) return true;
  if (/\s-\s/.test(s)) return true;
  if (OLD_SITE_RE.test(s)) return true;

  // Locale-specific common CTA tokens.
  switch (locale) {
    case 'zh':
      return /免费|在线|線上|畅玩|暢玩|在线玩|在線玩|线上玩|線上玩/.test(s);
    case 'ja':
      return /無料|オンライン/.test(s);
    case 'ko':
      return /무료|온라인/.test(s);
    case 'es':
      return /en\s+l[ií]nea|gratis|^juega\b/.test(s);
    case 'fr':
      return /en\s+ligne|gratuit|^jouez\b/.test(s);
    case 'de':
      return /^spiele\b|kostenlos/.test(s);
    case 'en':
    default:
      return /^play\b|\bonline\s+free\b|\bfree\b$|\bonline\b$/.test(s);
  }
}

async function main(): Promise<void> {
  const files = await fg('src/content/games/**/*.md', { dot: false });
  files.sort();

  const issues: Issue[] = [];

  for (const rel of files) {
    const filePath = path.join(process.cwd(), rel);
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);
    const data = (parsed.data || {}) as Record<string, unknown>;

    const locale = toLocale(typeof data.locale === 'string' ? data.locale : undefined);
    const title = normalizeWhitespace(String(data.title ?? ''));
    const seoTitle = normalizeWhitespace(String(data.seoTitle ?? ''));

    // Display title checks
    if (!title) {
      issues.push({ file: rel, locale, field: 'title', value: title, message: 'missing title' });
    } else {
      if (containsEmoji(title)) {
        issues.push({ file: rel, locale, field: 'title', value: title, message: 'title contains emoji' });
      }
      if (BRAND_SUFFIX_RE.test(title) || /\|\s*FiddleBops/i.test(title)) {
        issues.push({
          file: rel,
          locale,
          field: 'title',
          value: title,
          message: 'title contains brand suffix',
        });
      }
      if (OLD_SITE_RE.test(title)) {
        issues.push({ file: rel, locale, field: 'title', value: title, message: 'title contains old site suffix' });
      }
      if (looksLikeSeoBoilerplate(locale, title)) {
        issues.push({
          file: rel,
          locale,
          field: 'title',
          value: title,
          message: 'title looks like SEO boilerplate',
        });
      }
    }

    // SEO title checks
    if (!seoTitle) {
      issues.push({ file: rel, locale, field: 'seoTitle', value: seoTitle, message: 'missing seoTitle' });
    } else {
      if (containsEmoji(seoTitle)) {
        issues.push({
          file: rel,
          locale,
          field: 'seoTitle',
          value: seoTitle,
          message: 'seoTitle contains emoji',
        });
      }
      if (!BRAND_SUFFIX_RE.test(seoTitle)) {
        issues.push({
          file: rel,
          locale,
          field: 'seoTitle',
          value: seoTitle,
          message: 'seoTitle must end with "| FiddleBops"',
        });
      }
      if (OLD_SITE_RE.test(seoTitle)) {
        issues.push({
          file: rel,
          locale,
          field: 'seoTitle',
          value: seoTitle,
          message: 'seoTitle contains old site suffix',
        });
      }
    }
  }

  if (issues.length === 0) {
    console.log(`validate-seo-titles: OK (${files.length} files)`);
    return;
  }

  const MAX_PRINT = 200;
  console.error(`validate-seo-titles: FAILED (${issues.length} issue(s), ${files.length} files)`);
  for (const i of issues.slice(0, MAX_PRINT)) {
    console.error(`- ${i.file} [${i.locale}] ${i.field}: ${i.message}`);
    console.error(`  "${i.value}"`);
  }
  if (issues.length > MAX_PRINT) {
    console.error(`... and ${issues.length - MAX_PRINT} more`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});

