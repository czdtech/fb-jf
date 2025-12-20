#!/usr/bin/env node
/**
 * Sync ALL localized game markdown thumbnails to match the canonical thumbnail path:
 *   /new-images/thumbnails/<urlstr>.<ext>
 *
 * Why:
 * - 我们把物理图片从 /new-images/* 迁移到了 /new-images/thumbnails/*。
 * - 如果多语言文件仍指向旧路径，会导致本地/线上缩略图（以及 OG 图）失效。
 *
 * Usage:
 *   tsx scripts/sync-localized-thumbnails.mts
 *   tsx scripts/sync-localized-thumbnails.mts --dry-run
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function normalizeSlug(raw: string): string {
  return raw.trim().replace(/^\/+/, '').replace(/\/+$/, '');
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

  const urlIdx = lines.findIndex((l) => /^urlstr\s*:/.test(l));
  const insertAt = urlIdx === -1 ? lines.length : urlIdx + 1;
  lines.splice(insertAt, 0, line);
  return lines.join('\n');
}

async function buildCanonicalExtMap(): Promise<Map<string, string>> {
  const files = (await fs.readdir(GAMES_DIR)).filter((f) => f.endsWith('.en.md'));
  const map = new Map<string, string>();

  for (const filename of files) {
    const abs = path.join(GAMES_DIR, filename);
    const raw = await fs.readFile(abs, 'utf8');
    const fm = raw.match(FRONTMATTER_RE);
    if (!fm) continue;
    const frontmatter = fm[1];

    const urlstr = extractField(frontmatter, 'urlstr').value || filename.replace(/\.en\.md$/, '');
    const slug = normalizeSlug(urlstr);

    const thumb = extractField(frontmatter, 'thumbnail').value || '';
    const ext = path.extname(thumb.trim());
    if (!ext) continue;
    map.set(slug, ext);
  }

  return map;
}

async function main(): Promise<void> {
  const extMap = await buildCanonicalExtMap();
  const files = (await fs.readdir(GAMES_DIR)).filter((f) => f.endsWith('.md') && !f.endsWith('.en.md'));

  let touched = 0;
  let skipped = 0;
  let missingCanonical = 0;

  for (const filename of files) {
    const abs = path.join(GAMES_DIR, filename);
    const raw = await fs.readFile(abs, 'utf8');
    const fm = raw.match(FRONTMATTER_RE);
    if (!fm) continue;
    const frontmatter = fm[1];

    const urlstr = extractField(frontmatter, 'urlstr').value;
    if (!urlstr) {
      skipped += 1;
      continue;
    }

    const slug = normalizeSlug(urlstr);
    const ext = extMap.get(slug);
    if (!ext) {
      console.warn(`⚠️  No canonical thumbnail ext found for slug=${slug} (${filename})`);
      missingCanonical += 1;
      continue;
    }

    const desired = `/new-images/thumbnails/${slug}${ext}`;
    const current = (extractField(frontmatter, 'thumbnail').value || '').trim();
    if (current === desired) {
      skipped += 1;
      continue;
    }

    const nextFrontmatter = setField(frontmatter, 'thumbnail', desired);
    const nextRaw = raw.replace(FRONTMATTER_RE, `---\n${nextFrontmatter}\n---\n`);
    if (nextRaw === raw) {
      skipped += 1;
      continue;
    }

    touched += 1;
    if (dryRun) {
      console.log(`DRY-RUN: ${path.join('src', 'content', 'games', filename)} thumbnail -> ${desired}`);
      continue;
    }
    await fs.writeFile(abs, nextRaw, 'utf8');
  }

  if (missingCanonical > 0) {
    console.error(`\n❌ Done with missingCanonical=${missingCanonical} (dryRun=${dryRun})`);
    process.exitCode = 1;
  }

  console.log(`\nDone. touched=${touched} skipped=${skipped} missingCanonical=${missingCanonical} dryRun=${dryRun}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

