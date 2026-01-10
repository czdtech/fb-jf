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
import { discoverGamePagesFromDist } from '../utils/file-discovery';

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

function ensureDistAndGamePages(): boolean {
  if (!distExists) {
    console.warn('⚠️ SKIPPED: dist/ not found. Run "npm run build" first.');
    return false;
  }
  if (gamePages.length === 0) {
    console.warn('⚠️ SKIPPED: No game pages found in dist/');
    return false;
  }
  return true;
}

function itForBuiltGamePages(
  name: string,
  assertPage: (args: { pageUrl: string; html: string }) => void,
  options: { timeout?: number } = {}
): void {
  it(
    name,
    () => {
      if (!ensureDistAndGamePages()) return;

      const pageUrlArb = fc.constantFrom(...gamePages);

      fc.assert(
        fc.property(pageUrlArb, (pageUrl) => {
          const html = readBuiltHtml(pageUrl);
          expect(html).not.toBeNull();
          assertPage({ pageUrl, html: html! });
        }),
        { numRuns: Math.min(100, gamePages.length) }
      );
    },
    options.timeout
  );
}

describe('GameLayout Component - Property 6: Layout HTML Structure Completeness (Real Build)', () => {
  /**
   * **Feature: astro-best-practices-refactor, Property 6: Layout HTML Structure Completeness**
   * 
   * These tests verify the actual GameLayout.astro component output by examining
   * built HTML pages in dist/ that use the component.
   */
  
  itForBuiltGamePages('should contain DOCTYPE declaration in built pages', ({ html }) => {
    expect(html.trim().toLowerCase().startsWith('<!doctype html>')).toBe(true);
  });

  itForBuiltGamePages(
    'should contain html tag with lang attribute in built pages',
    ({ html }) => {
      const $ = cheerio.load(html);
      expect($('html').length).toBe(1);
      expect($('html').attr('lang')).toBeDefined();
    },
    { timeout: 20000 }
  );

  itForBuiltGamePages(
    'should contain head tag with required elements in built pages',
    ({ html }) => {
      const $ = cheerio.load(html);
      expect($('head').length).toBe(1);
      expect($('head meta[charset]').length).toBe(1);
      expect($('head meta[name="viewport"]').length).toBe(1);
      expect($('head title').length).toBe(1);
      expect($('head link[rel="canonical"]').length).toBe(1);
      expect($('head meta[name="description"]').length).toBe(1);
    },
    { timeout: 20000 }
  );

  itForBuiltGamePages('should contain body tag in built pages', ({ html }) => {
    const $ = cheerio.load(html);
    expect($('body').length).toBe(1);
  });

  itForBuiltGamePages('should contain main structural elements in body', ({ html }) => {
    const $ = cheerio.load(html);
    expect($('body header').length).toBeGreaterThanOrEqual(1);
    expect($('body main').length).toBe(1);
    expect($('body footer').length).toBe(1);
  });

  itForBuiltGamePages('should contain game-specific sections in built pages', ({ html }) => {
    const $ = cheerio.load(html);
    expect($('section.hero').length).toBe(1);
    expect($('section.about').length).toBe(1);
    expect($('.game-card').length).toBe(1);
  });

  itForBuiltGamePages('should contain iframe and play button elements in built pages', ({ html }) => {
    const $ = cheerio.load(html);
    expect($('iframe#fiddlebops-iframe').length).toBe(1);
    expect($('a#playButton, button#playButton').length).toBe(1);
  });

  itForBuiltGamePages('should have proper nesting: html > head and html > body', ({ html }) => {
    const $ = cheerio.load(html);
    expect($('html > head').length).toBe(1);
    expect($('html > body').length).toBe(1);
  });

  itForBuiltGamePages('should include about section with heading in built pages', ({ html }) => {
    const $ = cheerio.load(html);
    expect($('section.about').length).toBeGreaterThanOrEqual(1);
    expect($('section.about h2').length).toBeGreaterThanOrEqual(1);
    expect($('section.about h2').first().text().length).toBeGreaterThan(0);
  });

  itForBuiltGamePages('should include footer with required links in built pages', ({ html }) => {
    const $ = cheerio.load(html);
    expect($('footer a[href="/privacy/"]').length).toBe(1);
    expect($('footer a[href="/terms-of-service/"]').length).toBe(1);
    expect($('footer .copyright').length).toBe(1);
  });

  itForBuiltGamePages('should have fullscreen button in game pages', ({ html }) => {
    const $ = cheerio.load(html);
    expect($('button#fullscreen-btn').length).toBe(1);
  });
});
