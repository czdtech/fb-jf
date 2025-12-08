#!/usr/bin/env node
/**
 * Static Game Pages Migration Script
 * 
 * Extracts page configurations from static game pages and generates
 * migrated versions using the GameLayout component.
 * 
 * Requirements: 3.3
 * 
 * Usage:
 *   node scripts/migrate-static-pages.mjs --extract    # Extract configs only
 *   node scripts/migrate-static-pages.mjs --migrate    # Migrate a single page
 *   node scripts/migrate-static-pages.mjs --migrate-all # Migrate all pages
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pagesDir = path.join(__dirname, '../src/pages');
const backupDir = path.join(__dirname, '../src/pages-backup');

// Pages to exclude (not game pages)
const excludePages = [
  '[gameSlug].astro',
  '_[gameSlug].astro.backup',
  '404.astro',
  'categories.astro',
  'common.astro',
  'header.astro',
  'index.astro',
  'index-trending-games.astro',
  'nav.astro',
  'new-games.astro',
  'popular-games.astro',
  'privacy.astro',
  'terms-of-service.astro',
  'trending-games.astro',
];

// Extract all metadata from a page
function extractPageConfig(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  const slug = fileName.replace('.astro', '');
  
  // Extract title
  const titleMatch = content.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1] : '';
  
  // Extract game name from title (remove " - Play X Online" suffix)
  const gameNameMatch = title.match(/^(.+?)\s*[-–]\s*Play/);
  const gameName = gameNameMatch ? gameNameMatch[1].trim() : title;
  
  // Extract description
  const descMatch = content.match(/<meta\s+name="description"\s+content="([^"]+)"/);
  const description = descMatch ? descMatch[1] : '';
  
  // Extract canonical
  const canonicalMatch = content.match(/<link\s+rel="canonical"\s+href="([^"]+)"/);
  const canonical = canonicalMatch ? canonicalMatch[1] : '';
  
  // Extract og:image
  const ogImageMatch = content.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
  const ogImage = ogImageMatch ? ogImageMatch[1] : '';
  
  // Extract keywords
  const keywordsMatch = content.match(/<meta\s+name="keywords"\s+content="([^"]+)"/);
  const keywords = keywordsMatch ? keywordsMatch[1] : '';
  
  // Extract iframe src
  const iframeSrcPatterns = [
    /iframe\.src\s*=\s*["']([^"']+)["']/,
    /iframe\.src\s*=\s*`([^`]+)`/,
  ];
  let iframeSrc = '';
  for (const pattern of iframeSrcPatterns) {
    const match = content.match(pattern);
    if (match) {
      iframeSrc = match[1];
      break;
    }
  }
  
  // Extract background image from CSS
  const bgMatch = content.match(/url\(([^)]+)\)/);
  const backgroundImage = bgMatch ? bgMatch[1].replace(/['"]/g, '') : '';
  
  // Check for fullscreen button
  const hasFullscreen = content.includes('fullscreen-btn') && content.includes('fullscreenBtn');
  
  // Extract score
  const scoreMatch = content.match(/(\d+\.\d+)\/5\s*\((\d+)\s*votes?\)/);
  const score = scoreMatch ? { rating: scoreMatch[1], votes: scoreMatch[2] } : null;
  
  // Extract about section content
  const aboutMatch = content.match(/<section class="about"[^>]*>[\s\S]*?<div class="about-content">([\s\S]*?)<\/div>\s*<\/div>\s*<\/section>/);
  let aboutContent = '';
  if (aboutMatch) {
    aboutContent = aboutMatch[1]
      // Remove the breadcrumb and stars div
      .replace(/<p><a href="[^"]*"[^>]*>home<\/a>[^<]*<\/p>/, '')
      .replace(/<div class="stars">[\s\S]*?<\/div>/, '')
      .trim();
  }
  
  return {
    fileName,
    slug,
    gameName,
    title,
    description,
    canonical,
    ogImage,
    keywords,
    iframeSrc,
    backgroundImage,
    hasFullscreen,
    score,
    aboutContent,
  };
}

// Generate migrated page content
function generateMigratedPage(config) {
  const scoreStr = config.score ? `${config.score.rating}/5  (${config.score.votes} votes)` : '';
  
  // Escape any backticks in aboutContent for template literal
  const escapedAboutContent = config.aboutContent.replace(/`/g, '\\`');
  
  return `---
/**
 * ${config.gameName} - Migrated to GameLayout
 * Original file: ${config.fileName}
 * Migration date: ${new Date().toISOString().split('T')[0]}
 */
import GameLayout from '../layouts/GameLayout.astro';

const gameConfig = {
  title: "${config.gameName}",
  description: \`${config.description.replace(/`/g, '\\`')}\`,
  canonicalUrl: "${config.canonical}",
  thumbnail: "${config.ogImage}",
  iframeSrc: "${config.iframeSrc}",
  score: "${scoreStr}",
  hasFullscreen: ${config.hasFullscreen},
};
---

<GameLayout {...gameConfig}>
${config.aboutContent}
</GameLayout>
`;
}

// Extract configs for all pages
function extractAllConfigs() {
  const files = fs.readdirSync(pagesDir)
    .filter(f => f.endsWith('.astro') && !excludePages.includes(f));
  
  const configs = [];
  
  for (const file of files) {
    const filePath = path.join(pagesDir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isFile()) {
      try {
        const config = extractPageConfig(filePath);
        configs.push(config);
      } catch (error) {
        console.error(`Error extracting ${file}:`, error.message);
      }
    }
  }
  
  return configs;
}

// Backup original page
function backupPage(fileName) {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const srcPath = path.join(pagesDir, fileName);
  const destPath = path.join(backupDir, fileName);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`  Backed up: ${fileName}`);
    return true;
  }
  return false;
}

// Migrate a single page
function migratePage(slug, dryRun = false) {
  const fileName = `${slug}.astro`;
  const filePath = path.join(pagesDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.error(`Page not found: ${fileName}`);
    return false;
  }
  
  console.log(`\nMigrating: ${fileName}`);
  
  // Extract config
  const config = extractPageConfig(filePath);
  console.log(`  Title: ${config.title}`);
  console.log(`  Iframe: ${config.iframeSrc}`);
  console.log(`  Fullscreen: ${config.hasFullscreen}`);
  
  // Generate new content
  const newContent = generateMigratedPage(config);
  
  if (dryRun) {
    console.log('\n--- DRY RUN: Generated content ---');
    console.log(newContent.substring(0, 500) + '...');
    return true;
  }
  
  // Backup original
  backupPage(fileName);
  
  // Write migrated file
  fs.writeFileSync(filePath, newContent);
  console.log(`  Migrated: ${fileName}`);
  
  return true;
}

// Main CLI handler
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case '--extract':
      console.log('Extracting page configurations...\n');
      const configs = extractAllConfigs();
      const outputPath = path.join(__dirname, 'snapshots/static-pages-configs.json');
      fs.writeFileSync(outputPath, JSON.stringify(configs, null, 2));
      console.log(`\nExtracted ${configs.length} page configurations`);
      console.log(`Saved to: ${outputPath}`);
      break;
      
    case '--migrate':
      const slug = args[1];
      if (!slug) {
        console.error('Usage: node migrate-static-pages.mjs --migrate <slug>');
        console.error('Example: node migrate-static-pages.mjs --migrate incredibox');
        process.exit(1);
      }
      const dryRun = args.includes('--dry-run');
      migratePage(slug, dryRun);
      break;
      
    case '--migrate-all':
      console.log('Migrating all static pages...\n');
      const allConfigs = extractAllConfigs();
      let migrated = 0;
      let failed = 0;
      
      for (const config of allConfigs) {
        try {
          if (migratePage(config.slug, args.includes('--dry-run'))) {
            migrated++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`  Error: ${error.message}`);
          failed++;
        }
      }
      
      console.log(`\n=== Migration Summary ===`);
      console.log(`Migrated: ${migrated}`);
      console.log(`Failed: ${failed}`);
      break;
      
    case '--list':
      console.log('Static game pages:\n');
      const list = extractAllConfigs();
      list.forEach((c, i) => {
        console.log(`${i + 1}. ${c.slug} (fullscreen: ${c.hasFullscreen})`);
      });
      break;
      
    default:
      console.log('Static Game Pages Migration Script\n');
      console.log('Commands:');
      console.log('  --extract       Extract all page configurations to JSON');
      console.log('  --migrate <slug> Migrate a single page');
      console.log('  --migrate-all   Migrate all pages');
      console.log('  --list          List all static game pages');
      console.log('\nOptions:');
      console.log('  --dry-run       Preview changes without writing files');
  }
}

main();
