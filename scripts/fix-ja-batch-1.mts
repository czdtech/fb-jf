#!/usr/bin/env node
/**
 * Fix structure mismatches for ja-batch-1
 * This script reads the batch file and fixes each game's Japanese translation
 * by adding missing structural nodes (headings and list items)
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
  totalMismatches: number;
}

const BATCH_FILE = 'structure-batches/ja-batch-1.json';
const CONTENT_DIR = 'src/content/games';

// Read batch file
const batchData: Batch = JSON.parse(fs.readFileSync(BATCH_FILE, 'utf-8'));

console.log(`Processing ${batchData.items.length} games for locale: ${batchData.locale}`);
console.log('---');

for (const item of batchData.items) {
  console.log(`\nProcessing: ${item.urlstr}`);
  console.log(`  Reasons: ${item.reasons.join(', ')}`);
  
  const canonicalPath = path.join(CONTENT_DIR, item.canonicalFile);
  const localizedPath = path.join(CONTENT_DIR, item.localizedFile);
  const zhPath = path.join(CONTENT_DIR, item.localizedFile.replace('.ja.md', '.zh.md'));
  
  // Read files
  const canonicalContent = fs.readFileSync(canonicalPath, 'utf-8');
  const localizedContent = fs.readFileSync(localizedPath, 'utf-8');
  const zhContent = fs.existsSync(zhPath) ? fs.readFileSync(zhPath, 'utf-8') : null;
  
  // Parse structure
  const canonicalLines = canonicalContent.split('\n');
  const localizedLines = localizedContent.split('\n');
  const zhLines = zhContent ? zhContent.split('\n') : [];
  
  // Extract structural nodes
  const canonicalNodes = extractStructure(canonicalLines);
  const localizedNodes = extractStructure(localizedLines);
  
  // Find missing nodes
  const missingIndices = findMissingNodes(canonicalNodes, localizedNodes);
  
  if (missingIndices.length === 0) {
    console.log(`  ✓ No missing nodes found (already fixed?)`);
    continue;
  }
  
  console.log(`  Found ${missingIndices.length} missing nodes at indices: ${missingIndices.join(', ')}`);
  
  // Fix the localized content
  let fixedContent = fixStructure(
    canonicalLines,
    localizedLines,
    zhLines,
    canonicalNodes,
    localizedNodes,
    missingIndices
  );
  
  // Write back
  fs.writeFileSync(localizedPath, fixedContent, 'utf-8');
  console.log(`  ✓ Fixed and saved`);
}

console.log('\n---');
console.log('All games processed!');

// Helper functions

interface StructureNode {
  type: 'heading' | 'list-item' | 'paragraph';
  level?: number;
  lineIndex: number;
  text: string;
}

function extractStructure(lines: string[]): StructureNode[] {
  const nodes: StructureNode[] = [];
  let inFrontmatter = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip frontmatter
    if (line.trim() === '---') {
      inFrontmatter = !inFrontmatter;
      continue;
    }
    if (inFrontmatter) continue;
    
    // Skip empty lines
    if (line.trim() === '') continue;
    
    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      nodes.push({
        type: 'heading',
        level: headingMatch[1].length,
        lineIndex: i,
        text: headingMatch[2].trim()
      });
      continue;
    }
    
    // List item
    const listMatch = line.match(/^(\s*)[*\-+]\s+(.+)$/) || line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (listMatch) {
      nodes.push({
        type: 'list-item',
        lineIndex: i,
        text: line.trim()
      });
      continue;
    }
    
    // Paragraph (non-empty, non-heading, non-list)
    if (line.trim().length > 0) {
      nodes.push({
        type: 'paragraph',
        lineIndex: i,
        text: line.trim()
      });
    }
  }
  
  return nodes;
}

function findMissingNodes(canonical: StructureNode[], localized: StructureNode[]): number[] {
  const missing: number[] = [];
  let localizedIdx = 0;
  
  for (let canonicalIdx = 0; canonicalIdx < canonical.length; canonicalIdx++) {
    const canonicalNode = canonical[canonicalIdx];
    
    // Try to find this node in localized
    let found = false;
    for (let j = localizedIdx; j < localized.length; j++) {
      const localizedNode = localized[j];
      
      if (nodesMatch(canonicalNode, localizedNode)) {
        found = true;
        localizedIdx = j + 1;
        break;
      }
    }
    
    if (!found) {
      missing.push(canonicalIdx);
    }
  }
  
  return missing;
}

function nodesMatch(canonical: StructureNode, localized: StructureNode): boolean {
  if (canonical.type !== localized.type) return false;
  
  if (canonical.type === 'heading' && localized.type === 'heading') {
    return canonical.level === localized.level;
  }
  
  return true;
}

function fixStructure(
  canonicalLines: string[],
  localizedLines: string[],
  zhLines: string[],
  canonicalNodes: StructureNode[],
  localizedNodes: StructureNode[],
  missingIndices: number[]
): string {
  // Build a map of where to insert missing nodes
  const insertions: Map<number, string[]> = new Map();
  
  for (const missingIdx of missingIndices) {
    const missingNode = canonicalNodes[missingIdx];
    
    // Find the insertion point in localized content
    // Look for the previous node that exists in both
    let insertAfterLocalizedIdx = -1;
    for (let i = missingIdx - 1; i >= 0; i--) {
      const prevNode = canonicalNodes[i];
      const localizedMatch = localizedNodes.find(ln => nodesMatch(prevNode, ln));
      if (localizedMatch) {
        insertAfterLocalizedIdx = localizedMatch.lineIndex;
        break;
      }
    }
    
    // Get translation from zh if available
    let translatedText = '';
    if (zhLines.length > 0) {
      const zhNodes = extractStructure(zhLines);
      const zhMatch = zhNodes.find((zn, idx) => idx === missingIdx && nodesMatch(missingNode, zn));
      if (zhMatch) {
        translatedText = zhLines[zhMatch.lineIndex];
      }
    }
    
    // Fallback: use canonical with [JA TRANSLATION NEEDED] marker
    if (!translatedText) {
      translatedText = canonicalLines[missingNode.lineIndex];
      if (missingNode.type === 'heading') {
        translatedText = translatedText.replace(/^(#{1,6})\s+/, '$1 [JA TRANSLATION NEEDED] ');
      } else {
        translatedText = '[JA TRANSLATION NEEDED] ' + translatedText;
      }
    }
    
    // Add to insertions map
    if (!insertions.has(insertAfterLocalizedIdx)) {
      insertions.set(insertAfterLocalizedIdx, []);
    }
    insertions.get(insertAfterLocalizedIdx)!.push(translatedText);
  }
  
  // Apply insertions
  const result: string[] = [];
  for (let i = 0; i < localizedLines.length; i++) {
    result.push(localizedLines[i]);
    
    if (insertions.has(i)) {
      result.push(''); // Add blank line
      result.push(...insertions.get(i)!);
    }
  }
  
  return result.join('\n');
}
