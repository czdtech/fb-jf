#!/usr/bin/env node

/**
 * Script to rename image files with spaces to kebab-case
 * and update all references in the codebase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Recursively find files in a directory
function findFilesRecursive(dir, extensions, results = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findFilesRecursive(filePath, extensions, results);
    } else if (extensions.some(ext => file.endsWith(ext))) {
      results.push(filePath);
    }
  }
  
  return results;
}

// Find all image files with spaces
function findImagesWithSpaces() {
  const publicDir = path.join(rootDir, 'public');
  const allImages = findFilesRecursive(publicDir, ['.png', '.jpg', '.jpeg', '.gif', '.webp']);
  
  return allImages
    .filter(img => path.basename(img).includes(' '))
    .map(img => {
      const relativePath = path.relative(publicDir, img);
      return {
        oldPath: relativePath,
        newPath: relativePath.replace(/\s+/g, '-').toLowerCase(),
        oldName: path.basename(img),
        newName: path.basename(img.replace(/\s+/g, '-').toLowerCase())
      };
    });
}

// Convert filename to kebab-case
function toKebabCase(filename) {
  const ext = path.extname(filename);
  const name = path.basename(filename, ext);
  return name.replace(/\s+/g, '-').toLowerCase() + ext;
}

// Find all files that might reference images
function findReferenceFiles() {
  const extensions = ['.astro', '.md', '.js', '.mjs', '.ts', '.tsx', '.jsx'];
  const excludeDirs = ['node_modules', 'dist', '.astro', '.git'];
  
  function shouldExclude(filePath) {
    return excludeDirs.some(dir => filePath.includes(path.sep + dir + path.sep) || filePath.startsWith(dir + path.sep));
  }
  
  const files = findFilesRecursive(rootDir, extensions);
  return files
    .filter(f => !shouldExclude(f))
    .map(f => path.relative(rootDir, f));
}

// Update references in a file
function updateReferences(filePath, imageMap) {
  const fullPath = path.join(rootDir, filePath);
  let content = fs.readFileSync(fullPath, 'utf-8');
  let updated = false;
  
  for (const { oldName, newName, oldPath, newPath } of imageMap) {
    // Match both /oldName and /oldPath patterns
    const patterns = [
      new RegExp(`/${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'),
      new RegExp(`/${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g')
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, `/${newPath}`);
        updated = true;
      }
    }
  }
  
  if (updated) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    return true;
  }
  return false;
}

// Main execution
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  
  console.log('🔍 Finding images with spaces...\n');
  const imagesToRename = findImagesWithSpaces();
  
  if (imagesToRename.length === 0) {
    console.log('✅ No images with spaces found!');
    return;
  }
  
  console.log(`Found ${imagesToRename.length} images to rename:\n`);
  imagesToRename.forEach(({ oldPath, newPath }) => {
    console.log(`  ${oldPath} → ${newPath}`);
  });
  
  if (dryRun) {
    console.log('\n🔍 Dry run mode - no files will be modified');
    console.log('\n📝 Searching for references...\n');
    
    const referenceFiles = findReferenceFiles();
    const filesWithReferences = [];
    
    for (const file of referenceFiles) {
      const fullPath = path.join(rootDir, file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      for (const { oldName, oldPath } of imagesToRename) {
        if (content.includes(oldName) || content.includes(oldPath)) {
          filesWithReferences.push(file);
          break;
        }
      }
    }
    
    if (filesWithReferences.length > 0) {
      console.log(`Found references in ${filesWithReferences.length} files:`);
      filesWithReferences.forEach(f => console.log(`  - ${f}`));
    } else {
      console.log('No references found in code files');
    }
    
    console.log('\n💡 Run without --dry-run to apply changes');
    return;
  }
  
  console.log('\n📝 Updating references in code files...\n');
  const referenceFiles = findReferenceFiles();
  let updatedFiles = 0;
  
  for (const file of referenceFiles) {
    if (updateReferences(file, imagesToRename)) {
      console.log(`  ✓ Updated ${file}`);
      updatedFiles++;
    }
  }
  
  console.log(`\n✅ Updated ${updatedFiles} files\n`);
  
  console.log('🔄 Renaming image files...\n');
  for (const { oldPath, newPath } of imagesToRename) {
    const oldFullPath = path.join(rootDir, 'public', oldPath);
    const newFullPath = path.join(rootDir, 'public', newPath);
    
    // Create directory if needed
    const newDir = path.dirname(newFullPath);
    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(newDir, { recursive: true });
    }
    
    fs.renameSync(oldFullPath, newFullPath);
    console.log(`  ✓ Renamed ${oldPath}`);
  }
  
  console.log(`\n✅ Successfully renamed ${imagesToRename.length} images!`);
}

main().catch(console.error);
