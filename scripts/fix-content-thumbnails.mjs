#!/usr/bin/env node

/**
 * Script to fix thumbnail paths in content collection markdown files
 * Converts URL-encoded spaces and capitalized names to kebab-case
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Mapping of old filenames to new filenames
const imageMapping = {
  'Dandyrunki Retake.png': 'dandyrunki-retake.png',
  'Incredibox Cool As Ice.png': 'incredibox-cool-as-ice.png',
  'Incredibox Shatter Sprunk.png': 'incredibox-shatter-sprunk.png',
  'Incredibox Sprinkle.png': 'incredibox-sprinkle.png',
  'Incredibox Yellow Colorbox.png': 'incredibox-yellow-colorbox.png',
  'Sprunki Basical.png': 'sprunki-basical.png',
  'Sprunki But With Memes.png': 'sprunki-but-with-memes.png',
  'Sprunki Christmas.png': 'sprunki-christmas.png',
  'Sprunki Cool As Ice.png': 'sprunki-cool-as-ice.png',
  'Sprunki Craft.jpg': 'sprunki-craft.jpg',
  'Sprunki Custom.png': 'sprunki-custom.png',
  'Sprunki Dandys World.png': 'sprunki-dandys-world.png',
  'Sprunki Eggs Mix.png': 'sprunki-eggs-mix.png',
  'Sprunki Good Night.png': 'sprunki-good-night.png',
  'Sprunki Halloween.png': 'sprunki-halloween.png',
  'Sprunki Interactive Beta.png': 'sprunki-interactive-beta.png',
  'Sprunki Like Minecraft.png': 'sprunki-like-minecraft.png',
  'Sprunki Maker.png': 'sprunki-maker.png',
  'Sprunki Meets The Cat Spell.png': 'sprunki-meets-the-cat-spell.png',
  'Sprunki Mod BFDI.png': 'sprunki-mod-bfdi.png',
  'Sprunki Mountayonnaise.png': 'sprunki-mountayonnaise.png',
  'Sprunki Mustard.png': 'sprunki-mustard.png',
  'Sprunki Night Time.png': 'sprunki-night-time.png',
  'Sprunki Phase 5.png': 'sprunki-phase-5.png',
  'Sprunki Play Random.png': 'sprunki-play-random.png',
  'Sprunki Police And Prisoners.png': 'sprunki-police-and-prisoners.png',
  'Sprunki Pyramixed 0.9.png': 'sprunki-pyramixed-0.9.png',
  'Sprunki Retake New Human.png': 'sprunki-retake-new-human.png',
  'Sprunki Retake.png': 'sprunki-retake.png',
  'Sprunki Sepbox Steel Factory.png': 'sprunki-sepbox-steel-factory.png',
  'Sprunki Sonic.png': 'sprunki-sonic.png',
  'Sprunki Swapped Horror.png': 'sprunki-swapped-horror.png',
  'Sprunki virus NEW UPDATE.png': 'sprunki-virus-new-update.png',
  'Sprunkr But Sprunki.png': 'sprunkr-but-sprunki.png',
  'Super Sprunki Brasil.png': 'super-sprunki-brasil.png',
  'Swap Sprunkgerny.png': 'swap-sprunkgerny.png'
};

function urlEncode(str) {
  return str.replace(/ /g, '%20');
}

function fixContentFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let updated = false;
  
  // Fix each image mapping
  for (const [oldName, newName] of Object.entries(imageMapping)) {
    const oldEncoded = urlEncode(oldName);
    const oldPattern = `thumbnail: "/${oldEncoded}"`;
    const newPattern = `thumbnail: "/${newName}"`;
    
    if (content.includes(oldPattern)) {
      content = content.replace(oldPattern, newPattern);
      updated = true;
    }
  }
  
  if (updated) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  return false;
}

function findContentFiles() {
  const contentDir = path.join(rootDir, 'src/content/games');
  const files = fs.readdirSync(contentDir);
  return files
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(contentDir, f));
}

async function main() {
  console.log('🔍 Finding content files with old thumbnail paths...\n');
  
  const contentFiles = findContentFiles();
  let updatedCount = 0;
  
  for (const file of contentFiles) {
    if (fixContentFile(file)) {
      const basename = path.basename(file);
      console.log(`  ✓ Updated ${basename}`);
      updatedCount++;
    }
  }
  
  if (updatedCount === 0) {
    console.log('✅ No files needed updating!');
  } else {
    console.log(`\n✅ Updated ${updatedCount} content files!`);
  }
}

main().catch(console.error);
