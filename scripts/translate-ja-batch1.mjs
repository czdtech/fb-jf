#!/usr/bin/env node

/**
 * Batch translation script for JA batch 1 (A-M games)
 * This script translates game content files from English to Japanese
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Load batch configuration
const batchConfigPath = path.join(projectRoot, '.kiro/specs/full-i18n-content/ja-translation-batches.json');
const batchConfig = JSON.parse(await fs.readFile(batchConfigPath, 'utf-8'));

const batch1Games = batchConfig.batches['batch-1-A-M'].games;

console.log(`Found ${batch1Games.length} games in batch 1`);

// Translation function (placeholder - would use actual translation service)
async function translateContent(englishContent) {
  // This is a placeholder. In a real implementation, you would:
  // 1. Use a translation API (Google Translate, DeepL, etc.)
  // 2. Or use an LLM API for better context-aware translation
  // 3. Preserve markdown structure and special formatting
  
  // For now, just remove the [JA TRANSLATION NEEDED] markers
  // and indicate that manual translation is needed
  return englishContent.replace(/\[JA TRANSLATION NEEDED\] /g, '');
}

// Process a single game file
async function processGame(slug) {
  const enPath = path.join(projectRoot, 'src/content/games', `${slug}.en.md`);
  const jaPath = path.join(projectRoot, 'src/content/games', `${slug}.ja.md`);
  
  try {
    // Check if English source exists
    const enExists = await fs.access(enPath).then(() => true).catch(() => false);
    if (!enExists) {
      console.log(`⚠️  Skipping ${slug}: English source not found`);
      return { slug, status: 'skipped', reason: 'no-english-source' };
    }
    
    // Check if JA stub exists
    const jaExists = await fs.access(jaPath).then(() => true).catch(() => false);
    if (!jaExists) {
      console.log(`⚠️  Skipping ${slug}: JA stub not found`);
      return { slug, status: 'skipped', reason: 'no-ja-stub' };
    }
    
    // Read JA stub
    const jaContent = await fs.readFile(jaPath, 'utf-8');
    
    // Check if already translated (no [JA TRANSLATION NEEDED] markers)
    if (!jaContent.includes('[JA TRANSLATION NEEDED]')) {
      console.log(`✓ ${slug}: Already translated`);
      return { slug, status: 'already-translated' };
    }
    
    console.log(`📝 ${slug}: Needs translation`);
    return { slug, status: 'needs-translation' };
    
  } catch (error) {
    console.error(`❌ Error processing ${slug}:`, error.message);
    return { slug, status: 'error', error: error.message };
  }
}

// Main execution
async function main() {
  console.log('Starting JA Batch 1 translation analysis...\n');
  
  const results = [];
  
  for (const slug of batch1Games) {
    const result = await processGame(slug);
    results.push(result);
  }
  
  // Summary
  console.log('\n=== Summary ===');
  const alreadyTranslated = results.filter(r => r.status === 'already-translated').length;
  const needsTranslation = results.filter(r => r.status === 'needs-translation').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const errors = results.filter(r => r.status === 'error').length;
  
  console.log(`Already translated: ${alreadyTranslated}`);
  console.log(`Needs translation: ${needsTranslation}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${results.length}`);
  
  // Save detailed results
  const reportPath = path.join(projectRoot, '.kiro/specs/full-i18n-content/ja-batch1-translation-status.json');
  await fs.writeFile(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
  console.log(`\nDetailed report saved to: ${reportPath}`);
}

main().catch(console.error);
