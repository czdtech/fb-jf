import * as fs from 'fs';
import * as path from 'path';

/**
 * Recursively find all files matching a predicate.
 */
function findFilesRecursive(dir: string, predicate: (entry: fs.Dirent, fullPath: string) => boolean): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findFilesRecursive(fullPath, predicate));
      continue;
    }

    if (predicate(entry, fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Recursively find all .astro files under a directory.
 */
export function findAstroFiles(dir: string): string[] {
  return findFilesRecursive(dir, (entry) => entry.isFile() && entry.name.endsWith('.astro'));
}

/**
 * Recursively find all `index.html` files under a directory (e.g. dist/).
 */
export function findIndexHtmlFiles(dir: string): string[] {
  return findFilesRecursive(dir, (entry) => entry.isFile() && entry.name === 'index.html');
}

/**
 * Get list of Content Collection game slugs by reading the content directory.
 * Only canonical English entries are included (`*.en.md`).
 */
export function getContentCollectionSlugs(contentDir: string = path.join(process.cwd(), 'src/content/games')): string[] {
  const slugs: string[] = [];

  if (!fs.existsSync(contentDir)) return slugs;

  const files = fs.readdirSync(contentDir);
  for (const file of files) {
    if (file.endsWith('.en.md')) {
      slugs.push(file.replace('.en.md', ''));
    }
  }

  return slugs;
}

/**
 * Discover game pages from dist/ directory.
 * This ensures new pages are automatically covered without needing baseline updates.
 */
export function discoverGamePagesFromDist(
  options: {
    distDir?: string;
    contentDir?: string;
    excludedSlugs?: Iterable<string>;
  } = {}
): string[] {
  const distPath = options.distDir ?? path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distPath)) return [];

  const contentDir = options.contentDir ?? path.join(process.cwd(), 'src/content/games');
  const contentSlugs = new Set(getContentCollectionSlugs(contentDir));
  const excludedSlugs = new Set(options.excludedSlugs ?? ['categories', 'privacy', 'terms-of-service', '404']);

  const pages: string[] = [];
  const entries = fs.readdirSync(distPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const slug = entry.name;
    if (!contentSlugs.has(slug) || excludedSlugs.has(slug)) continue;

    const indexPath = path.join(distPath, slug, 'index.html');
    if (fs.existsSync(indexPath)) {
      pages.push(`/${slug}/`);
    }
  }

  return pages;
}

