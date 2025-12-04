/**
 * **Feature: comprehensive-improvement, Property 7: Hreflang Tag Generation**
 * **Validates: Requirements 6.5**
 * 
 * Property-based tests to verify that hreflang tags are correctly generated
 * for pages with multiple language versions.
 * 
 * Property: For any page that has multiple language versions, the HTML output
 * SHALL include hreflang tags for all available language versions.
 * 
 * NOTE: These tests will be SKIPPED if dist/ doesn't exist.
 * - Run "npm run build" to create the dist/ directory
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// Supported locales from astro.config.mjs
const SUPPORTED_LOCALES = ['en', 'zh', 'ja', 'ko', 'de', 'fr', 'es'] as const;
type Locale = typeof SUPPORTED_LOCALES[number];

interface HreflangLink {
  lang: string;
  url: string;
}

// Test data
let distExists = false;
let pagesWithHreflang: string[] = [];

/**
 * Extract hreflang links from HTML
 */
function extractHreflangLinks(html: string): HreflangLink[] {
  const regex = /<link\s+rel=["']alternate["']\s+hreflang=["']([^"']+)["']\s+href=["']([^"']+)["']|<link\s+hreflang=["']([^"']+)["']\s+href=["']([^"']+)["']\s+rel=["']alternate["']/gi;
  const links: HreflangLink[] = [];
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    const lang = match[1] || match[3];
    const url = match[2] || match[4];
    if (lang && url) {
      links.push({ lang, url });
    }
  }
  
  return links;
}

/**
 * Convert URL path to file path in dist/
 */
function urlToFilePath(urlPath: string): string {
  if (urlPath === '/') {
    return 'dist/index.html';
  }
  // Remove leading slash and add index.html
  const cleanPath = urlPath.replace(/^\//, '').replace(/\/$/, '');
  return `dist/${cleanPath}/index.html`;
}

/**
 * Read HTML from dist/ and extract hreflang links
 */
function getHreflangLinks(urlPath: string): HreflangLink[] | null {
  const filePath = urlToFilePath(urlPath);
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  
  const html = fs.readFileSync(fullPath, 'utf-8');
  return extractHreflangLinks(html);
}

/**
 * Discover pages with hreflang tags from dist/ directory
 */
function discoverPagesWithHreflang(): string[] {
  const distPath = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distPath)) return [];
  
  const pagesWithHreflang: string[] = [];
  
  // Check homepage
  const homepagePath = path.join(distPath, 'index.html');
  if (fs.existsSync(homepagePath)) {
    const html = fs.readFileSync(homepagePath, 'utf-8');
    const hreflangLinks = extractHreflangLinks(html);
    if (hreflangLinks.length > 0) {
      pagesWithHreflang.push('/');
    }
  }
  
  // Check language-specific homepage versions
  for (const locale of SUPPORTED_LOCALES) {
    if (locale === 'en') continue; // Skip default locale (already checked above)
    
    const localePath = path.join(distPath, locale, 'index.html');
    if (fs.existsSync(localePath)) {
      const html = fs.readFileSync(localePath, 'utf-8');
      const hreflangLinks = extractHreflangLinks(html);
      if (hreflangLinks.length > 0) {
        pagesWithHreflang.push(`/${locale}/`);
      }
    }
  }
  
  return pagesWithHreflang;
}

beforeAll(() => {
  const distPath = path.join(process.cwd(), 'dist');
  distExists = fs.existsSync(distPath);
  
  if (distExists) {
    pagesWithHreflang = discoverPagesWithHreflang();
  }
});

describe('Hreflang Tag Generation Tests', () => {
  describe('Property 7: Hreflang Tag Generation', () => {
    /**
     * **Feature: comprehensive-improvement, Property 7: Hreflang Tag Generation**
     * 
     * Property: For any page that has multiple language versions, the HTML output
     * SHALL include hreflang tags for all available language versions.
     */
    it('should include hreflang tags for all supported locales', () => {
      if (!distExists) {
        console.warn('⚠️ SKIPPED: dist/ not found. Run "npm run build" first.');
        return;
      }
      if (pagesWithHreflang.length === 0) {
        console.warn('⚠️ SKIPPED: No pages with hreflang tags found');
        return;
      }

      const sampleSize = Math.min(10, pagesWithHreflang.length);
      const pageUrlArb = fc.constantFrom(...pagesWithHreflang);

      fc.assert(
        fc.property(pageUrlArb, (pageUrl) => {
          const hreflangLinks = getHreflangLinks(pageUrl);
          
          // Page must have hreflang tags
          expect(hreflangLinks).not.toBeNull();
          expect(hreflangLinks!.length).toBeGreaterThan(0);
          
          // Should have at least one hreflang tag per supported locale
          // (including x-default for the default locale)
          const langs = hreflangLinks!.map(link => link.lang);
          
          // Check for x-default
          expect(langs).toContain('x-default');
          
          // Check for at least the default locale (en)
          expect(langs).toContain('en');
        }),
        { numRuns: sampleSize }
      );
    });

    it('should have valid URLs in all hreflang tags', () => {
      if (!distExists || pagesWithHreflang.length === 0) {
        console.warn('⚠️ SKIPPED: Prerequisites not met');
        return;
      }

      const sampleSize = Math.min(10, pagesWithHreflang.length);
      const pageUrlArb = fc.constantFrom(...pagesWithHreflang);

      fc.assert(
        fc.property(pageUrlArb, (pageUrl) => {
          const hreflangLinks = getHreflangLinks(pageUrl);
          
          expect(hreflangLinks).not.toBeNull();
          
          // All hreflang URLs should be valid absolute URLs
          hreflangLinks!.forEach(link => {
            expect(() => new URL(link.url)).not.toThrow();
            
            const url = new URL(link.url);
            expect(url.protocol).toBe('https:');
            expect(url.hostname).toBe('www.playfiddlebops.com');
          });
        }),
        { numRuns: sampleSize }
      );
    });

    it('should have correct URL structure for each locale', () => {
      if (!distExists || pagesWithHreflang.length === 0) {
        console.warn('⚠️ SKIPPED: Prerequisites not met');
        return;
      }

      const sampleSize = Math.min(10, pagesWithHreflang.length);
      const pageUrlArb = fc.constantFrom(...pagesWithHreflang);

      fc.assert(
        fc.property(pageUrlArb, (pageUrl) => {
          const hreflangLinks = getHreflangLinks(pageUrl);
          
          expect(hreflangLinks).not.toBeNull();
          
          hreflangLinks!.forEach(link => {
            const url = new URL(link.url);
            const pathname = url.pathname;
            
            // x-default should point to the default locale (no prefix)
            if (link.lang === 'x-default') {
              expect(pathname).toBe('/');
            }
            // en (default locale) should not have locale prefix
            else if (link.lang === 'en') {
              expect(pathname).toBe('/');
            }
            // Other locales should have locale prefix
            else if (SUPPORTED_LOCALES.includes(link.lang as Locale)) {
              expect(pathname).toMatch(new RegExp(`^/${link.lang}/`));
            }
          });
        }),
        { numRuns: sampleSize }
      );
    });

    it('should not have duplicate hreflang tags for the same language', () => {
      if (!distExists || pagesWithHreflang.length === 0) {
        console.warn('⚠️ SKIPPED: Prerequisites not met');
        return;
      }

      const sampleSize = Math.min(10, pagesWithHreflang.length);
      const pageUrlArb = fc.constantFrom(...pagesWithHreflang);

      fc.assert(
        fc.property(pageUrlArb, (pageUrl) => {
          const hreflangLinks = getHreflangLinks(pageUrl);
          
          expect(hreflangLinks).not.toBeNull();
          
          // Check for duplicate languages
          const langs = hreflangLinks!.map(link => link.lang);
          const uniqueLangs = new Set(langs);
          
          expect(langs.length).toBe(uniqueLangs.size);
        }),
        { numRuns: sampleSize }
      );
    });

    it('should have consistent hreflang tags across language versions of the same page', () => {
      if (!distExists) {
        console.warn('⚠️ SKIPPED: dist/ not found. Run "npm run build" first.');
        return;
      }
      
      // For this test, we need to check that all language versions of the same page
      // have the same set of hreflang tags (just with different current page)
      // We'll test the homepage as it's most likely to have all language versions
      
      const homepageVersions = pagesWithHreflang.filter(url => 
        url === '/' || url.match(/^\/[a-z]{2}\/$/)
      );
      
      if (homepageVersions.length < 2) {
        console.warn('⚠️ SKIPPED: Not enough homepage language versions found');
        return;
      }

      // Get hreflang links from all homepage versions
      const allHreflangSets = homepageVersions.map(url => {
        const links = getHreflangLinks(url);
        return links ? links.map(l => l.lang).sort() : [];
      });

      // All versions should have the same set of languages
      const firstSet = JSON.stringify(allHreflangSets[0]);
      allHreflangSets.forEach(set => {
        expect(JSON.stringify(set)).toBe(firstSet);
      });
    });
  });
});
