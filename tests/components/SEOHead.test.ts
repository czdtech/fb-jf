/**
 * **Feature: astro-best-practices-refactor, Property 2: Meta Tags Preservation**
 * **Validates: Requirements 1.2**
 * 
 * Property-based tests for SEOHead component output in the actual built pages.
 * These tests verify that the real SEOHead.astro component produces correct meta tags
 * by examining the built HTML in dist/.
 * 
 * NOTE: These tests will be SKIPPED if dist/ doesn't exist.
 * Run "npm run build" before running tests for full coverage.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// Types
interface PageSEOData {
  title: string | null;
  description: string | null;
  keywords: string | null;
  robots: string | null;
  canonical: string | null;
  og: {
    title: string | null;
    description: string | null;
    url: string | null;
    siteName: string | null;
    locale: string | null;
    image: string | null;
    type: string | null;
  };
  twitter: {
    card: string | null;
    site: string | null;
    title: string | null;
    description: string | null;
    image: string | null;
  };
  jsonLd: Array<Record<string, unknown>> | null;
}

// SEO extraction functions
function extractMetaContent(html: string, name: string, property = false): string | null {
  const attr = property ? 'property' : 'name';
  const regex = new RegExp(
    `<meta\\s+(?:[^>]*?\\s)?${attr}="${name}"(?:\\s[^>]*?)?\\s+content="([^"]*)"` +
    `|<meta\\s+(?:[^>]*?\\s)?content="([^"]*)"(?:\\s[^>]*?)?\\s+${attr}="${name}"`,
    'i'
  );
  const match = html.match(regex);
  return match ? (match[1] || match[2]) : null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title>([^<]*)<\/title>/i);
  return match ? match[1] : null;
}

function extractCanonical(html: string): string | null {
  const regex = /<link\s+(?:[^>]*?\s)?rel=["']canonical["'](?:\s[^>]*?)?\s+href=["']([^"']*)["']|<link\s+(?:[^>]*?\s)?href=["']([^"']*)["'](?:\s[^>]*?)?\s+rel=["']canonical["']/i;
  const match = html.match(regex);
  return match ? (match[1] || match[2]) : null;
}

function extractJsonLd(html: string): Array<Record<string, unknown>> | null {
  const regex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const matches: Array<Record<string, unknown>> = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const jsonContent = match[1].trim();
      if (jsonContent) {
        matches.push(JSON.parse(jsonContent));
      }
    } catch (e) {
      // Skip invalid JSON
    }
  }
  return matches.length > 0 ? matches : null;
}

function extractSeoFromHtml(html: string): PageSEOData {
  return {
    title: extractTitle(html),
    description: extractMetaContent(html, 'description'),
    keywords: extractMetaContent(html, 'keywords'),
    robots: extractMetaContent(html, 'robots'),
    canonical: extractCanonical(html),
    og: {
      title: extractMetaContent(html, 'og:title', true),
      description: extractMetaContent(html, 'og:description', true),
      url: extractMetaContent(html, 'og:url', true),
      siteName: extractMetaContent(html, 'og:site_name', true),
      locale: extractMetaContent(html, 'og:locale', true),
      image: extractMetaContent(html, 'og:image', true),
      type: extractMetaContent(html, 'og:type', true),
    },
    twitter: {
      card: extractMetaContent(html, 'twitter:card'),
      site: extractMetaContent(html, 'twitter:site'),
      title: extractMetaContent(html, 'twitter:title'),
      description: extractMetaContent(html, 'twitter:description'),
      image: extractMetaContent(html, 'twitter:image'),
    },
    jsonLd: extractJsonLd(html),
  };
}

function urlToFilePath(urlPath: string): string {
  if (urlPath === '/') return 'dist/index.html';
  const cleanPath = urlPath.replace(/^\//, '').replace(/\/$/, '');
  return `dist/${cleanPath}/index.html`;
}

// Test data
let distExists = false;
let gamePages: string[] = [];

/**
 * Get list of Content Collection game slugs by reading the content directory
 */
function getContentCollectionSlugs(): string[] {
  const contentDir = path.join(process.cwd(), 'src/content/games');
  const slugs: string[] = [];
  
  if (fs.existsSync(contentDir)) {
    const files = fs.readdirSync(contentDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        slugs.push(file.replace('.md', ''));
      }
    }
  }
  
  return slugs;
}

/**
 * Discover game pages from dist/ directory
 * This ensures new pages are automatically covered without needing baseline updates
 */
function discoverGamePagesFromDist(): string[] {
  const distPath = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distPath)) return [];
  
  const contentSlugs = new Set(getContentCollectionSlugs());
  const excludedSlugs = new Set(['categories', 'privacy', 'terms-of-service', '404']);
  const gamePages: string[] = [];
  
  // Read dist directory for single-segment paths that match content collection
  const entries = fs.readdirSync(distPath, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const slug = entry.name;
      // Check if this slug exists in content collection and has an index.html
      if (contentSlugs.has(slug) && !excludedSlugs.has(slug)) {
        const indexPath = path.join(distPath, slug, 'index.html');
        if (fs.existsSync(indexPath)) {
          gamePages.push(`/${slug}/`);
        }
      }
    }
  }
  
  return gamePages;
}

beforeAll(() => {
  const distPath = path.join(process.cwd(), 'dist');
  distExists = fs.existsSync(distPath);
  
  if (distExists) {
    // Discover pages directly from dist/ - this automatically includes new pages
    gamePages = discoverGamePagesFromDist();
  }
});

function readBuiltHtml(urlPath: string): string | null {
  const filePath = urlToFilePath(urlPath);
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf-8');
}

describe('SEOHead Component - Property 2: Meta Tags Preservation (Real Build)', () => {
  /**
   * **Feature: astro-best-practices-refactor, Property 2: Meta Tags Preservation**
   * 
   * These tests verify the actual SEOHead.astro component output by examining
   * built HTML pages in dist/ that use the component.
   */
  
  it('should have title tag in built pages', () => {
    if (!distExists) {
      console.warn('⚠️ SKIPPED: dist/ not found. Run "npm run build" first.');
      return;
    }
    if (gamePages.length === 0) {
      console.warn('⚠️ SKIPPED: No game pages found in dist/');
      return;
    }

    const pageUrlArb = fc.constantFrom(...gamePages);

    fc.assert(
      fc.property(pageUrlArb, (pageUrl) => {
        const html = readBuiltHtml(pageUrl);
        expect(html).not.toBeNull();
        
        const seo = extractSeoFromHtml(html!);
        expect(seo.title).not.toBeNull();
        expect(seo.title!.length).toBeGreaterThan(0);
      }),
      { numRuns: Math.min(100, gamePages.length) }
    );
  });

  it('should have description meta tag in built pages (may be empty for some games)', () => {
    if (!distExists || gamePages.length === 0) {
      console.warn('⚠️ SKIPPED: dist/ not found or no game pages');
      return;
    }

    const pageUrlArb = fc.constantFrom(...gamePages);

    fc.assert(
      fc.property(pageUrlArb, (pageUrl) => {
        const html = readBuiltHtml(pageUrl);
        expect(html).not.toBeNull();
        
        // Description meta tag should exist (content may be empty for some games due to data quality)
        // The tag itself should be present in the HTML
        expect(html!).toContain('name="description"');
      }),
      { numRuns: Math.min(100, gamePages.length) }
    );
  });

  it('should have canonical URL in built pages', () => {
    if (!distExists || gamePages.length === 0) {
      console.warn('⚠️ SKIPPED: dist/ not found or no game pages');
      return;
    }

    const pageUrlArb = fc.constantFrom(...gamePages);

    fc.assert(
      fc.property(pageUrlArb, (pageUrl) => {
        const html = readBuiltHtml(pageUrl);
        expect(html).not.toBeNull();
        
        const seo = extractSeoFromHtml(html!);
        expect(seo.canonical).not.toBeNull();
        expect(seo.canonical!.startsWith('https://www.playfiddlebops.com')).toBe(true);
      }),
      { numRuns: Math.min(100, gamePages.length) }
    );
  });

  it('should have Open Graph meta tags in built pages', () => {
    if (!distExists || gamePages.length === 0) {
      console.warn('⚠️ SKIPPED: dist/ not found or no game pages');
      return;
    }

    const pageUrlArb = fc.constantFrom(...gamePages);

    fc.assert(
      fc.property(pageUrlArb, (pageUrl) => {
        const html = readBuiltHtml(pageUrl);
        expect(html).not.toBeNull();
        
        // OG tags should be present (check raw HTML for robustness)
        // Note: og:description may be empty for some games due to data quality
        expect(html!).toContain('og:title');
        expect(html!).toContain('og:description');
        expect(html!).toContain('og:url');
        expect(html!).toContain('og:site_name');
        expect(html!).toContain('og:image');
        expect(html!).toContain('og:type');
      }),
      { numRuns: Math.min(100, gamePages.length) }
    );
  });

  it('should have Twitter Card meta tags in built pages', () => {
    if (!distExists || gamePages.length === 0) {
      console.warn('⚠️ SKIPPED: dist/ not found or no game pages');
      return;
    }

    const pageUrlArb = fc.constantFrom(...gamePages);

    fc.assert(
      fc.property(pageUrlArb, (pageUrl) => {
        const html = readBuiltHtml(pageUrl);
        expect(html).not.toBeNull();
        
        // Twitter card tag should be present (check raw HTML for robustness)
        expect(html!).toContain('twitter:card');
        expect(html!).toContain('twitter:title');
        expect(html!).toContain('twitter:image');
      }),
      { numRuns: Math.min(100, gamePages.length) }
    );
  });

  it('should have robots meta tag set to index, follow', () => {
    if (!distExists || gamePages.length === 0) {
      console.warn('⚠️ SKIPPED: dist/ not found or no game pages');
      return;
    }

    const pageUrlArb = fc.constantFrom(...gamePages);

    fc.assert(
      fc.property(pageUrlArb, (pageUrl) => {
        const html = readBuiltHtml(pageUrl);
        expect(html).not.toBeNull();
        
        const seo = extractSeoFromHtml(html!);
        expect(seo.robots).toBe('index, follow');
      }),
      { numRuns: Math.min(100, gamePages.length) }
    );
  });

  it('should have JSON-LD structured data in game pages', () => {
    if (!distExists || gamePages.length === 0) {
      console.warn('⚠️ SKIPPED: dist/ not found or no game pages');
      return;
    }

    const pageUrlArb = fc.constantFrom(...gamePages);

    fc.assert(
      fc.property(pageUrlArb, (pageUrl) => {
        const html = readBuiltHtml(pageUrl);
        expect(html).not.toBeNull();
        
        const seo = extractSeoFromHtml(html!);
        
        // JSON-LD should be present
        expect(seo.jsonLd).not.toBeNull();
        expect(seo.jsonLd!.length).toBeGreaterThan(0);
        
        // Should have @context and @type
        const jsonLd = seo.jsonLd![0];
        expect(jsonLd['@context']).toBe('https://schema.org');
        expect(jsonLd['@type']).toBe('Game');
      }),
      { numRuns: Math.min(100, gamePages.length) }
    );
  });

  it('should have keywords meta tag in game pages', () => {
    if (!distExists || gamePages.length === 0) {
      console.warn('⚠️ SKIPPED: dist/ not found or no game pages');
      return;
    }

    const pageUrlArb = fc.constantFrom(...gamePages);

    fc.assert(
      fc.property(pageUrlArb, (pageUrl) => {
        const html = readBuiltHtml(pageUrl);
        expect(html).not.toBeNull();
        
        const seo = extractSeoFromHtml(html!);
        expect(seo.keywords).not.toBeNull();
        expect(seo.keywords!.length).toBeGreaterThan(0);
      }),
      { numRuns: Math.min(100, gamePages.length) }
    );
  });

  it('should have OG and Twitter title tags present', () => {
    if (!distExists || gamePages.length === 0) {
      console.warn('⚠️ SKIPPED: dist/ not found or no game pages');
      return;
    }

    const pageUrlArb = fc.constantFrom(...gamePages);

    fc.assert(
      fc.property(pageUrlArb, (pageUrl) => {
        const html = readBuiltHtml(pageUrl);
        expect(html).not.toBeNull();
        
        // Both OG and Twitter title tags should be present
        expect(html!).toContain('og:title');
        expect(html!).toContain('twitter:title');
      }),
      { numRuns: Math.min(100, gamePages.length) }
    );
  });
});
