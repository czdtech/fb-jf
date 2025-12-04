/**
 * **Feature: astro-best-practices-refactor, Property 6: Layout HTML Structure Completeness**
 * **Validates: Requirements 2.1**
 * 
 * Property-based tests for GameLayout component output in the actual built pages.
 * These tests verify that the real GameLayout.astro component produces correct HTML structure
 * by examining the built HTML in dist/.
 * 
 * NOTE: These tests will be SKIPPED if dist/ doesn't exist.
 * Run "npm run build" before running tests for full coverage.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

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

function urlToFilePath(urlPath: string): string {
  if (urlPath === '/') return 'dist/index.html';
  const cleanPath = urlPath.replace(/^\//, '').replace(/\/$/, '');
  return `dist/${cleanPath}/index.html`;
}

function readBuiltHtml(urlPath: string): string | null {
  const filePath = urlToFilePath(urlPath);
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf-8');
}

describe('GameLayout Component - Property 6: Layout HTML Structure Completeness (Real Build)', () => {
  /**
   * **Feature: astro-best-practices-refactor, Property 6: Layout HTML Structure Completeness**
   * 
   * These tests verify the actual GameLayout.astro component output by examining
   * built HTML pages in dist/ that use the component.
   */
  
  it('should contain DOCTYPE declaration in built pages', () => {
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
        
        // DOCTYPE should be present at the beginning
        expect(html!.trim().toLowerCase().startsWith('<!doctype html>')).toBe(true);
      }),
      { numRuns: Math.min(100, gamePages.length) }
    );
  });

  it('should contain html tag with lang attribute in built pages', () => {
    if (!distExists || gamePages.length === 0) {
      console.warn('⚠️ SKIPPED: dist/ not found or no game pages');
      return;
    }

    const pageUrlArb = fc.constantFrom(...gamePages);

    fc.assert(
      fc.property(pageUrlArb, (pageUrl) => {
        const html = readBuiltHtml(pageUrl);
        expect(html).not.toBeNull();
        
        const $ = cheerio.load(html!);
        
        // html tag should exist with lang attribute
        expect($('html').length).toBe(1);
        expect($('html').attr('lang')).toBeDefined();
      }),
      { numRuns: Math.min(100, gamePages.length) }
    );
  });

  it('should contain head tag with required elements in built pages', () => {
    if (!distExists || gamePages.length === 0) {
      console.warn('⚠️ SKIPPED: dist/ not found or no game pages');
      return;
    }

    const pageUrlArb = fc.constantFrom(...gamePages);

    fc.assert(
      fc.property(pageUrlArb, (pageUrl) => {
        const html = readBuiltHtml(pageUrl);
        expect(html).not.toBeNull();
        
        const $ = cheerio.load(html!);
        
        // head tag should exist with required elements
        expect($('head').length).toBe(1);
        expect($('head meta[charset]').length).toBe(1);
        expect($('head meta[name="viewport"]').length).toBe(1);
        expect($('head title').length).toBe(1);
        expect($('head link[rel="canonical"]').length).toBe(1);
        expect($('head meta[name="description"]').length).toBe(1);
      }),
      { numRuns: Math.min(100, gamePages.length) }
    );
  });

  it('should contain body tag in built pages', () => {
    if (!distExists || gamePages.length === 0) {
      console.warn('⚠️ SKIPPED: dist/ not found or no game pages');
      return;
    }

    const pageUrlArb = fc.constantFrom(...gamePages);

    fc.assert(
      fc.property(pageUrlArb, (pageUrl) => {
        const html = readBuiltHtml(pageUrl);
        expect(html).not.toBeNull();
        
        const $ = cheerio.load(html!);
        expect($('body').length).toBe(1);
      }),
      { numRuns: Math.min(100, gamePages.length) }
    );
  });

  it('should contain main structural elements in body', () => {
    if (!distExists || gamePages.length === 0) {
      console.warn('⚠️ SKIPPED: dist/ not found or no game pages');
      return;
    }

    const pageUrlArb = fc.constantFrom(...gamePages);

    fc.assert(
      fc.property(pageUrlArb, (pageUrl) => {
        const html = readBuiltHtml(pageUrl);
        expect(html).not.toBeNull();
        
        const $ = cheerio.load(html!);
        
        // Main structural elements should exist
        expect($('body header').length).toBeGreaterThanOrEqual(1);
        expect($('body main').length).toBe(1);
        expect($('body footer').length).toBe(1);
      }),
      { numRuns: Math.min(100, gamePages.length) }
    );
  });

  it('should contain game-specific sections in built pages', () => {
    if (!distExists || gamePages.length === 0) {
      console.warn('⚠️ SKIPPED: dist/ not found or no game pages');
      return;
    }

    const pageUrlArb = fc.constantFrom(...gamePages);

    fc.assert(
      fc.property(pageUrlArb, (pageUrl) => {
        const html = readBuiltHtml(pageUrl);
        expect(html).not.toBeNull();
        
        const $ = cheerio.load(html!);
        
        // Game-specific sections should exist
        expect($('section.hero').length).toBe(1);
        expect($('section.about').length).toBe(1);
        expect($('.game-card').length).toBe(1);
      }),
      { numRuns: Math.min(100, gamePages.length) }
    );
  });

  it('should contain iframe and play button elements in built pages', () => {
    if (!distExists || gamePages.length === 0) {
      console.warn('⚠️ SKIPPED: dist/ not found or no game pages');
      return;
    }

    const pageUrlArb = fc.constantFrom(...gamePages);

    fc.assert(
      fc.property(pageUrlArb, (pageUrl) => {
        const html = readBuiltHtml(pageUrl);
        expect(html).not.toBeNull();
        
        const $ = cheerio.load(html!);
        
        // Interactive elements should exist
        expect($('iframe#fiddlebops-iframe').length).toBe(1);
        expect($('button#playButton').length).toBe(1);
      }),
      { numRuns: Math.min(100, gamePages.length) }
    );
  });

  it('should have proper nesting: html > head and html > body', () => {
    if (!distExists || gamePages.length === 0) {
      console.warn('⚠️ SKIPPED: dist/ not found or no game pages');
      return;
    }

    const pageUrlArb = fc.constantFrom(...gamePages);

    fc.assert(
      fc.property(pageUrlArb, (pageUrl) => {
        const html = readBuiltHtml(pageUrl);
        expect(html).not.toBeNull();
        
        const $ = cheerio.load(html!);
        
        // head should be direct child of html
        expect($('html > head').length).toBe(1);
        
        // body should be direct child of html
        expect($('html > body').length).toBe(1);
      }),
      { numRuns: Math.min(100, gamePages.length) }
    );
  });

  it('should include about section with heading in built pages', () => {
    if (!distExists || gamePages.length === 0) {
      console.warn('⚠️ SKIPPED: dist/ not found or no game pages');
      return;
    }

    const pageUrlArb = fc.constantFrom(...gamePages);

    fc.assert(
      fc.property(pageUrlArb, (pageUrl) => {
        const html = readBuiltHtml(pageUrl);
        expect(html).not.toBeNull();
        
        const $ = cheerio.load(html!);
        
        // About section should exist with a heading (at least one)
        expect($('section.about').length).toBeGreaterThanOrEqual(1);
        expect($('section.about h2').length).toBeGreaterThanOrEqual(1);
        expect($('section.about h2').first().text().length).toBeGreaterThan(0);
      }),
      { numRuns: Math.min(100, gamePages.length) }
    );
  });

  it('should include footer with required links in built pages', () => {
    if (!distExists || gamePages.length === 0) {
      console.warn('⚠️ SKIPPED: dist/ not found or no game pages');
      return;
    }

    const pageUrlArb = fc.constantFrom(...gamePages);

    fc.assert(
      fc.property(pageUrlArb, (pageUrl) => {
        const html = readBuiltHtml(pageUrl);
        expect(html).not.toBeNull();
        
        const $ = cheerio.load(html!);
        
        // Footer should contain privacy and terms links
        expect($('footer a[href="/privacy/"]').length).toBe(1);
        expect($('footer a[href="/terms-of-service/"]').length).toBe(1);
        
        // Footer should contain copyright
        expect($('footer .copyright').length).toBe(1);
      }),
      { numRuns: Math.min(100, gamePages.length) }
    );
  });

  it('should have fullscreen button in game pages', () => {
    if (!distExists || gamePages.length === 0) {
      console.warn('⚠️ SKIPPED: dist/ not found or no game pages');
      return;
    }

    const pageUrlArb = fc.constantFrom(...gamePages);

    fc.assert(
      fc.property(pageUrlArb, (pageUrl) => {
        const html = readBuiltHtml(pageUrl);
        expect(html).not.toBeNull();
        
        const $ = cheerio.load(html!);
        
        // Fullscreen button should exist
        expect($('button#fullscreen-btn').length).toBe(1);
      }),
      { numRuns: Math.min(100, gamePages.length) }
    );
  });
});
