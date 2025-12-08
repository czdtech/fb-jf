#!/usr/bin/env node
/**
 * Generate ZH stubs for specific batches (optimized version)
 * 
 * Usage:
 *   node scripts/generate-zh-batch-stubs-v2.mjs batch-1  # Generate batch 1 (A-M)
 *   node scripts/generate-zh-batch-stubs-v2.mjs batch-2  # Generate batch 2 (N-Z)
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const batchFile = '.kiro/specs/full-i18n-content/zh-translation-batches.json';
const batches = JSON.parse(fs.readFileSync(batchFile, 'utf-8'));

const batchArg = process.argv[2] || 'help';
const dryRun = process.argv.includes('--dry-run');

if (batchArg === 'help' || batchArg === '--help' || batchArg === '-h') {
  console.log(`
Generate ZH Translation Stubs by Batch (Optimized)

Usage:
  node scripts/generate-zh-batch-stubs-v2.mjs <batch> [--dry-run]

Batches:
  batch-1    Generate stubs for Batch 1 (A-M) - ${batches.batches['batch-1-A-M'].count} games
  batch-2    Generate stubs for Batch 2 (N-Z) - ${batches.batches['batch-2-N-Z'].count} games
`);
  process.exit(0);
}

function generateStubContent(canonicalGame, locale) {
  const { frontmatter, content } = canonicalGame;

  // Create localized frontmatter
  const localizedFrontmatter = {
    locale,
    urlstr: frontmatter.urlstr,
    title: `[${locale.toUpperCase()} TRANSLATION NEEDED] ${frontmatter.title}`,
    description: `[${locale.toUpperCase()} TRANSLATION NEEDED] ${frontmatter.description}`,
    iframeSrc: frontmatter.iframeSrc,
    thumbnail: frontmatter.thumbnail,
    tags: frontmatter.tags || [],
  };

  // Include optional fields
  if (frontmatter.score) localizedFrontmatter.score = frontmatter.score;
  if (frontmatter.developer) localizedFrontmatter.developer = frontmatter.developer;
  if (frontmatter.releaseDate) localizedFrontmatter.releaseDate = frontmatter.releaseDate;

  // Mark content sections for translation
  const markedContent = content
    .split('\n')
    .map(line => {
      // Keep empty lines and markdown structure
      if (!line.trim() || line.match(/^#{1,6}\s/) || line.match(/^[-*]\s/)) {
        return line;
      }
      // Mark text lines for translation
      return `[${locale.toUpperCase()} TRANSLATION NEEDED] ${line}`;
    })
    .join('\n');

  return matter.stringify(markedContent, localizedFrontmatter);
}

async function generateBatch(batchName, gamesList) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 Processing ${batchName}`);
  console.log(`   Total games: ${gamesList.length}`);
  console.log(`${'='.repeat(60)}\n`);

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const urlstr of gamesList) {
    try {
      // Find the canonical game file
      const files = fs.readdirSync(GAMES_DIR);
      const canonicalFile = files.find(f => {
        if (!f.endsWith('.md') || f.match(/\.(zh|ja|es|fr|de|ko)\.md$/)) {
          return false;
        }
        const filePath = path.join(GAMES_DIR, f);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data } = matter(fileContent);
        return data.urlstr === urlstr || f.replace('.md', '') === urlstr;
      });

      if (!canonicalFile) {
        console.log(`  ⚠️  Canonical file not found for: ${urlstr}`);
        errors++;
        continue;
      }

      // Check if zh variant already exists
      const zhFile = canonicalFile.replace('.md', '.zh.md');
      const zhPath = path.join(GAMES_DIR, zhFile);
      
      if (fs.existsSync(zhPath)) {
        skipped++;
        continue;
      }

      // Read canonical game
      const canonicalPath = path.join(GAMES_DIR, canonicalFile);
      const fileContent = fs.readFileSync(canonicalPath, 'utf-8');
      const { data: frontmatter, content } = matter(fileContent);

      // Generate stub
      const stubContent = generateStubContent({ frontmatter, content }, 'zh');

      if (dryRun) {
        console.log(`  [DRY RUN] Would generate: ${zhFile}`);
      } else {
        fs.writeFileSync(zhPath, stubContent, 'utf-8');
        console.log(`  ✓ Generated: ${zhFile}`);
      }
      
      generated++;

      if (generated % 50 === 0) {
        console.log(`\n  Progress: ${generated}/${gamesList.length} processed...\n`);
      }

    } catch (error) {
      console.error(`  ❌ Error processing ${urlstr}:`, error.message);
      errors++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ ${batchName} complete!`);
  console.log(`   Generated: ${generated}`);
  console.log(`   Skipped (already exist): ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`${'='.repeat(60)}\n`);
}

// Execute based on argument
if (batchArg === 'batch-1') {
  await generateBatch('Batch 1 (A-M)', batches.batches['batch-1-A-M'].games);
} else if (batchArg === 'batch-2') {
  await generateBatch('Batch 2 (N-Z)', batches.batches['batch-2-N-Z'].games);
} else {
  console.error(`❌ Unknown batch: ${batchArg}`);
  console.error('   Use "batch-1" or "batch-2"');
  process.exit(1);
}
