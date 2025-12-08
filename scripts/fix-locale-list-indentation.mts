#!/usr/bin/env node --experimental-strip-types
/**
 * Script to fix list item indentation issues in localized files
 * Compares canonical and localized structure and fixes indentation mismatches
 */

import fs from 'fs';
import path from 'path';

interface BatchItem {
  urlstr: string;
  canonicalFile: string;
  localizedFile: string;
  reasons: string[];
}

interface Batch {
  locale: string;
  batchNumber: number;
  items: BatchItem[];
}

interface StructureNode {
  type: 'heading' | 'list-item' | 'paragraph';
  level?: number;
  indentBucket?: number;
  text: string;
  lineNumber: number;
}

function parseStructure(content: string): StructureNode[] {
  const lines = content.split('\n');
  const nodes: StructureNode[] = [];
  let inFrontmatter = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Handle frontmatter
    if (i === 0 && trimmed === '---') {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter && trimmed === '---') {
      inFrontmatter = false;
      continue;
    }
    if (inFrontmatter) continue;

    // Skip empty lines
    if (!trimmed) continue;

    // Skip code blocks
    if (trimmed.startsWith('```')) continue;

    // Heading
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      nodes.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].replace(/\*\*\[[A-Z]{2}\]\*\*\s*/, ''),
        lineNumber: i + 1
      });
      continue;
    }

    // List item
    const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const indent = listMatch[1].length;
      const text = listMatch[3].replace(/\*\*\[[A-Z]{2}\]\*\*\s*/, '');
      nodes.push({
        type: 'list-item',
        indentBucket: Math.floor(indent / 4),
        text,
        lineNumber: i + 1
      });
      continue;
    }

    // Paragraph (non-empty, non-heading, non-list)
    if (trimmed && !trimmed.startsWith('|')) {
      nodes.push({
        type: 'paragraph',
        text: trimmed.replace(/\*\*\[[A-Z]{2}\]\*\*\s*/, ''),
        lineNumber: i + 1
      });
    }
  }

  return nodes;
}

function fixIndentation(canonicalPath: string, localizedPath: string, locale: string): boolean {
  const canonicalContent = fs.readFileSync(canonicalPath, 'utf-8');
  const localizedContent = fs.readFileSync(localizedPath, 'utf-8');

  const canonicalNodes = parseStructure(canonicalContent);
  const localizedNodes = parseStructure(localizedContent);

  const lines = localizedContent.split('\n');
  let modified = false;

  // Build a map of canonical list items with their expected indentation
  const canonicalListItems = canonicalNodes.filter(n => n.type === 'list-item');
  
  // Find mismatched list items in localized content
  let canIdx = 0;
  let locIdx = 0;

  while (canIdx < canonicalNodes.length && locIdx < localizedNodes.length) {
    const canNode = canonicalNodes[canIdx];
    const locNode = localizedNodes[locIdx];

    if (canNode.type === 'list-item' && locNode.type === 'list-item') {
      // Check if the text content is similar (ignoring locale prefixes)
      const canText = canNode.text.replace(/\*\*\[[A-Z]{2}\]\*\*\s*/, '').substring(0, 30);
      const locText = locNode.text.replace(/\*\*\[[A-Z]{2}\]\*\*\s*/, '').substring(0, 30);

      if (canText === locText || locText.includes(canText.substring(0, 15))) {
        // Check if indentation matches
        if (canNode.indentBucket !== locNode.indentBucket) {
          // Fix the indentation
          const lineIdx = locNode.lineNumber - 1;
          const currentLine = lines[lineIdx];
          const listMatch = currentLine.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
          
          if (listMatch) {
            const newIndent = ' '.repeat(canNode.indentBucket! * 4);
            const newLine = newIndent + listMatch[2] + '   ' + listMatch[3];
            lines[lineIdx] = newLine;
            modified = true;
            console.log(`    Fixed indentation: ${locText.substring(0, 40)}...`);
          }
        }
        canIdx++;
        locIdx++;
      } else {
        // Text doesn't match, might be a missing item
        locIdx++;
      }
    } else if (canNode.type === locNode.type) {
      canIdx++;
      locIdx++;
    } else {
      locIdx++;
    }
  }

  if (modified) {
    fs.writeFileSync(localizedPath, lines.join('\n'), 'utf-8');
    return true;
  }

  return false;
}

async function fixBatchFiles(batchPath: string) {
  const batchContent = fs.readFileSync(batchPath, 'utf-8');
  const batch: Batch = JSON.parse(batchContent);
  
  console.log(`\nProcessing ${batch.locale}-batch-${batch.batchNumber} (${batch.items.length} files)...`);
  
  let fixedCount = 0;
  
  for (const item of batch.items) {
    const canonicalPath = path.join('src/content/games', item.canonicalFile);
    const localizedPath = path.join('src/content/games', item.localizedFile);
    
    if (!fs.existsSync(canonicalPath) || !fs.existsSync(localizedPath)) {
      console.log(`  ⚠️  File not found: ${item.urlstr}`);
      continue;
    }
    
    console.log(`  Processing: ${item.urlstr}`);
    if (fixIndentation(canonicalPath, localizedPath, batch.locale)) {
      fixedCount++;
      console.log(`  ✓ Fixed: ${item.urlstr}`);
    } else {
      console.log(`  - No indentation changes needed: ${item.urlstr}`);
    }
  }
  
  console.log(`Completed batch ${batch.batchNumber}: ${fixedCount}/${batch.items.length} files fixed`);
  return fixedCount;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node --experimental-strip-types scripts/fix-locale-list-indentation.mts <batch-file> [batch-file...]');
    console.error('Example: node --experimental-strip-types scripts/fix-locale-list-indentation.mts structure-batches/es-batch-1.json');
    process.exit(1);
  }
  
  let totalFixed = 0;
  
  for (const batchPath of args) {
    if (!fs.existsSync(batchPath)) {
      console.error(`Batch file not found: ${batchPath}`);
      continue;
    }
    
    const fixed = await fixBatchFiles(batchPath);
    totalFixed += fixed;
  }
  
  console.log(`\n✅ Total files fixed across all batches: ${totalFixed}`);
}

main().catch(console.error);
