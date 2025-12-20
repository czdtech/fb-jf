#!/usr/bin/env node
/**
 * Normalize canonical `releaseDate` frontmatter values to `YYYY-MM-DD`.
 *
 * Why:
 * - Some entries may have ISO strings like `2025-10-18T00:00:00.000Z`.
 * - Astro will parse both, but keeping one format improves CMS consistency and diffs.
 *
 * Usage:
 *   npx tsx scripts/normalize-release-date.mts          # dry-run
 *   npx tsx scripts/normalize-release-date.mts --write  # write changes
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');

function normalizeReleaseDateLine(line: string): string | null {
  const m = line.match(/^releaseDate:\s*(.+)\s*$/);
  if (!m) return null;
  const raw = m[1].trim();

  // Already normalized.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return line;

  // ISO / RFC3339.
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return line;
    const dateOnly = d.toISOString().slice(0, 10);
    return `releaseDate: ${dateOnly}`;
  }

  return line;
}

async function main(): Promise<void> {
  const write = process.argv.includes('--write');

  const files = (await fs.readdir(GAMES_DIR)).filter((f) => f.endsWith('.en.md'));
  let changed = 0;
  let checked = 0;

  for (const filename of files) {
    const fullPath = path.join(GAMES_DIR, filename);
    const raw = await fs.readFile(fullPath, 'utf8');
    checked++;

    // Only operate on the YAML frontmatter block to avoid rewriting the entire file.
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n/);
    if (!fmMatch) continue;

    const fm = fmMatch[1];
    const lines = fm.split('\n');
    let touched = false;
    const nextLines = lines.map((line) => {
      if (!line.startsWith('releaseDate:')) return line;
      const next = normalizeReleaseDateLine(line);
      if (next !== line) touched = true;
      return next ?? line;
    });

    if (!touched) continue;

    const nextFm = nextLines.join('\n');
    const nextRaw = raw.replace(fmMatch[0], `---\n${nextFm}\n---\n`);
    if (nextRaw === raw) continue;

    changed++;
    if (write) await fs.writeFile(fullPath, nextRaw, 'utf8');
  }

  console.log(
    write
      ? `✅ releaseDate normalized: ${changed}/${checked} canonical files updated.`
      : `ℹ️  releaseDate normalization dry-run: ${changed}/${checked} canonical files would change. (run with --write)`
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
