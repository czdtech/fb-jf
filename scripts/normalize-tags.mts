#!/usr/bin/env node
/**
 * Normalize tags for canonical games (src/content/games/*.en.md).
 *
 * What it does:
 * - trims tags
 * - applies a small alias map for obvious duplicates (space/hyphen variants)
 * - removes duplicates while preserving order
 *
 * Usage:
 *   npx tsx scripts/normalize-tags.mts        # write changes
 *   npx tsx scripts/normalize-tags.mts --dry-run
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const CANONICAL_SUFFIX = '.en.md';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');

/**
 * Alias map (lowercased + trimmed).
 * Keep this list small and obvious; do not encode subjective taxonomy decisions here.
 */
const TAG_ALIASES: Record<string, string> = {
  '2 player': '2-player',
  '2-player': '2-player',
  'tower defense': 'tower-defense',
  'tower-defense': 'tower-defense',
  'board game': 'board-game',
  'board-game': 'board-game',
  'endless runner': 'endless-runner',
  'endless-runner': 'endless-runner',
  'io game': 'io-game',
  'io-game': 'io-game',
  'card game': 'card-game',
  'card-game': 'card-game',
};

function normalizeRaw(tag: unknown): string {
  return String(tag ?? '').trim();
}

function normalizeKey(tag: string): string {
  return tag.trim().toLowerCase();
}

function applyAlias(tag: string): string {
  const key = normalizeKey(tag);
  return TAG_ALIASES[key] || tag;
}

function dedupePreserveOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = normalizeKey(item);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function main(): Promise<void> {
  const files = (await fs.readdir(GAMES_DIR)).filter((f) => f.endsWith(CANONICAL_SUFFIX));

  let changedFiles = 0;
  let changedTags = 0;

  for (const file of files) {
    const filePath = path.join(GAMES_DIR, file);
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);

    const data = parsed.data || {};
    const tags = data.tags;
    if (!Array.isArray(tags)) continue;

    const nextTags = dedupePreserveOrder(
      tags
        .map(normalizeRaw)
        .filter(Boolean)
        .map((t) => applyAlias(t))
    );

    const prevTags = tags.map((t) => String(t));
    const same =
      prevTags.length === nextTags.length &&
      prevTags.every((t, i) => normalizeKey(t) === normalizeKey(nextTags[i]));

    if (same) continue;

    data.tags = nextTags;
    const next = matter.stringify(parsed.content, data);
    changedFiles += 1;
    changedTags += Math.abs(prevTags.length - nextTags.length);

    if (!dryRun) {
      await fs.writeFile(filePath, next, 'utf8');
    }
  }

  const mode = dryRun ? 'DRY RUN' : 'WRITE';
  console.log(`✅ normalize-tags (${mode}): ${changedFiles} file(s) changed`);
  if (changedTags) console.log(`   (dedupe delta count: ${changedTags})`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});

