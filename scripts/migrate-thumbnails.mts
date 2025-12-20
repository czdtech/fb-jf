#!/usr/bin/env node
/**
 * Migrate all canonical game thumbnails to a strong, deterministic location:
 *   public/new-images/thumbnails/<urlstr>.<ext>
 * and update frontmatter `thumbnail` to:
 *   /new-images/thumbnails/<urlstr>.<ext>
 *
 * Why:
 * - CMS upload path统一
 * - 文件名强绑定 urlstr（SEO/运营稳定）
 * - CI 可强约束校验（避免“上传了随机文件名的图片”）
 *
 * Usage:
 *   tsx scripts/migrate-thumbnails.mts
 *   tsx scripts/migrate-thumbnails.mts --dry-run
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const DEST_DIR = path.join(PUBLIC_DIR, 'new-images', 'thumbnails');

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

  // Prefer inserting after urlstr.
  const urlIdx = lines.findIndex((l) => /^urlstr\s*:/.test(l));
  const insertAt = urlIdx === -1 ? lines.length : urlIdx + 1;
  lines.splice(insertAt, 0, line);
  return lines.join('\n');
}

function toPublicPathFromFrontmatter(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (!v.startsWith('/')) return `/${v}`;
  return v;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const files = (await fs.readdir(GAMES_DIR)).filter((f) => f.endsWith('.en.md'));

  // 先统计每个 source 被引用次数（决定 move vs copy）
  const sourceCounts = new Map<string, number>();
  const perFile = new Map<string, { slug: string; srcAbs: string; srcPublic: string; ext: string }>();

  for (const filename of files) {
    const filePath = path.join(GAMES_DIR, filename);
    const raw = await fs.readFile(filePath, 'utf8');
    const fm = raw.match(FRONTMATTER_RE);
    if (!fm) continue;
    const frontmatter = fm[1];

    const urlstr = extractField(frontmatter, 'urlstr').value || filename.replace(/\.en\.md$/, '');
    const slug = normalizeSlug(urlstr);

    const thumbRaw = extractField(frontmatter, 'thumbnail').value;
    if (!thumbRaw) continue;
    const thumbPublic = toPublicPathFromFrontmatter(thumbRaw);
    if (!thumbPublic) continue;

    const rel = thumbPublic.replace(/^\/+/, '');
    const srcAbs = path.join(PUBLIC_DIR, rel);
    const ext = path.extname(rel);

    perFile.set(filename, { slug, srcAbs, srcPublic: thumbPublic, ext });
    sourceCounts.set(srcAbs, (sourceCounts.get(srcAbs) || 0) + 1);
  }

  await fs.mkdir(DEST_DIR, { recursive: true });

  let touched = 0;
  let moved = 0;
  let copied = 0;
  let skipped = 0;
  let missing = 0;

  for (const filename of files) {
    const info = perFile.get(filename);
    if (!info) continue;

    const { slug, srcAbs, srcPublic, ext } = info;

    if (!ext) {
      console.warn(`⚠️  No extension for thumbnail: ${filename} (${srcPublic})`);
      skipped += 1;
      continue;
    }

    const destAbs = path.join(DEST_DIR, `${slug}${ext}`);
    const destPublic = `/new-images/thumbnails/${slug}${ext}`;

    const srcOk = await fileExists(srcAbs);
    if (!srcOk) {
      console.warn(`❌ Missing thumbnail file: ${srcPublic} (expected ${path.relative(process.cwd(), srcAbs)})`);
      missing += 1;
      continue;
    }

    // Copy/move file if needed.
    if (path.resolve(srcAbs) !== path.resolve(destAbs)) {
      const destExists = await fileExists(destAbs);
      if (!destExists) {
        const count = sourceCounts.get(srcAbs) || 0;
        if (count > 1) {
          if (!dryRun) await fs.copyFile(srcAbs, destAbs);
          copied += 1;
        } else {
          if (!dryRun) await fs.rename(srcAbs, destAbs);
          moved += 1;
        }
      }
    }

    // Update markdown frontmatter.
    const mdAbs = path.join(GAMES_DIR, filename);
    const raw = await fs.readFile(mdAbs, 'utf8');
    const fm = raw.match(FRONTMATTER_RE);
    if (!fm) continue;
    const frontmatter = fm[1];

    const currentThumb = extractField(frontmatter, 'thumbnail').value || '';
    const currentPublic = toPublicPathFromFrontmatter(currentThumb) || '';
    if (currentPublic === destPublic) {
      skipped += 1;
      continue;
    }

    const nextFrontmatter = setField(frontmatter, 'thumbnail', destPublic);
    const nextRaw = raw.replace(FRONTMATTER_RE, `---\n${nextFrontmatter}\n---\n`);

    touched += 1;
    if (dryRun) {
      console.log(`DRY-RUN: ${path.join('src', 'content', 'games', filename)} thumbnail -> ${destPublic}`);
      continue;
    }
    await fs.writeFile(mdAbs, nextRaw, 'utf8');
  }

  if (missing > 0) {
    console.error(`\n❌ Done with missing files: missing=${missing} (dryRun=${dryRun})`);
    process.exitCode = 1;
  }

  console.log(
    `\nDone. touched=${touched} moved=${moved} copied=${copied} skipped=${skipped} missing=${missing} dryRun=${dryRun}`
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

