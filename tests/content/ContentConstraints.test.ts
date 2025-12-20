/**
 * Content constraints for canonical game data (English only).
 *
 * Goals:
 * - Enforce `urlstr` uniqueness (route stability / SEO safety).
 * - Enforce filename <-> urlstr binding (`<urlstr>.en.md`) for Decap workflow.
 * - Enforce sidebar slot constraints (no duplicates in 1..4).
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');

type Frontmatter = {
  urlstr?: string;
  locale?: string;
  thumbnail?: string;
  sidebarNew?: number;
  sidebarPopular?: number;
  modType?: string;
};

function normalizeSlug(raw: string): string {
  return raw.trim().replace(/^\/+/, '').replace(/\/+$/, '');
}

describe('Content Constraints - Canonical Games', () => {
  it('should keep canonical urlstr unique and bound to filename', async () => {
    const files = (await fs.readdir(GAMES_DIR)).filter((f) => f.endsWith('.en.md'));

    const seen = new Map<string, string>();
    for (const filename of files) {
      const filePath = path.join(GAMES_DIR, filename);
      const raw = await fs.readFile(filePath, 'utf8');
      const { data } = matter(raw);
      const fm = data as Frontmatter;

      const locale = fm.locale || 'en';
      expect(locale).toBe('en');

      const urlstr = typeof fm.urlstr === 'string' && fm.urlstr.trim() ? fm.urlstr : filename.replace(/\.en\.md$/, '');
      const slug = normalizeSlug(urlstr);
      const base = filename.replace(/\.en\.md$/, '');

      // Strong binding: filename matches urlstr exactly (no leading/trailing slashes).
      expect(slug).toBe(base);

      const prev = seen.get(slug);
      if (prev) {
        throw new Error(`Duplicate canonical urlstr detected: "${slug}" in ${prev} and ${filename}`);
      }
      seen.set(slug, filename);
    }
  });

  it('should keep sidebar slot numbers unique (1..4) per list', async () => {
    const files = (await fs.readdir(GAMES_DIR)).filter((f) => f.endsWith('.en.md'));

    const newSlots = new Map<number, string>();
    const popularSlots = new Map<number, string>();

    for (const filename of files) {
      const filePath = path.join(GAMES_DIR, filename);
      const raw = await fs.readFile(filePath, 'utf8');
      const { data } = matter(raw);
      const fm = data as Frontmatter;

      if (fm.locale && fm.locale !== 'en') continue;

      if (typeof fm.sidebarNew === 'number') {
        expect(Number.isInteger(fm.sidebarNew)).toBe(true);
        expect(fm.sidebarNew).toBeGreaterThanOrEqual(1);
        expect(fm.sidebarNew).toBeLessThanOrEqual(4);
        const prev = newSlots.get(fm.sidebarNew);
        if (prev) {
          throw new Error(`Duplicate sidebarNew slot ${fm.sidebarNew}: ${prev} and ${filename}`);
        }
        newSlots.set(fm.sidebarNew, filename);
      }

      if (typeof fm.sidebarPopular === 'number') {
        expect(Number.isInteger(fm.sidebarPopular)).toBe(true);
        expect(fm.sidebarPopular).toBeGreaterThanOrEqual(1);
        expect(fm.sidebarPopular).toBeLessThanOrEqual(4);
        const prev = popularSlots.get(fm.sidebarPopular);
        if (prev) {
          throw new Error(`Duplicate sidebarPopular slot ${fm.sidebarPopular}: ${prev} and ${filename}`);
        }
        popularSlots.set(fm.sidebarPopular, filename);
      }
    }
  });

  it('should bind thumbnails to /new-images/thumbnails/<urlstr>.<ext> and ensure the file exists', async () => {
    const files = (await fs.readdir(GAMES_DIR)).filter((f) => f.endsWith('.en.md'));
    const allowedExt = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

    for (const filename of files) {
      const filePath = path.join(GAMES_DIR, filename);
      const raw = await fs.readFile(filePath, 'utf8');
      const { data } = matter(raw);
      const fm = data as Frontmatter;

      if (fm.locale && fm.locale !== 'en') continue;

      const urlstr = typeof fm.urlstr === 'string' && fm.urlstr.trim() ? fm.urlstr : filename.replace(/\.en\.md$/, '');
      const slug = normalizeSlug(urlstr);

      expect(typeof fm.thumbnail).toBe('string');
      const thumb = (fm.thumbnail || '').trim();
      expect(thumb.startsWith('/new-images/thumbnails/')).toBe(true);

      const ext = path.extname(thumb);
      expect(allowedExt.has(ext)).toBe(true);

      // Strong binding: filename of the thumbnail must match urlstr.
      const expected = `/new-images/thumbnails/${slug}${ext}`;
      expect(thumb).toBe(expected);

      // Ensure the referenced file exists under /public.
      const publicAbs = path.join(process.cwd(), 'public', thumb.replace(/^\/+/, ''));
      const stat = await fs.stat(publicAbs);
      expect(stat.isFile()).toBe(true);
    }
  });

  it('should restrict modType values when present', async () => {
    const files = (await fs.readdir(GAMES_DIR)).filter((f) => f.endsWith('.en.md'));
    const allowed = new Set(['sprunki', 'incredibox', 'fiddlebops']);

    for (const filename of files) {
      const raw = await fs.readFile(path.join(GAMES_DIR, filename), 'utf8');
      const { data } = matter(raw);
      const fm = data as Frontmatter;

      if (fm.locale && fm.locale !== 'en') continue;
      if (typeof fm.modType !== 'string' || !fm.modType.trim()) continue;

      expect(allowed.has(fm.modType)).toBe(true);
    }
  });
});
