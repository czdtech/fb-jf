#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'content', 'games', 'crossyroad.zh.md');
let s = fs.readFileSync(filePath, 'utf8');

// In the FAQ section, convert list-style Q/A lines back to paragraphs.
s = s.replace('  - **Q: How do I get new characters?**', '  **Q: How do I get new characters?**');
s = s.replace('  - **Q: What\'s the point of the coins?**', '  **Q: What\'s the point of the coins?**');
s = s.replace('  - **Q: Why did an eagle take me away?**', '  **Q: Why did an eagle take me away?**');

fs.writeFileSync(filePath, s, 'utf8');
console.log('Patched crossyroad.zh.md FAQ bullets to paragraphs.');
