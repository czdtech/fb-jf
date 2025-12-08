#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'content', 'games', 'bejeweled.zh.md');
let s = fs.readFileSync(filePath, 'utf8');

// Convert stubbed list items back to paragraph-style where canonical uses paragraphs.
// 1) "Special Gems" line should be a paragraph, not a list item.
s = s.replace(' - **Special Gems:', '  **Special Gems:');

// 2) "Game Modes" line should also be a paragraph.
s = s.replace('    - **Game Modes:', '   **Game Modes:');

// 3) FAQ questions should be paragraphs, not list items.
s = s.replace('  - **Q: Is Bejeweled free to play?**', '  **Q: Is Bejeweled free to play?**');
s = s.replace('  - **Q: What happens when there are "No More Moves"?**', '  **Q: What happens when there are "No More Moves"?**');
s = s.replace('  - **Q: What is the difference between Bejeweled Classic and Bejeweled Blitz?**', '  **Q: What is the difference between Bejeweled Classic and Bejeweled Blitz?**');

fs.writeFileSync(filePath, s, 'utf8');
console.log('Patched bejeweled.zh.md structure.');
