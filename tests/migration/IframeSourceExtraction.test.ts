/**
 * **Feature: comprehensive-improvement, Property 3: Iframe Source Extraction**
 * **Validates: Requirements 1.3**
 *
 * Property-based tests to verify that iframe sources are correctly extracted
 * from static game pages during migration.
 *
 * Note: 在当前重构后的项目中，src/pages 下已经不再有静态游戏页面，
 * 所以涉及真实页面的属性测试会在没有静态页面时直接跳过，只对
 * 抽象函数行为做单元测试。
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';

// 动态导入 ESM 模块
let extractIframeSrc: (content: string) => string | null;
let extractGameDataFromContent: (content: string, filePath: string) => any;
let generateMarkdown: (data: any) => string;

const PAGES_DIR = path.join(process.cwd(), 'src', 'pages');

// 非游戏页面
const EXCLUDED_FILES = [
  '[gameSlug].astro',
  '_[gameSlug].astro.backup',
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

interface StaticGamePage {
  path: string;
  content: string;
  slug: string;
}

let staticGamePages: StaticGamePage[] = [];

beforeAll(async () => {
  const parseModule = await import('../../scripts/parse-static-page.mjs');
  const generateModule = await import('../../scripts/generate-game-md.mjs');

  extractIframeSrc = parseModule.extractIframeSrc;
  extractGameDataFromContent = parseModule.extractGameDataFromContent;
  generateMarkdown = generateModule.generateMarkdown;

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
    it('should extract valid iframe URLs from all static game pages', () => {
      if (staticGamePages.length === 0) {
        console.warn('⚠️ SKIPPED: No static game pages found');
        return;
      }

      const pageArb = fc.constantFrom(...staticGamePages);

      fc.assert(
        fc.property(pageArb, (page) => {
          const iframeSrc = extractIframeSrc(page.content);

          const hasIframeSrcAssignment =
            /iframe\.src\s*=\s*["']([^"']+)["']/i.test(page.content);

          if (hasIframeSrcAssignment) {
            expect(iframeSrc).not.toBeNull();
            expect(typeof iframeSrc).toBe('string');
            expect(iframeSrc!.length).toBeGreaterThan(0);

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
        { numRuns: Math.min(100, staticGamePages.length) },
      );
    });

    it('should extract the exact iframe URL from the source', () => {
      if (staticGamePages.length === 0) {
        console.warn('⚠️ SKIPPED: No static game pages found');
        return;
      }

      const pageArb = fc.constantFrom(...staticGamePages);

      fc.assert(
        fc.property(pageArb, (page) => {
          const match = page.content.match(
            /iframe\.src\s*=\s*["']([^"']+)["']/i,
          );

          if (match) {
            const expectedUrl = match[1].trim();
            const extractedUrl = extractIframeSrc(page.content);

            expect(extractedUrl).toBe(expectedUrl);
          }
        }),
        { numRuns: Math.min(100, staticGamePages.length) },
      );
    });

    it('should extract complete game data from static pages', () => {
      if (staticGamePages.length === 0) {
        console.warn('⚠️ SKIPPED: No static game pages found');
        return;
      }

      const pageArb = fc.constantFrom(...staticGamePages);

      fc.assert(
        fc.property(pageArb, (page) => {
          const gameData = extractGameDataFromContent(page.content, page.path);

          expect(gameData.slug).toBe(page.slug);
          expect(typeof gameData.title).toBe('string');
          expect(typeof gameData.description).toBe('string');
          expect(Array.isArray(gameData.tags)).toBe(true);

          const hasIframeSrcAssignment =
            /iframe\.src\s*=\s*["']([^"']+)["']/i.test(page.content);
          if (hasIframeSrcAssignment) {
            expect(gameData.iframeSrc).toBeTruthy();
          }
        }),
        { numRuns: Math.min(100, staticGamePages.length) },
      );
    });

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
            expect(markdown).toContain('iframeSrc:');
            expect(markdown).toContain(gameData.iframeSrc);
          }
        }),
        { numRuns: Math.min(100, staticGamePages.length) },
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

      // 基本结构
      expect(markdown).toContain('---');

      // 解析 frontmatter 并验证字段值
      const parsed = matter(markdown);
      expect(parsed.data.title).toBe('Test Game');
      expect(parsed.data.description).toBe('A test game');
      expect(parsed.data.iframeSrc).toBe('https://example.com/game');
      expect(parsed.data.thumbnail).toBe('/test.png');
      expect(parsed.data.urlstr).toBe('test-game');
      expect(parsed.data.tags).toEqual(['game', 'test']);

      // 内容部分保留结构
      expect(parsed.content).toContain('### About');
      expect(parsed.content).toContain('Test content');
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
      const parsed = matter(markdown);

      expect(parsed.data.score).toBe('4.5/5 (100 votes)');
    });
  });
});
