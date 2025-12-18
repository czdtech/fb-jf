#!/usr/bin/env node
/**
 * Tag taxonomy report for canonical games.
 *
 * Goal: keep tags “少而精”，并避免同义/格式重复（如 "2 player" vs "2-player"）。
 *
 * Usage:
 *   npx tsx scripts/tags-report.mts
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

// Allow piping output to tools like `head` without throwing EPIPE.
process.stdout.on('error', (err: any) => {
  if (err && err.code === 'EPIPE') process.exit(0);
});

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const CANONICAL_SUFFIX = '.en.md';

const CORE_CATEGORY_SLUGS = new Set([
  'puzzle',
  'casual',
  'thinky',
  'action',
  'sports',
  'strategy',
  'platformer',
  'arcade',
  'shooting',
  'card',
  'rhythm',
  'adventure',
  'music',
  'clicker',
  'driving',
  'physics',
  'multiplayer',
  '2-player',
]);

function normalize(tag: unknown): string {
  return String(tag ?? '').trim().toLowerCase();
}

function slugifyTag(tag: string): string {
  return normalize(tag).replace(/\s+/g, '-');
}

async function main(): Promise<void> {
  const files = (await fs.readdir(GAMES_DIR)).filter((f) => f.endsWith(CANONICAL_SUFFIX));

  const freq = new Map<string, number>();
  const slugToVariants = new Map<string, Array<{ tag: string; count: number }>>();

  let totalGames = 0;
  let gamesMissingCoreCategory = 0;

  for (const file of files) {
    const raw = await fs.readFile(path.join(GAMES_DIR, file), 'utf8');
    const data = matter(raw).data || {};
    const tags = Array.isArray(data.tags) ? data.tags : [];

    totalGames += 1;

    const hasCore = tags.some((t) => CORE_CATEGORY_SLUGS.has(slugifyTag(String(t))));
    if (!hasCore) {
      gamesMissingCoreCategory += 1;
    }

    for (const tag of tags) {
      const n = normalize(tag);
      if (!n) continue;
      freq.set(n, (freq.get(n) || 0) + 1);
    }
  }

  // Build slug -> variants mapping (for space/hyphen duplicates).
  for (const [tag, count] of freq.entries()) {
    const slug = slugifyTag(tag);
    const arr = slugToVariants.get(slug) || [];
    arr.push({ tag, count });
    slugToVariants.set(slug, arr);
  }

  const uniqueTags = freq.size;
  const counts = [...freq.values()];
  const once = counts.filter((c) => c === 1).length;
  const le2 = counts.filter((c) => c <= 2).length;
  const ge5 = counts.filter((c) => c >= 5).length;
  const ge10 = counts.filter((c) => c >= 10).length;

  const top = [...freq.entries()]
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, 50);

  const dupes = [...slugToVariants.entries()]
    .filter(([, variants]) => variants.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  console.log(`Canonical games: ${totalGames}`);
  console.log(`Unique tags: ${uniqueTags}`);
  console.log(`Tag frequency: once=${once}, <=2=${le2}, >=5=${ge5}, >=10=${ge10}`);
  console.log(`Games missing any CORE category tag: ${gamesMissingCoreCategory}`);

  console.log('\nTop tags:');
  for (const [tag, count] of top) {
    console.log(String(count).padStart(4, ' '), tag);
  }

  if (dupes.length) {
    console.log('\nPotential duplicates (space/hyphen variants):');
    for (const [slug, variants] of dupes.slice(0, 30)) {
      const parts = variants
        .sort((a, b) => (b.count - a.count) || a.tag.localeCompare(b.tag))
        .map((v) => `${v.tag}(${v.count})`)
        .join(' | ');
      console.log(`${slug} => ${parts}`);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
