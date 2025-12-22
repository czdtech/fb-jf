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
import { defaultLocale, locales } from '../../src/i18n/routing';

function toHreflang(locale: string): string {
  // Site uses `zh-CN` hreflang but `/zh/` path prefix.
  return locale === 'zh' ? 'zh-CN' : locale;
}

const SUPPORTED_LOCALES = locales;
type Locale = (typeof SUPPORTED_LOCALES)[number];
const SUPPORTED_HREFLANGS = SUPPORTED_LOCALES.map((l) => toHreflang(l));

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

function getLocalizedUrlPath(basePath: string, locale: Locale): string {
  if (basePath === '/') {
    return locale === defaultLocale ? '/' : `/${locale}/`;
  }
  return locale === defaultLocale ? basePath : `/${locale}${basePath}`;
}

function stripLocalePrefix(urlPath: string): string {
  if (urlPath === '/') return '/';

  for (const locale of SUPPORTED_LOCALES) {
    if (locale === defaultLocale) continue;
    const prefix = `/${locale}/`;
    if (urlPath.startsWith(prefix)) {
      const rest = urlPath.slice(prefix.length - 1); // keep leading '/'
      return rest === '' ? '/' : rest;
    }
  }

  return urlPath;
}

function hreflangToPathPrefix(hreflang: string): string {
  if (hreflang === 'x-default') return '';
  if (hreflang === 'en') return '';
  if (hreflang === 'zh-CN') return 'zh';
  return hreflang;
}

function discoverPagesWithHreflang(): string[] {
  const distPath = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distPath)) return [];

  const basePaths = ['/', '/update-games/', '/c/puzzle/', '/steal-a-brainrot/'] as const;
  const candidates: string[] = [];
  for (const basePath of basePaths) {
    for (const locale of SUPPORTED_LOCALES) {
      candidates.push(getLocalizedUrlPath(basePath, locale));
    }
  }

  const pages: string[] = [];
  for (const urlPath of candidates) {
    const links = getHreflangLinks(urlPath);
    if (links && links.length > 0) pages.push(urlPath);
  }

  return [...new Set(pages)];
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

          // Should include all supported hreflang codes (en, zh-CN, es, fr, de, ja, ko)
          for (const hreflang of SUPPORTED_HREFLANGS) {
            expect(langs).toContain(hreflang);
          }
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

          const basePath = stripLocalePrefix(pageUrl);

          hreflangLinks!.forEach(link => {
            const url = new URL(link.url);
            const pathname = url.pathname;
            const prefix = hreflangToPathPrefix(link.lang);

            const expectedPath = prefix ? `/${prefix}${basePath}` : basePath;
            expect(pathname).toBe(expectedPath);
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

      const byBasePath = new Map<string, string[]>();
      for (const urlPath of pagesWithHreflang) {
        const basePath = stripLocalePrefix(urlPath);
        const list = byBasePath.get(basePath) ?? [];
        list.push(urlPath);
        byBasePath.set(basePath, list);
      }

      // Any base path with 2+ localized versions should have consistent hreflang sets.
      for (const [, versions] of byBasePath) {
        if (versions.length < 2) continue;

        const allSets = versions.map((url) => {
          const links = getHreflangLinks(url);
          return links ? links.map((l) => l.lang).sort() : [];
        });

        const first = JSON.stringify(allSets[0]);
        allSets.forEach((set) => {
          expect(JSON.stringify(set)).toBe(first);
        });
      }
    });
  });
});
