#!/usr/bin/env node --experimental-strip-types
/**
 * Script to automatically fix all zh batch structure mismatches
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function main() {
  console.log('🔧 Starting automated zh batch fixes...\n');
  
  // Process batches 3-29
  for (let batchNum = 3; batchNum <= 29; batchNum++) {
    const batchFile = `structure-batches/zh-batch-${batchNum}.json`;
    
    if (!fs.existsSync(batchFile)) {
      console.log(`⚠️  Batch file not found: ${batchFile}`);
      continue;
    }
    
    console.log(`\n📦 Processing batch ${batchNum}...`);
    
    // Run the fix script
    try {
      execSync(`node --experimental-strip-types scripts/fix-zh-batch-structure.mts ${batchFile}`, {
        stdio: 'inherit'
      });
    } catch (error) {
      console.error(`Error processing batch ${batchNum}:`, error);
    }
    
    // Validate the batch
    try {
      const result = execSync(
        `node --experimental-strip-types scripts/validate-structure-batch.mts --batch ${batchFile}`,
        { encoding: 'utf-8' }
      );
      
      // Extract summary
      const summaryMatch = result.match(/✅ Fixed: (\d+)/);
      const mismatchMatch = result.match(/❌ Still mismatched: (\d+)/);
      
      if (summaryMatch && mismatchMatch) {
        const fixed = parseInt(summaryMatch[1]);
        const mismatched = parseInt(mismatchMatch[1]);
        console.log(`  Result: ${fixed} fixed, ${mismatched} still mismatched`);
      }
    } catch (error) {
      // Validation might exit with non-zero if there are mismatches
      console.log(`  Validation completed for batch ${batchNum}`);
    }
  }
  
  console.log('\n✅ All batches processed!');
  console.log('\nRunning final global validation...');
  
  // Run global validation
  try {
    execSync('npm run validate:i18n', { stdio: 'inherit' });
  } catch (error) {
    console.log('Some mismatches remain. Manual review may be needed.');
  }
}

main().catch(console.error);
