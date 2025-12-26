#!/usr/bin/env node
/**
 * Fix FAQ list structure for locales to better match canonical structure.
 *
 * Targets files where canonical uses bullet Q/A with nested A items:
 *   *   **Q: ...**
 *       *   **A:** ...
 *
 * Common drift in some locales:
 * - Questions rendered as plain paragraphs (missing list marker)
 * - Answers rendered as plain paragraphs (missing nested list marker/indent)
 * - Nested Q lines caused by accidental indentation
 *
 * This script normalizes the localized FAQ section into:
 * - Q: list-item indent 0
 * - A: list-item indent 4 spaces (indentBucket=2)
 *
 * It intentionally does NOT translate content, only repairs structure markers.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

type Locale = 'ko' | 'de';
const DEFAULT_LOCALES: Locale[] = ['ko', 'de'];

const REPORT_PATH = path.join(process.cwd(), 'i18n-structure-report.json');
const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');

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

function normalizeAnswerLabel(s: string): string {
  const t = s.replace(/^A\s*[:.]\s*/i, '**A:** ');
  return t.replace(/^\*\*A\s*[:.]\*\*\s*/i, '**A:** ');
}

function stripListMarkerPrefix(s: string): string {
  return s.replace(/^[-*+]\s+/, '');
}

type CanonicalFaqVariant = 'none' | 'nested' | 'paragraph';

function detectCanonicalFaqVariant(body: string): CanonicalFaqVariant {
  const lines = body.split(/\r?\n/);
  const faqIdx = lines.findIndex((l) => /^###\s+.*FAQ\b/i.test(l.trim()));
  if (faqIdx < 0) return 'none';

  let sawQ = false;
  let sawNestedA = false;
  let sawParagraphA = false;

  for (let i = faqIdx + 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    if (/^###\s+/.test(t)) break;

    if (/^[-*+]\s+(\*\*Q[:.]|Q[:.])/.test(t)) {
      sawQ = true;
      continue;
    }

    if (/^\s{2,}[-*+]\s+(\*\*A[:.]|A[:.])/.test(lines[i])) {
      sawNestedA = true;
      continue;
    }

    if (/^(\*\*A[:.]|\*\*A\.\*\*|A[:.]|A\.)/i.test(t)) {
      sawParagraphA = true;
      continue;
    }
  }

  if (sawQ && sawNestedA) return 'nested';
  if (sawQ && sawParagraphA) return 'paragraph';
  return 'none';
}

function isQuestionLine(locale: Locale, trimmed: string): boolean {
  const s = stripListMarkerPrefix(trimmed);
  if (locale === 'de') return /^(\*\*F:|\*\*Q:|F:|Q:)/.test(s);
  return /^(\*\*Q[.:]|\*\*Q:|Q[.:]|Q:)/.test(s);
}

function isAnswerLine(locale: Locale, trimmed: string): boolean {
  const s = stripListMarkerPrefix(trimmed);
  if (locale === 'de') return /^(\*\*A:|\*\*A\.\*\*|A:|A\.)/i.test(s);
  return /^(\*\*A:|\*\*A\.\*\*|A:|A\.)/i.test(s);
}

function isNumberedBoldQuestionLine(trimmed: string): boolean {
  return /^\*\*\d+\.\s+.+\*\*\s*$/.test(trimmed);
}

function normalizeQuestionText(locale: Locale, trimmed: string): string {
  let s = stripListMarkerPrefix(trimmed).trim();

  const boldWrap = /^\*\*(.+)\*\*\s*$/.exec(s);
  if (boldWrap) s = boldWrap[1].trim();

  s = s.replace(/^\d+\.\s+/, '');
  if (locale === 'ko') s = s.replace(/^\d+\)\s+/, ''); // occasional "1) ..."

  return s;
}

function normalizeAnswerText(trimmed: string): string {
  let s = stripListMarkerPrefix(trimmed).trim();
  if (s.startsWith('>')) s = s.replace(/^>\s*/, '').trim();
  s = s.replace(/^(\*\*A[:.]\*\*|A[:.])\s*/i, '').trim();
  return s;
}

function fixFaqSection(
  locale: Locale,
  body: string,
  variant: CanonicalFaqVariant
): { fixed: string; changed: boolean } {
  const lines = body.split(/\r?\n/);
  const out = lines.slice();

  const faqIdx = out.findIndex((l) => /^###\s+.*FAQ\b/i.test(l.trim()));
  if (faqIdx < 0) return { fixed: body, changed: false };

  const faqEndIdx = (() => {
    for (let i = faqIdx + 1; i < out.length; i++) {
      if (/^###\s+/.test(out[i].trim())) return i;
    }
    return out.length;
  })();

  let inFaq = false;
  let changed = false;

  if (variant === 'paragraph' || variant === 'nested') {
    const section = out.slice(faqIdx + 1, faqEndIdx);
    const hasQ = section.some((l) => isQuestionLine(locale, l.trim()));
    const hasNumbered = section.some((l) => isNumberedBoldQuestionLine(l.trim()));

    if (!hasQ && hasNumbered) {
      const blocks: Array<{ q: string; answerLines: string[] }> = [];
      let current: { q: string; answerLines: string[] } | null = null;

      for (const rawLine of section) {
        const t = rawLine.trim();
        if (!t) {
          if (current) current.answerLines.push(rawLine);
          continue;
        }

        if (isQuestionLine(locale, t) || isNumberedBoldQuestionLine(t)) {
          if (current) blocks.push(current);
          current = { q: rawLine, answerLines: [] };
          continue;
        }

        if (current) current.answerLines.push(rawLine);
      }
      if (current) blocks.push(current);

      if (blocks.length > 0) {
        const rebuilt: string[] = [];

        for (const b of blocks) {
          const qText = normalizeQuestionText(locale, b.q.trim());
          const answerParts = b.answerLines
            .map((l) => normalizeAnswerText(l.trim()))
            .filter((x) => x.length > 0);

          if (variant === 'nested') {
            rebuilt.push(`*   **Q: ${qText}**`);
            rebuilt.push('');
            if (answerParts.length > 0) rebuilt.push(`    *   **A:** ${answerParts.join(' ')}`);
            else rebuilt.push('    *   **A:**');
            rebuilt.push('');
          } else {
            rebuilt.push(`- Q: ${qText}`);
            rebuilt.push('');
            if (answerParts.length > 0) rebuilt.push(`  A: ${answerParts.join(' ')}`);
            else rebuilt.push('  A:');
            rebuilt.push('');
          }
        }

        out.splice(faqIdx + 1, faqEndIdx - (faqIdx + 1), ...rebuilt);
        return { fixed: out.join('\n'), changed: true };
      }
    }
  }

  for (let i = 0; i < out.length; i++) {
    const line = out[i];
    const trimmed = line.trim();

    if (i === faqIdx) {
      inFaq = true;
      continue;
    }

    if (inFaq && i !== faqIdx && /^###\s+/.test(trimmed)) {
      inFaq = false;
      continue;
    }

    if (!inFaq) continue;
    if (!trimmed) continue;

    if (isQuestionLine(locale, trimmed)) {
      const q = stripListMarkerPrefix(trimmed);
      const next = `*   ${q}`;
      if (out[i] !== next) {
        out[i] = next;
        changed = true;
      }
      continue;
    }

    if (variant === 'nested' && isAnswerLine(locale, trimmed)) {
      const aRaw = stripListMarkerPrefix(trimmed);
      const a = normalizeAnswerLabel(aRaw);
      const next = `    *   ${a}`;
      if (out[i] !== next) {
        out[i] = next;
        changed = true;
      }
    }
  }

  return { fixed: out.join('\n'), changed };
}

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const opts = {
    locales: DEFAULT_LOCALES as Locale[],
    dryRun: false,
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
    } else if (a === '--dry-run') {
      opts.dryRun = true;
    } else if (a === '--help' || a === '-h') {
      console.log(`
Fix FAQ list structure (Q/A bullets)

Usage:
  tsx scripts/fix-i18n-faq-list-structure.mts [options]

Options:
  --locales <a,b>      Locales to fix (default: ${DEFAULT_LOCALES.join(',')})
  --dry-run            Do not write files
`);
      process.exit(0);
    }
  }

  return opts;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);

  const rawReport = await fs.readFile(REPORT_PATH, 'utf8');
  const report = JSON.parse(rawReport) as {
    mismatches: Array<{ urlstr: string; locale: string; canonicalFile: string; localizedFile: string }>;
  };

  const targets = report.mismatches
    .filter((m) => opts.locales.includes(m.locale as Locale))
    .map((m) => ({ urlstr: m.urlstr, locale: m.locale as Locale, canonicalFile: m.canonicalFile, localizedFile: m.localizedFile }));

  const seen = new Set<string>();
  const uniqueTargets = targets.filter((t) => {
    const k = `${t.locale}:${t.urlstr}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  let changedFiles = 0;

  for (const t of uniqueTargets) {
    const canonicalPath = path.join(GAMES_DIR, t.canonicalFile);
    const localizedPath = path.join(GAMES_DIR, t.localizedFile);

    const canonicalRaw = await fs.readFile(canonicalPath, 'utf8');
    const canonicalBody = matter(canonicalRaw).content;
    const variant = detectCanonicalFaqVariant(canonicalBody);
    if (variant === 'none') continue;

    const localizedRaw = await fs.readFile(localizedPath, 'utf8');
    const lines = localizedRaw.split(/\r?\n/);
    const fmEnd = findFrontmatterEnd(lines);
    if (fmEnd <= 0) continue;

    const fm = lines.slice(0, fmEnd).join('\n');
    const body = lines.slice(fmEnd).join('\n');

    const { fixed, changed } = fixFaqSection(t.locale, body, variant);
    if (!changed) continue;

    changedFiles += 1;
    if (!opts.dryRun) await fs.writeFile(localizedPath, `${fm}\n${fixed}`, 'utf8');
  }

  const label = opts.dryRun ? 'DRY RUN' : 'DONE';
  console.log(`✅ ${label}: FAQ list structure fixed`);
  console.log(`   changed files: ${changedFiles}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
