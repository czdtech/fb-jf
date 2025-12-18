#!/usr/bin/env node
/**
 * Backfill missing `releaseDate` for canonical English game files (`*.en.md`)
 * using git commit timestamps.
 *
 * Why:
 * - update-games / categories rely on releaseDate for deterministic sorting.
 * - Existing content has gaps; we backfill once, then CMS owns future edits.
 *
 * Usage:
 *   tsx scripts/backfill-release-date.mts
 *   tsx scripts/backfill-release-date.mts --mode=updated
 *   tsx scripts/backfill-release-date.mts --force
 *   tsx scripts/backfill-release-date.mts --dry-run
 *
 * Options:
 * - --mode=created   Use first commit time (default; approximates “上线/新增时间”)
 * - --mode=updated   Use last commit time (approximates “最近更新”)
 * - --force          Overwrite existing releaseDate values
 * - --dry-run        Print planned changes without writing files
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

type Mode = 'created' | 'updated';

const args = new Set(process.argv.slice(2));
const modeArg = [...args].find((a) => a.startsWith('--mode='));
const mode = (modeArg?.split('=')[1] || 'created') as Mode;
const force = args.has('--force');
const dryRun = args.has('--dry-run');

if (mode !== 'created' && mode !== 'updated') {
  console.error(`❌ Invalid --mode value: ${mode}. Use --mode=created or --mode=updated.`);
  process.exit(1);
}

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toYyyyMmDd(iso: string): string | null {
  const date = iso.trim().slice(0, 10);
  return isIsoDate(date) ? date : null;
}

function gitGetDateForFile(relativePath: string, mode: Mode): string | null {
  try {
    const out =
      mode === 'updated'
        ? execFileSync('git', ['log', '-1', '--format=%aI', '--', relativePath], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
          }).trim()
        : execFileSync('git', ['log', '--follow', '--format=%aI', '--', relativePath], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
          }).trim();

    if (!out) return null;
    const lines = out.split(/\r?\n/).filter(Boolean);
    const picked = mode === 'updated' ? lines[0] : lines[lines.length - 1];
    return toYyyyMmDd(picked);
  } catch {
    return null;
  }
}

function extractReleaseDate(frontmatter: string): { idx: number; value: string | null } {
  const lines = frontmatter.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = /^releaseDate\s*:\s*(.*)\s*$/.exec(lines[i]);
    if (!m) continue;
    const raw = (m[1] || '').trim();
    if (!raw) return { idx: i, value: null };
    const unquoted = raw.replace(/^['"]|['"]$/g, '');
    const normalized = toYyyyMmDd(unquoted);
    return { idx: i, value: normalized };
  }
  return { idx: -1, value: null };
}

function insertOrReplaceReleaseDate(frontmatter: string, date: string): string {
  const lines = frontmatter.split(/\r?\n/);
  const existing = extractReleaseDate(frontmatter);

  const line = `releaseDate: ${date}`;

  if (existing.idx !== -1) {
    lines[existing.idx] = line;
    return lines.join('\n');
  }

  const preferAfter = ['developer', 'score', 'urlstr', 'thumbnail', 'iframeSrc', 'description', 'title', 'locale', 'tags'];
  let insertAt = lines.length;

  for (const key of preferAfter) {
    const idx = lines.findIndex((l) => new RegExp(`^${key}\\s*:`).test(l));
    if (idx !== -1) {
      insertAt = idx + 1;
      break;
    }
  }

  // Avoid inserting after trailing blank lines.
  while (insertAt > 0 && insertAt === lines.length && lines[insertAt - 1].trim() === '') {
    insertAt -= 1;
  }

  lines.splice(insertAt, 0, line);
  return lines.join('\n');
}

async function main(): Promise<void> {
  const all = await fs.readdir(GAMES_DIR);
  const files = all.filter((f) => f.endsWith('.en.md'));

  let touched = 0;
  let skipped = 0;
  let failed = 0;

  for (const filename of files) {
    const relativePath = path.join('src', 'content', 'games', filename);
    const absolutePath = path.join(GAMES_DIR, filename);
    const raw = await fs.readFile(absolutePath, 'utf8');

    const fm = raw.match(FRONTMATTER_RE);
    if (!fm) {
      console.warn(`⚠️  No frontmatter found: ${relativePath}`);
      skipped += 1;
      continue;
    }

    const frontmatter = fm[1];
    const current = extractReleaseDate(frontmatter);

    if (!force && current.idx !== -1 && current.value) {
      skipped += 1;
      continue;
    }

    const date = gitGetDateForFile(relativePath, mode);
    if (!date) {
      console.warn(`⚠️  Could not determine git date (${mode}): ${relativePath}`);
      failed += 1;
      continue;
    }

    if (!force && current.idx !== -1 && !current.value) {
      // Has releaseDate but invalid/empty; we will replace.
    } else if (!force && current.idx !== -1 && current.value) {
      // Already handled by early continue.
    }

    const newFrontmatter = insertOrReplaceReleaseDate(frontmatter, date);
    const newRaw = raw.replace(FRONTMATTER_RE, `---\n${newFrontmatter}\n---\n`);

    if (newRaw === raw) {
      skipped += 1;
      continue;
    }

    touched += 1;

    if (dryRun) {
      console.log(`DRY-RUN: ${relativePath} -> releaseDate: ${date}`);
      continue;
    }

    await fs.writeFile(absolutePath, newRaw, 'utf8');
    console.log(`✅ ${relativePath} -> releaseDate: ${date}`);
  }

  console.log(`\nDone. touched=${touched} skipped=${skipped} failed=${failed} mode=${mode} force=${force} dryRun=${dryRun}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

