#!/usr/bin/env node
/**
 * Batch Migration Script for Static Game Pages
 * 
 * Migrates all static game pages from src/pages/ to Content Collection markdown files.
 * 
 * Usage:
 *   node scripts/migrate-all-pages.mjs [options]
 * 
 * Options:
 *   --dry-run          Don't write files, just show what would be done
 *   --filter <pattern> Only process files matching the pattern (glob or regex)
 *   --overwrite        Overwrite existing files in content collection
 *   --verbose          Show detailed output for each file
 *   --output <dir>     Output directory (default: src/content/games)
 * 
 * Requirements: 1.1
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join, basename } from 'path';
import { extractGameDataFromContent } from './parse-static-page.mjs';
import { generateMarkdownFile } from './generate-game-md.mjs';

const PAGES_DIR = 'src/pages';
const DEFAULT_OUTPUT_DIR = 'src/content/games';

// Files that are NOT game pages (components, special pages, etc.)
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
 * Check if a filename matches the filter pattern
 * @param {string} filename - Filename to check
 * @param {string} pattern - Filter pattern (glob-like or regex)
 * @returns {boolean}
 */
function matchesFilter(filename, pattern) {
  if (!pattern) return true;
  
  // Convert glob-like pattern to regex
  // Support: * (any chars), ? (single char)
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars except * and ?
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  
  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(filename);
}

/**
 * Get all static game page files
 * @param {string} filter - Optional filter pattern
 * @returns {Promise<string[]>} Array of file paths
 */
async function getStaticGamePages(filter = null) {
  const entries = await readdir(PAGES_DIR, { withFileTypes: true });
  const gamePages = [];
  
  for (const entry of entries) {
    // Skip directories
    if (entry.isDirectory()) {
      continue;
    }
    
    // Skip non-astro files
    if (!entry.name.endsWith('.astro')) {
      continue;
    }
    
    // Skip excluded files
    if (EXCLUDED_FILES.includes(entry.name)) {
      continue;
    }
    
    // Apply filter if provided
    if (filter && !matchesFilter(entry.name, filter)) {
      continue;
    }
    
    gamePages.push(join(PAGES_DIR, entry.name));
  }
  
  return gamePages.sort();
}

/**
 * Migrate a single page
 * @param {string} filePath - Path to the .astro file
 * @param {string} outputDir - Output directory
 * @param {Object} options - Migration options
 * @returns {Promise<Object>} Migration result
 */
async function migratePage(filePath, outputDir, options = {}) {
  const { dryRun = false, overwrite = false, verbose = false } = options;
  const filename = basename(filePath);
  const slug = filename.replace('.astro', '');
  
  try {
    // Read and parse the file
    const content = await readFile(filePath, 'utf-8');
    const gameData = extractGameDataFromContent(content, filePath);
    
    // Ensure urlstr is set
    if (!gameData.urlstr) {
      gameData.urlstr = slug;
    }
    
    // Validate required fields
    const errors = [];
    if (!gameData.iframeSrc) {
      errors.push('Missing iframeSrc');
    }
    if (!gameData.title || gameData.title === gameData.slug) {
      errors.push('Missing or invalid title');
    }
    
    // Generate markdown file
    const result = await generateMarkdownFile(gameData, outputDir, { dryRun, overwrite });
    
    return {
      source: filePath,
      slug: gameData.slug,
      success: true,
      written: result.written,
      skipped: result.skipped,
      reason: result.reason,
      outputPath: result.path,
      warnings: errors.length > 0 ? errors : undefined,
      data: verbose ? gameData : undefined,
    };
  } catch (error) {
    return {
      source: filePath,
      slug: filename.replace('.astro', ''),
      success: false,
      error: error.message,
    };
  }
}

/**
 * Main migration function
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let dryRun = false;
  let filter = null;
  let overwrite = false;
  let verbose = false;
  let outputDir = DEFAULT_OUTPUT_DIR;
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        dryRun = true;
        break;
      case '--filter':
        filter = args[++i];
        break;
      case '--overwrite':
        overwrite = true;
        break;
      case '--verbose':
        verbose = true;
        break;
      case '--output':
        outputDir = args[++i];
        break;
      case '--help':
        console.log(`
Batch Migration Script for Static Game Pages

Usage:
  node scripts/migrate-all-pages.mjs [options]

Options:
  --dry-run          Don't write files, just show what would be done
  --filter <pattern> Only process files matching the pattern
                     Examples: "sprunki-*", "fiddlebops-*", "*retake*"
  --overwrite        Overwrite existing files in content collection
  --verbose          Show detailed output for each file
  --output <dir>     Output directory (default: src/content/games)
  --help             Show this help message

Examples:
  # Dry run all pages
  node scripts/migrate-all-pages.mjs --dry-run

  # Migrate only Sprunki games
  node scripts/migrate-all-pages.mjs --filter "sprunki-*"

  # Migrate with overwrite
  node scripts/migrate-all-pages.mjs --overwrite

  # Verbose dry run for specific pattern
  node scripts/migrate-all-pages.mjs --dry-run --verbose --filter "*retake*"
`);
        return;
    }
  }
  
  console.log('🚀 Static Game Pages Migration');
  console.log('='.repeat(50));
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Output: ${outputDir}`);
  console.log(`Filter: ${filter || 'none (all files)'}`);
  console.log(`Overwrite: ${overwrite ? 'yes' : 'no'}`);
  console.log('='.repeat(50));
  
  // Get files to migrate
  const files = await getStaticGamePages(filter);
  console.log(`\n📁 Found ${files.length} static game pages to migrate\n`);
  
  if (files.length === 0) {
    console.log('No files to migrate.');
    return;
  }
  
  // Migrate each file
  const results = {
    total: files.length,
    success: 0,
    written: 0,
    skipped: 0,
    failed: 0,
    warnings: 0,
  };
  
  const failures = [];
  const warnings = [];
  
  for (const filePath of files) {
    const result = await migratePage(filePath, outputDir, { dryRun, overwrite, verbose });
    
    if (result.success) {
      results.success++;
      if (result.written) {
        results.written++;
        if (verbose) {
          console.log(`✅ ${result.slug} -> ${result.outputPath}`);
        }
      } else if (result.skipped) {
        results.skipped++;
        if (verbose) {
          console.log(`⏭️  ${result.slug} (skipped: ${result.reason})`);
        }
      } else if (dryRun) {
        results.written++; // Count as would-be-written in dry run
        if (verbose) {
          console.log(`📝 ${result.slug} -> ${result.outputPath} (dry run)`);
        }
      }
      
      if (result.warnings) {
        results.warnings++;
        warnings.push({ slug: result.slug, warnings: result.warnings });
        if (verbose) {
          console.log(`   ⚠️  Warnings: ${result.warnings.join(', ')}`);
        }
      }
    } else {
      results.failed++;
      failures.push({ slug: result.slug, error: result.error });
      console.log(`❌ ${result.slug}: ${result.error}`);
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Migration Summary');
  console.log('='.repeat(50));
  console.log(`Total files:     ${results.total}`);
  console.log(`Successful:      ${results.success}`);
  console.log(`Written:         ${results.written}${dryRun ? ' (would write)' : ''}`);
  console.log(`Skipped:         ${results.skipped}`);
  console.log(`Failed:          ${results.failed}`);
  console.log(`With warnings:   ${results.warnings}`);
  
  if (failures.length > 0) {
    console.log('\n❌ Failed files:');
    failures.forEach(f => console.log(`   - ${f.slug}: ${f.error}`));
  }
  
  if (warnings.length > 0 && !verbose) {
    console.log('\n⚠️  Files with warnings:');
    warnings.forEach(w => console.log(`   - ${w.slug}: ${w.warnings.join(', ')}`));
  }
  
  if (dryRun) {
    console.log('\n💡 This was a dry run. Run without --dry-run to actually migrate files.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
