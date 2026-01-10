#!/usr/bin/env node
/**
 * Font Download Script
 * Downloads Google Fonts for self-hosting to eliminate network round trips
 * 
 * Usage: node scripts/download-fonts.mjs
 */

import https from 'https';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FONTS_DIR = path.join(ROOT, 'public', 'fonts');

// Fonts to download with their Google Fonts CSS URLs
// NOTE: Only Latin-based fonts are downloaded automatically.
// CJK fonts (Noto Sans SC, etc.) are NOT included here because:
// 1. They are 20MB+ for full coverage
// 2. Chinese text falls back to system fonts (see fonts.css + variables.css)
// 3. The existing noto-sans-sc files in public/fonts/ are Latin subsets only
const FONTS = [
  {
    family: 'Chakra Petch',
    weights: [400, 600, 700],
    styles: ['normal'],
    slug: 'chakra-petch',
  },
  {
    family: 'Russo One',
    weights: [400],
    styles: ['normal'],
    slug: 'russo-one',
  },
];

// User agent to get woff2 format from Google
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        ...options.headers,
      },
    }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location, options).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    
    req.on('error', reject);
  });
}

async function downloadFont(url, filename) {
  const filePath = path.join(FONTS_DIR, filename);
  
  // Check if already exists
  try {
    await fs.access(filePath);
    console.log(`  ⏭️  ${filename} (already exists)`);
    return true;
  } catch {}
  
  try {
    const buffer = await fetch(url);
    await fs.writeFile(filePath, buffer);
    console.log(`  ✅ ${filename} (${(buffer.length / 1024).toFixed(1)}KB)`);
    return true;
  } catch (err) {
    console.error(`  ❌ ${filename}: ${err.message}`);
    return false;
  }
}

async function getFontCSSFromGoogle(fontFamily, weights, styles) {
  const weightsStr = weights.join(';');
  const family = fontFamily.replace(/ /g, '+');
  const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${weightsStr}&display=swap`;
  
  try {
    const css = await fetch(url);
    return css.toString('utf-8');
  } catch (err) {
    console.error(`Failed to get CSS for ${fontFamily}: ${err.message}`);
    return null;
  }
}

function extractFontUrls(css) {
  const urls = [];
  const regex = /url\((https:\/\/fonts\.gstatic\.com[^)]+\.woff2)\)/g;
  let match;
  
  while ((match = regex.exec(css)) !== null) {
    urls.push(match[1]);
  }
  
  return urls;
}

function extractFontInfo(css) {
  // Parse @font-face blocks
  const fonts = [];
  const blockRegex = /@font-face\s*\{([^}]+)\}/g;
  let match;
  
  while ((match = blockRegex.exec(css)) !== null) {
    const block = match[1];
    
    const familyMatch = block.match(/font-family:\s*['"]?([^'";\n]+)/);
    const weightMatch = block.match(/font-weight:\s*(\d+)/);
    const styleMatch = block.match(/font-style:\s*(\w+)/);
    const urlMatch = block.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+\.woff2)\)/);
    const unicodeMatch = block.match(/unicode-range:\s*([^;]+)/);
    
    if (familyMatch && urlMatch) {
      fonts.push({
        family: familyMatch[1].trim(),
        weight: weightMatch ? weightMatch[1] : '400',
        style: styleMatch ? styleMatch[1] : 'normal',
        url: urlMatch[1],
        unicodeRange: unicodeMatch ? unicodeMatch[1].trim() : null,
      });
    }
  }
  
  return fonts;
}

async function main() {
  console.log('📥 Font Download Script\n');
  
  // Create fonts directory
  await fs.mkdir(FONTS_DIR, { recursive: true });
  
  const allFontInfo = [];
  
  for (const font of FONTS) {
    console.log(`\n📦 ${font.family}`);
    
    const css = await getFontCSSFromGoogle(font.family, font.weights, font.styles);
    if (!css) continue;
    
    const fontInfos = extractFontInfo(css);
    
    for (const info of fontInfos) {
      // Generate local filename
      const subset = info.unicodeRange ? 
        (info.unicodeRange.includes('U+0000-00FF') ? 'latin' : 
         info.unicodeRange.includes('U+4E00') ? 'chinese' : 'extended') : 'full';
      
      const filename = `${font.slug}-${info.weight}-${subset}.woff2`;
      
      const success = await downloadFont(info.url, filename);
      if (success) {
        allFontInfo.push({
          ...info,
          localFile: filename,
          slug: font.slug,
        });
      }
    }
  }
  
  // Generate CSS file
  console.log('\n📝 Generating fonts.css...');
  
  let css = `/* Auto-generated font CSS - do not edit manually */
/* Run: npm run download-fonts */

`;
  
  for (const info of allFontInfo) {
    css += `@font-face {
  font-family: '${info.family}';
  font-style: ${info.style};
  font-weight: ${info.weight};
  font-display: swap;
  src: url('/fonts/${info.localFile}') format('woff2');${info.unicodeRange ? `
  unicode-range: ${info.unicodeRange};` : ''}
}

`;
  }
  
  await fs.writeFile(path.join(ROOT, 'public', 'fonts.css'), css);
  console.log('✅ fonts.css generated');
  
  console.log('\n' + '='.repeat(50));
  console.log(`Total fonts downloaded: ${allFontInfo.length}`);
  console.log('\nNext step: Update BaseHead.astro to use /fonts.css instead of Google Fonts');
}

main().catch(console.error);
