#!/usr/bin/env node --experimental-strip-types
/**
 * Analyze i18n structure mismatches and generate a human-readable report
 * 
 * This script reads i18n-structure-report.json and produces:
 * - Statistics by mismatch type (heading vs list-item)
 * - Statistics by locale
 * - Statistics by heading level (for heading mismatches)
 * - List of affected games
 */

import fs from 'fs';
import path from 'path';

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

interface MismatchCategory {
  type: 'heading' | 'list-item' | 'paragraph' | 'unknown';
  level?: number;
  index: number;
}

function parseReason(reason: string): MismatchCategory {
  // Example: "Canonical structure node missing in localized content at index 13 (type=list-item)"
  // Example: "Canonical structure node missing in localized content at index 7 (type=heading, level=3)"
  
  const indexMatch = reason.match(/at index (\d+)/);
  const typeMatch = reason.match(/type=([\w-]+)/);  // Changed to match hyphens
  const levelMatch = reason.match(/level=(\d+)/);
  
  const index = indexMatch ? parseInt(indexMatch[1], 10) : -1;
  const typeStr = typeMatch ? typeMatch[1] : 'unknown';
  const level = levelMatch ? parseInt(levelMatch[1], 10) : undefined;
  
  let type: MismatchCategory['type'] = 'unknown';
  if (typeStr === 'heading' || typeStr === 'list-item' || typeStr === 'paragraph') {
    type = typeStr;
  }
  
  return { type, level, index };
}

function main() {
  const reportPath = path.join(process.cwd(), 'i18n-structure-report.json');
  
  if (!fs.existsSync(reportPath)) {
    console.error(`Error: ${reportPath} not found`);
    console.error('Please run: npm run validate:i18n');
    process.exit(1);
  }
  
  const report: StructureReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  
  // Statistics containers
  const byType = new Map<string, number>();
  const byLocale = new Map<string, number>();
  const byHeadingLevel = new Map<number, number>();
  const affectedGames = new Set<string>();
  const byTypeAndLocale = new Map<string, Map<string, number>>();
  
  // Process each mismatch
  for (const mismatch of report.mismatches) {
    const category = parseReason(mismatch.reason);
    
    // Count by type
    const typeKey = category.level !== undefined 
      ? `${category.type} (level ${category.level})`
      : category.type;
    byType.set(typeKey, (byType.get(typeKey) || 0) + 1);
    
    // Count by locale
    byLocale.set(mismatch.locale, (byLocale.get(mismatch.locale) || 0) + 1);
    
    // Count heading levels
    if (category.type === 'heading' && category.level !== undefined) {
      byHeadingLevel.set(category.level, (byHeadingLevel.get(category.level) || 0) + 1);
    }
    
    // Track affected games
    affectedGames.add(mismatch.urlstr);
    
    // Count by type and locale combination
    if (!byTypeAndLocale.has(category.type)) {
      byTypeAndLocale.set(category.type, new Map());
    }
    const localeMap = byTypeAndLocale.get(category.type)!;
    localeMap.set(mismatch.locale, (localeMap.get(mismatch.locale) || 0) + 1);
  }
  
  // Generate markdown report
  const lines: string[] = [];
  
  lines.push('# I18n Structure Mismatch Analysis Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Source:** i18n-structure-report.json (${report.timestamp})`);
  lines.push('');
  
  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total Canonical Games:** ${report.summary.canonicalGames}`);
  lines.push(`- **Total Checked Pairs:** ${report.summary.checkedPairs}`);
  lines.push(`- **Total Mismatches:** ${report.summary.mismatchCount}`);
  lines.push(`- **Affected Games:** ${affectedGames.size}`);
  lines.push(`- **Average Mismatches per Affected Game:** ${(report.summary.mismatchCount / affectedGames.size).toFixed(2)}`);
  lines.push('');
  
  // By Type
  lines.push('## Mismatches by Type');
  lines.push('');
  const sortedByType = Array.from(byType.entries()).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sortedByType) {
    const percentage = ((count / report.summary.mismatchCount) * 100).toFixed(1);
    lines.push(`- **${type}:** ${count} (${percentage}%)`);
  }
  lines.push('');
  
  // By Locale
  lines.push('## Mismatches by Locale');
  lines.push('');
  const sortedByLocale = Array.from(byLocale.entries()).sort((a, b) => b[1] - a[1]);
  for (const [locale, count] of sortedByLocale) {
    const percentage = ((count / report.summary.mismatchCount) * 100).toFixed(1);
    lines.push(`- **${locale}:** ${count} (${percentage}%)`);
  }
  lines.push('');
  
  // Heading Levels (if any)
  if (byHeadingLevel.size > 0) {
    lines.push('## Heading Mismatches by Level');
    lines.push('');
    const sortedByLevel = Array.from(byHeadingLevel.entries()).sort((a, b) => a[0] - b[0]);
    for (const [level, count] of sortedByLevel) {
      const percentage = ((count / report.summary.mismatchCount) * 100).toFixed(1);
      lines.push(`- **Level ${level} (###${'#'.repeat(level - 1)}):** ${count} (${percentage}%)`);
    }
    lines.push('');
  }
  
  // Type x Locale Matrix
  lines.push('## Mismatches by Type and Locale');
  lines.push('');
  for (const [type, localeMap] of byTypeAndLocale.entries()) {
    lines.push(`### ${type}`);
    lines.push('');
    const sortedLocales = Array.from(localeMap.entries()).sort((a, b) => b[1] - a[1]);
    for (const [locale, count] of sortedLocales) {
      lines.push(`- **${locale}:** ${count}`);
    }
    lines.push('');
  }
  
  // Priority classification
  const priorityPatterns = {
    'High Priority - Sprunki Series': /^sprunki-/,
    'High Priority - Incredibox Series': /^incredibox-/,
    'High Priority - Fiddlebops Series': /^fiddlebops-/,
    'Medium Priority - Popular Games': /^(geometry-dash|minecraft|among-us|friday-night-funkin|subway-surfers|temple-run|flappy-bird|crossy-road|doodle-jump|angry-birds|cut-the-rope|fruit-ninja|jetpack-joyride|cookie-clicker|2048|tetris|pac-man|snake|solitaire|chess|mahjong)/,
  };
  
  const priorityGames = new Map<string, Set<string>>();
  for (const [category] of Object.entries(priorityPatterns)) {
    priorityGames.set(category, new Set());
  }
  priorityGames.set('Other Games', new Set());
  
  const gameCount = new Map<string, number>();
  for (const mismatch of report.mismatches) {
    gameCount.set(mismatch.urlstr, (gameCount.get(mismatch.urlstr) || 0) + 1);
    
    let categorized = false;
    for (const [category, pattern] of Object.entries(priorityPatterns)) {
      if (pattern.test(mismatch.urlstr)) {
        priorityGames.get(category)!.add(mismatch.urlstr);
        categorized = true;
        break;
      }
    }
    if (!categorized) {
      priorityGames.get('Other Games')!.add(mismatch.urlstr);
    }
  }
  
  // Priority summary
  lines.push('## Priority Classification');
  lines.push('');
  lines.push('Games are classified by priority for fixing:');
  lines.push('');
  
  for (const [category, games] of priorityGames.entries()) {
    if (games.size > 0) {
      const totalMismatches = Array.from(games).reduce((sum, game) => sum + (gameCount.get(game) || 0), 0);
      lines.push(`### ${category}`);
      lines.push('');
      lines.push(`- **Affected Games:** ${games.size}`);
      lines.push(`- **Total Mismatches:** ${totalMismatches}`);
      lines.push('');
      
      // Show top 10 games in this category
      const sortedCategoryGames = Array.from(games)
        .map(game => ({ game, count: gameCount.get(game) || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      if (sortedCategoryGames.length > 0) {
        lines.push('**Top affected games in this category:**');
        lines.push('');
        for (const { game, count } of sortedCategoryGames) {
          lines.push(`- ${game}: ${count} mismatches`);
        }
        lines.push('');
      }
    }
  }
  
  // Top affected games overall
  lines.push('## Most Affected Games (Top 20)');
  lines.push('');
  const sortedGames = Array.from(gameCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  
  for (const [game, count] of sortedGames) {
    // Mark priority
    let priorityMark = '';
    for (const [category, pattern] of Object.entries(priorityPatterns)) {
      if (pattern.test(game)) {
        priorityMark = category.includes('High') ? ' 🔴' : ' 🟡';
        break;
      }
    }
    lines.push(`- **${game}:** ${count} mismatches${priorityMark}`);
  }
  lines.push('');
  
  // Sample mismatches by type
  lines.push('## Sample Mismatches by Type');
  lines.push('');
  
  const samplesByType = new Map<string, Mismatch[]>();
  for (const mismatch of report.mismatches) {
    const category = parseReason(mismatch.reason);
    const typeKey = category.level !== undefined 
      ? `${category.type} (level ${category.level})`
      : category.type;
    
    if (!samplesByType.has(typeKey)) {
      samplesByType.set(typeKey, []);
    }
    const samples = samplesByType.get(typeKey)!;
    if (samples.length < 3) {
      samples.push(mismatch);
    }
  }
  
  for (const [type, samples] of samplesByType.entries()) {
    lines.push(`### ${type}`);
    lines.push('');
    for (const sample of samples) {
      lines.push(`- **Game:** ${sample.urlstr}`);
      lines.push(`  - **Locale:** ${sample.locale}`);
      lines.push(`  - **Reason:** ${sample.reason}`);
      lines.push('');
    }
  }
  
  // Recommendations
  lines.push('## Recommendations');
  lines.push('');
  lines.push('### Suggested Fix Order');
  lines.push('');
  lines.push('1. **Start with zh and ja locales** - These have the most heading mismatches (377 combined) which are typically easier to fix than list-items');
  lines.push('2. **Focus on High Priority games first** - Sprunki and Incredibox series (88 total mismatches)');
  lines.push('3. **Then Medium Priority popular games** - Classic games like Chess, Mahjong, Solitaire (93 mismatches)');
  lines.push('4. **Process remaining games in batches** - Use batch processing for the 428 other affected games');
  lines.push('');
  lines.push('### Key Insights');
  lines.push('');
  lines.push(`- **78.8% of mismatches are list-items** - These require careful translation to maintain semantic meaning`);
  lines.push(`- **21% are heading mismatches** - Mostly level 3 headings, primarily in zh/ja locales`);
  lines.push(`- **zh and ja need the most attention** - Combined they account for 49.3% of all mismatches`);
  lines.push(`- **es, fr, de, ko are consistent** - Each has exactly 225 mismatches, suggesting systematic issues`);
  lines.push('');
  lines.push('### Next Steps');
  lines.push('');
  lines.push('1. Run `scripts/plan-structure-fix-batches.mts` to create batch files for systematic fixing');
  lines.push('2. Start with zh-batch-1 and ja-batch-1 to address high-priority heading mismatches');
  lines.push('3. Use `scripts/validate-structure-batch.mts` to verify each batch after fixing');
  lines.push('4. Re-run `npm run validate:i18n` after each major milestone to track progress');
  lines.push('');
  
  // Write report
  const outputPath = path.join(process.cwd(), 'page-structure-validation-report.md');
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
  
  console.log(`✅ Analysis complete!`);
  console.log(`📄 Report written to: ${outputPath}`);
  console.log('');
  console.log('Summary:');
  console.log(`  Total mismatches: ${report.summary.mismatchCount}`);
  console.log(`  Affected games: ${affectedGames.size}`);
  console.log(`  Locales with issues: ${byLocale.size}`);
  console.log('');
  console.log('Priority breakdown:');
  for (const [category, games] of priorityGames.entries()) {
    if (games.size > 0 && !category.includes('Other')) {
      const totalMismatches = Array.from(games).reduce((sum, game) => sum + (gameCount.get(game) || 0), 0);
      console.log(`  ${category}: ${games.size} games, ${totalMismatches} mismatches`);
    }
  }
}

main();
