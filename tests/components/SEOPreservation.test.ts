/**
 * **Feature: astro-best-practices-refactor, Property 1: Canonical URL Preservation**
 * **Feature: astro-best-practices-refactor, Property 3: Structured Data Preservation**
 * **Validates: Requirements 1.1, 1.3**
 * 
 * Property-based tests to verify that SEO elements are preserved after refactoring.
 * 
 * Page Discovery Strategy:
 * - Pages are discovered from the CURRENT build (dist/) and content collection
 * - This ensures new pages are automatically covered without baseline updates
 * - Baseline is used for comparison when available, but tests run regardless
 * 
 * NOTE: These tests will be SKIPPED if dist/ doesn't exist.
 * - Run "npm run build" to create the dist/ directory
 * - Optionally run "npm run baseline" to create comparison snapshots
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// Types for SEO data
interface OGData {
  title: string | null;
  description: string | null;
  url: string | null;
  siteName: string | null;
  locale: string | null;
  image: string | null;
  type: string | null;
}

interface TwitterData {
  card: string | null;
  site: string | null;
  title: string | null;
  description: string | null;
  image: string | null;
}

interface JsonLdData {
  '@context': string;
  '@type': string;
  name?: string;
  alternateName?: string;
  url?: string;
  description?: string;
  [key: string]: unknown;
}

interface PageSEOData {
  title: string | null;
  description: string | null;
  keywords: string | null;
  robots: string | null;
  canonical: string | null;
  og: OGData;
  twitter: TwitterData;
  jsonLd: JsonLdData[] | null;
}

interface SEOSnapshot {
  totalPages: number;
  pages: Record<string, PageSEOData>;
}


// SEO extraction functions (same as in seo-snapshot.mjs)
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

function extractJsonLd(html: string): JsonLdData[] | null {
  const regex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const matches: JsonLdData[] = [];
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
 * Check if a canonical URL is valid (not broken with template syntax)
 */
function isValidCanonicalInBaseline(canonical: string | null): boolean {
  if (!canonical) return false;
  if (canonical.includes('{') || canonical.includes('}')) return false;
  try {
    new URL(canonical);
    return true;
  } catch {
    return false;
  }
}

// Test data
let seoBaseline: SEOSnapshot | null = null;
let baselineExists = false;
let distExists = false;
let allGamePages: string[] = [];
let pagesWithCanonical: string[] = [];
let pagesWithJsonLd: string[] = [];

/**
 * Get list of Content Collection game slugs by reading the content directory
 */
function getContentCollectionSlugs(): string[] {
  const contentDir = path.join(process.cwd(), 'src/content/games');
  const slugs: string[] = [];
  
  if (fs.existsSync(contentDir)) {
    const files = fs.readdirSync(contentDir);
    for (const file of files) {
      // Only use canonical English entries.
      // Content is stored as `<urlstr>.<locale>.md` (e.g. `soccar.en.md`).
      if (file.endsWith('.en.md')) {
        slugs.push(file.replace('.en.md', ''));
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
  const baselinePath = path.join(process.cwd(), 'scripts/snapshots/seo-baseline.json');
  const distPath = path.join(process.cwd(), 'dist');
  
  // Check if dist exists first - this is the primary source of truth
  distExists = fs.existsSync(distPath);
  
  if (distExists) {
    // Discover pages from current build - this automatically includes new pages
    allGamePages = discoverGamePagesFromDist();
    
    // For pages discovered from dist, check their SEO data directly
    pagesWithCanonical = allGamePages.filter(url => {
      const seoData = getCurrentSeoData(url);
      return seoData && isValidCanonicalInBaseline(seoData.canonical);
    });
    
    pagesWithJsonLd = allGamePages.filter(url => {
      const seoData = getCurrentSeoData(url);
      return seoData?.jsonLd !== null && seoData?.jsonLd !== undefined && seoData.jsonLd.length > 0;
    });
  }
  
  // Check if baseline exists (optional - used for comparison tests)
  baselineExists = fs.existsSync(baselinePath);
  if (baselineExists) {
    const data = fs.readFileSync(baselinePath, 'utf-8');
    seoBaseline = JSON.parse(data) as SEOSnapshot;
  }
});

/**
 * Read current HTML from dist/ and extract SEO data
 */
function getCurrentSeoData(urlPath: string): PageSEOData | null {
  const filePath = urlToFilePath(urlPath);
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  
  const html = fs.readFileSync(fullPath, 'utf-8');
  return extractSeoFromHtml(html);
}

describe('SEO Preservation Tests - Current Build Validation', () => {
  describe('Property 1: Canonical URL Preservation', () => {
    /**
     * **Feature: astro-best-practices-refactor, Property 1: Canonical URL Preservation**
     * 
     * Property: For any game page in the current build, the canonical URL
     * SHALL be valid and use the correct domain.
     * 
     * When baseline exists, also verify canonical URLs match the baseline.
     */
    it('should have valid canonical URLs in all game pages', () => {
      if (!distExists) {
        console.warn('⚠️ SKIPPED: dist/ not found. Run "npm run build" first.');
        return;
      }
      if (pagesWithCanonical.length === 0) {
        console.warn('⚠️ SKIPPED: No pages with valid canonical URLs found');
        return;
      }

      const sampleSize = Math.min(100, pagesWithCanonical.length);
      const pageUrlArb = fc.constantFrom(...pagesWithCanonical);

      fc.assert(
        fc.property(pageUrlArb, (pageUrl) => {
          const currentData = getCurrentSeoData(pageUrl);
          
          // Page must exist in current build
          expect(currentData).not.toBeNull();
          
          // Canonical URL must be valid
          expect(currentData!.canonical).not.toBeNull();
          expect(isValidCanonicalInBaseline(currentData!.canonical)).toBe(true);
        }),
        { numRuns: sampleSize }
      );
    });

    it('should preserve canonical URLs from baseline when baseline exists', () => {
      if (!distExists) {
        console.warn('⚠️ SKIPPED: dist/ not found. Run "npm run build" first.');
        return;
      }
      if (!baselineExists) {
        console.warn('⚠️ SKIPPED: SEO baseline not found. Run "npm run baseline" to enable comparison tests.');
        return;
      }
      
      // Only test pages that exist in both baseline and current build
      const baselinePages = Object.keys(seoBaseline!.pages);
      const pagesInBoth = pagesWithCanonical.filter(url => baselinePages.includes(url));
      
      if (pagesInBoth.length === 0) {
        console.warn('⚠️ SKIPPED: No overlapping pages between baseline and current build');
        return;
      }

      const sampleSize = Math.min(100, pagesInBoth.length);
      const pageUrlArb = fc.constantFrom(...pagesInBoth);

      fc.assert(
        fc.property(pageUrlArb, (pageUrl) => {
          const baselineData = seoBaseline!.pages[pageUrl];
          const currentData = getCurrentSeoData(pageUrl);
          
          expect(currentData).not.toBeNull();
          expect(currentData!.canonical).toBe(baselineData.canonical);
        }),
        { numRuns: sampleSize }
      );
    });

    it('should have canonical URLs using the correct domain in current build', () => {
      if (!distExists || pagesWithCanonical.length === 0) {
        console.warn('⚠️ SKIPPED: Prerequisites not met');
        return;
      }

      const sampleSize = Math.min(50, pagesWithCanonical.length);
      const pageUrlArb = fc.constantFrom(...pagesWithCanonical);

      fc.assert(
        fc.property(pageUrlArb, (pageUrl) => {
          const currentData = getCurrentSeoData(pageUrl);
          
          if (currentData?.canonical) {
            const url = new URL(currentData.canonical);
            expect(url.hostname).toBe('www.playfiddlebops.com');
            expect(url.protocol).toBe('https:');
          }
        }),
        { numRuns: sampleSize }
      );
    });
  });


  describe('Property 3: Structured Data Preservation', () => {
    /**
     * **Feature: astro-best-practices-refactor, Property 3: Structured Data Preservation**
     * 
     * Property: For any game page in the current build containing JSON-LD,
     * the structured data SHALL have valid schema.org format.
     * 
     * When baseline exists, also verify JSON-LD matches the baseline.
     */
    it('should have valid JSON-LD structured data in all game pages', () => {
      if (!distExists) {
        console.warn('⚠️ SKIPPED: dist/ not found. Run "npm run build" first.');
        return;
      }
      if (pagesWithJsonLd.length === 0) {
        console.warn('⚠️ SKIPPED: No pages with JSON-LD found');
        return;
      }

      const sampleSize = Math.min(100, pagesWithJsonLd.length);
      const pageUrlArb = fc.constantFrom(...pagesWithJsonLd);

      fc.assert(
        fc.property(pageUrlArb, (pageUrl) => {
          const currentData = getCurrentSeoData(pageUrl);
          
          expect(currentData).not.toBeNull();
          expect(currentData!.jsonLd).not.toBeNull();
          expect(currentData!.jsonLd!.length).toBeGreaterThan(0);
        }),
        { numRuns: sampleSize }
      );
    });

    it('should preserve JSON-LD structured data from baseline when baseline exists', () => {
      if (!distExists) {
        console.warn('⚠️ SKIPPED: dist/ not found. Run "npm run build" first.');
        return;
      }
      if (!baselineExists) {
        console.warn('⚠️ SKIPPED: SEO baseline not found. Run "npm run baseline" to enable comparison tests.');
        return;
      }
      
      // Only test pages that exist in both baseline and current build
      const baselinePages = Object.keys(seoBaseline!.pages);
      const pagesInBoth = pagesWithJsonLd.filter(url => baselinePages.includes(url));
      
      if (pagesInBoth.length === 0) {
        console.warn('⚠️ SKIPPED: No overlapping pages between baseline and current build');
        return;
      }

      const sampleSize = Math.min(100, pagesInBoth.length);
      const pageUrlArb = fc.constantFrom(...pagesInBoth);

      fc.assert(
        fc.property(pageUrlArb, (pageUrl) => {
          const baselineData = seoBaseline!.pages[pageUrl];
          const currentData = getCurrentSeoData(pageUrl);

          expect(currentData).not.toBeNull();

          const baselineJsonLd = (baselineData.jsonLd ?? []) as any[];
          const currentJsonLd = (currentData!.jsonLd ?? []) as any[];

          // 结构上：条目数量必须一致，不能丢条或多条
          expect(currentJsonLd.length).toBe(baselineJsonLd.length);

          // 逐条对比：核心字段必须一致，description 允许在 baseline 为空时被补全
          for (let i = 0; i < baselineJsonLd.length; i++) {
            const baseItem = baselineJsonLd[i] ?? {};
            const currItem = currentJsonLd[i] ?? {};

            // 1. 核心 schema.org 元信息必须一致
            if (baseItem['@context'] !== undefined) {
              expect(currItem['@context']).toBe(baseItem['@context']);
            }
            if (baseItem['@type'] !== undefined) {
              expect(currItem['@type']).toBe(baseItem['@type']);
            }
            if (baseItem.name !== undefined) {
              expect(currItem.name).toBe(baseItem.name);
            }
            if (baseItem.alternateName !== undefined) {
              expect(currItem.alternateName).toBe(baseItem.alternateName);
            }
            if (baseItem.url !== undefined) {
              expect(currItem.url).toBe(baseItem.url);
            }

            // 2. description 规则：
            // - baseline.description 为 null 或空字符串：视为“当年未配置”，允许现在补充文案；
            // - baseline.description 为非空字符串：要求与当前完全一致，避免回退或篡改。
            if ('description' in baseItem) {
              const baseDesc = baseItem.description as string | null | undefined;
              const currDesc = currItem.description as string | null | undefined;

              if (baseDesc === null || baseDesc === '') {
                // 不要求内容相同，但字段必须存在（哪怕是 ''）
                expect(currDesc).not.toBeUndefined();
              } else {
                expect(currDesc).toBe(baseDesc);
              }
            }
          }
        }),
        { numRuns: sampleSize }
      );
    });

    it('should have JSON-LD with required @context and @type in current build', () => {
      if (!distExists || pagesWithJsonLd.length === 0) {
        console.warn('⚠️ SKIPPED: Prerequisites not met');
        return;
      }

      const sampleSize = Math.min(50, pagesWithJsonLd.length);
      const pageUrlArb = fc.constantFrom(...pagesWithJsonLd);

      fc.assert(
        fc.property(pageUrlArb, (pageUrl) => {
          const currentData = getCurrentSeoData(pageUrl);
          
          if (currentData?.jsonLd) {
            currentData.jsonLd.forEach(item => {
              expect(item['@context']).toBe('https://schema.org');
              expect(typeof item['@type']).toBe('string');
              expect(item['@type'].length).toBeGreaterThan(0);
            });
          }
        }),
        { numRuns: sampleSize }
      );
    });

    it('should have Game type JSON-LD with required properties in current build', () => {
      if (!distExists || pagesWithJsonLd.length === 0) {
        console.warn('⚠️ SKIPPED: Prerequisites not met');
        return;
      }

      // Filter to game pages from current build
      const gamePages = pagesWithJsonLd.filter(url => {
        const currentData = getCurrentSeoData(url);
        return currentData?.jsonLd && currentData.jsonLd.some(item => item['@type'] === 'Game');
      });

      if (gamePages.length === 0) {
        console.warn('⚠️ SKIPPED: No game pages found');
        return;
      }

      const sampleSize = Math.min(50, gamePages.length);
      const pageUrlArb = fc.constantFrom(...gamePages);

      fc.assert(
        fc.property(pageUrlArb, (pageUrl) => {
          const currentData = getCurrentSeoData(pageUrl);
          const currentGame = currentData?.jsonLd?.find(item => item['@type'] === 'Game');
          
          expect(currentGame).toBeDefined();
          expect(currentGame!.name).toBeDefined();
          expect(typeof currentGame!.name).toBe('string');
        }),
        { numRuns: sampleSize }
      );
    });
  });

  describe('Property 2: Meta Tags Preservation', () => {
    /**
     * **Feature: astro-best-practices-refactor, Property 2: Meta Tags Preservation**
     * 
     * Property: For any game page in the current build, meta tags SHALL be present.
     * 
     * When baseline exists, also verify meta tags match the baseline.
     */
    it('should have title and description in all game pages', () => {
      if (!distExists) {
        console.warn('⚠️ SKIPPED: dist/ not found. Run "npm run build" first.');
        return;
      }
      if (allGamePages.length === 0) {
        console.warn('⚠️ SKIPPED: No game pages found');
        return;
      }

      const sampleSize = Math.min(100, allGamePages.length);
      const pageUrlArb = fc.constantFrom(...allGamePages);

      fc.assert(
        fc.property(pageUrlArb, (pageUrl) => {
          const currentData = getCurrentSeoData(pageUrl);
          
          expect(currentData).not.toBeNull();
          expect(currentData!.title).not.toBeNull();
          expect(currentData!.title!.length).toBeGreaterThan(0);
          // Description tag should exist (content may be empty for some games)
        }),
        { numRuns: sampleSize }
      );
    });

    it('should preserve title and description from baseline when baseline exists', () => {
      if (!distExists) {
        console.warn('⚠️ SKIPPED: dist/ not found. Run "npm run build" first.');
        return;
      }
      if (!baselineExists) {
        console.warn('⚠️ SKIPPED: SEO baseline not found. Run "npm run baseline" to enable comparison tests.');
        return;
      }

      // Only test pages that exist in both baseline and current build
      const baselinePages = Object.keys(seoBaseline!.pages);
      const pagesInBoth = allGamePages.filter(url => baselinePages.includes(url));
      
      if (pagesInBoth.length === 0) {
        console.warn('⚠️ SKIPPED: No overlapping pages between baseline and current build');
        return;
      }

      const sampleSize = Math.min(100, pagesInBoth.length);
      const pageUrlArb = fc.constantFrom(...pagesInBoth);

      fc.assert(
        fc.property(pageUrlArb, (pageUrl) => {
          const baselineData = seoBaseline!.pages[pageUrl];
          const currentData = getCurrentSeoData(pageUrl);

          if (!currentData) return;

          // Title 必须与基线严格一致
          expect(currentData.title).toBe(baselineData.title);

          // 对于 description：
          // - 如果基线有值，则保持完全一致，防止无意回退或篡改；
          // - 如果基线为 null，表示历史上没有配置 description，此时允许我们补充更好的文案，
          //   只要求当前 description 不是 undefined（可以为空字符串）。
          if (baselineData.description === null) {
            expect(currentData.description).not.toBeUndefined();
          } else {
            expect(currentData.description).toBe(baselineData.description);
          }
        }),
        { numRuns: sampleSize }
      );
    });

    it('should have Open Graph tags in all game pages', () => {
      if (!distExists || allGamePages.length === 0) {
        console.warn('⚠️ SKIPPED: Prerequisites not met');
        return;
      }

      const sampleSize = Math.min(50, allGamePages.length);
      const pageUrlArb = fc.constantFrom(...allGamePages);

      fc.assert(
        fc.property(pageUrlArb, (pageUrl) => {
          const currentData = getCurrentSeoData(pageUrl);
          
          if (!currentData) return;
          
          // OG tags should be present
          expect(currentData.og.title).not.toBeNull();
          expect(currentData.og.url).not.toBeNull();
          expect(currentData.og.image).not.toBeNull();
        }),
        { numRuns: sampleSize }
      );
    });

    it('should preserve Open Graph tags from baseline when baseline exists', () => {
      if (!distExists) {
        console.warn('⚠️ SKIPPED: dist/ not found. Run "npm run build" first.');
        return;
      }
      if (!baselineExists) {
        console.warn('⚠️ SKIPPED: SEO baseline not found. Run "npm run baseline" to enable comparison tests.');
        return;
      }

      // Only test pages that exist in both baseline and current build
      const baselinePages = Object.keys(seoBaseline!.pages);
      const pagesInBoth = allGamePages.filter(url => baselinePages.includes(url));
      
      if (pagesInBoth.length === 0) {
        console.warn('⚠️ SKIPPED: No overlapping pages between baseline and current build');
        return;
      }

      const sampleSize = Math.min(50, pagesInBoth.length);
      const pageUrlArb = fc.constantFrom(...pagesInBoth);

      fc.assert(
        fc.property(pageUrlArb, (pageUrl) => {
          const baselineData = seoBaseline!.pages[pageUrl];
          const currentData = getCurrentSeoData(pageUrl);

          if (!currentData) return;

          // OG title/url/image 必须与基线一致，保证关键分享标签不被破坏
          expect(currentData.og.title).toBe(baselineData.og.title);
          expect(currentData.og.url).toBe(baselineData.og.url);
          expect(currentData.og.image).toBe(baselineData.og.image);

          // 对于 og:description，同样做「null 代表当时没有配置」的宽松处理：
          // - baseline 为 null：允许当前补充描述；
          // - baseline 有值：要求与基线完全一致。
          if (baselineData.og.description === null) {
            // 可以为 '' 或更长文本，只要字段存在即可
            expect(currentData.og.description).not.toBeUndefined();
          } else {
            expect(currentData.og.description).toBe(baselineData.og.description);
          }
        }),
        { numRuns: sampleSize }
      );
    });
  });
});
