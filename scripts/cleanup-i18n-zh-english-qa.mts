#!/usr/bin/env node
/**
 * Cleanup zh game markdown files by removing obvious English Q/A residue lines.
 *
 * Scope: src/content/games/*.zh.md
 *
 * Removes lines that look like English FAQ Q:/A: entries, e.g.:
 * - Q: ...
 * - A: ...
 * - **Q:** ...
 * - **A:** ...
 *
 * Safety:
 * - Only removes when the line contains Q/A prefix AND is mostly English
 *   (>=3 English words and <=2 CJK chars).
 * - Skips code fences and HTML comments.
 *
 * This is intended to delete duplicated English snippets left alongside
 * already-translated Chinese content.
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

function getEnglishWordCount(s: string): number {
  return (s.match(englishWordRe) ?? []).length;
}

function getCjkCount(s: string): number {
  return (s.match(cjkRe) ?? []).length;
}

function isEnglishQALine(line: string): boolean {
  if (!/\b(Q|A)\s*[:：]/.test(line)) return false;
  const englishWordCount = getEnglishWordCount(line);
  const cjkCount = getCjkCount(line);
  return englishWordCount >= 3 && cjkCount <= 2;
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
Cleanup zh English FAQ Q/A residue

Usage:
  tsx scripts/cleanup-i18n-zh-english-qa.mts [options]

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
  let removedLines = 0;

  for (const file of allFiles) {
    const absPath = path.join(GAMES_DIR, file);
    const raw = await fs.readFile(absPath, 'utf8');
    const lines = raw.split(/\r?\n/);
    const bodyStart = findFrontmatterEnd(lines);

    let inCodeFence = false;
    let inHtmlComment = false;

    let fileChanged = false;
    const nextLines: string[] = [];

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const trimmed = line.trim();

      if (idx >= bodyStart) {
        if (!inHtmlComment && trimmed.includes('<!--')) inHtmlComment = true;
        if (inHtmlComment) {
          nextLines.push(line);
          if (trimmed.includes('-->')) inHtmlComment = false;
          continue;
        }

        if (trimmed.startsWith('```')) {
          inCodeFence = !inCodeFence;
          nextLines.push(line);
          continue;
        }
        if (inCodeFence) {
          nextLines.push(line);
          continue;
        }

        if (isEnglishQALine(line)) {
          fileChanged = true;
          removedLines += 1;
          continue;
        }
      }

      nextLines.push(line);
    }

    if (fileChanged) {
      changedFiles += 1;
      if (!opts.dryRun) {
        await fs.writeFile(absPath, nextLines.join('\n'), 'utf8');
      }
    }
  }

  const mode = opts.dryRun ? 'dry-run' : 'write';
  console.log(`✅ zh cleanup (English QA) finished (${mode}).`);
  console.log(`   files processed: ${allFiles.length}`);
  console.log(`   files changed:   ${changedFiles}`);
  console.log(`   lines removed:   ${removedLines}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});

