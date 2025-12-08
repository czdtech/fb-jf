#!/usr/bin/env node --experimental-strip-types

/**
 * Prioritize locale batch processing order
 * Task 9.2: 为每种语言确定处理顺序
 * 
 * Prioritizes based on:
 * 1. High-traffic game franchises (e.g., Sprunki, Incredibox, Papa's games)
 * 2. Popular standalone games
 * 3. Alphabetical order for remaining games
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

interface PrioritizedBatch {
  batchFile: string;
  locale: string;
  batchNumber: number;
  priority: 'high' | 'medium' | 'normal';
  highPriorityGames: string[];
  totalGames: number;
}

const BATCH_DIR = 'structure-batches';
const TARGET_LOCALES = ['es', 'fr', 'de', 'ko'];

// High-traffic game patterns (franchises and popular titles)
const HIGH_PRIORITY_PATTERNS = [
  /^sprunki-/,
  /^incredibox-/,
  /^papa-/,
  /^geometry-dash/,
  /^fireboy-and-watergirl/,
  /^five-nights-at-freddy/,
  /^super-smash-flash/,
  /^bloons-td/,
  /^run-[0-9]/,
  /^bad-ice-cream/,
  /^fancy-pants/,
  /^moto-x3m/,
  /^slope/,
  /^subway-surfers/,
  /^minecraft/,
  /^among-us/,
  /^happy-wheels/,
  /^getting-over-it/,
  /^cuphead/,
  /^undertale/,
  /^fnf/,
  /^friday-night-funkin/
];

const MEDIUM_PRIORITY_GAMES = [
  'crossy-road',
  'temple-run',
  'flappy-bird',
  'doodle-jump',
  'angry-birds',
  'cut-the-rope',
  'fruit-ninja',
  'jetpack-joyride',
  'cookie-clicker',
  'agar-io',
  'slither-io',
  'paper-io',
  '2048',
  'tetris',
  'pac-man',
  'snake',
  'solitaire',
  'mahjong',
  'sudoku',
  'chess',
  'checkers'
];

function calculatePriority(items: BatchItem[]): {
  priority: 'high' | 'medium' | 'normal';
  highPriorityGames: string[];
} {
  const highPriorityGames: string[] = [];
  let highCount = 0;
  let mediumCount = 0;
  
  for (const item of items) {
    const urlstr = item.urlstr;
    
    // Check high priority patterns
    if (HIGH_PRIORITY_PATTERNS.some(pattern => pattern.test(urlstr))) {
      highCount++;
      highPriorityGames.push(urlstr);
      continue;
    }
    
    // Check medium priority games
    if (MEDIUM_PRIORITY_GAMES.includes(urlstr)) {
      mediumCount++;
      continue;
    }
  }
  
  // Determine overall priority
  let priority: 'high' | 'medium' | 'normal';
  if (highCount >= 3) {
    priority = 'high';
  } else if (highCount >= 1 || mediumCount >= 5) {
    priority = 'medium';
  } else {
    priority = 'normal';
  }
  
  return { priority, highPriorityGames };
}

function analyzeBatchPriorities(): Map<string, PrioritizedBatch[]> {
  const localeMap = new Map<string, PrioritizedBatch[]>();
  
  // Initialize for each locale
  for (const locale of TARGET_LOCALES) {
    localeMap.set(locale, []);
  }
  
  // Read all batch files
  const files = fs.readdirSync(BATCH_DIR);
  
  for (const file of files) {
    const match = file.match(/^(es|fr|de|ko)-batch-(\d+)\.json$/);
    if (!match) continue;
    
    const locale = match[1];
    const batchNum = parseInt(match[2], 10);
    
    const filePath = path.join(BATCH_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const batch: Batch = JSON.parse(content);
    
    const { priority, highPriorityGames } = calculatePriority(batch.items);
    
    localeMap.get(locale)!.push({
      batchFile: file,
      locale,
      batchNumber: batchNum,
      priority,
      highPriorityGames,
      totalGames: batch.items.length
    });
  }
  
  // Sort batches within each locale by priority
  for (const batches of localeMap.values()) {
    batches.sort((a, b) => {
      // Priority order: high > medium > normal
      const priorityOrder = { high: 0, medium: 1, normal: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Within same priority, sort by batch number
      return a.batchNumber - b.batchNumber;
    });
  }
  
  return localeMap;
}

function generatePriorityReport(localeMap: Map<string, PrioritizedBatch[]>): string {
  let report = '# Locale Batch Processing Priority Order\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  report += '## Overview\n\n';
  report += 'This report provides a prioritized processing order for remaining locale batches.\n';
  report += 'Priority is based on:\n';
  report += '1. **High Priority**: Batches containing popular game franchises (Sprunki, Incredibox, Papa\'s games, etc.)\n';
  report += '2. **Medium Priority**: Batches with well-known standalone games\n';
  report += '3. **Normal Priority**: All other batches\n\n';
  
  // Summary statistics
  report += '## Priority Distribution\n\n';
  report += '| Locale | High Priority | Medium Priority | Normal Priority | Total |\n';
  report += '|--------|---------------|-----------------|-----------------|-------|\n';
  
  for (const locale of TARGET_LOCALES) {
    const batches = localeMap.get(locale)!;
    const high = batches.filter(b => b.priority === 'high').length;
    const medium = batches.filter(b => b.priority === 'medium').length;
    const normal = batches.filter(b => b.priority === 'normal').length;
    report += `| ${locale.toUpperCase()} | ${high} | ${medium} | ${normal} | ${batches.length} |\n`;
  }
  report += '\n';
  
  // Recommended processing order for each locale
  report += '## Recommended Processing Order\n\n';
  
  for (const locale of TARGET_LOCALES) {
    const batches = localeMap.get(locale)!;
    const localeName = locale === 'es' ? 'Spanish' : 
                       locale === 'fr' ? 'French' : 
                       locale === 'de' ? 'German' : 'Korean';
    
    report += `### ${locale.toUpperCase()} (${localeName})\n\n`;
    
    // Group by priority
    const highPriority = batches.filter(b => b.priority === 'high');
    const mediumPriority = batches.filter(b => b.priority === 'medium');
    const normalPriority = batches.filter(b => b.priority === 'normal');
    
    if (highPriority.length > 0) {
      report += '#### High Priority Batches (Process First)\n\n';
      for (const batch of highPriority) {
        report += `- **${batch.batchFile}** (${batch.totalGames} games)\n`;
        if (batch.highPriorityGames.length > 0) {
          report += `  - Notable games: ${batch.highPriorityGames.slice(0, 3).join(', ')}`;
          if (batch.highPriorityGames.length > 3) {
            report += ` (+${batch.highPriorityGames.length - 3} more)`;
          }
          report += '\n';
        }
      }
      report += '\n';
    }
    
    if (mediumPriority.length > 0) {
      report += '#### Medium Priority Batches\n\n';
      for (const batch of mediumPriority) {
        report += `- **${batch.batchFile}** (${batch.totalGames} games)\n`;
      }
      report += '\n';
    }
    
    if (normalPriority.length > 0) {
      report += '#### Normal Priority Batches\n\n';
      for (const batch of normalPriority) {
        report += `- ${batch.batchFile} (${batch.totalGames} games)\n`;
      }
      report += '\n';
    }
  }
  
  // Execution plan
  report += '## Execution Plan\n\n';
  report += '### Sequential Processing (Single Team)\n\n';
  report += 'If processing sequentially with one team, recommended order:\n\n';
  
  let step = 1;
  for (const locale of TARGET_LOCALES) {
    const batches = localeMap.get(locale)!;
    const highPriority = batches.filter(b => b.priority === 'high');
    
    if (highPriority.length > 0) {
      report += `${step}. **${locale.toUpperCase()} High Priority** (${highPriority.length} batches)\n`;
      step++;
    }
  }
  
  for (const locale of TARGET_LOCALES) {
    const batches = localeMap.get(locale)!;
    const mediumPriority = batches.filter(b => b.priority === 'medium');
    
    if (mediumPriority.length > 0) {
      report += `${step}. **${locale.toUpperCase()} Medium Priority** (${mediumPriority.length} batches)\n`;
      step++;
    }
  }
  
  report += `${step}. **All Normal Priority** (process in any order)\n\n`;
  
  report += '### Parallel Processing (Multiple Teams)\n\n';
  report += 'If multiple teams are available, assign by locale:\n\n';
  report += '- **Team A (Spanish)**: Process es-batch-* in priority order\n';
  report += '- **Team B (French)**: Process fr-batch-* in priority order\n';
  report += '- **Team C (German)**: Process de-batch-* in priority order\n';
  report += '- **Team D (Korean)**: Process ko-batch-* in priority order\n\n';
  report += 'Each team should follow the priority order listed above for their locale.\n\n';
  
  // Quick reference
  report += '## Quick Reference: First Batches to Process\n\n';
  report += '```bash\n';
  for (const locale of TARGET_LOCALES) {
    const batches = localeMap.get(locale)!;
    const firstBatch = batches[0];
    report += `# ${locale.toUpperCase()}: Start with ${firstBatch.batchFile} (${firstBatch.priority} priority)\n`;
  }
  report += '```\n\n';
  
  return report;
}

// Main execution
console.log('Analyzing batch priorities...\n');

const localeMap = analyzeBatchPriorities();
const report = generatePriorityReport(localeMap);

// Write report
const reportPath = 'locale-batch-priority-order.md';
fs.writeFileSync(reportPath, report, 'utf-8');

console.log(`✓ Priority analysis complete!`);
console.log(`✓ Report written to: ${reportPath}\n`);

// Print summary
console.log('Priority Summary:');
console.log('-----------------');
for (const locale of TARGET_LOCALES) {
  const batches = localeMap.get(locale)!;
  const high = batches.filter(b => b.priority === 'high').length;
  const medium = batches.filter(b => b.priority === 'medium').length;
  const normal = batches.filter(b => b.priority === 'normal').length;
  console.log(`${locale.toUpperCase()}: ${high} high, ${medium} medium, ${normal} normal priority batches`);
}

console.log('\nRecommended first batches:');
for (const locale of TARGET_LOCALES) {
  const batches = localeMap.get(locale)!;
  const firstBatch = batches[0];
  console.log(`  ${locale.toUpperCase()}: ${firstBatch.batchFile} (${firstBatch.priority} priority)`);
}
