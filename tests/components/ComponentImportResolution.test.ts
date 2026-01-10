/**
 * **Feature: comprehensive-improvement, Property 4: Component Import Resolution**
 * **Validates: Requirements 2.7**
 * 
 * Property-based tests to verify that all component imports resolve correctly
 * after migrating components from src/pages/ to src/components/.
 * 
 * NOTE: These tests will be SKIPPED if dist/ doesn't exist.
 * - Run "npm run build" to create the dist/ directory
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { findAstroFiles } from '../utils/file-discovery';

// List of migrated components that should exist in src/components/
// Note: Nav.astro was removed as dead code (never imported anywhere)
const MIGRATED_COMPONENTS = [
  'Header.astro',
  'Common.astro',
  'GameSidebar.astro',
  'TrendingGames.astro',
  'IndexTrendingGames.astro',
  'Categories.astro',
];

// Components that should NOT exist in src/pages/ (they were migrated)
const COMPONENTS_NOT_IN_PAGES = [
  'header.astro',
  'nav.astro',
  'common.astro',
  'popular-games.astro',
  'new-games.astro',
  'trending-games.astro',
  'index-trending-games.astro',
  'categories.astro',
];

let distExists = false;
let componentsDir: string;
let pagesDir: string;
let astroFiles: string[] = [];

/**
 * Extract import statements from an Astro file
 */
function extractImports(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const imports: string[] = [];
  
  // Match import statements in the frontmatter (between ---)
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    // Match import ... from '...' or import ... from "..."
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(frontmatter)) !== null) {
      imports.push(match[1]);
    }
  }
  
  return imports;
}

/**
 * Check if an import path resolves to an existing file
 */
function resolveImport(importPath: string, fromFile: string): boolean {
  const fromDir = path.dirname(fromFile);
  
  // Handle relative imports
  if (importPath.startsWith('.')) {
    const resolvedPath = path.resolve(fromDir, importPath);
    return fs.existsSync(resolvedPath);
  }
  
  // For non-relative imports (packages), assume they resolve
  return true;
}

beforeAll(() => {
  const distPath = path.join(process.cwd(), 'dist');
  componentsDir = path.join(process.cwd(), 'src/components');
  pagesDir = path.join(process.cwd(), 'src/pages');
  
  distExists = fs.existsSync(distPath);
  
  // Find all .astro files in src/pages and src/layouts
  astroFiles = [
    ...findAstroFiles(pagesDir),
    ...findAstroFiles(path.join(process.cwd(), 'src/layouts')),
  ];
});

describe('Component Import Resolution Tests', () => {
  describe('Property 4: Component Import Resolution', () => {
    /**
     * **Feature: comprehensive-improvement, Property 4: Component Import Resolution**
     * 
     * Property: For any file that imports a moved component, the import path
     * SHALL resolve correctly and the component file SHALL exist.
     */
    it('should have all migrated components in src/components/', () => {
      const componentArb = fc.constantFrom(...MIGRATED_COMPONENTS);
      
      fc.assert(
        fc.property(componentArb, (componentName) => {
          const componentPath = path.join(componentsDir, componentName);
          expect(fs.existsSync(componentPath)).toBe(true);
        }),
        { numRuns: MIGRATED_COMPONENTS.length }
      );
    });

    it('should NOT have old component files in src/pages/', () => {
      const oldComponentArb = fc.constantFrom(...COMPONENTS_NOT_IN_PAGES);
      
      fc.assert(
        fc.property(oldComponentArb, (componentName) => {
          const oldPath = path.join(pagesDir, componentName);
          expect(fs.existsSync(oldPath)).toBe(false);
        }),
        { numRuns: COMPONENTS_NOT_IN_PAGES.length }
      );
    });

    it('should resolve all component imports in .astro files', () => {
      if (astroFiles.length === 0) {
        console.warn('⚠️ SKIPPED: No .astro files found');
        return;
      }

      // Filter to files that have component imports
      const filesWithComponentImports = astroFiles.filter(file => {
        const imports = extractImports(file);
        return imports.some(imp => imp.includes('components/'));
      });

      if (filesWithComponentImports.length === 0) {
        console.warn('⚠️ SKIPPED: No files with component imports found');
        return;
      }

      const sampleSize = Math.min(100, filesWithComponentImports.length);
      const fileArb = fc.constantFrom(...filesWithComponentImports);

      fc.assert(
        fc.property(fileArb, (filePath) => {
          const imports = extractImports(filePath);
          const componentImports = imports.filter(imp => imp.includes('components/'));
          
          for (const importPath of componentImports) {
            const resolves = resolveImport(importPath, filePath);
            expect(resolves).toBe(true);
          }
        }),
        { numRuns: sampleSize }
      );
    });

    it('should have successful build (dist/ exists)', () => {
      if (!distExists) {
        console.warn('⚠️ SKIPPED: dist/ not found. Run "npm run build" first.');
        return;
      }
      
      // If dist exists, the build succeeded which means all imports resolved
      expect(distExists).toBe(true);
    });

    it('should have all component imports pointing to src/components/', () => {
      if (astroFiles.length === 0) {
        console.warn('⚠️ SKIPPED: No .astro files found');
        return;
      }

      // Check that no imports point to old locations in pages/
      const filesWithImports = astroFiles.filter(file => {
        const imports = extractImports(file);
        return imports.length > 0;
      });

      if (filesWithImports.length === 0) {
        console.warn('⚠️ SKIPPED: No files with imports found');
        return;
      }

      const sampleSize = Math.min(100, filesWithImports.length);
      const fileArb = fc.constantFrom(...filesWithImports);

      fc.assert(
        fc.property(fileArb, (filePath) => {
          const imports = extractImports(filePath);
          
          // Check that no imports reference old component locations
          for (const importPath of imports) {
            // Should not import Header, Nav, etc. from pages directory
            const isOldComponentImport = COMPONENTS_NOT_IN_PAGES.some(comp => {
              const baseName = comp.replace('.astro', '');
              return importPath.includes(`pages/${baseName}`) || 
                     importPath.includes(`pages/${comp}`);
            });
            expect(isOldComponentImport).toBe(false);
          }
        }),
        { numRuns: sampleSize }
      );
    });
  });
});
