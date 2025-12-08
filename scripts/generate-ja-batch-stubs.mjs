#!/usr/bin/env node
/**
 * Generate JA stubs for specific batches
 * 
 * Usage:
 *   node scripts/generate-ja-batch-stubs.mjs batch-1  # Generate batch 1 (A-M)
 *   node scripts/generate-ja-batch-stubs.mjs batch-2  # Generate batch 2 (N-Z)
 *   node scripts/generate-ja-batch-stubs.mjs all      # Generate all batches
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const batchFile = '.kiro/specs/full-i18n-content/ja-translation-batches.json';
const batches = JSON.parse(fs.readFileSync(batchFile, 'utf-8'));

const batchArg = process.argv[2] || 'help';
const dryRun = process.argv.includes('--dry-run');

if (batchArg === 'help' || batchArg === '--help' || batchArg === '-h') {
  console.log(`
Generate JA Translation Stubs by Batch

Usage:
  node scripts/generate-ja-batch-stubs.mjs <batch> [--dry-run]

Batches:
  batch-1    Generate stubs for Batch 1 (A-M) - ${batches.batches['batch-1-A-M'].count} games
  batch-2    Generate stubs for Batch 2 (N-Z) - ${batches.batches['batch-2-N-Z'].count} games
  all        Generate stubs for all batches - ${batches.totalMissing} games total

Options:
  --dry-run  Show what would be generated without writing files
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
  if (dryRun) {
    console.log(`   Mode: DRY RUN (no files will be written)`);
  }
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

      // Check if ja variant already exists
      const jaFile = canonicalFile.replace('.md', '.ja.md');
      const jaPath = path.join(GAMES_DIR, jaFile);
      
      if (fs.existsSync(jaPath)) {
        skipped++;
        continue;
      }

      // Read canonical game
      const canonicalPath = path.join(GAMES_DIR, canonicalFile);
      const fileContent = fs.readFileSync(canonicalPath, 'utf-8');
      const { data: frontmatter, content } = matter(fileContent);

      // Generate stub
      const stubContent = generateStubContent({ frontmatter, content }, 'ja');

      if (dryRun) {
        console.log(`  [DRY RUN] Would generate: ${jaFile}`);
      } else {
        fs.writeFileSync(jaPath, stubContent, 'utf-8');
        console.log(`  ✓ Generated: ${jaFile}`);
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

  return { generated, skipped, errors };
}

// Execute based on argument
async function main() {
  if (batchArg === 'batch-1') {
    await generateBatch('Batch 1 (A-M)', batches.batches['batch-1-A-M'].games);
  } else if (batchArg === 'batch-2') {
    await generateBatch('Batch 2 (N-Z)', batches.batches['batch-2-N-Z'].games);
  } else if (batchArg === 'all') {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         Generating JA Stubs for All Batches               ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    const batch1Result = await generateBatch('Batch 1 (A-M)', batches.batches['batch-1-A-M'].games);
    const batch2Result = await generateBatch('Batch 2 (N-Z)', batches.batches['batch-2-N-Z'].games);
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Overall Summary                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`Total Generated: ${batch1Result.generated + batch2Result.generated}`);
    console.log(`Total Skipped: ${batch1Result.skipped + batch2Result.skipped}`);
    console.log(`Total Errors: ${batch1Result.errors + batch2Result.errors}`);
    console.log('');
  } else {
    console.error(`❌ Unknown batch: ${batchArg}`);
    console.error('   Use "batch-1", "batch-2", or "all"');
    process.exit(1);
  }
}

main();
