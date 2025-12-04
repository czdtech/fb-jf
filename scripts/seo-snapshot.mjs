#!/usr/bin/env node
/**
 * SEO Snapshot Script
 * 
 * Extracts SEO elements from all built HTML pages and saves them as JSON.
 * 
 * Usage:
 *   node scripts/seo-snapshot.mjs              # Writes to seo-baseline.json (default)
 *   node scripts/seo-snapshot.mjs --after      # Writes to seo-after-refactor.json
 *   node scripts/seo-snapshot.mjs --output=custom.json  # Writes to custom file
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { readdir, readFile, writeFile, stat, mkdir } from 'fs/promises';
import { join, relative } from 'path';

const DIST_DIR = 'dist';
const SNAPSHOTS_DIR = 'scripts/snapshots';
const BASELINE_FILE = 'seo-baseline.json';
const AFTER_FILE = 'seo-after-refactor.json';

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
 * Extract content from a meta tag - handles arbitrary attribute order
 */
function extractMetaContent(html, name, property = false) {
  const attr = property ? 'property' : 'name';
  
  // Try double-quoted content first (most common)
  let regex = new RegExp(
    `<meta\\s+(?:[^>]*?\\s)?${attr}="${name}"(?:\\s[^>]*?)?\\s+content="([^"]*)"` +
    `|<meta\\s+(?:[^>]*?\\s)?content="([^"]*)"(?:\\s[^>]*?)?\\s+${attr}="${name}"`,
    'i'
  );
  let match = html.match(regex);
  if (match) {
    return match[1] || match[2];
  }
  
  // Try single-quoted content
  regex = new RegExp(
    `<meta\\s+(?:[^>]*?\\s)?${attr}='${name}'(?:\\s[^>]*?)?\\s+content='([^']*)'` +
    `|<meta\\s+(?:[^>]*?\\s)?content='([^']*)'(?:\\s[^>]*?)?\\s+${attr}='${name}'`,
    'i'
  );
  match = html.match(regex);
  if (match) {
    return match[1] || match[2];
  }
  
  // Try mixed quotes
  regex = new RegExp(
    `<meta\\s+(?:[^>]*?\\s)?${attr}=["']${name}["'](?:\\s[^>]*?)?\\s+content="([^"]*)"` +
    `|<meta\\s+(?:[^>]*?\\s)?content="([^"]*)"(?:\\s[^>]*?)?\\s+${attr}=["']${name}["']`,
    'i'
  );
  match = html.match(regex);
  if (match) {
    return match[1] || match[2];
  }
  
  return null;
}

/**
 * Extract title from HTML
 */
function extractTitle(html) {
  const match = html.match(/<title>([^<]*)<\/title>/i);
  return match ? match[1] : null;
}

/**
 * Extract canonical URL - handles arbitrary attribute order
 */
function extractCanonical(html) {
  const regex = /<link\s+(?:[^>]*?\s)?rel=["']canonical["'](?:\s[^>]*?)?\s+href=["']([^"']*)["']|<link\s+(?:[^>]*?\s)?href=["']([^"']*)["'](?:\s[^>]*?)?\s+rel=["']canonical["']/i;
  const match = html.match(regex);
  return match ? (match[1] || match[2]) : null;
}

/**
 * Extract JSON-LD structured data
 */
function extractJsonLd(html) {
  const regex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const matches = [];
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    try {
      const jsonContent = match[1].trim();
      if (jsonContent) {
        matches.push(JSON.parse(jsonContent));
      }
    } catch (e) {
      console.warn('Warning: Invalid JSON-LD found');
    }
  }
  
  return matches.length > 0 ? matches : null;
}

/**
 * Extract hreflang links - handles arbitrary attribute order
 */
function extractHreflang(html) {
  const regex = /<link\s+(?:[^>]*?\s)?rel=["']alternate["'][^>]*?hreflang=["']([^"']*)["'][^>]*?href=["']([^"']*)["']|<link\s+(?:[^>]*?\s)?hreflang=["']([^"']*)["'][^>]*?href=["']([^"']*)["'][^>]*?rel=["']alternate["']/gi;
  
  const links = [];
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    const lang = match[1] || match[3];
    const url = match[2] || match[4];
    if (lang && url) {
      links.push({ lang, url });
    }
  }
  
  return links.length > 0 ? links : null;
}

/**
 * Extract all SEO elements from an HTML file
 */
function extractSeoElements(html) {
  return {
    title: extractTitle(html),
    description: extractMetaContent(html, 'description'),
    keywords: extractMetaContent(html, 'keywords'),
    robots: extractMetaContent(html, 'robots'),
    canonical: extractCanonical(html),
    og: {
      title: extractMetaContent(html, 'og:title', true),
      description: extractMetaContent(html, 'og:description', true),
      url: extractMetaContent(html, 'og:url', true),
      siteName: extractMetaContent(html, 'og:site_name', true),
      locale: extractMetaContent(html, 'og:locale', true),
      image: extractMetaContent(html, 'og:image', true),
      type: extractMetaContent(html, 'og:type', true),
    },
    twitter: {
      card: extractMetaContent(html, 'twitter:card'),
      site: extractMetaContent(html, 'twitter:site'),
      title: extractMetaContent(html, 'twitter:title'),
      description: extractMetaContent(html, 'twitter:description'),
      image: extractMetaContent(html, 'twitter:image'),
    },
    jsonLd: extractJsonLd(html),
    hreflang: extractHreflang(html),
  };
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


/**
 * Main function
 */
async function main() {
  const { outputFile } = parseArgs();
  
  console.log('🔍 SEO Snapshot Script');
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
  
  const seoData = {};
  let processedCount = 0;
  
  for (const filePath of htmlFiles) {
    const html = await readFile(filePath, 'utf-8');
    const urlPath = filePathToUrlPath(filePath, DIST_DIR);
    
    seoData[urlPath] = extractSeoElements(html);
    processedCount++;
    
    if (processedCount % 100 === 0) {
      console.log(`   Processed ${processedCount}/${htmlFiles.length} files...`);
    }
  }
  
  console.log(`✅ Processed ${processedCount} files`);
  
  // Create snapshots directory if it doesn't exist
  try {
    await stat(SNAPSHOTS_DIR);
  } catch (e) {
    await mkdir(SNAPSHOTS_DIR, { recursive: true });
  }
  
  // Sort pages by URL for deterministic output
  const sortedPages = {};
  Object.keys(seoData).sort().forEach(key => {
    sortedPages[key] = seoData[key];
  });
  
  const output = {
    totalPages: Object.keys(sortedPages).length,
    pages: sortedPages,
  };
  
  await writeFile(outputFile, JSON.stringify(output, null, 2));
  console.log(`💾 Saved SEO snapshot to ${outputFile}`);
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Total pages: ${output.totalPages}`);
  
  const pagesWithJsonLd = Object.values(seoData).filter(p => p.jsonLd).length;
  const pagesWithCanonical = Object.values(seoData).filter(p => p.canonical).length;
  const pagesWithOg = Object.values(seoData).filter(p => p.og.title).length;
  
  console.log(`   Pages with JSON-LD: ${pagesWithJsonLd}`);
  console.log(`   Pages with canonical: ${pagesWithCanonical}`);
  console.log(`   Pages with OG tags: ${pagesWithOg}`);
}

main().catch(console.error);
