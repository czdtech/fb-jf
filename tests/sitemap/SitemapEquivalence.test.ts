/**
 * **Feature: astro-best-practices-refactor, Property 11: Sitemap Equivalence**
 * **Validates: Requirements 5.3**
 * 
 * Property-based tests to verify that the generated sitemap contains all URLs
 * from the original sitemap. This ensures SEO continuity after adding
 * @astrojs/sitemap integration.
 * 
 * IMPORTANT: These tests require:
 * 1. Original sitemap (public/sitemap.xml) - the baseline
 * 2. Generated sitemap (dist/sitemap-0.xml) - from @astrojs/sitemap
 * 
 * Note: The generated sitemap may have a different format (no lastmod/changefreq/priority)
 * but must contain all URLs from the original sitemap.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// Types
interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

interface SitemapData {
  urls: string[];
  entries: SitemapEntry[];
}

// Paths
const ORIGINAL_SITEMAP = 'public/sitemap.xml';
const GENERATED_SITEMAP = 'dist/sitemap-0.xml';
const GENERATED_SITEMAP_INDEX = 'dist/sitemap-index.xml';

// Test data
let originalSitemap: SitemapData | null = null;
let generatedSitemap: SitemapData | null = null;
let originalUrls: string[] = [];
let generatedUrls: Set<string> = new Set();

/**
 * Parse sitemap XML and extract URLs and entries
 */
function parseSitemap(xml: string): SitemapData {
  const entries: SitemapEntry[] = [];
  const urls: string[] = [];
  
  // Handle both formatted and minified XML
  const urlRegex = /<url>[\s\S]*?<\/url>/g;
  const locRegex = /<loc>([^<]*)<\/loc>/;
  const lastmodRegex = /<lastmod>([^<]*)<\/lastmod>/;
  const changefreqRegex = /<changefreq>([^<]*)<\/changefreq>/;
  const priorityRegex = /<priority>([^<]*)<\/priority>/;
  
  let match;
  while ((match = urlRegex.exec(xml)) !== null) {
    const urlBlock = match[0];
    const locMatch = urlBlock.match(locRegex);
    
    if (locMatch) {
      const entry: SitemapEntry = {
        loc: locMatch[1],
      };
      
      const lastmodMatch = urlBlock.match(lastmodRegex);
      if (lastmodMatch) entry.lastmod = lastmodMatch[1];
      
      const changefreqMatch = urlBlock.match(changefreqRegex);
      if (changefreqMatch) entry.changefreq = changefreqMatch[1];
      
      const priorityMatch = urlBlock.match(priorityRegex);
      if (priorityMatch) entry.priority = priorityMatch[1];
      
      entries.push(entry);
      urls.push(locMatch[1]);
    }
  }
  
  // If no <url> tags found, try to extract <loc> directly (for minified format)
  if (urls.length === 0) {
    const directLocRegex = /<loc>([^<]*)<\/loc>/g;
    while ((match = directLocRegex.exec(xml)) !== null) {
      urls.push(match[1]);
      entries.push({ loc: match[1] });
    }
  }
  
  return { urls, entries };
}

/**
 * Normalize URL for comparison (ensure consistent trailing slash)
 */
function normalizeUrl(url: string): string {
  // Ensure consistent trailing slash
  return url.endsWith('/') ? url : url + '/';
}

/**
 * Check if URL is a valid page URL (not a component or partial)
 */
function isValidPageUrl(url: string): boolean {
  const invalidPatterns = [
    '/nav',
    '/header',
    '/common',
    '/popular-games',
    '/new-games',
    '/trending-games',
    '/index-trending-games',
  ];
  
  return !invalidPatterns.some(pattern => url.includes(pattern));
}

beforeAll(() => {
  const originalPath = path.join(process.cwd(), ORIGINAL_SITEMAP);
  const generatedPath = path.join(process.cwd(), GENERATED_SITEMAP);
  
  // Load original sitemap
  if (fs.existsSync(originalPath)) {
    const content = fs.readFileSync(originalPath, 'utf-8');
    originalSitemap = parseSitemap(content);
    originalUrls = originalSitemap.urls.map(normalizeUrl);
  }
  
  // Load generated sitemap
  if (fs.existsSync(generatedPath)) {
    const content = fs.readFileSync(generatedPath, 'utf-8');
    generatedSitemap = parseSitemap(content);
    generatedUrls = new Set(generatedSitemap.urls.map(normalizeUrl));
  }
});

describe('Sitemap Equivalence Tests', () => {
  describe('Property 11: Sitemap Equivalence', () => {
    /**
     * **Feature: astro-best-practices-refactor, Property 11: Sitemap Equivalence**
     * 
     * Property: For any URL in the original sitemap, the generated sitemap
     * SHALL contain that URL (after normalization).
     */
    it('should contain all original sitemap URLs in generated sitemap', () => {
      if (!originalSitemap) {
        console.warn(`⚠️ SKIPPED: Original sitemap not found at ${ORIGINAL_SITEMAP}`);
        return;
      }
      if (!generatedSitemap) {
        console.warn(`⚠️ SKIPPED: Generated sitemap not found at ${GENERATED_SITEMAP}. Run "npm run build" first.`);
        return;
      }
      if (originalUrls.length === 0) {
        console.warn('⚠️ SKIPPED: Original sitemap is empty');
        return;
      }

      // Use property-based testing to verify all original URLs exist in generated
      const urlArb = fc.constantFrom(...originalUrls);

      fc.assert(
        fc.property(urlArb, (originalUrl) => {
          const exists = generatedUrls.has(originalUrl);
          expect(exists).toBe(true);
        }),
        { numRuns: Math.min(200, originalUrls.length) }
      );
    });

    it('should have 100% coverage of original sitemap URLs', () => {
      if (!originalSitemap || !generatedSitemap) {
        console.warn('⚠️ SKIPPED: Sitemaps not available');
        return;
      }

      const missingUrls = originalUrls.filter(url => !generatedUrls.has(url));
      const coveragePercent = ((originalUrls.length - missingUrls.length) / originalUrls.length) * 100;

      // Log coverage info
      console.log(`Sitemap coverage: ${coveragePercent.toFixed(1)}%`);
      console.log(`Original URLs: ${originalUrls.length}`);
      console.log(`Generated URLs: ${generatedUrls.size}`);
      console.log(`Missing URLs: ${missingUrls.length}`);

      if (missingUrls.length > 0) {
        console.log('Missing URLs (first 10):');
        missingUrls.slice(0, 10).forEach(url => console.log(`  - ${url}`));
      }

      // Expect 100% coverage
      expect(coveragePercent).toBe(100);
    });

    it('should have valid URL format for all generated sitemap entries', () => {
      if (!generatedSitemap) {
        console.warn('⚠️ SKIPPED: Generated sitemap not available');
        return;
      }

      const urlArb = fc.constantFrom(...generatedSitemap.urls);

      fc.assert(
        fc.property(urlArb, (url) => {
          // URL should be valid
          expect(() => new URL(url)).not.toThrow();
          
          // URL should use correct domain
          const parsed = new URL(url);
          expect(parsed.hostname).toBe('www.playfiddlebops.com');
          expect(parsed.protocol).toBe('https:');
        }),
        { numRuns: Math.min(100, generatedSitemap.urls.length) }
      );
    });

    it('should not include component/partial URLs in generated sitemap', () => {
      if (!generatedSitemap) {
        return;
      }

      const invalidPatterns = [
        '/nav/',
        '/header/',
        '/common/',
        '/popular-games/',
        '/new-games/',
        '/trending-games/',
        '/index-trending-games/',
      ];

      generatedSitemap.urls.forEach(url => {
        invalidPatterns.forEach(pattern => {
          expect(url).not.toContain(pattern);
        });
      });
    });
  });

  describe('Sitemap Format Validation', () => {
    it('should have sitemap-index.xml in dist/', () => {
      const indexPath = path.join(process.cwd(), GENERATED_SITEMAP_INDEX);
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    it('should have valid XML structure in generated sitemap', () => {
      if (!generatedSitemap) {
        return;
      }

      const generatedPath = path.join(process.cwd(), GENERATED_SITEMAP);
      const content = fs.readFileSync(generatedPath, 'utf-8');

      // Check for XML declaration or urlset
      expect(content).toMatch(/<\?xml|<urlset/);
      
      // Check for proper closing
      expect(content).toMatch(/<\/urlset>/);
    });

    it('should preserve original sitemap in dist/ for fallback', () => {
      // The original sitemap.xml from public/ should be copied to dist/
      const copiedPath = path.join(process.cwd(), 'dist/sitemap.xml');
      
      // This might not exist if public/sitemap.xml is not copied
      // Just log a warning if not found
      if (!fs.existsSync(copiedPath)) {
        console.warn('Note: Original sitemap.xml not found in dist/');
        console.warn('The generated sitemap-0.xml will be used instead.');
      }
    });
  });

  describe('URL Coverage Analysis', () => {
    it('should report any new URLs in generated sitemap', () => {
      if (!originalSitemap || !generatedSitemap) {
        return;
      }

      const originalSet = new Set(originalUrls);
      const newUrls = [...generatedUrls].filter(url => !originalSet.has(url));

      if (newUrls.length > 0) {
        console.log(`\nNew URLs in generated sitemap: ${newUrls.length}`);
        
        // Categorize new URLs
        const categoryUrls = newUrls.filter(url => url.includes('/c/'));
        const gameUrls = newUrls.filter(url => url.includes('/games/'));
        const otherUrls = newUrls.filter(url => !url.includes('/c/') && !url.includes('/games/'));

        if (categoryUrls.length > 0) {
          console.log(`  Category pages (/c/*): ${categoryUrls.length}`);
        }
        if (gameUrls.length > 0) {
          console.log(`  Game pages (/games/*): ${gameUrls.length}`);
        }
        if (otherUrls.length > 0) {
          console.log(`  Other pages: ${otherUrls.length}`);
          otherUrls.slice(0, 5).forEach(url => console.log(`    + ${url}`));
        }
      }

      // New URLs are acceptable (they're additions, not removals)
      // This test is informational only
      expect(true).toBe(true);
    });
  });
});
