#!/usr/bin/env node

/**
 * Translate JA Batch 2 (N-Z games) - 210 games
 * 
 * This script translates games from English to Japanese for batch 2,
 * maintaining structural consistency with Chinese translations.
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

console.log(`\n📊 JA Batch 2 Translation Status`);
console.log(`Total games in batch: ${batch2Games.length}`);

let needsTranslation = 0;
let alreadyTranslated = 0;

for (const game of batch2Games) {
  const jaFile = path.join(GAMES_DIR, `${game}.ja.md`);
  
  if (fs.existsSync(jaFile)) {
    const content = fs.readFileSync(jaFile, 'utf-8');
    if (content.includes('[JA TRANSLATION NEEDED]')) {
      needsTranslation++;
    } else {
      alreadyTranslated++;
    }
  }
}

console.log(`✅ Already translated: ${alreadyTranslated}`);
console.log(`⏳ Needs translation: ${needsTranslation}`);
console.log(`\n📝 Games to translate:`);

const gamesToTranslate = batch2Games.filter(game => {
  const jaFile = path.join(GAMES_DIR, `${game}.ja.md`);
  if (fs.existsSync(jaFile)) {
    const content = fs.readFileSync(jaFile, 'utf-8');
    return content.includes('[JA TRANSLATION NEEDED]');
  }
  return false;
});

console.log(gamesToTranslate.join('\n'));
console.log(`\n📊 Total: ${gamesToTranslate.length} games`);
