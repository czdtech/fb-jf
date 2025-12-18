#!/usr/bin/env node

/**
 * Batch translate JA Batch 2 games
 * This script provides a framework for translating all batch 2 games
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GAMES_DIR = path.join(__dirname, '../src/content/games');

// Load batch configuration
const batchConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../.kiro/specs/full-i18n-content/ja-translation-batches.json'), 'utf-8')
);

const batch2Games = batchConfig.batches['batch-2-N-Z'].games;

console.log(`\n🚀 Starting JA Batch 2 Translation`);
console.log(`Total games: ${batch2Games.length}\n`);

let translated = 0;
let skipped = 0;
let errors = 0;

for (const game of batch2Games) {
  const jaFile = path.join(GAMES_DIR, `${game}.ja.md`);
  const enFile = path.join(GAMES_DIR, `${game}.en.md`);
  const zhFile = path.join(GAMES_DIR, `${game}.zh.md`);
  
  try {
    if (!fs.existsSync(jaFile)) {
      console.log(`⚠️  ${game}: JA file not found`);
      errors++;
      continue;
    }
    
    const jaContent = fs.readFileSync(jaFile, 'utf-8');
    
    if (!jaContent.includes('[JA TRANSLATION NEEDED]')) {
      console.log(`✅ ${game}: Already translated`);
      skipped++;
      continue;
    }
    
    // Check if EN and ZH files exist for reference
    if (!fs.existsSync(enFile)) {
      console.log(`⚠️  ${game}: EN source file not found`);
      errors++;
      continue;
    }
    
    console.log(`📝 ${game}: Needs translation`);
    
  } catch (error) {
    console.error(`❌ ${game}: Error - ${error.message}`);
    errors++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`✅ Already translated: ${skipped}`);
console.log(`📝 Needs translation: ${batch2Games.length - skipped - errors}`);
console.log(`❌ Errors: ${errors}`);
console.log(`\n💡 Next steps:`);
console.log(`1. Translate remaining ${batch2Games.length - skipped - errors} games`);
console.log(`2. Run validation: npm run validate:i18n`);
console.log(`3. Update task status`);
