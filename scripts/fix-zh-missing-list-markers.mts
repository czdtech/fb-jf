#!/usr/bin/env node --experimental-strip-types
/**
 * Script to fix zh files where [ZH TRANSLATION NEEDED] prefix
 * has hidden the list marker, making them not recognized as list items
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

function fixMissingListMarkers(content: string): string {
  const lines = content.split('\n');
  const fixedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Pattern 1: [ZH TRANSLATION NEEDED] followed by bold text with colon (should be a list item)
    // Match: [ZH TRANSLATION NEEDED]   **Special Gems:**
    // Replace with:  - **Special Gems:**
    if (line.match(/^\[ZH TRANSLATION NEEDED\]\s+\*\*[^*]+\*\*:/)) {
      line = line.replace(/^\[ZH TRANSLATION NEEDED\]\s+/, ' - ');
      console.log(`    Fixed missing list marker: ${line.substring(0, 50)}...`);
    }
    
    // Pattern 2: [ZH TRANSLATION NEEDED] with spaces followed by bold text (might be nested list item)
    // Match: [ZH TRANSLATION NEEDED]    **Game Modes:**
    // Replace with:    - **Game Modes:**
    else if (line.match(/^\[ZH TRANSLATION NEEDED\]\s{2,}\*\*/)) {
      line = line.replace(/^\[ZH TRANSLATION NEEDED\](\s+)/, '$1- ');
      console.log(`    Fixed missing nested list marker: ${line.substring(0, 50)}...`);
    }
    
    // Pattern 3: [ZH TRANSLATION NEEDED] followed by text at start of line (might be list item)
    // Check if previous line was a list item or heading
    else if (line.match(/^\[ZH TRANSLATION NEEDED\]\s+\*\*[^*]+\*\*/)) {
      if (i > 0) {
        const prevLine = fixedLines[i - 1];
        // If previous line was a list item or this looks like it should be one
        if (prevLine.trim().match(/^[-*]\s+/) || prevLine.trim().match(/^\d+\.\s+/)) {
          line = line.replace(/^\[ZH TRANSLATION NEEDED\]\s+/, ' - ');
          console.log(`    Fixed missing list marker: ${line.substring(0, 50)}...`);
        }
      }
    }
    
    fixedLines.push(line);
  }
  
  return fixedLines.join('\n');
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
    const fixedContent = fixMissingListMarkers(originalContent);
    
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
    console.error('Usage: node --experimental-strip-types scripts/fix-zh-missing-list-markers.mts <batch-file> [batch-file...]');
    console.error('Example: node --experimental-strip-types scripts/fix-zh-missing-list-markers.mts structure-batches/zh-batch-3.json');
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
