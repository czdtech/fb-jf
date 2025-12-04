#!/usr/bin/env node
/**
 * Sitemap Snapshot Script
 * 
 * Saves the sitemap content as a baseline for comparison.
 * 
 * Usage:
 *   node scripts/sitemap-snapshot.mjs              # Writes to sitemap-baseline.* (default)
 *   node scripts/sitemap-snapshot.mjs --after      # Writes to sitemap-after-refactor.*
 * 
 * Requirements: 8.5
 */

import { readFile, writeFile, stat, mkdir } from 'fs/promises';
import { join } from 'path';

const DIST_SITEMAP_PATH = 'dist/sitemap-index.xml';
const DIST_SITEMAP_SINGLE = 'dist/sitemap-0.xml';
const PUBLIC_SITEMAP_PATH = 'public/sitemap.xml';
const SNAPSHOTS_DIR = 'scripts/snapshots';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const isAfter = args.includes('--after');
  
  const prefix = isAfter ? 'sitemap-after-refactor' : 'sitemap-baseline';
  
  return {
    outputXml: join(SNAPSHOTS_DIR, `${prefix}.xml`),
    outputJson: join(SNAPSHOTS_DIR, `${prefix}.json`),
  };
}

/**
 * Parse sitemap XML and extract URLs
 */
function parseSitemap(xml) {
  const urls = [];
  const urlRegex = /<url>([\s\S]*?)<\/url>/g;
  const locRegex = /<loc>([^<]*)<\/loc>/;
  const lastmodRegex = /<lastmod>([^<]*)<\/lastmod>/;
  const changefreqRegex = /<changefreq>([^<]*)<\/changefreq>/;
  const priorityRegex = /<priority>([^<]*)<\/priority>/;
  
  let match;
  while ((match = urlRegex.exec(xml)) !== null) {
    const urlBlock = match[1];
    
    const locMatch = urlBlock.match(locRegex);
    const lastmodMatch = urlBlock.match(lastmodRegex);
    const changefreqMatch = urlBlock.match(changefreqRegex);
    const priorityMatch = urlBlock.match(priorityRegex);
    
    if (locMatch) {
      urls.push({
        loc: locMatch[1],
        lastmod: lastmodMatch ? lastmodMatch[1] : null,
        changefreq: changefreqMatch ? changefreqMatch[1] : null,
        priority: priorityMatch ? priorityMatch[1] : null,
      });
    }
  }
  
  return urls;
}

/**
 * Find the sitemap file - checks dist/ first, then public/
 */
async function findSitemapPath() {
  try {
    await stat(DIST_SITEMAP_PATH);
    return { path: DIST_SITEMAP_PATH, isIndex: true };
  } catch (e) {}
  
  try {
    await stat(DIST_SITEMAP_SINGLE);
    return { path: DIST_SITEMAP_SINGLE, isIndex: false };
  } catch (e) {}
  
  try {
    await stat('dist/sitemap.xml');
    return { path: 'dist/sitemap.xml', isIndex: false };
  } catch (e) {}
  
  try {
    await stat(PUBLIC_SITEMAP_PATH);
    return { path: PUBLIC_SITEMAP_PATH, isIndex: false };
  } catch (e) {}
  
  return null;
}

async function main() {
  const { outputXml, outputJson } = parseArgs();
  
  console.log('🗺️  Sitemap Snapshot Script');
  console.log('='.repeat(50));
  console.log(`📝 Output XML: ${outputXml}`);
  console.log(`📝 Output JSON: ${outputJson}`);
  
  const sitemapInfo = await findSitemapPath();
  
  if (!sitemapInfo) {
    console.error('❌ Error: No sitemap found in dist/ or public/');
    console.error('   Run "npm run build" first if using @astrojs/sitemap integration.');
    process.exit(1);
  }
  
  console.log(`📂 Reading ${sitemapInfo.path}...`);
  
  let sitemapContent = await readFile(sitemapInfo.path, 'utf-8');
  
  // If it's a sitemap index, read the actual sitemap files
  if (sitemapInfo.isIndex) {
    console.log('   Found sitemap index, reading referenced sitemaps...');
    const sitemapLocs = [];
    const locRegex = /<loc>([^<]*)<\/loc>/g;
    let match;
    while ((match = locRegex.exec(sitemapContent)) !== null) {
      sitemapLocs.push(match[1]);
    }
    
    let combinedContent = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    for (const loc of sitemapLocs) {
      const filename = loc.split('/').pop();
      const localPath = `dist/${filename}`;
      try {
        const content = await readFile(localPath, 'utf-8');
        const urlRegex = /<url>[\s\S]*?<\/url>/g;
        let urlMatch;
        while ((urlMatch = urlRegex.exec(content)) !== null) {
          combinedContent += urlMatch[0] + '\n';
        }
      } catch (e) {
        console.warn(`   Warning: Could not read ${localPath}`);
      }
    }
    combinedContent += '</urlset>';
    sitemapContent = combinedContent;
  }
  
  // Create snapshots directory if it doesn't exist
  try {
    await stat(SNAPSHOTS_DIR);
  } catch (e) {
    await mkdir(SNAPSHOTS_DIR, { recursive: true });
  }
  
  // Save raw XML
  await writeFile(outputXml, sitemapContent);
  console.log(`💾 Saved raw sitemap to ${outputXml}`);
  
  // Parse and save as JSON
  const urls = parseSitemap(sitemapContent);
  
  const output = {
    totalUrls: urls.length,
    urls: urls.sort((a, b) => a.loc.localeCompare(b.loc)),
  };
  
  await writeFile(outputJson, JSON.stringify(output, null, 2));
  console.log(`💾 Saved parsed sitemap to ${outputJson}`);
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Total URLs in sitemap: ${urls.length}`);
}

main().catch(console.error);
