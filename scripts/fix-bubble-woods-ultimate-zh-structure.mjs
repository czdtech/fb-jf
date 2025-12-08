#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'content', 'games', 'bubble-woods-ultimate.zh.md');
let s = fs.readFileSync(filePath, 'utf8');

s = s.replace('*   [ZH TRANSLATION NEEDED] **Rainbow Bubble:** Will act as any color it touches, helping you complete a match.',
  '    *   [ZH TRANSLATION NEEDED] **Rainbow Bubble:** Will act as any color it touches, helping you complete a match.');

s = s.replace('*   [ZH TRANSLATION NEEDED] **Bomb Bubble:** Explodes on impact, clearing a small cluster.',
  '    *   [ZH TRANSLATION NEEDED] **Bomb Bubble:** Explodes on impact, clearing a small cluster.');

s = s.replace('*   [ZH TRANSLATION NEEDED] **Hourglass:** The most valuable one—hitting it adds a few precious seconds to your timer.',
  '    *   [ZH TRANSLATION NEEDED] **Hourglass:** The most valuable one—hitting it adds a few precious seconds to your timer.');

fs.writeFileSync(filePath, s, 'utf8');
console.log('Patched bubble-woods-ultimate.zh.md power-up bullet indents.');
