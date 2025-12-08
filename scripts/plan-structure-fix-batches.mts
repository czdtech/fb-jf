#!/usr/bin/env node
/**
 * Structure Fix Batch Planning Script
 * 
 * This script plans structure fix batches by dividing structure mismatches
 * into manageable batches for parallel processing by locale.
 * 
 * Requirements: 5.1, 5.2
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const STRUCTURE_REPORT_PATH = path.join(__dirname, '../i18n-structure-report.json');
const OUTPUT_DIR = path.join(__dirname, '../structure-batches');
const BATCH_SIZE = 15; // (urlstr, locale) pairs per batch
const TARGET_LOCALES = ['zh', 'ja', 'es', 'fr', 'de', 'ko'] as const;

interface Mismatch {
  urlstr: string;
  locale: string;
  canonicalFile: string;
  localizedFile: string;
  reason: string;
}

interface StructureReport {
  timestamp: string;
  summary: {
    canonicalGames: number;
    checkedPairs: number;
    mismatchCount: number;
  };
  mismatches: Mismatch[];
}

interface BatchItem {
  urlstr: string;
  canonicalFile: string;
  localizedFile: string;
  reasons: string[];
}

interface StructureBatch {
  locale: string;
  batchNumber: number;
  items: BatchItem[];
  totalMismatches: number;
}

/**
 * Load structure report
 */
async function loadStructureReport(): Promise<StructureReport> {
  const content = await fs.readFile(STRUCTURE_REPORT_PATH, 'utf-8');
  return JSON.parse(content);
}

/**
 * Group mismatches by locale and urlstr
 */
function groupMismatchesByLocale(mismatches: Mismatch[]): Map<string, Map<string, Mismatch[]>> {
  const localeMap = new Map<string, Map<string, Mismatch[]>>();

  for (const mismatch of mismatches) {
    if (!localeMap.has(mismatch.locale)) {
      localeMap.set(mismatch.locale, new Map());
    }

    const urlstrMap = localeMap.get(mismatch.locale)!;
    if (!urlstrMap.has(mismatch.urlstr)) {
      urlstrMap.set(mismatch.urlstr, []);
    }

    urlstrMap.get(mismatch.urlstr)!.push(mismatch);
  }

  return localeMap;
}

/**
 * Create batches for a single locale
 */
function createBatchesForLocale(
  locale: string,
  urlstrMap: Map<string, Mismatch[]>,
  batchSize: number
): StructureBatch[] {
  const batches: StructureBatch[] = [];
  const urlstrs = Array.from(urlstrMap.keys()).sort();
  
  let currentBatch: BatchItem[] = [];
  let batchNumber = 1;

  for (const urlstr of urlstrs) {
    const mismatches = urlstrMap.get(urlstr)!;
    
    const batchItem: BatchItem = {
      urlstr,
      canonicalFile: mismatches[0].canonicalFile,
      localizedFile: mismatches[0].localizedFile,
      reasons: mismatches.map(m => m.reason),
    };

    currentBatch.push(batchItem);

    // Create a new batch when we reach the batch size
    if (currentBatch.length >= batchSize) {
      batches.push({
        locale,
        batchNumber,
        items: currentBatch,
        totalMismatches: currentBatch.reduce((sum, item) => sum + item.reasons.length, 0),
      });

      currentBatch = [];
      batchNumber++;
    }
  }

  // Add remaining items as the last batch
  if (currentBatch.length > 0) {
    batches.push({
      locale,
      batchNumber,
      items: currentBatch,
      totalMismatches: currentBatch.reduce((sum, item) => sum + item.reasons.length, 0),
    });
  }

  return batches;
}

/**
 * Ensure output directory exists
 */
async function ensureOutputDir() {
  try {
    await fs.access(OUTPUT_DIR);
  } catch {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  }
}

/**
 * Main batch planning function
 */
async function planStructureFixBatches() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        Structure Fix Batch Planning                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Load structure report
  const report = await loadStructureReport();
  
  console.log(`Report timestamp: ${report.timestamp}`);
  console.log(`Total canonical games: ${report.summary.canonicalGames}`);
  console.log(`Total checked pairs: ${report.summary.checkedPairs}`);
  console.log(`Total mismatches: ${report.summary.mismatchCount}\n`);

  // Group mismatches by locale
  const localeMap = groupMismatchesByLocale(report.mismatches);

  console.log('Mismatches by locale:');
  for (const locale of TARGET_LOCALES) {
    const urlstrMap = localeMap.get(locale);
    if (urlstrMap) {
      const totalMismatches = Array.from(urlstrMap.values())
        .reduce((sum, arr) => sum + arr.length, 0);
      console.log(`  ${locale}: ${urlstrMap.size} urlstrs, ${totalMismatches} total mismatches`);
    } else {
      console.log(`  ${locale}: 0 urlstrs, 0 total mismatches`);
    }
  }
  console.log();

  // Ensure output directory exists
  await ensureOutputDir();

  // Create batches for each locale
  const allBatches: StructureBatch[] = [];
  
  for (const locale of TARGET_LOCALES) {
    const urlstrMap = localeMap.get(locale);
    
    if (!urlstrMap || urlstrMap.size === 0) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`${locale.toUpperCase()}: No mismatches - skipping`);
      console.log('='.repeat(60));
      continue;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Planning batches for ${locale.toUpperCase()}`);
    console.log('='.repeat(60));

    const batches = createBatchesForLocale(locale, urlstrMap, BATCH_SIZE);
    allBatches.push(...batches);

    console.log(`\nTotal batches: ${batches.length}`);
    console.log(`Batch size: ${BATCH_SIZE} urlstrs per batch\n`);

    // Save each batch to a separate file
    for (const batch of batches) {
      const batchFilename = `${locale}-batch-${batch.batchNumber}.json`;
      const batchPath = path.join(OUTPUT_DIR, batchFilename);
      
      await fs.writeFile(batchPath, JSON.stringify(batch, null, 2), 'utf-8');
      
      console.log(`Batch ${batch.batchNumber}:`);
      console.log(`  File: ${batchFilename}`);
      console.log(`  Items: ${batch.items.length} urlstrs`);
      console.log(`  Total mismatches: ${batch.totalMismatches}`);
      console.log(`  Sample urlstrs:`);
      
      batch.items.slice(0, 3).forEach(item => {
        console.log(`    - ${item.urlstr} (${item.reasons.length} mismatches)`);
      });
      
      if (batch.items.length > 3) {
        console.log(`    ... and ${batch.items.length - 3} more`);
      }
      console.log();
    }
  }

  // Generate summary report
  console.log(`${'='.repeat(60)}`);
  console.log('Generating summary report...');
  console.log('='.repeat(60));

  const summaryPath = path.join(__dirname, '../structure-batches-summary.md');
  let summary = '# Structure Fix Batch Plans\n\n';
  summary += `Generated: ${new Date().toISOString()}\n\n`;
  summary += `## Overview\n\n`;
  summary += `- Total Mismatches: ${report.summary.mismatchCount}\n`;
  summary += `- Batch Size: ${BATCH_SIZE} urlstrs per batch\n`;
  summary += `- Total Batches: ${allBatches.length}\n\n`;

  summary += `## Mismatches by Locale\n\n`;
  summary += `| Locale | Unique URLstrs | Total Mismatches | Batches |\n`;
  summary += `|--------|----------------|------------------|----------|\n`;

  for (const locale of TARGET_LOCALES) {
    const urlstrMap = localeMap.get(locale);
    const localeBatches = allBatches.filter(b => b.locale === locale);
    
    if (urlstrMap) {
      const totalMismatches = Array.from(urlstrMap.values())
        .reduce((sum, arr) => sum + arr.length, 0);
      summary += `| ${locale} | ${urlstrMap.size} | ${totalMismatches} | ${localeBatches.length} |\n`;
    } else {
      summary += `| ${locale} | 0 | 0 | 0 |\n`;
    }
  }

  summary += `\n## Priority: zh and ja\n\n`;
  summary += `The zh (Chinese) and ja (Japanese) locales are marked as high priority.\n\n`;

  // Add detailed batch information for zh and ja
  for (const locale of ['zh', 'ja']) {
    const localeBatches = allBatches.filter(b => b.locale === locale);
    
    if (localeBatches.length === 0) {
      summary += `### ${locale.toUpperCase()}: No mismatches ✓\n\n`;
      continue;
    }

    summary += `### ${locale.toUpperCase()} Batches\n\n`;
    
    for (const batch of localeBatches) {
      summary += `#### Batch ${batch.batchNumber}: \`${locale}-batch-${batch.batchNumber}.json\`\n\n`;
      summary += `- Items: ${batch.items.length} urlstrs\n`;
      summary += `- Total mismatches: ${batch.totalMismatches}\n`;
      summary += `- Sample urlstrs:\n`;
      
      batch.items.slice(0, 5).forEach(item => {
        summary += `  - \`${item.urlstr}\` (${item.reasons.length} mismatches)\n`;
      });
      
      if (batch.items.length > 5) {
        summary += `  - ... and ${batch.items.length - 5} more\n`;
      }
      summary += `\n`;
    }
  }

  // Add information for other locales
  summary += `## Other Locales (es, fr, de, ko)\n\n`;
  
  for (const locale of ['es', 'fr', 'de', 'ko']) {
    const localeBatches = allBatches.filter(b => b.locale === locale);
    
    if (localeBatches.length === 0) {
      summary += `### ${locale.toUpperCase()}: No mismatches ✓\n\n`;
      continue;
    }

    summary += `### ${locale.toUpperCase()}: ${localeBatches.length} batches\n\n`;
    summary += `Batch files: `;
    summary += localeBatches.map(b => `\`${locale}-batch-${b.batchNumber}.json\``).join(', ');
    summary += `\n\n`;
  }

  summary += `## Execution Strategy\n\n`;
  summary += `### For each batch:\n\n`;
  summary += `1. Read the batch file: \`structure-batches/<locale>-batch-<N>.json\`\n`;
  summary += `2. For each item in the batch:\n`;
  summary += `   - Open the canonical file and localized file\n`;
  summary += `   - Identify missing structural nodes based on reasons\n`;
  summary += `   - Add missing headings or list items with faithful translations\n`;
  summary += `3. Validate the batch: \`npm run validate:i18n\`\n`;
  summary += `4. Confirm all mismatches for the batch are resolved\n`;
  summary += `5. Commit and move to the next batch\n\n`;

  summary += `### Recommended order:\n\n`;
  summary += `1. Complete all zh batches (high priority)\n`;
  summary += `2. Complete all ja batches (high priority)\n`;
  summary += `3. Complete es, fr, de, ko batches in parallel or sequentially\n\n`;

  await fs.writeFile(summaryPath, summary, 'utf-8');
  console.log(`✓ Saved summary to: structure-batches-summary.md\n`);

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              Batch Planning Complete                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Next steps:');
  console.log('1. Review batch files in structure-batches/ directory');
  console.log('2. Review summary in structure-batches-summary.md');
  console.log('3. Begin with zh-batch-1.json (high priority)');
  console.log('4. Use validation scripts after each batch\n');

  console.log(`Total batches created: ${allBatches.length}`);
  console.log(`  zh: ${allBatches.filter(b => b.locale === 'zh').length} batches`);
  console.log(`  ja: ${allBatches.filter(b => b.locale === 'ja').length} batches`);
  console.log(`  es: ${allBatches.filter(b => b.locale === 'es').length} batches`);
  console.log(`  fr: ${allBatches.filter(b => b.locale === 'fr').length} batches`);
  console.log(`  de: ${allBatches.filter(b => b.locale === 'de').length} batches`);
  console.log(`  ko: ${allBatches.filter(b => b.locale === 'ko').length} batches\n`);
}

// Main execution
planStructureFixBatches().catch(error => {
  console.error('Error planning structure fix batches:', error);
  process.exit(1);
});
