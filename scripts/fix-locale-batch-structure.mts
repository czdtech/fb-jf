#!/usr/bin/env node --experimental-strip-types
/**
 * Script to fix structure mismatches in locale batch files
 * Removes [LOCALE TRANSLATION NEEDED] or **[LOCALE]** prefixes from list items
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
}

function fixListItemStructure(content: string, locale: string): string {
  const localeUpper = locale.toUpperCase();
  
  // Pattern 1: Remove **[LOCALE]** prefix from list items
  // Match: *   **[ES]** **Text:**
  // Replace with: *   **Text:**
  const pattern1 = new RegExp(`(\\s*[*-]\\s+)\\*\\*\\[${localeUpper}\\]\\*\\*\\s+`, 'g');
  content = content.replace(pattern1, '$1');
  
  // Pattern 2: Remove **[LOCALE]** prefix from nested list items with indentation
  // Match:     *   **[ES]** **Text:**
  // Replace with:     *   **Text:**
  const pattern2 = new RegExp(`(\\s+[*-]\\s+)\\*\\*\\[${localeUpper}\\]\\*\\*\\s+`, 'g');
  content = content.replace(pattern2, '$1');
  
  // Pattern 3: Remove [LOCALE TRANSLATION NEEDED] prefix from numbered list items
  // Match: [ES TRANSLATION NEEDED] 1.  **Title:**
  // Replace with: 1.  **Title:**
  const pattern3 = new RegExp(`\\[${localeUpper} TRANSLATION NEEDED\\] (\\d+\\.\\s+\\*\\*[^*]+\\*\\*:)`, 'g');
  content = content.replace(pattern3, '$1');
  
  // Pattern 4: Remove [LOCALE TRANSLATION NEEDED] prefix from nested list items
  // Match: [ES TRANSLATION NEEDED]     *   **Move:**
  // Replace with:     *   **Move:**
  const pattern4 = new RegExp(`\\[${localeUpper} TRANSLATION NEEDED\\](\\s+\\*\\s+\\*\\*[^*]+\\*\\*:)`, 'g');
  content = content.replace(pattern4, '$1');
  
  // Pattern 5: Remove [LOCALE TRANSLATION NEEDED] prefix from list items
  // Match: [ES TRANSLATION NEEDED]  -  **Text:**
  // Replace with:  -  **Text:**
  const pattern5 = new RegExp(`\\[${localeUpper} TRANSLATION NEEDED\\](\\s+-\\s+)`, 'g');
  content = content.replace(pattern5, '$1');
  
  // Pattern 6: Remove [LOCALE TRANSLATION NEEDED] prefix (no leading spaces)
  // Match: [ES TRANSLATION NEEDED] -  **Text:**
  // Replace with: -  **Text:**
  const pattern6 = new RegExp(`\\[${localeUpper} TRANSLATION NEEDED\\] (-\\s+)`, 'g');
  content = content.replace(pattern6, '$1');
  
  return content;
}

async function fixBatchFiles(batchPath: string) {
  const batchContent = fs.readFileSync(batchPath, 'utf-8');
  const batch: Batch = JSON.parse(batchContent);
  
  console.log(`\nProcessing ${batch.locale}-batch-${batch.batchNumber} (${batch.items.length} files)...`);
  
  let fixedCount = 0;
  
  for (const item of batch.items) {
    const localizedPath = path.join('src/content/games', item.localizedFile);
    
    if (!fs.existsSync(localizedPath)) {
      console.log(`  ⚠️  File not found: ${localizedPath}`);
      continue;
    }
    
    const originalContent = fs.readFileSync(localizedPath, 'utf-8');
    const fixedContent = fixListItemStructure(originalContent, batch.locale);
    
    if (originalContent !== fixedContent) {
      fs.writeFileSync(localizedPath, fixedContent, 'utf-8');
      console.log(`  ✓ Fixed: ${item.urlstr}`);
      fixedCount++;
    } else {
      console.log(`  - No changes needed: ${item.urlstr}`);
    }
  }
  
  console.log(`Completed batch ${batch.batchNumber}: ${fixedCount}/${batch.items.length} files fixed`);
  return fixedCount;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node --experimental-strip-types scripts/fix-locale-batch-structure.mts <batch-file> [batch-file...]');
    console.error('Example: node --experimental-strip-types scripts/fix-locale-batch-structure.mts structure-batches/es-batch-1.json');
    process.exit(1);
  }
  
  let totalFixed = 0;
  
  for (const batchPath of args) {
    if (!fs.existsSync(batchPath)) {
      console.error(`Batch file not found: ${batchPath}`);
      continue;
    }
    
    const fixed = await fixBatchFiles(batchPath);
    totalFixed += fixed;
  }
  
  console.log(`\n✅ Total files fixed across all batches: ${totalFixed}`);
}

main().catch(console.error);
