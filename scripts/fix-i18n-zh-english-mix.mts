#!/usr/bin/env node
/**
 * Auto-fix obvious English residue patterns in zh game markdown files.
 *
 * Scope: src/content/games/*.zh.md
 *
 * What it fixes (safe, template-ish):
 * - English template headings (Controls Guide / FAQ / Game Introduction / etc.)
 * - Redundant parenthetical English translations like “中文（Gameplay Strategy & Tips）”
 *   (keeps FAQ as “（FAQ）” when present)
 *
 * What it does NOT do (manual QA needed):
 * - Translate full English paragraphs/list items (non-template, game-specific)
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');

const englishWordRe = /[A-Za-z][A-Za-z']{1,}/g; // >=2 chars
const cjkRe = /[\u4e00-\u9fff]/g;

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

function getEnglishWords(s: string): string[] {
  return s.match(englishWordRe) ?? [];
}

function countCjk(s: string): number {
  return (s.match(cjkRe) ?? []).length;
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

const HEADING_MAP: Array<{ re: RegExp; zh: string }> = [
  { re: /^Detailed Game Introduction$/i, zh: '详细游戏介绍' },
  { re: /^Game Introduction$/i, zh: '游戏介绍' },
  { re: /^Overview$/i, zh: '概览' },
  { re: /^How to Play$/i, zh: '如何游玩' },
  { re: /^Gameplay Guide$/i, zh: '玩法指南' },
  { re: /^Gameplay Strategy$/i, zh: '玩法策略' },
  { re: /^Strategy\s+and\s+Tips$/i, zh: '玩法策略与技巧' },
  { re: /^Advanced Tips$/i, zh: '进阶技巧' },
  { re: /^Gameplay Strategy\s*&\s*Walkthrough$/i, zh: '玩法策略与通关思路' },
  { re: /^Gameplay Strategy\s*&\s*Tips$/i, zh: '玩法策略与实用技巧' },
  { re: /^Gameplay Strategy\s*&\s*Tips\s*$/i, zh: '玩法策略与实用技巧' },
  { re: /^Walkthrough$/i, zh: '通关指南' },
  { re: /^Controls Guide$/i, zh: '操作指南' },
  { re: /^Controls$/i, zh: '操作' },
  { re: /^(Frequently Asked Questions|Frequently Asked Questions\s*\(FAQ\)|FAQ)$/i, zh: '常见问题（FAQ）' },
  { re: /^(Conclusion|Wrapping Up|Bottom Line)$/i, zh: '总结' },
  { re: /^Tips$/i, zh: '小技巧' },
  { re: /^Tips\s+and\s+Strategies$/i, zh: '玩法技巧与策略' },
];

function mapEnglishHeading(core: string): string | null {
  const normalized = core.trim().replace(/[:：]$/, '');
  for (const { re, zh } of HEADING_MAP) {
    if (re.test(normalized)) return zh;
  }
  return null;
}

function normalizeFaqParen(s: string): string {
  // If the inside mentions FAQ anywhere, normalize to Chinese parens with FAQ only.
  if (/\bFAQ\b/i.test(s)) return '（FAQ）';
  return s;
}

function removeRedundantEnglishParens(line: string): { line: string; changed: boolean } {
  // Remove parentheses segments that are clearly English translations (>=2 English words),
  // but only when the remaining line still contains CJK (so we don't erase whole content).
  let changed = false;

  const replaced = line.replace(/[（(]([^）)]*)[)）]/g, (raw, inside: string) => {
    const normalizedInside = inside.trim();
    const englishWords = getEnglishWords(normalizedInside).length;
    if (englishWords < 2) return raw;

    const keepFaq = normalizeFaqParen(normalizedInside);
    if (keepFaq === '（FAQ）') {
      changed = true;
      return '（FAQ）';
    }

    const without = (line.replace(raw, '')).trim();
    if (countCjk(without) === 0) return raw;

    changed = true;
    return '';
  });

  // Minor cleanup: collapse duplicated FAQ parens.
  const cleaned = replaced.replace(/（FAQ）\s*（FAQ）/g, '（FAQ）');
  return { line: cleaned, changed: changed || cleaned !== line };
}

function fixHeadingLine(line: string): { line: string; changed: boolean } {
  const m = /^(\s*#{1,6}\s+)([\s\S]*?)\s*$/.exec(line);
  if (!m) return { line, changed: false };

  const prefix = m[1];
  const rawText = m[2];
  const { line: withoutParens, changed: parenChanged } = removeRedundantEnglishParens(rawText);

  const { core, wrap } = unwrapWholeEmphasis(withoutParens);
  const mapped = mapEnglishHeading(core);
  if (!mapped) {
    const out = `${prefix}${withoutParens}`.replace(/\s+$/, '');
    return { line: out, changed: parenChanged || out !== line };
  }

  const rebuilt = wrap ? `${wrap}${mapped}${wrap}` : mapped;
  const out = `${prefix}${rebuilt}`.replace(/\s+$/, '');
  return { line: out, changed: true };
}

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const opts = {
    dryRun: false,
    maxFiles: Infinity as number,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run') {
      opts.dryRun = true;
    } else if (a === '--max-files' && args[i + 1]) {
      const n = Number(args[++i]);
      if (Number.isFinite(n) && n > 0) opts.maxFiles = Math.floor(n);
    } else if (a === '--help' || a === '-h') {
      console.log(`
Auto-fix zh English residue (safe templates)

Usage:
  tsx scripts/fix-i18n-zh-english-mix.mts [options]

Options:
  --dry-run            Do not write files, just print summary
  --max-files <n>      Limit how many zh files to process (debug)
`);
      process.exit(0);
    }
  }

  return opts;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);

  const allFiles = (await fs.readdir(GAMES_DIR))
    .filter((f) => f.endsWith('.zh.md'))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, opts.maxFiles);

  let changedFiles = 0;
  let changedLines = 0;

  for (const file of allFiles) {
    const absPath = path.join(GAMES_DIR, file);
    const raw = await fs.readFile(absPath, 'utf8');
    const lines = raw.split(/\r?\n/);
    const bodyStart = findFrontmatterEnd(lines);

    let inCodeFence = false;
    let inHtmlComment = false;

    let fileChanged = false;

    for (let idx = bodyStart; idx < lines.length; idx++) {
      const line = lines[idx];
      const trimmed = line.trim();

      if (!inHtmlComment && trimmed.includes('<!--')) inHtmlComment = true;
      if (inHtmlComment) {
        if (trimmed.includes('-->')) inHtmlComment = false;
        continue;
      }

      if (trimmed.startsWith('```')) {
        inCodeFence = !inCodeFence;
        continue;
      }
      if (inCodeFence) continue;

      let next = line;
      let changed = false;

      if (isHeading(line)) {
        const r = fixHeadingLine(line);
        next = r.line;
        changed = r.changed;
      } else {
        const r = removeRedundantEnglishParens(line);
        next = r.line;
        changed = r.changed;
      }

      if (changed && next !== line) {
        lines[idx] = next;
        fileChanged = true;
        changedLines += 1;
      }
    }

    if (fileChanged) {
      changedFiles += 1;
      if (!opts.dryRun) {
        await fs.writeFile(absPath, lines.join('\n'), 'utf8');
      }
    }
  }

  const mode = opts.dryRun ? 'dry-run' : 'write';
  console.log(`✅ zh fix (templates) finished (${mode}).`);
  console.log(`   files processed: ${allFiles.length}`);
  console.log(`   files changed:   ${changedFiles}`);
  console.log(`   lines changed:   ${changedLines}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
