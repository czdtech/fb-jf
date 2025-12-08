#!/usr/bin/env node --experimental-strip-types

/**
 * Analyze remaining locale batches (es, fr, de, ko) for structure fix planning
 * Task 9.1: 从现有批次文件中筛选非 zh/ja 批次
 */

import fs from 'fs';
import path from 'path';

interface BatchItem {
  urlstr: string;
  canonicalFile: string;
  localizedFile: string;
  reasons: string[];
}

interface Batch {
  locale: string;
  batchNumber: number;
  items: BatchItem[];
  totalMismatches: number;
}

interface LocaleStats {
  locale: string;
  batchCount: number;
  totalMismatches: number;
  avgMismatchesPerBatch: number;
  batches: string[];
  sampleGames: string[];
}

const BATCH_DIR = 'structure-batches';
const TARGET_LOCALES = ['es', 'fr', 'de', 'ko'];

function analyzeBatches(): Map<string, LocaleStats> {
  const stats = new Map<string, LocaleStats>();
  
  // Initialize stats for each locale
  for (const locale of TARGET_LOCALES) {
    stats.set(locale, {
      locale,
      batchCount: 0,
      totalMismatches: 0,
      avgMismatchesPerBatch: 0,
      batches: [],
      sampleGames: []
    });
  }
  
  // Read all batch files
  const files = fs.readdirSync(BATCH_DIR);
  
  for (const file of files) {
    // Only process target locales (es, fr, de, ko)
    const match = file.match(/^(es|fr|de|ko)-batch-(\d+)\.json$/);
    if (!match) continue;
    
    const locale = match[1];
    const batchNum = parseInt(match[2], 10);
    
    const filePath = path.join(BATCH_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const batch: Batch = JSON.parse(content);
    
    const localeStats = stats.get(locale)!;
    localeStats.batchCount++;
    localeStats.totalMismatches += batch.totalMismatches;
    localeStats.batches.push(file);
    
    // Collect sample games from first batch
    if (batchNum === 1) {
      localeStats.sampleGames = batch.items.slice(0, 5).map(item => item.urlstr);
    }
  }
  
  // Calculate averages
  for (const localeStats of stats.values()) {
    if (localeStats.batchCount > 0) {
      localeStats.avgMismatchesPerBatch = 
        Math.round(localeStats.totalMismatches / localeStats.batchCount * 10) / 10;
    }
    // Sort batches naturally
    localeStats.batches.sort((a, b) => {
      const aNum = parseInt(a.match(/batch-(\d+)/)?.[1] || '0', 10);
      const bNum = parseInt(b.match(/batch-(\d+)/)?.[1] || '0', 10);
      return aNum - bNum;
    });
  }
  
  return stats;
}

function generateReport(stats: Map<string, LocaleStats>): string {
  let report = '# Remaining Locale Structure Fix Analysis\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += '## Summary\n\n';
  report += 'This report analyzes the remaining locales (es, fr, de, ko) that need structure fixes.\n';
  report += 'zh and ja locales have been completed in previous phases.\n\n';
  
  // Summary table
  report += '| Locale | Batch Count | Total Mismatches | Avg per Batch |\n';
  report += '|--------|-------------|------------------|---------------|\n';
  
  const sortedLocales = Array.from(stats.values()).sort((a, b) => 
    b.totalMismatches - a.totalMismatches
  );
  
  for (const stat of sortedLocales) {
    report += `| ${stat.locale} | ${stat.batchCount} | ${stat.totalMismatches} | ${stat.avgMismatchesPerBatch} |\n`;
  }
  
  const totalBatches = sortedLocales.reduce((sum, s) => sum + s.batchCount, 0);
  const totalMismatches = sortedLocales.reduce((sum, s) => sum + s.totalMismatches, 0);
  report += `| **Total** | **${totalBatches}** | **${totalMismatches}** | - |\n\n`;
  
  // Detailed breakdown by locale
  report += '## Detailed Breakdown\n\n';
  
  for (const stat of sortedLocales) {
    report += `### ${stat.locale.toUpperCase()} (${stat.locale === 'es' ? 'Spanish' : stat.locale === 'fr' ? 'French' : stat.locale === 'de' ? 'German' : 'Korean'})\n\n`;
    report += `- **Batch Count**: ${stat.batchCount}\n`;
    report += `- **Total Mismatches**: ${stat.totalMismatches}\n`;
    report += `- **Average per Batch**: ${stat.avgMismatchesPerBatch}\n`;
    report += `- **Batch Files**: ${stat.batches[0]} through ${stat.batches[stat.batches.length - 1]}\n\n`;
    
    if (stat.sampleGames.length > 0) {
      report += '**Sample Games (from batch 1)**:\n';
      for (const game of stat.sampleGames) {
        report += `- ${game}\n`;
      }
      report += '\n';
    }
  }
  
  // Processing recommendations
  report += '## Processing Recommendations\n\n';
  report += '### Priority Order\n\n';
  report += 'Based on total mismatch count (higher = more work needed):\n\n';
  
  let priority = 1;
  for (const stat of sortedLocales) {
    report += `${priority}. **${stat.locale.toUpperCase()}**: ${stat.totalMismatches} mismatches across ${stat.batchCount} batches\n`;
    priority++;
  }
  
  report += '\n### Batch Processing Strategy\n\n';
  report += 'Each locale should be processed sequentially, batch by batch:\n\n';
  
  for (const stat of sortedLocales) {
    report += `**${stat.locale.toUpperCase()}**:\n`;
    report += `- Start with: \`${stat.batches[0]}\`\n`;
    report += `- Process through: \`${stat.batches[stat.batches.length - 1]}\`\n`;
    report += `- Estimated batches: ${stat.batchCount}\n\n`;
  }
  
  report += '### Parallel Processing Opportunities\n\n';
  report += 'Since each locale is independent, teams can work in parallel:\n';
  report += '- Team A: Spanish (es)\n';
  report += '- Team B: French (fr)\n';
  report += '- Team C: German (de)\n';
  report += '- Team D: Korean (ko)\n\n';
  
  report += '### Validation After Each Batch\n\n';
  report += 'After completing each batch, run:\n';
  report += '```bash\n';
  report += 'npm run validate:i18n\n';
  report += '# or for specific batch:\n';
  report += 'node --experimental-strip-types scripts/validate-structure-batch.mts --batch structure-batches/<locale>-batch-<N>.json\n';
  report += '```\n\n';
  
  return report;
}

// Main execution
console.log('Analyzing remaining locale batches...\n');

const stats = analyzeBatches();
const report = generateReport(stats);

// Write report to file
const reportPath = 'remaining-locales-analysis.md';
fs.writeFileSync(reportPath, report, 'utf-8');

console.log(`✓ Analysis complete!`);
console.log(`✓ Report written to: ${reportPath}\n`);

// Print summary to console
console.log('Summary:');
console.log('--------');
for (const stat of Array.from(stats.values()).sort((a, b) => b.totalMismatches - a.totalMismatches)) {
  console.log(`${stat.locale.toUpperCase()}: ${stat.batchCount} batches, ${stat.totalMismatches} mismatches`);
}

const totalBatches = Array.from(stats.values()).reduce((sum, s) => sum + s.batchCount, 0);
const totalMismatches = Array.from(stats.values()).reduce((sum, s) => sum + s.totalMismatches, 0);
console.log(`\nTotal: ${totalBatches} batches, ${totalMismatches} mismatches across 4 locales`);
