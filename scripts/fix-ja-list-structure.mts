#!/usr/bin/env node
/**
 * Fix Japanese files to ensure list items are properly formatted
 * Move [JA TRANSLATION NEEDED] markers inside list items, not before them
 */

import fs from 'fs';
import path from 'path';

const games = [
  '2048-pizza',
  '248-deluxe-wooden-edition',
  '3d-football-mania',
  '3d-free-kick',
  '4-in-row-mania',
  '8x8-match-tiles',
  '99-balls-3d',
  'addiction-mini',
  'age-of-war',
  'air-traffic-control',
  'alien-hominid',
];

for (const game of games) {
  const filePath = path.join('src/content/games', `${game}.ja.md`);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Fix numbered list items: move [JA TRANSLATION NEEDED] after the number
  content = content.replace(
    /^(\[JA TRANSLATION NEEDED\])\s+(\d+\.\s+)/gm,
    '$2$1 '
  );
  
  // Fix FAQ answers: ensure proper indentation for list items
  content = content.replace(
    /^(\[JA TRANSLATION NEEDED\])\s+(\*\s+\*\*A:\*\*)/gm,
    '    $2 $1'
  );
  
  // Also fix cases where the answer is already indented but marker is before
  content = content.replace(
    /^(\[JA TRANSLATION NEEDED\])\s+(    \*\s+\*\*A:\*\*)/gm,
    '$2 $1'
  );
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ Fixed ${game}.ja.md`);
}

console.log('\nAll files fixed!');
