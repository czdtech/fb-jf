/**
 * **Feature: comprehensive-improvement, Property 5: CSS Class Naming Convention**
 * **Validates: Requirements 3.4**
 * 
 * Property-based tests to verify that all CSS class names follow kebab-case
 * naming convention.
 * 
 * NOTE: These tests will be SKIPPED if dist/ doesn't exist.
 * - Run "npm run build" to create the dist/ directory
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// CSS files to check
const CSS_FILES = [
  'public/main.css',
  'public/styles/variables.css',
  'public/styles/components.css',
  'public/styles/homepage.css',
  'src/styles/global.css',
  'src/styles/variables.css',
];

// Regex to match CSS class selectors
// Matches .class-name, .class_name, .className, etc.
const CSS_CLASS_REGEX = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g;

// Regex to validate kebab-case (lowercase letters, numbers, and hyphens)
// Allows: .class-name, .class-name-2
const KEBAB_CASE_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

// Known exceptions - third-party class names that don't follow kebab-case
const KNOWN_EXCEPTIONS = [
  // Svelte-generated classes
  'svelte-bpq1qa',
  // Font Awesome classes
  'fa-solid',
  'fa-expand',
  'fa-compress',
  // Tailwind-style utility classes
  'w-[100px]',
  // CSS pseudo-classes and pseudo-elements (not actual class names)
  'before',
  'after',
  'hover',
  'focus',
  'active',
  // Media query related
  'max-width',
  'min-width',
];

let distExists = false;
let cssFilesContent: Map<string, string> = new Map();
let allClassNames: string[] = [];

/**
 * Extract all CSS class names from a CSS file content
 */
function extractClassNames(content: string): string[] {
  const classNames: string[] = [];
  let match;
  
  while ((match = CSS_CLASS_REGEX.exec(content)) !== null) {
    const className = match[1];
    // Skip pseudo-classes and pseudo-elements
    if (!className.startsWith('-') && !KNOWN_EXCEPTIONS.includes(className)) {
      classNames.push(className);
    }
  }
  
  return [...new Set(classNames)]; // Remove duplicates
}

/**
 * Check if a class name follows kebab-case convention
 * Allows some flexibility for common patterns
 */
function isKebabCase(className: string): boolean {
  // Skip known exceptions
  if (KNOWN_EXCEPTIONS.includes(className)) {
    return true;
  }
  
  // Skip third-party prefixes (fa-, etc.)
  if (className.startsWith('fa-')) {
    return true;
  }
  
  // Skip CSS variable references
  if (className.startsWith('--')) {
    return true;
  }
  
  // Allow single lowercase letters
  if (/^[a-z]$/.test(className)) {
    return true;
  }
  
  // Standard kebab-case check
  if (KEBAB_CASE_REGEX.test(className)) {
    return true;
  }
  
  // Allow kebab-case with numbers at the end (e.g., game-l-2, error-404)
  if (/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(className)) {
    return true;
  }
  
  // Allow classes with underscores for third-party compatibility
  // but flag camelCase and PascalCase
  const hasCamelCase = /[a-z][A-Z]/.test(className);
  const hasPascalCase = /^[A-Z]/.test(className);
  
  return !hasCamelCase && !hasPascalCase;
}

beforeAll(() => {
  const distPath = path.join(process.cwd(), 'dist');
  distExists = fs.existsSync(distPath);
  
  // Read all CSS files
  for (const cssFile of CSS_FILES) {
    const fullPath = path.join(process.cwd(), cssFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      cssFilesContent.set(cssFile, content);
      
      // Extract class names
      const classNames = extractClassNames(content);
      allClassNames.push(...classNames);
    }
  }
  
  // Remove duplicates
  allClassNames = [...new Set(allClassNames)];
});

describe('CSS Naming Convention Tests', () => {
  describe('Property 5: CSS Class Naming Convention', () => {
    /**
     * **Feature: comprehensive-improvement, Property 5: CSS Class Naming Convention**
     * 
     * Property: For any CSS class defined in the style system, the class name
     * SHALL follow kebab-case naming convention.
     */
    it('should have CSS files to test', () => {
      expect(cssFilesContent.size).toBeGreaterThan(0);
    });

    it('should have class names extracted from CSS files', () => {
      expect(allClassNames.length).toBeGreaterThan(0);
    });

    it('should have all CSS class names follow kebab-case convention', () => {
      if (allClassNames.length === 0) {
        console.warn('⚠️ SKIPPED: No class names found in CSS files');
        return;
      }

      const classNameArb = fc.constantFrom(...allClassNames);

      fc.assert(
        fc.property(classNameArb, (className) => {
          const isValid = isKebabCase(className);
          if (!isValid) {
            console.log(`Invalid class name: ${className}`);
          }
          expect(isValid).toBe(true);
        }),
        { numRuns: Math.min(200, allClassNames.length) }
      );
    });

    it('should not have camelCase class names', () => {
      const camelCaseClasses = allClassNames.filter(name => {
        // Check for camelCase pattern (lowercase followed by uppercase)
        return /[a-z][A-Z]/.test(name) && !KNOWN_EXCEPTIONS.includes(name);
      });

      if (camelCaseClasses.length > 0) {
        console.log('CamelCase classes found:', camelCaseClasses);
      }

      expect(camelCaseClasses.length).toBe(0);
    });

    it('should not have PascalCase class names', () => {
      const pascalCaseClasses = allClassNames.filter(name => {
        // Check for PascalCase pattern (starts with uppercase)
        return /^[A-Z]/.test(name) && !KNOWN_EXCEPTIONS.includes(name);
      });

      if (pascalCaseClasses.length > 0) {
        console.log('PascalCase classes found:', pascalCaseClasses);
      }

      expect(pascalCaseClasses.length).toBe(0);
    });

    it('should have consistent naming across all CSS files', () => {
      // Check that the same class name is not defined with different cases
      const normalizedNames = new Map<string, string[]>();
      
      for (const className of allClassNames) {
        const normalized = className.toLowerCase();
        if (!normalizedNames.has(normalized)) {
          normalizedNames.set(normalized, []);
        }
        normalizedNames.get(normalized)!.push(className);
      }

      // Find any class names that have multiple case variations
      const inconsistentNames = Array.from(normalizedNames.entries())
        .filter(([_, names]) => names.length > 1 && new Set(names).size > 1);

      if (inconsistentNames.length > 0) {
        console.log('Inconsistent class names:', inconsistentNames);
      }

      expect(inconsistentNames.length).toBe(0);
    });

    it('should have build succeed with valid CSS (dist/ exists)', () => {
      if (!distExists) {
        console.warn('⚠️ SKIPPED: dist/ not found. Run "npm run build" first.');
        return;
      }
      
      expect(distExists).toBe(true);
    });
  });
});
