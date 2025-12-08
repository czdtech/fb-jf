#!/usr/bin/env node
/**
 * Translation Batch Planning Script
 * 
 * This script plans translation batches for remaining languages (es, fr, de, ko)
 * by dividing the canonical games into manageable batches for parallel processing.
 * 
 * Requirements: 7.1, 7.2
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASELINE_REPORT_PATH = path.join(__dirname, '../i18n-baseline-report.json');
const TARGET_LANGUAGES = ['es', 'fr', 'de', 'ko'] as const;
const BATCH_SIZE = 100; // Games per batch

interface CanonicalGame {
  urlstr: string;
  title: string;
  tags: string[];
  filename: string;
}

interface TranslationBatch {
  batchNumber: number;
  games: CanonicalGame[];
  startIndex: number;
  endIndex: number;
}

interface LanguagePlan {
  locale: string;
  totalGames: number;
  batchSize: number;
  batches: TranslationBatch[];
}

/**
 * Load baseline report
 */
async function loadBaselineReport() {
  const content = await fs.readFile(BASELINE_REPORT_PATH, 'utf-8');
  return JSON.parse(content);
}

/**
 * Create translation batches for a language
 */
function createBatches(games: CanonicalGame[], batchSize: number): TranslationBatch[] {
  const batches: TranslationBatch[] = [];
  const totalBatches = Math.ceil(games.length / batchSize);

  for (let i = 0; i < totalBatches; i++) {
    const startIndex = i * batchSize;
    const endIndex = Math.min(startIndex + batchSize, games.length);
    const batchGames = games.slice(startIndex, endIndex);

    batches.push({
      batchNumber: i + 1,
      games: batchGames,
      startIndex,
      endIndex: endIndex - 1,
    });
  }

  return batches;
}

/**
 * Plan translation batches for all remaining languages
 */
async function planTranslationBatches() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        Translation Batch Planning for Phase 8             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Load baseline report
  const report = await loadBaselineReport();
  const canonicalGames: CanonicalGame[] = report.canonicalGames;

  console.log(`Total Canonical Games: ${canonicalGames.length}\n`);
  console.log(`Target Languages: ${TARGET_LANGUAGES.join(', ')}`);
  console.log(`Batch Size: ${BATCH_SIZE} games per batch\n`);

  const plans: LanguagePlan[] = [];

  for (const locale of TARGET_LANGUAGES) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Planning batches for ${locale.toUpperCase()}`);
    console.log('='.repeat(60));

    const batches = createBatches(canonicalGames, BATCH_SIZE);

    console.log(`\nTotal batches: ${batches.length}`);
    console.log(`\nBatch breakdown:`);

    batches.forEach(batch => {
      console.log(`  Batch ${batch.batchNumber}: Games ${batch.startIndex + 1}-${batch.endIndex + 1} (${batch.games.length} games)`);
      console.log(`    Sample games:`);
      batch.games.slice(0, 3).forEach(game => {
        console.log(`      - ${game.urlstr}: "${game.title}"`);
      });
      if (batch.games.length > 3) {
        console.log(`      ... and ${batch.games.length - 3} more`);
      }
    });

    plans.push({
      locale,
      totalGames: canonicalGames.length,
      batchSize: BATCH_SIZE,
      batches,
    });
  }

  // Save plans to JSON files
  console.log(`\n${'='.repeat(60)}`);
  console.log('Saving batch plans...');
  console.log('='.repeat(60));

  for (const plan of plans) {
    const planPath = path.join(__dirname, `../translation-batches-${plan.locale}.json`);
    await fs.writeFile(planPath, JSON.stringify(plan, null, 2), 'utf-8');
    console.log(`✓ Saved ${plan.locale} plan to: translation-batches-${plan.locale}.json`);
  }

  // Generate summary markdown
  const summaryPath = path.join(__dirname, '../translation-batches-summary.md');
  let summary = '# Translation Batch Plans for Phase 8\n\n';
  summary += `Generated: ${new Date().toISOString()}\n\n`;
  summary += `## Overview\n\n`;
  summary += `- Total Canonical Games: ${canonicalGames.length}\n`;
  summary += `- Target Languages: ${TARGET_LANGUAGES.join(', ')}\n`;
  summary += `- Batch Size: ${BATCH_SIZE} games per batch\n`;
  summary += `- Total Batches per Language: ${plans[0].batches.length}\n\n`;

  for (const plan of plans) {
    summary += `## ${plan.locale.toUpperCase()} Translation Plan\n\n`;
    summary += `### Batches\n\n`;

    plan.batches.forEach(batch => {
      summary += `#### Batch ${batch.batchNumber}\n\n`;
      summary += `- Games: ${batch.startIndex + 1}-${batch.endIndex + 1} (${batch.games.length} total)\n`;
      summary += `- Sample games:\n`;
      batch.games.slice(0, 5).forEach(game => {
        summary += `  - \`${game.urlstr}\`: ${game.title}\n`;
      });
      if (batch.games.length > 5) {
        summary += `  - ... and ${batch.games.length - 5} more\n`;
      }
      summary += `\n`;
    });

    summary += `### Execution Strategy\n\n`;
    summary += `1. Generate stubs for batch using: \`npm run generate-stubs -- --lang ${plan.locale} --batch <batch-number>\`\n`;
    summary += `2. Complete translations for the batch\n`;
    summary += `3. Run validation: \`npm run validate-i18n\`\n`;
    summary += `4. Run structure validation: \`npm run validate-structure\`\n`;
    summary += `5. Commit and move to next batch\n\n`;
  }

  await fs.writeFile(summaryPath, summary, 'utf-8');
  console.log(`✓ Saved summary to: translation-batches-summary.md\n`);

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              Batch Planning Complete                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Next steps:');
  console.log('1. Review the batch plans in translation-batches-*.json files');
  console.log('2. Review the summary in translation-batches-summary.md');
  console.log('3. Begin translation work batch by batch for each language');
  console.log('4. Use the validation scripts after each batch\n');
}

// Main execution
planTranslationBatches().catch(error => {
  console.error('Error planning translation batches:', error);
  process.exit(1);
});
