#!/usr/bin/env node
/**
 * SEO Comparison Script
 * 
 * Compares baseline vs after-refactor SEO snapshots to verify SEO elements are unchanged.
 * 
 * Usage:
 *   npm run compare:seo                    # Compare baseline vs after-refactor
 *   node scripts/seo-compare.mjs --baseline=file1.json --after=file2.json  # Custom files
 * 
 * Requirements: 1.1, 1.2, 1.3, 8.1, 8.2, 8.3, 8.4
 */

import { readFile, stat } from 'fs/promises';

const DEFAULT_BASELINE = 'scripts/snapshots/seo-baseline.json';
const DEFAULT_AFTER = 'scripts/snapshots/seo-after-refactor.json';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let baselineFile = DEFAULT_BASELINE;
  let afterFile = DEFAULT_AFTER;
  
  for (const arg of args) {
    if (arg.startsWith('--baseline=')) {
      baselineFile = arg.slice('--baseline='.length);
    } else if (arg.startsWith('--after=')) {
      afterFile = arg.slice('--after='.length);
    }
  }
  
  return { baselineFile, afterFile };
}

/**
 * Deep compare two objects
 */
function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return a === b;
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => deepEqual(a[key], b[key]));
}

/**
 * Compare SEO elements for a single page
 */
function comparePage(url, before, after) {
  const differences = [];
  
  const fields = ['title', 'description', 'canonical', 'robots', 'keywords'];
  
  for (const field of fields) {
    if (before[field] !== after[field]) {
      differences.push({
        field,
        before: before[field],
        after: after[field]
      });
    }
  }
  
  // Compare OG tags
  if (!deepEqual(before.og, after.og)) {
    differences.push({
      field: 'og',
      before: before.og,
      after: after.og
    });
  }
  
  // Compare Twitter tags
  if (!deepEqual(before.twitter, after.twitter)) {
    differences.push({
      field: 'twitter',
      before: before.twitter,
      after: after.twitter
    });
  }
  
  // Compare JSON-LD
  if (!deepEqual(before.jsonLd, after.jsonLd)) {
    differences.push({
      field: 'jsonLd',
      before: before.jsonLd,
      after: after.jsonLd
    });
  }
  
  // Compare hreflang
  if (!deepEqual(before.hreflang, after.hreflang)) {
    differences.push({
      field: 'hreflang',
      before: before.hreflang,
      after: after.hreflang
    });
  }
  
  return differences;
}

/**
 * Check if a file exists
 */
async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  const { baselineFile, afterFile } = parseArgs();
  
  console.log('🔍 SEO Comparison Script');
  console.log('='.repeat(50));
  console.log(`📂 Baseline: ${baselineFile}`);
  console.log(`📂 After:    ${afterFile}`);
  console.log('');
  
  // Check if files exist
  if (!await fileExists(baselineFile)) {
    console.error(`❌ Error: Baseline file not found: ${baselineFile}`);
    console.error('   Run "npm run baseline" to create the baseline snapshot first.');
    process.exit(1);
  }
  
  if (!await fileExists(afterFile)) {
    console.error(`❌ Error: After-refactor file not found: ${afterFile}`);
    console.error('   Run "npm run snapshot:after" to create the after-refactor snapshot.');
    process.exit(1);
  }
  
  // Load snapshots
  const beforeData = JSON.parse(await readFile(baselineFile, 'utf-8'));
  const afterData = JSON.parse(await readFile(afterFile, 'utf-8'));
  
  console.log(`📊 Baseline: ${beforeData.totalPages} pages`);
  console.log(`📊 After:    ${afterData.totalPages} pages`);
  
  // Check for missing/new pages
  const beforeUrls = new Set(Object.keys(beforeData.pages));
  const afterUrls = new Set(Object.keys(afterData.pages));
  
  const missingPages = [...beforeUrls].filter(url => !afterUrls.has(url));
  const newPages = [...afterUrls].filter(url => !beforeUrls.has(url));
  
  if (missingPages.length > 0) {
    console.log(`\n❌ Missing pages (${missingPages.length}):`);
    missingPages.slice(0, 10).forEach(url => console.log(`   - ${url}`));
    if (missingPages.length > 10) {
      console.log(`   ... and ${missingPages.length - 10} more`);
    }
  }
  
  if (newPages.length > 0) {
    console.log(`\n⚠️ New pages (${newPages.length}):`);
    newPages.slice(0, 10).forEach(url => console.log(`   + ${url}`));
    if (newPages.length > 10) {
      console.log(`   ... and ${newPages.length - 10} more`);
    }
  }
  
  // Compare common pages
  const commonUrls = [...beforeUrls].filter(url => afterUrls.has(url));
  console.log(`\n🔄 Comparing ${commonUrls.length} common pages...`);
  
  const pagesWithDifferences = [];
  
  for (const url of commonUrls) {
    const differences = comparePage(url, beforeData.pages[url], afterData.pages[url]);
    if (differences.length > 0) {
      pagesWithDifferences.push({ url, differences });
    }
  }
  
  // Report results
  console.log('\n' + '='.repeat(50));
  console.log('📋 Results:');
  
  if (pagesWithDifferences.length === 0 && missingPages.length === 0 && newPages.length === 0) {
    console.log('✅ All SEO elements are identical!');
    process.exit(0);
  }
  
  if (pagesWithDifferences.length > 0) {
    console.log(`\n❌ Pages with SEO differences: ${pagesWithDifferences.length}`);
    
    pagesWithDifferences.slice(0, 5).forEach(({ url, differences }) => {
      console.log(`\n   📄 ${url}`);
      differences.forEach(diff => {
        console.log(`      ${diff.field}:`);
        console.log(`        Before: ${JSON.stringify(diff.before)}`);
        console.log(`        After:  ${JSON.stringify(diff.after)}`);
      });
    });
    
    if (pagesWithDifferences.length > 5) {
      console.log(`\n   ... and ${pagesWithDifferences.length - 5} more pages with differences`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`   Total pages compared: ${commonUrls.length}`);
  console.log(`   Pages with differences: ${pagesWithDifferences.length}`);
  console.log(`   Missing pages: ${missingPages.length}`);
  console.log(`   New pages: ${newPages.length}`);
  
  if (pagesWithDifferences.length > 0 || missingPages.length > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
