#!/usr/bin/env node
/**
 * Generate ZH stubs for specific batches
 * 
 * Usage:
 *   node scripts/generate-zh-batch-stubs.mjs batch-1  # Generate batch 1 (A-M)
 *   node scripts/generate-zh-batch-stubs.mjs batch-2  # Generate batch 2 (N-Z)
 *   node scripts/generate-zh-batch-stubs.mjs all      # Generate all batches
 */

import fs from 'fs';
import { execSync } from 'child_process';

const batchFile = '.kiro/specs/full-i18n-content/zh-translation-batches.json';
const batches = JSON.parse(fs.readFileSync(batchFile, 'utf-8'));

const batchArg = process.argv[2] || 'help';

if (batchArg === 'help' || batchArg === '--help' || batchArg === '-h') {
  console.log(`
Generate ZH Translation Stubs by Batch

Usage:
  node scripts/generate-zh-batch-stubs.mjs <batch>

Batches:
  batch-1    Generate stubs for Batch 1 (A-M) - ${batches.batches['batch-1-A-M'].count} games
  batch-2    Generate stubs for Batch 2 (N-Z) - ${batches.batches['batch-2-N-Z'].count} games
  all        Generate stubs for all batches

Options:
  --dry-run  Preview what would be generated without writing files
`);
  process.exit(0);
}

const dryRun = process.argv.includes('--dry-run');
const dryRunFlag = dryRun ? '--dry-run' : '';

function generateBatch(batchName, games) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 Generating stubs for ${batchName}`);
  console.log(`   Games: ${games.length}`);
  console.log(`${'='.repeat(60)}\n`);

  let generated = 0;
  let skipped = 0;

  // Process in smaller chunks to avoid command line length limits
  const chunkSize = 50;
  for (let i = 0; i < games.length; i += chunkSize) {
    const chunk = games.slice(i, i + chunkSize);
    
    for (const game of chunk) {
      try {
        const cmd = `node --experimental-strip-types scripts/generate-i18n-stubs.mts --lang zh --filter ${game} ${dryRunFlag}`;
        const output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
        
        if (output.includes('Generated:') || output.includes('Would generate:')) {
          generated++;
          if (generated % 10 === 0) {
            console.log(`  ✓ Processed ${generated}/${games.length} games...`);
          }
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`  ⚠️  Error processing ${game}:`, error.message);
      }
    }
  }

  console.log(`\n✅ Batch ${batchName} complete!`);
  console.log(`   Generated: ${generated}`);
  console.log(`   Skipped (already exist): ${skipped}`);
}

// Execute based on argument
if (batchArg === 'batch-1') {
  generateBatch('Batch 1 (A-M)', batches.batches['batch-1-A-M'].games);
} else if (batchArg === 'batch-2') {
  generateBatch('Batch 2 (N-Z)', batches.batches['batch-2-N-Z'].games);
} else if (batchArg === 'all') {
  generateBatch('Batch 1 (A-M)', batches.batches['batch-1-A-M'].games);
  generateBatch('Batch 2 (N-Z)', batches.batches['batch-2-N-Z'].games);
} else {
  console.error(`❌ Unknown batch: ${batchArg}`);
  console.error('   Use "batch-1", "batch-2", or "all"');
  process.exit(1);
}

console.log('\n' + '='.repeat(60));
console.log('🎉 All requested batches processed!');
console.log('='.repeat(60));
