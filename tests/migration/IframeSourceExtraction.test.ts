/**
 * **Feature: comprehensive-improvement, Property 3: Iframe Source Extraction**
 * **Validates: Requirements 1.3**
 * 
 * Property-based tests to verify that iframe sources are correctly extracted
 * from static game pages during migration.
 * 
 * Property: For any migrated game page, the frontmatter iframeSrc field SHALL
 * contain a valid URL that matches the original iframe src attribute.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// Import the extraction functions
// Note: We need to use dynamic import for ESM modules
let extractIframeSrc: (content: string) => string | null;
let extractGameDataFromContent: (content: string, filePath: string) => any;
let generateMarkdown: (data: any) => string;

const PAGES_DIR = path.join(process.cwd(), 'src/pages');

// Files that are NOT game pages
const EXCLUDED_FILES = [
  '[gameSlug].astro',
  '[gameSlug].astro.backup',
  '404.astro',
  'index.astro',
  'privacy.astro',
  'terms-of-service.astro',
  'header.astro',
  'nav.astro',
  'common.astro',
  'popular-games.astro',
  'new-games.astro',
  'trending-games.astro',
  'index-trending-games.astro',
  'categories.astro',
];

let staticGamePages: { path: string; content: string; slug: string }[] = [];

beforeAll(async () => {
  // Dynamically import the ESM modules
  const parseModule = await import('../../scripts/parse-static-page.mjs');
  const generateModule = await import('../../scripts/generate-game-md.mjs');
  
  extractIframeSrc = parseModule.extractIframeSrc;
  extractGameDataFromContent = parseModule.extractGameDataFromContent;
  generateMarkdown = generateModule.generateMarkdown;
  
  // Load all static game pages
  if (fs.existsSync(PAGES_DIR)) {
    const entries = fs.readdirSync(PAGES_DIR, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) continue;
      if (!entry.name.endsWith('.astro')) continue;
      if (EXCLUDED_FILES.includes(entry.name)) continue;
      
      const filePath = path.join(PAGES_DIR, entry.name);
      const content = fs.readFileSync(filePath, 'utf-8');
      const slug = entry.name.replace('.astro', '');
      
      staticGamePages.push({ path: filePath, content, slug });
    }
  }
});

describe('Migration Script Tests', () => {
  describe('Property 3: Iframe Source Extraction', () => {
    /**
     * **Feature: comprehensive-improvement, Property 3: Iframe Source Extraction**
     * 
     * Property: For any static game page with an iframe.src assignment,
     * extractIframeSrc SHALL return a valid URL string (absolute or relative path).
     */
    it('should extract valid iframe URLs from all static game pages', () => {
      if (staticGamePages.length === 0) {
        console.warn('⚠️ SKIPPED: No static game pages found');
        return;
      }

      const pageArb = fc.constantFrom(...staticGamePages);

      fc.assert(
        fc.property(pageArb, (page) => {
          const iframeSrc = extractIframeSrc(page.content);
          
          // If the page has an iframe.src assignment, it should be extracted
          const hasIframeSrcAssignment = /iframe\.src\s*=\s*["']([^"']+)["']/i.test(page.content);
          
          if (hasIframeSrcAssignment) {
            expect(iframeSrc).not.toBeNull();
            expect(typeof iframeSrc).toBe('string');
            expect(iframeSrc!.length).toBeGreaterThan(0);
            
            // Should be either a valid absolute URL or a relative path
            const isRelativePath = iframeSrc!.startsWith('/');
            const isAbsoluteUrl = (() => {
              try {
                new URL(iframeSrc!);
                return true;
              } catch {
                return false;
              }
            })();
            
            expect(isRelativePath || isAbsoluteUrl).toBe(true);
          }
        }),
        { numRuns: Math.min(100, staticGamePages.length) }
      );
    });

    /**
     * Property: Extracted iframeSrc should match the original iframe.src value
     */
    it('should extract the exact iframe URL from the source', () => {
      if (staticGamePages.length === 0) {
        console.warn('⚠️ SKIPPED: No static game pages found');
        return;
      }

      const pageArb = fc.constantFrom(...staticGamePages);

      fc.assert(
        fc.property(pageArb, (page) => {
          // Extract the expected URL directly from the content
          const match = page.content.match(/iframe\.src\s*=\s*["']([^"']+)["']/i);
          
          if (match) {
            const expectedUrl = match[1].trim();
            const extractedUrl = extractIframeSrc(page.content);
            
            expect(extractedUrl).toBe(expectedUrl);
          }
        }),
        { numRuns: Math.min(100, staticGamePages.length) }
      );
    });

    /**
     * Property: extractGameDataFromContent should produce valid game data
     */
    it('should extract complete game data from static pages', () => {
      if (staticGamePages.length === 0) {
        console.warn('⚠️ SKIPPED: No static game pages found');
        return;
      }

      const pageArb = fc.constantFrom(...staticGamePages);

      fc.assert(
        fc.property(pageArb, (page) => {
          const gameData = extractGameDataFromContent(page.content, page.path);
          
          // Required fields should be present
          expect(gameData.slug).toBe(page.slug);
          expect(typeof gameData.title).toBe('string');
          expect(typeof gameData.description).toBe('string');
          expect(Array.isArray(gameData.tags)).toBe(true);
          
          // If page has iframe, iframeSrc should be extracted
          const hasIframeSrcAssignment = /iframe\.src\s*=\s*["']([^"']+)["']/i.test(page.content);
          if (hasIframeSrcAssignment) {
            expect(gameData.iframeSrc).toBeTruthy();
          }
        }),
        { numRuns: Math.min(100, staticGamePages.length) }
      );
    });

    /**
     * Property: Generated markdown should contain the extracted iframeSrc
     */
    it('should preserve iframeSrc in generated markdown', () => {
      if (staticGamePages.length === 0) {
        console.warn('⚠️ SKIPPED: No static game pages found');
        return;
      }

      const pageArb = fc.constantFrom(...staticGamePages);

      fc.assert(
        fc.property(pageArb, (page) => {
          const gameData = extractGameDataFromContent(page.content, page.path);
          
          if (gameData.iframeSrc) {
            const markdown = generateMarkdown(gameData);
            
            // The markdown should contain the iframeSrc in frontmatter
            expect(markdown).toContain('iframeSrc:');
            expect(markdown).toContain(gameData.iframeSrc);
          }
        }),
        { numRuns: Math.min(100, staticGamePages.length) }
      );
    });
  });

  describe('extractGameData unit tests', () => {
    it('should extract title from <title> tag', () => {
      const content = `
        <html>
        <head>
          <title>Test Game - Play Online</title>
        </head>
        </html>
      `;
      const data = extractGameDataFromContent(content, 'test.astro');
      expect(data.title).toBe('Test Game - Play Online');
    });

    it('should extract description from meta tag', () => {
      const content = `
        <html>
        <head>
          <meta name="description" content="This is a test game description">
        </head>
        </html>
      `;
      const data = extractGameDataFromContent(content, 'test.astro');
      expect(data.description).toBe('This is a test game description');
    });

    it('should extract iframeSrc from script', () => {
      const content = `
        <script>
          iframe.src = "https://example.com/game";
        </script>
      `;
      const data = extractGameDataFromContent(content, 'test.astro');
      expect(data.iframeSrc).toBe('https://example.com/game');
    });

    it('should extract tags from keywords meta', () => {
      const content = `
        <meta name="keywords" content="game, puzzle, fun">
      `;
      const data = extractGameDataFromContent(content, 'test.astro');
      expect(data.tags).toEqual(['game', 'puzzle', 'fun']);
    });

    it('should derive slug from filename', () => {
      const content = '<html></html>';
      const data = extractGameDataFromContent(content, 'my-cool-game.astro');
      expect(data.slug).toBe('my-cool-game');
      expect(data.urlstr).toBe('my-cool-game');
    });
  });

  describe('generateMarkdown unit tests', () => {
    it('should generate valid frontmatter', () => {
      const data = {
        slug: 'test-game',
        title: 'Test Game',
        description: 'A test game',
        iframeSrc: 'https://example.com/game',
        thumbnail: '/test.png',
        urlstr: 'test-game',
        tags: ['game', 'test'],
        content: '### About\n\nTest content',
      };
      
      const markdown = generateMarkdown(data);
      
      expect(markdown).toContain('---');
      expect(markdown).toContain('title: "Test Game"');
      expect(markdown).toContain('description: "A test game"');
      expect(markdown).toContain('iframeSrc: "https://example.com/game"');
      expect(markdown).toContain('thumbnail: "/test.png"');
      expect(markdown).toContain('tags: ["game", "test"]');
      expect(markdown).toContain('### About');
      expect(markdown).toContain('Test content');
    });

    it('should escape special characters in YAML strings', () => {
      const data = {
        slug: 'test',
        title: 'Game: The "Best" One',
        description: "It's a great game",
        iframeSrc: 'https://example.com',
        thumbnail: '/test.png',
        urlstr: 'test',
        tags: ['game'],
        content: '',
      };
      
      const markdown = generateMarkdown(data);
      
      // Should properly escape quotes and colons
      expect(markdown).toContain('title: "Game: The \\"Best\\" One"');
    });

    it('should include optional score when present', () => {
      const data = {
        slug: 'test',
        title: 'Test',
        description: 'Test',
        iframeSrc: 'https://example.com',
        thumbnail: '/test.png',
        urlstr: 'test',
        tags: ['game'],
        score: '4.5/5 (100 votes)',
        content: '',
      };
      
      const markdown = generateMarkdown(data);
      
      expect(markdown).toContain('score: "4.5/5 (100 votes)"');
    });
  });
});
