#!/usr/bin/env node
/**
 * Image Optimization Script
 * Converts PNG/JPG images to WebP format and generates responsive sizes
 * 
 * Usage: node scripts/optimize-images.mjs
 * 
 * This script:
 * 1. Scans public/new-images/thumbnails/ for PNG/JPG files
 * 2. Converts each to WebP with quality 80
  * 3. Generates responsive sizes: 150w, 300w (16:9 thumbnails)
 * 4. Only converts if output doesn't exist or is older than source
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DIRS_TO_PROCESS = [
  'public/new-images/thumbnails',
  'public/characters/images',
];

const WEBP_QUALITY = 80;
const SKIP_DIRS = ['embed', 'admin', '_astro'];

// Responsive sizes to generate (width in pixels)
// Keep variant count small; this is a content site, not a photo gallery.
const RESPONSIVE_SIZES = [150, 300];

// Thumbnail aspect ratio: cards are 16:9.
const THUMBNAIL_ASPECT_W = 16;
const THUMBNAIL_ASPECT_H = 9;

function getThumbHeight(width) {
  return Math.round((width * THUMBNAIL_ASPECT_H) / THUMBNAIL_ASPECT_W);
}

function isForce() {
  return process.argv.includes('--force');
}

async function getImageFiles(dir, recursive = true) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (recursive && !SKIP_DIRS.includes(entry.name)) {
          files.push(...await getImageFiles(fullPath, recursive));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.png', '.jpg', '.jpeg'].includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (err) {
    console.warn(`Warning: Could not read directory ${dir}: ${err.message}`);
  }
  
  return files;
}

async function shouldConvert(srcPath, outPath) {
  try {
    if (isForce()) return true;
    const [srcStat, outStat] = await Promise.all([
      fs.stat(srcPath),
      fs.stat(outPath).catch(() => null),
    ]);
    
    if (!outStat) return true;
    return srcStat.mtime > outStat.mtime;
  } catch {
    return true;
  }
}

async function convertToWebP(srcPath, generateResponsive = true) {
  const results = [];
  const baseName = path.basename(srcPath, path.extname(srcPath));
  const dirName = path.dirname(srcPath);
  
  // Main WebP conversion (original size)
  const webpPath = srcPath.replace(/\.(png|jpe?g)$/i, '.webp');
  
  if (await shouldConvert(srcPath, webpPath)) {
    try {
      const srcStat = await fs.stat(srcPath);
      
      await sharp(srcPath)
        .webp({ quality: WEBP_QUALITY })
        .toFile(webpPath);
      
      const webpStat = await fs.stat(webpPath);
      
      results.push({
        srcPath,
        outPath: webpPath,
        srcSize: srcStat.size,
        outSize: webpStat.size,
        saved: srcStat.size - webpStat.size,
        type: 'webp',
      });
    } catch (err) {
      results.push({ error: true, srcPath, message: err.message, type: 'webp' });
    }
  }
  
  // Generate responsive sizes (only for thumbnail directories)
  if (generateResponsive && dirName.includes('thumbnails')) {
    for (const width of RESPONSIVE_SIZES) {
      const height = getThumbHeight(width);
      const responsivePath = path.join(dirName, `${baseName}-${width}w.webp`);
      
      if (await shouldConvert(srcPath, responsivePath)) {
        try {
          // IMPORTANT: do NOT crop the main subject.
          // We always output a 16:9 canvas.
          // - Background: blurred cover (fills canvas)
          // - Foreground: contain (keeps full image visible), without enlargement
          const background = await sharp(srcPath)
            .resize(width, height, { fit: 'cover' })
            .blur(18)
            .toBuffer();

          const foreground = await sharp(srcPath)
            .resize(width, height, {
              fit: 'contain',
              withoutEnlargement: true,
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .toBuffer();

          await sharp(background)
            .composite([{ input: foreground }])
            .webp({ quality: WEBP_QUALITY })
            .toFile(responsivePath);
          
          const outStat = await fs.stat(responsivePath);
          results.push({
            srcPath,
            outPath: responsivePath,
            outSize: outStat.size,
            type: `responsive-${width}w`,
          });
        } catch (err) {
          // Silently skip responsive generation errors
        }
      }
    }
  }
  
  return results;
}

async function processRootPublicImages() {
  const results = [];
  const rootPublic = path.join(ROOT, 'public');
  
  try {
    const entries = await fs.readdir(rootPublic, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.png', '.jpg', '.jpeg'].includes(ext)) {
          const fullPath = path.join(rootPublic, entry.name);
          const fileResults = await convertToWebP(fullPath, false);
          results.push(...fileResults);
        }
      }
    }
  } catch (err) {
    console.warn(`Warning: Could not process root public: ${err.message}`);
  }
  
  return results;
}

async function main() {
  console.log('🖼️  Image Optimization Script (with Responsive)\n');
  
  const allResults = [];
  
  // Process directory images with responsive sizes
  for (const dir of DIRS_TO_PROCESS) {
    const fullDir = path.join(ROOT, dir);
    console.log(`Processing: ${dir}`);
    
    const files = await getImageFiles(fullDir, true);
    
    for (const file of files) {
      const results = await convertToWebP(file, true);
      allResults.push(...results);
    }
  }
  
  // Process root public images (no responsive)
  console.log('Processing: public/ (root images only)');
  const rootResults = await processRootPublicImages();
  allResults.push(...rootResults);
  
  // Summary
  const webpResults = allResults.filter(r => r.type === 'webp' && !r.error);
  const responsiveResults = allResults.filter(r => r.type?.startsWith('responsive'));
  const errors = allResults.filter(r => r.error);
  
  const totalSaved = webpResults.reduce((sum, r) => sum + (r.saved || 0), 0);
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ WebP converted: ${webpResults.length}`);
  console.log(`📐 Responsive generated: ${responsiveResults.length}`);
  if (errors.length > 0) console.log(`❌ Errors: ${errors.length}`);
  console.log(`💾 Total saved: ${(totalSaved / 1024 / 1024).toFixed(2)} MB`);
}

main().catch(console.error);
