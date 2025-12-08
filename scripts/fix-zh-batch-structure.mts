#!/usr/bin/env node --experimental-strip-types
/**
 * Script to fix structure mismatches in zh batch files
 * Removes [ZH TRANSLATION NEEDED] prefixes from numbered list items and nested list items
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

function fixListItemStructure(content: string): string {
  // Pattern 1: Fix numbered list items with [ZH TRANSLATION NEEDED] prefix
  // Match: [ZH TRANSLATION NEEDED] 1.  **Title:**
  // Replace with: 1.  **Title:**
  content = content.replace(/\[ZH TRANSLATION NEEDED\] (\d+\.\s+\*\*[^*]+\*\*:)/g, '$1');
  
  // Pattern 2: Fix nested list items under Player 1/2 in Controls sections
  // Match: [ZH TRANSLATION NEEDED]     *   **Move:**
  // Replace with:     *   **Move:**
  content = content.replace(/\[ZH TRANSLATION NEEDED\](\s+\*\s+\*\*[^*]+\*\*:)/g, '$1');
  
  // Pattern 3: Fix nested list items under FAQ answers
  // Match: [ZH TRANSLATION NEEDED]     *   **A:**
  // Replace with:     *   **A:**
  content = content.replace(/\[ZH TRANSLATION NEEDED\](\s+\*\s+\*\*[A-Z]:\*\*)/g, '$1');
  
  // Pattern 4: Fix list items with [ZH TRANSLATION NEEDED] prefix (with leading spaces)
  // Match: [ZH TRANSLATION NEEDED]  -  **Text:**
  // Replace with:  -  **Text:**
  content = content.replace(/\[ZH TRANSLATION NEEDED\](\s+-\s+)/g, '$1');
  
  // Pattern 5: Fix list items with [ZH TRANSLATION NEEDED] prefix (no leading spaces)
  // Match: [ZH TRANSLATION NEEDED] -  **Text:**
  // Replace with: -  **Text:**
  content = content.replace(/\[ZH TRANSLATION NEEDED\] (-\s+)/g, '$1');
  
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
    const fixedContent = fixListItemStructure(originalContent);
    
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
    console.error('Usage: node --experimental-strip-types scripts/fix-zh-batch-structure.mts <batch-file> [batch-file...]');
    console.error('Example: node --experimental-strip-types scripts/fix-zh-batch-structure.mts structure-batches/zh-batch-2.json');
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
