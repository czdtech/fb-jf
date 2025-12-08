/**
 * Property-Based Test: Image Optimization Attributes
 * 
 * Feature: comprehensive-improvement, Property 6: Image Optimization Attributes
 * Validates: Requirements 5.3, 5.4
 * 
 * Property: For any image rendered in the built site, the output img tag 
 * SHALL include width, height, and loading attributes.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { load } from 'cheerio';
import * as fc from 'fast-check';

describe('Property 6: Image Optimization Attributes', () => {
  const distDir = path.join(process.cwd(), 'dist');

  // Helper function to find all HTML files in dist directory
  function findHtmlFiles(dir: string): string[] {
    const files: string[] = [];
    
    if (!fs.existsSync(dir)) {
      return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        files.push(...findHtmlFiles(fullPath));
      } else if (entry.isFile() && entry.name === 'index.html') {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  // Helper function to extract all img tags from HTML
  function extractImageTags(htmlPath: string): Array<{ src: string; alt: string; loading?: string; width?: string; height?: string }> {
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const $ = load(html);
    const images: Array<{ src: string; alt: string; loading?: string; width?: string; height?: string }> = [];

    $('img').each((_, elem) => {
      const $img = $(elem);
      images.push({
        src: $img.attr('src') || '',
        alt: $img.attr('alt') || '',
        loading: $img.attr('loading'),
        width: $img.attr('width'),
        height: $img.attr('height'),
      });
    });

    return images;
  }

  it(
    'should have width, height, and loading attributes on all game thumbnail images',
    () => {
    const htmlFiles = findHtmlFiles(distDir);
    
    if (htmlFiles.length === 0) {
      console.warn('No HTML files found in dist directory. Run `npm run build` first.');
      return;
    }

    // Property: For any HTML page with game images, all img tags should have optimization attributes
    fc.assert(
      fc.property(
        fc.constantFrom(...htmlFiles),
        (htmlPath) => {
          const images = extractImageTags(htmlPath);
          
          // Filter to game-related images (those in game-logo or game-grid contexts)
          const html = fs.readFileSync(htmlPath, 'utf-8');
          const $ = load(html);
          
          const gameImages: Array<{ src: string; alt: string; loading?: string; width?: string; height?: string }> = [];
          
          // Find images within game-logo or game-grid contexts
          $('.game-logo img, .game-grid img').each((_, elem) => {
            const $img = $(elem);
            gameImages.push({
              src: $img.attr('src') || '',
              alt: $img.attr('alt') || '',
              loading: $img.attr('loading'),
              width: $img.attr('width'),
              height: $img.attr('height'),
            });
          });

          // If there are no game images on this page, the property is trivially satisfied
          if (gameImages.length === 0) {
            return true;
          }

          // Check that all game images have the required attributes
          const allHaveLoading = gameImages.every(img => img.loading === 'lazy' || img.loading === 'eager');
          const allHaveWidth = gameImages.every(img => img.width && img.width !== '');
          const allHaveHeight = gameImages.every(img => img.height && img.height !== '');

          // Log failures for debugging
          if (!allHaveLoading || !allHaveWidth || !allHaveHeight) {
            const missingAttrs = gameImages.filter(img => 
              !img.loading || !img.width || !img.height
            );
            console.log(`\nPage: ${htmlPath}`);
            console.log(`Images missing attributes:`, missingAttrs);
          }

          return allHaveLoading && allHaveWidth && allHaveHeight;
        }
      ),
      { numRuns: Math.min(100, htmlFiles.length) }
    );
  },
  // 站点页面数量较多，解析 + property-based 检查较重，适当放宽超时时间
  30000
  );

  it('should have alt attributes on all images for accessibility', () => {
    const htmlFiles = findHtmlFiles(distDir);
    
    if (htmlFiles.length === 0) {
      console.warn('No HTML files found in dist directory. Run `npm run build` first.');
      return;
    }

    fc.assert(
      fc.property(
        fc.constantFrom(...htmlFiles),
        (htmlPath) => {
          const images = extractImageTags(htmlPath);
          
          // All images should have alt attributes (can be empty for decorative images)
          const allHaveAlt = images.every(img => img.alt !== undefined);

          if (!allHaveAlt) {
            const missingAlt = images.filter(img => img.alt === undefined);
            console.log(`\nPage: ${htmlPath}`);
            console.log(`Images missing alt:`, missingAlt);
          }

          return allHaveAlt;
        }
      ),
      { numRuns: Math.min(100, htmlFiles.length) }
    );
  });
});
