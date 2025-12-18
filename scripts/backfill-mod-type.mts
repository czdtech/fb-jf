#!/usr/bin/env node
/**
 * Backfill `modType` for canonical English game files (`*.en.md`).
 *
 * Rules (simple + deterministic):
 * - urlstr startsWith "incredibox" -> modType=incredibox
 * - urlstr startsWith "fiddlebops" -> modType=fiddlebops
 * - urlstr startsWith "sprunki" OR includes "sprunki" -> modType=sprunki
 *
 * Usage:
 *   tsx scripts/backfill-mod-type.mts
 *   tsx scripts/backfill-mod-type.mts --dry-run
 *   tsx scripts/backfill-mod-type.mts --force
 */

import fs from 'node:fs/promises';
import path from 'node:path';

type ModType = 'sprunki' | 'incredibox' | 'fiddlebops';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const force = args.has('--force');

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function normalizeSlug(raw: string): string {
  return raw.trim().replace(/^\/+/, '').replace(/\/+$/, '');
}

function detectModType(slug: string): ModType | null {
  if (!slug) return null;
  if (slug.startsWith('incredibox')) return 'incredibox';
  if (slug.startsWith('fiddlebops')) return 'fiddlebops';
  if (slug.startsWith('sprunki') || slug.includes('sprunki')) return 'sprunki';
  return null;
}

function extractField(frontmatter: string, name: string): { idx: number; value: string | null } {
  const lines = frontmatter.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = new RegExp(`^${name}\\s*:\\s*(.*)\\s*$`).exec(lines[i]);
    if (!m) continue;
    const raw = (m[1] || '').trim();
    if (!raw) return { idx: i, value: null };
    return { idx: i, value: raw.replace(/^['"]|['"]$/g, '') };
  }
  return { idx: -1, value: null };
}

function setField(frontmatter: string, name: string, value: string): string {
  const lines = frontmatter.split(/\r?\n/);
  const existing = extractField(frontmatter, name);
  const line = `${name}: ${value}`;

  if (existing.idx !== -1) {
    lines[existing.idx] = line;
    return lines.join('\n');
  }

  // Prefer inserting after locale.
  const localeIdx = lines.findIndex((l) => /^locale\s*:/.test(l));
  const insertAt = localeIdx === -1 ? lines.length : localeIdx + 1;
  lines.splice(insertAt, 0, line);
  return lines.join('\n');
}

function removeField(frontmatter: string, name: string): string {
  const lines = frontmatter.split(/\r?\n/);
  const filtered = lines.filter((l) => !new RegExp(`^${name}\\s*:`).test(l));
  return filtered.join('\n');
}

async function main(): Promise<void> {
  const files = (await fs.readdir(GAMES_DIR)).filter((f) => f.endsWith('.en.md'));

  let touched = 0;
  let skipped = 0;

  for (const filename of files) {
    const filePath = path.join(GAMES_DIR, filename);
    const relativePath = path.join('src', 'content', 'games', filename);
    const raw = await fs.readFile(filePath, 'utf8');

    const fm = raw.match(FRONTMATTER_RE);
    if (!fm) continue;
    const frontmatter = fm[1];

    const urlstr = extractField(frontmatter, 'urlstr').value || filename.replace(/\.en\.md$/, '');
    const slug = normalizeSlug(urlstr);
    const modType = detectModType(slug);

    const existing = extractField(frontmatter, 'modType');
    if (!force && existing.value) {
      skipped += 1;
      continue;
    }

    let nextFrontmatter = frontmatter;

    if (modType) {
      nextFrontmatter = setField(frontmatter, 'modType', modType);
    } else if (existing.idx !== -1) {
      nextFrontmatter = removeField(frontmatter, 'modType');
    } else {
      skipped += 1;
      continue;
    }

    const nextRaw = raw.replace(FRONTMATTER_RE, `---\n${nextFrontmatter}\n---\n`);
    if (nextRaw === raw) {
      skipped += 1;
      continue;
    }

    touched += 1;
    if (dryRun) {
      console.log(`DRY-RUN: ${relativePath} -> modType: ${modType ?? '(removed)'}`);
      continue;
    }

    await fs.writeFile(filePath, nextRaw, 'utf8');
    console.log(`✅ ${relativePath} -> modType: ${modType ?? '(removed)'}`);
  }

  console.log(`\nDone. touched=${touched} skipped=${skipped} dryRun=${dryRun} force=${force}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

