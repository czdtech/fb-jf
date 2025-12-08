#!/usr/bin/env node
/**
 * Static Game Pages Analysis Script
 * 
 * Analyzes all static game pages in src/pages/ that need migration to Content Collection.
 * Extracts key information: title, description, iframeSrc, thumbnail.
 * 
 * Usage:
 *   node scripts/analyze-static-pages.mjs
 * 
 * Requirements: 1.1
 */

import { readdir, readFile, writeFile, stat, mkdir } from 'fs/promises';
import { join, basename } from 'path';

const PAGES_DIR = 'src/pages';
const SNAPSHOTS_DIR = 'scripts/snapshots';
const OUTPUT_FILE = 'static-pages-baseline.json';

// Files that are NOT game pages (components, special pages, etc.)
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

// Directories to skip (they contain dynamic routes or language variants)
const EXCLUDED_DIRS = [
  'c',
  'de',
  'es',
  'fr',
  'ja',
  'ko',
  'zh',
  'games',
  'update-games',
  'fiddlebops-mod',
  'incredibox-mod',
  'sprunki-mod',
];

/**
 * Extract title from HTML content
 */
function extractTitle(content) {
  const match = content.match(/<title>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract meta description from HTML content
 */
function extractDescription(content) {
  const match = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
                content.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract iframe src from the loadIframe function
 */
function extractIframeSrc(content) {
  // Look for iframe.src = "..." pattern in the script
  const match = content.match(/iframe\.src\s*=\s*["']([^"']+)["']/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract thumbnail from og:image or background-image
 */
function extractThumbnail(content) {
  // Try og:image first
  let match = content.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
              content.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  
  if (match) {
    // Extract just the filename from the full URL
    const url = match[1];
    const filename = url.split('/').pop();
    return filename;
  }
  
  // Try background-image in style
  match = content.match(/background-image:[^;]*url\(([^)]+)\)/i);
  if (match) {
    return match[1].replace(/['"]/g, '').trim();
  }
  
  return null;
}

/**
 * Extract canonical URL
 */
function extractCanonical(content) {
  const match = content.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i) ||
                content.match(/<link\s+href=["']([^"']+)["']\s+rel=["']canonical["']/i);
  return match ? match[1].trim() : null;
}

/**
 * Analyze a single .astro file
 */
async function analyzeFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const filename = basename(filePath);
  const slug = filename.replace('.astro', '');
  
  return {
    filename,
    slug,
    title: extractTitle(content),
    description: extractDescription(content),
    iframeSrc: extractIframeSrc(content),
    thumbnail: extractThumbnail(content),
    canonical: extractCanonical(content),
  };
}

/**
 * Main function
 */
async function main() {
  console.log('📊 Static Game Pages Analysis');
  console.log('='.repeat(50));
  
  // Get all .astro files in src/pages
  const entries = await readdir(PAGES_DIR, { withFileTypes: true });
  
  const gamePages = [];
  const componentPages = [];
  const skippedFiles = [];
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.includes(entry.name)) {
        skippedFiles.push({ name: entry.name, reason: 'excluded directory' });
      }
      continue;
    }
    
    if (!entry.name.endsWith('.astro')) {
      continue;
    }
    
    if (EXCLUDED_FILES.includes(entry.name)) {
      // Categorize excluded files
      if (['header.astro', 'nav.astro', 'common.astro', 'popular-games.astro', 
           'new-games.astro', 'trending-games.astro', 'index-trending-games.astro',
           'categories.astro'].includes(entry.name)) {
        componentPages.push(entry.name);
      } else {
        skippedFiles.push({ name: entry.name, reason: 'special page or dynamic route' });
      }
      continue;
    }
    
    const filePath = join(PAGES_DIR, entry.name);
    const pageData = await analyzeFile(filePath);
    gamePages.push(pageData);
  }
  
  // Sort by slug
  gamePages.sort((a, b) => a.slug.localeCompare(b.slug));
  
  // Categorize by series
  const series = {
    sprunki: gamePages.filter(p => p.slug.startsWith('sprunki-') || p.slug === 'sprunkgerny' || 
                                    p.slug.includes('sprunki') || p.slug === 'sprunkle-bops' ||
                                    p.slug === 'sprunkr-but-sprunki'),
    fiddlebops: gamePages.filter(p => p.slug.startsWith('fiddlebops-')),
    incredibox: gamePages.filter(p => p.slug.startsWith('incredibox-') || p.slug === 'incredibox'),
    other: gamePages.filter(p => 
      !p.slug.startsWith('sprunki-') && !p.slug.startsWith('fiddlebops-') && 
      !p.slug.startsWith('incredibox-') && p.slug !== 'incredibox' &&
      !p.slug.includes('sprunki') && p.slug !== 'sprunkgerny' && 
      p.slug !== 'sprunkle-bops' && p.slug !== 'sprunkr-but-sprunki'
    ),
  };
  
  // Create output
  const output = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalGamePages: gamePages.length,
      componentPages: componentPages.length,
      byCategory: {
        sprunki: series.sprunki.length,
        fiddlebops: series.fiddlebops.length,
        incredibox: series.incredibox.length,
        other: series.other.length,
      },
    },
    componentPages,
    gamePages,
    byCategory: series,
  };
  
  // Ensure snapshots directory exists
  try {
    await stat(SNAPSHOTS_DIR);
  } catch (e) {
    await mkdir(SNAPSHOTS_DIR, { recursive: true });
  }
  
  // Write output
  const outputPath = join(SNAPSHOTS_DIR, OUTPUT_FILE);
  await writeFile(outputPath, JSON.stringify(output, null, 2));
  
  // Print summary
  console.log('\n📋 Summary:');
  console.log(`   Total static game pages: ${gamePages.length}`);
  console.log(`   Component pages (need migration): ${componentPages.length}`);
  console.log('\n📁 By Category:');
  console.log(`   Sprunki series: ${series.sprunki.length}`);
  console.log(`   Fiddlebops series: ${series.fiddlebops.length}`);
  console.log(`   Incredibox series: ${series.incredibox.length}`);
  console.log(`   Other games: ${series.other.length}`);
  
  console.log('\n🔧 Component pages in src/pages/ (need to move to src/components/):');
  componentPages.forEach(p => console.log(`   - ${p}`));
  
  console.log('\n📄 Sample game pages:');
  gamePages.slice(0, 5).forEach(p => {
    console.log(`   - ${p.slug}`);
    console.log(`     Title: ${p.title?.substring(0, 50)}...`);
    console.log(`     iframeSrc: ${p.iframeSrc || 'NOT FOUND'}`);
    console.log(`     Thumbnail: ${p.thumbnail || 'NOT FOUND'}`);
  });
  
  // Check for issues
  const missingIframe = gamePages.filter(p => !p.iframeSrc);
  const missingThumbnail = gamePages.filter(p => !p.thumbnail);
  
  if (missingIframe.length > 0) {
    console.log(`\n⚠️  Pages missing iframeSrc: ${missingIframe.length}`);
    missingIframe.forEach(p => console.log(`   - ${p.slug}`));
  }
  
  if (missingThumbnail.length > 0) {
    console.log(`\n⚠️  Pages missing thumbnail: ${missingThumbnail.length}`);
    missingThumbnail.slice(0, 5).forEach(p => console.log(`   - ${p.slug}`));
    if (missingThumbnail.length > 5) {
      console.log(`   ... and ${missingThumbnail.length - 5} more`);
    }
  }
  
  console.log(`\n💾 Full report saved to: ${outputPath}`);
}

main().catch(console.error);
