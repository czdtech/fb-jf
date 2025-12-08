#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'content', 'games', 'bubble-tower.zh.md');
let s = fs.readFileSync(filePath, 'utf8');

// Indent nested control bullets to match canonical structure
s = s.replace('*   [ZH TRANSLATION NEEDED] **Mouse:** Click and drag the background to rotate the tower.',
  '    *   [ZH TRANSLATION NEEDED] **Mouse:** Click and drag the background to rotate the tower.');

s = s.replace('*   [ZH TRANSLATION NEEDED] **Keyboard:** Use the Left and Right arrow keys.',
  '    *   [ZH TRANSLATION NEEDED] **Keyboard:** Use the Left and Right arrow keys.');

s = s.replace('*   [ZH TRANSLATION NEEDED] **Mouse:** Your cannon aims automatically based on your cursor\'s position. Click the left mouse button to shoot the bubble.',
  '    *   [ZH TRANSLATION NEEDED] **Mouse:** Your cannon aims automatically based on your cursor\'s position. Click the left mouse button to shoot the bubble.');

fs.writeFileSync(filePath, s, 'utf8');
console.log('Patched bubble-tower.zh.md control bullet indents.');
