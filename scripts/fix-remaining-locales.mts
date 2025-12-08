#!/usr/bin/env node --experimental-strip-types
/**
 * Script to automatically fix all remaining locale batch structure mismatches
 * Processes es, fr, de, ko locales
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function main() {
  const locales = ['es', 'fr', 'de', 'ko'];
  
  console.log('🔧 Starting automated fixes for remaining locales...\n');
  console.log('Locales to process:', locales.join(', '));
  
  for (const locale of locales) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing ${locale.toUpperCase()} batches`);
    console.log('='.repeat(60));
    
    // Find all batches for this locale
    const batchFiles = fs.readdirSync('structure-batches')
      .filter(f => f.startsWith(`${locale}-batch-`) && f.endsWith('.json'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/batch-(\d+)/)?.[1] || '0');
        const numB = parseInt(b.match(/batch-(\d+)/)?.[1] || '0');
        return numA - numB;
      });
    
    console.log(`Found ${batchFiles.length} batches for ${locale}`);
    
    for (const batchFile of batchFiles) {
      const batchPath = `structure-batches/${batchFile}`;
      const batchNum = batchFile.match(/batch-(\d+)/)?.[1];
      
      console.log(`\n📦 Processing batch ${batchNum}...`);
      
      // Run the fix script
      try {
        execSync(`node --experimental-strip-types scripts/fix-locale-list-indentation.mts ${batchPath}`, {
          stdio: 'inherit'
        });
      } catch (error) {
        console.error(`Error processing batch ${batchNum}:`, error);
      }
      
      // Validate the batch
      try {
        const result = execSync(
          `node --experimental-strip-types scripts/validate-structure-batch.mts --batch ${batchPath}`,
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
    
    console.log(`\n✅ Completed all batches for ${locale.toUpperCase()}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All locales processed!');
  console.log('='.repeat(60));
  console.log('\nRunning final global validation...');
  
  // Run global validation
  try {
    execSync('npm run validate:i18n', { stdio: 'inherit' });
  } catch (error) {
    console.log('Some mismatches remain. Manual review may be needed.');
  }
}

main().catch(console.error);
