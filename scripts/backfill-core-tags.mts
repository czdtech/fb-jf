#!/usr/bin/env node
/**
 * Ensure each canonical game has at least one “core category” tag.
 *
 * Core tags are used to generate `/c/<slug>/` category pages (strategy B: only core pages).
 * This script adds ONE best-guess core tag when a game has none.
 *
 * Usage:
 *   npx tsx scripts/backfill-core-tags.mts           # dry-run (prints stats + sample)
 *   npx tsx scripts/backfill-core-tags.mts --write   # write changes
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');

const CORE_TAGS = [
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
] as const;

const CORE_SET = new Set<string>(CORE_TAGS);

// Heuristic mapping: non-core tags -> core tag.
const MAP: Record<string, (typeof CORE_TAGS)[number]> = {
  // sports
  soccer: 'sports',
  football: 'sports',
  basketball: 'sports',
  golf: 'sports',
  tennis: 'sports',

  // driving / racing
  drifting: 'driving',
  racing: 'driving',
  car: 'driving',
  skiing: 'driving',
  downhill: 'driving',

  // strategy
  'tower-defense': 'strategy',
  tycoon: 'strategy',
  simulation: 'strategy',
  simulator: 'strategy',
  'time-management': 'strategy',

  // shooting
  fps: 'shooting',

  // rhythm / music
  electronic: 'music',

  // puzzle / thinky
  'brain-teaser': 'thinky',
  logic: 'thinky',
  trivia: 'thinky',
  quiz: 'thinky',
  bejeweled: 'puzzle',
  word: 'puzzle',
  'word-game': 'puzzle',
  mahjong: 'puzzle',
  'board-game': 'puzzle',
  'card-game': 'card',

  // action
  roguelike: 'action',
  'action-rpg': 'action',
  fighting: 'action',
  survival: 'action',
  horror: 'action',
  stickman: 'action',
  io: 'multiplayer',
  'io-game': 'multiplayer',
  'battle-royale': 'multiplayer',

  // arcade / platformer
  'endless-runner': 'arcade',
  runner: 'arcade',
  'crossy-road': 'arcade',
  'crossy road': 'arcade',
  slope: 'arcade',
  ball: 'arcade',
  flash: 'arcade',
  classic: 'arcade',
  '3d': 'arcade',
  sandbox: 'adventure',
  escape: 'adventure',
  crafting: 'adventure',
  creative: 'adventure',
  pirate: 'adventure',
  '2d platformer': 'platformer',
  platformer: 'platformer',
  'point-and-click': 'adventure',
  'interactive-story': 'thinky',
  satire: 'thinky',
  'social-commentary': 'thinky',
  'dandyrunki retake': 'music',
  'dandyrunki retake online': 'music',
  '60 seconds burger run': 'arcade',
};

function normalizeTag(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim().toLowerCase();
  return t ? t : null;
}

function pickCoreTag(tags: string[]): (typeof CORE_TAGS)[number] | null {
  const counts = new Map<(typeof CORE_TAGS)[number], number>();

  for (const t of tags) {
    const mapped = MAP[t];
    if (mapped) {
      counts.set(mapped, (counts.get(mapped) || 0) + 1);
      continue;
    }

    // Substring heuristics for messy tags.
    if (t.includes('sprunki') || t.includes('incredibox') || t.includes('fiddlebops') || t.includes('sprunk')) {
      counts.set('music', (counts.get('music') || 0) + 1);
      continue;
    }
    if (t.includes('dandyrunki')) {
      counts.set('music', (counts.get('music') || 0) + 1);
      continue;
    }
    if (t.includes('pixelbox') || t.includes('beatbox')) {
      counts.set('music', (counts.get('music') || 0) + 1);
      continue;
    }
    if (t.includes('quiz') || t.includes('trivia')) {
      counts.set('thinky', (counts.get('thinky') || 0) + 1);
      continue;
    }
    if (t.includes('platformer')) {
      counts.set('platformer', (counts.get('platformer') || 0) + 1);
      continue;
    }
    if (t.includes('geometry dash') || t.includes('geometry-dash')) {
      counts.set('platformer', (counts.get('platformer') || 0) + 1);
      continue;
    }
    if (t.includes('race') || t.includes('drift') || t.includes('ski') || t.includes('downhill')) {
      counts.set('driving', (counts.get('driving') || 0) + 1);
      continue;
    }
    if (t.includes('minecraft')) {
      counts.set('adventure', (counts.get('adventure') || 0) + 1);
      continue;
    }
    if (t.includes('burger') && t.includes('run')) {
      counts.set('arcade', (counts.get('arcade') || 0) + 1);
      continue;
    }
    if (t.includes('roguelike') || t.includes('action-rpg')) {
      counts.set('action', (counts.get('action') || 0) + 1);
      continue;
    }
    if (t.endsWith('io') || t === 'io') {
      counts.set('multiplayer', (counts.get('multiplayer') || 0) + 1);
      continue;
    }
    if (t.includes('io-game') || t.includes('battle-royale')) {
      counts.set('multiplayer', (counts.get('multiplayer') || 0) + 1);
      continue;
    }
  }

  if (counts.size === 0) return null;

  // Highest frequency wins; tie-break by CORE_TAGS order.
  const ranked = [...counts.entries()].sort((a, b) => {
    const byCount = b[1] - a[1];
    if (byCount !== 0) return byCount;
    return CORE_TAGS.indexOf(a[0]) - CORE_TAGS.indexOf(b[0]);
  });

  return ranked[0]![0];
}

function sortKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const preferred = [
    'locale',
    'title',
    'description',
    'iframeSrc',
    'thumbnail',
    'urlstr',
    'sidebarNew',
    'sidebarPopular',
    'featured',
    'modType',
    'score',
    'tags',
    'developer',
    'releaseDate',
  ];

  const out: Record<string, unknown> = {};
  for (const k of preferred) if (k in obj) out[k] = obj[k];
  for (const k of Object.keys(obj).sort()) if (!(k in out)) out[k] = obj[k];
  return out;
}

async function main(): Promise<void> {
  const write = process.argv.includes('--write');
  const files = (await fs.readdir(GAMES_DIR)).filter((f) => f.endsWith('.en.md'));

  let updated = 0;
  let needsManual = 0;
  const manualFiles: string[] = [];

  const samples: Array<{ file: string; add: string; tags: string[] }> = [];

  for (const filename of files) {
    const fullPath = path.join(GAMES_DIR, filename);
    const raw = await fs.readFile(fullPath, 'utf8');
    const parsed = matter(raw);

    const data = parsed.data as Record<string, unknown>;
    const rawTags = Array.isArray(data.tags) ? data.tags : [];
    const tags = rawTags.map(normalizeTag).filter(Boolean) as string[];

    const hasCore = tags.some((t) => CORE_SET.has(t));
    if (hasCore) continue;

    const picked = pickCoreTag(tags);
    if (!picked) {
      needsManual++;
      if (manualFiles.length < 50) manualFiles.push(filename);
      continue;
    }

    const nextTags = [...new Set([...tags, picked])];
    data.tags = nextTags;
    parsed.data = sortKeys(data);

    const next = matter.stringify(parsed.content, parsed.data);
    if (next === raw) continue;

    updated++;
    if (samples.length < 20) samples.push({ file: filename, add: picked, tags });

    if (write) {
      await fs.writeFile(fullPath, next, 'utf8');
    }
  }

  console.log(
    write
      ? `✅ Core tag backfill wrote ${updated} file(s). ${needsManual} file(s) still need manual tagging.`
      : `ℹ️  Core tag backfill dry-run: would update ${updated} file(s). ${needsManual} file(s) need manual tagging. (run with --write)`
  );

  if (!write && manualFiles.length) {
    console.log('\nNeeds manual core tag (first 50):');
    for (const f of manualFiles) console.log(`- ${f}`);
  }

  if (samples.length) {
    console.log('\nSample changes (first 20):');
    for (const s of samples) {
      console.log(`- ${s.file}: +${s.add} (from tags: ${s.tags.join(', ')})`);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
