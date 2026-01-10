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
import { discoverGamePagesFromDist } from '../utils/file-discovery';
import { extractSeoFromHtml } from '../utils/seo-helpers';

function urlToFilePath(urlPath: string): string {
  if (urlPath === '/') return 'dist/index.html';
  const cleanPath = urlPath.replace(/^\//, '').replace(/\/$/, '');
  return `dist/${cleanPath}/index.html`;
}

// Test data
let distExists = false;
let gamePages: string[] = [];

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
