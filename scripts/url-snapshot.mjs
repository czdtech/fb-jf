#!/usr/bin/env node
/**
 * URL List Snapshot Script
 * 
 * Records all generated URLs from the build output for comparison.
 * 
 * Usage:
 *   node scripts/url-snapshot.mjs              # Writes to url-baseline.json (default)
 *   node scripts/url-snapshot.mjs --after      # Writes to url-after-refactor.json
 *   node scripts/url-snapshot.mjs --output=custom.json  # Writes to custom file
 * 
 * Requirements: 1.5
 */

import { readdir, writeFile, stat, mkdir } from 'fs/promises';
import { join, relative } from 'path';

const DIST_DIR = 'dist';
const SNAPSHOTS_DIR = 'scripts/snapshots';
const BASELINE_FILE = 'url-baseline.json';
const AFTER_FILE = 'url-after-refactor.json';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let outputFile = join(SNAPSHOTS_DIR, BASELINE_FILE);
  
  for (const arg of args) {
    if (arg === '--after') {
      outputFile = join(SNAPSHOTS_DIR, AFTER_FILE);
    } else if (arg.startsWith('--output=')) {
      outputFile = arg.slice('--output='.length);
    }
  }
  
  return { outputFile };
}

/**
 * Recursively find all HTML files in a directory
 */
async function findHtmlFiles(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await findHtmlFiles(fullPath, files);
    } else if (entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Convert file path to URL path (cross-platform)
 */
function filePathToUrlPath(filePath, distDir) {
  let urlPath = relative(distDir, filePath);
  urlPath = urlPath.replace(/\\/g, '/');
  
  if (urlPath.endsWith('/index.html')) {
    urlPath = urlPath.slice(0, -11) + '/';
  } else if (urlPath === 'index.html') {
    urlPath = '/';
  } else {
    urlPath = '/' + urlPath;
  }
  
  if (!urlPath.startsWith('/')) {
    urlPath = '/' + urlPath;
  }
  
  return urlPath;
}

async function main() {
  const { outputFile } = parseArgs();
  
  console.log('🔗 URL List Snapshot Script');
  console.log('='.repeat(50));
  console.log(`📝 Output file: ${outputFile}`);
  
  // Check if dist directory exists
  try {
    await stat(DIST_DIR);
  } catch (e) {
    console.error(`❌ Error: ${DIST_DIR} directory not found.`);
    console.error('   Please run "npm run build" first.');
    process.exit(1);
  }
  
  console.log(`📂 Scanning ${DIST_DIR} for HTML files...`);
  
  const htmlFiles = await findHtmlFiles(DIST_DIR);
  console.log(`📄 Found ${htmlFiles.length} HTML files`);
  
  // Convert to URL paths
  const urls = htmlFiles
    .map(f => filePathToUrlPath(f, DIST_DIR))
    .sort();
  
  // Create snapshots directory if it doesn't exist
  try {
    await stat(SNAPSHOTS_DIR);
  } catch (e) {
    await mkdir(SNAPSHOTS_DIR, { recursive: true });
  }
  
  const output = {
    totalUrls: urls.length,
    urls: urls,
  };
  
  await writeFile(outputFile, JSON.stringify(output, null, 2));
  console.log(`💾 Saved URL list to ${outputFile}`);
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Total URLs: ${urls.length}`);
  
  // Count by path prefix
  const byPrefix = {};
  urls.forEach(url => {
    const parts = url.split('/').filter(Boolean);
    const prefix = parts.length > 0 ? '/' + parts[0] + '/' : '/';
    byPrefix[prefix] = (byPrefix[prefix] || 0) + 1;
  });
  
  console.log('   URLs by prefix (top 10):');
  Object.entries(byPrefix)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([prefix, count]) => {
      console.log(`     ${prefix}: ${count}`);
    });
}

main().catch(console.error);
