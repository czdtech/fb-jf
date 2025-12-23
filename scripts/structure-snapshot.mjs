#!/usr/bin/env node
/**
 * Structure Snapshot Script
 * 
 * Extracts DOM structure (headings, nav/footer links, main sections) from key routes.
 * Used to verify structure freeze constraints during UI redesign.
 * 
 * Usage:
 *   node scripts/structure-snapshot.mjs              # Writes to structure-baseline.json
 *   node scripts/structure-snapshot.mjs --after      # Writes to structure-after.json
 */

import { readdir, readFile, writeFile, stat, mkdir } from 'fs/promises';
import { join, relative } from 'path';
import * as cheerio from 'cheerio';

const DIST_DIR = 'dist';
const SNAPSHOTS_DIR = 'scripts/snapshots';
const BASELINE_FILE = 'structure-baseline.json';
const AFTER_FILE = 'structure-after.json';

// Key routes to snapshot for structure freeze validation
const KEY_ROUTES = [
  '/',           // English homepage
  '/zh/',        // Chinese homepage
  '/de/',        // German homepage
  '/privacy/',   // Privacy page
  '/terms-of-service/', // Terms page
  '/search/',    // Search page
  '/games/',     // Games list
];

const SUPPORTED_LOCALES = ['zh', 'de', 'es', 'fr', 'ja', 'ko'];
const SAMPLE_GAME_PAGES_COUNT = 3;

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let outputFile = join(SNAPSHOTS_DIR, BASELINE_FILE);
  let isAfter = false;
  
  for (const arg of args) {
    if (arg === '--after') {
      outputFile = join(SNAPSHOTS_DIR, AFTER_FILE);
      isAfter = true;
    } else if (arg.startsWith('--output=')) {
      outputFile = arg.slice('--output='.length);
    }
  }
  
  return { outputFile, isAfter };
}

/**
 * Find HTML file for a given URL path
 */
function urlPathToFilePath(urlPath, distDir) {
  if (urlPath === '/') {
    return join(distDir, 'index.html');
  }
  if (urlPath.endsWith('/')) {
    return join(distDir, urlPath.slice(1), 'index.html');
  }
  return join(distDir, urlPath.slice(1) + '.html');
}

function normalizeText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function extractStructure(html) {
  const $ = cheerio.load(html);

  const $main = $('main').first();
  const $header = $('header').first();
  const $footer = $('footer').first();

  const headings = [];
  $main.find('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tagName = ($(el).prop('tagName') || '').toString().toLowerCase();
    const level = parseInt(tagName.replace('h', ''), 10);
    const text = normalizeText($(el).text()).slice(0, 100);
    if (!Number.isNaN(level)) {
      headings.push({ level, text });
    }
  });

  const mainOutline = [];
  const ignoredMainChildTags = new Set(['script', 'style', 'template']);
  $main.children().each((_, el) => {
    const $el = $(el);
    const tag = ((el.tagName || '').toString() || $el.prop('tagName') || '').toLowerCase();
    if (ignoredMainChildTags.has(tag)) return;
    const id = $el.attr('id') || null;
    const className = $el.attr('class') || null;

    const $firstHeading = $el.find('h1, h2, h3, h4, h5, h6').first();
    let firstHeading = null;
    if ($firstHeading.length > 0) {
      const headingTag = ($firstHeading.prop('tagName') || '').toString().toLowerCase();
      const headingLevel = parseInt(headingTag.replace('h', ''), 10);
      const headingText = normalizeText($firstHeading.text()).slice(0, 100);
      if (!Number.isNaN(headingLevel) && headingText) {
        firstHeading = { level: headingLevel, text: headingText };
      }
    }

    mainOutline.push({
      tag,
      id,
      class: className,
      firstHeading,
    });
  });

  const headerLinks = [];
  $header.find('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!href || href.startsWith('#')) return;
    headerLinks.push({ href, text: normalizeText($(el).text()).slice(0, 50) });
  });

  const footerLinks = [];
  $footer.find('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!href || href.startsWith('#')) return;
    footerLinks.push({ href, text: normalizeText($(el).text()).slice(0, 50) });
  });

  const semantic = {
    hasMain: $('main').length > 0,
    hasNav: $('nav').length > 0,
    hasHeader: $('header').length > 0,
    hasFooter: $('footer').length > 0,
    hasAside: $('aside').length > 0,
    h1Count: $main.find('h1').length,
  };

  return {
    headings,
    mainOutline,
    headerLinks,
    footerLinks,
    semantic,
  };
}

/**
 * Recursively find all HTML files to discover game pages
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
 * Convert file path to URL path
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

async function loadBaselineRoutes() {
  try {
    const baselineContent = await readFile(join(SNAPSHOTS_DIR, BASELINE_FILE), 'utf-8');
    const baseline = JSON.parse(baselineContent);
    if (baseline?.routes && typeof baseline.routes === 'object') {
      return Object.keys(baseline.routes);
    }
  } catch {
    // ignore
  }
  return null;
}

async function main() {
  const { outputFile, isAfter } = parseArgs();
  
  console.log('🏗️  Structure Snapshot Script');
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
  
  // Find all HTML files to discover game pages
  const baselineRoutes = isAfter ? await loadBaselineRoutes() : null;
  let routesToSnapshot = baselineRoutes ? [...baselineRoutes] : [...KEY_ROUTES];

  if (!baselineRoutes) {
    const allHtmlFiles = (await findHtmlFiles(DIST_DIR)).sort();

    // Find sample game pages (not locale, not list pages)
    const gamePagesPattern = /^\/[a-z0-9-]+\/$/;
    const excludePrefixes = [
      ...SUPPORTED_LOCALES.map(l => `/${l}/`),
      '/games/',
      '/c/',
      '/admin/',
      '/search/',
      '/privacy/',
      '/terms-of-service/',
      '/update-games/',
      '/fiddlebops-mod/',
      '/incredibox-mod/',
      '/sprunki-mod/',
    ];

    const rootGamePages = allHtmlFiles
      .map(f => filePathToUrlPath(f, DIST_DIR))
      .filter((url) => {
        if (!gamePagesPattern.test(url)) return false;
        return !excludePrefixes.some(prefix => url.startsWith(prefix));
      })
      .sort()
      .slice(0, SAMPLE_GAME_PAGES_COUNT);

    const localizedGamePages = [];
    for (const gameRoute of rootGamePages) {
      const slug = gameRoute.replace(/^\//, '').replace(/\/$/, '');
      for (const locale of SUPPORTED_LOCALES) {
        localizedGamePages.push(`/${locale}/${slug}/`);
      }
    }

    routesToSnapshot = [...KEY_ROUTES, ...rootGamePages, ...localizedGamePages];
  }

  // Dedupe while preserving order
  const seen = new Set();
  routesToSnapshot = routesToSnapshot.filter((r) => {
    if (seen.has(r)) return false;
    seen.add(r);
    return true;
  });
  
  console.log(`📂 Snapshotting ${routesToSnapshot.length} routes...`);
  
  const structureData = {};
  
  for (const route of routesToSnapshot) {
    const filePath = urlPathToFilePath(route, DIST_DIR);
    
    try {
      const html = await readFile(filePath, 'utf-8');
      structureData[route] = extractStructure(html);
      console.log(`   ✓ ${route}`);
    } catch (e) {
      console.warn(`   ⚠ ${route} - file not found or error`);
    }
  }
  
  // Create snapshots directory if it doesn't exist
  try {
    await stat(SNAPSHOTS_DIR);
  } catch (e) {
    await mkdir(SNAPSHOTS_DIR, { recursive: true });
  }
  
  const output = {
    snapshotTime: new Date().toISOString(),
    totalRoutes: Object.keys(structureData).length,
    routes: structureData,
  };
  
  await writeFile(outputFile, JSON.stringify(output, null, 2));
  console.log(`💾 Saved structure snapshot to ${outputFile}`);
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Routes snapshotted: ${output.totalRoutes}`);
  
  const semanticSummary = { withMain: 0, withNav: 0, singleH1: 0 };
  Object.values(structureData).forEach(s => {
    if (s.semantic.hasMain) semanticSummary.withMain++;
    if (s.semantic.hasNav) semanticSummary.withNav++;
    if (s.semantic.h1Count === 1) semanticSummary.singleH1++;
  });
  
  console.log(`   Pages with <main>: ${semanticSummary.withMain}`);
  console.log(`   Pages with <nav>: ${semanticSummary.withNav}`);
  console.log(`   Pages with single H1: ${semanticSummary.singleH1}`);
}

main().catch(console.error);
