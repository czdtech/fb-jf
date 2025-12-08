#!/usr/bin/env node
/**
 * Fix remaining ja structure mismatches using proper subsequence matching
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

interface StructNode {
  type: 'heading' | 'list-item' | 'paragraph';
  level?: number;
  indentBucket?: number;
  text: string;
  lineIndex: number;
}

function parseMarkdownStructure(body: string): StructNode[] {
  const lines = body.split(/\r?\n/);
  const nodes: StructNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;
    if (trimmed.startsWith('<!--') && trimmed.endsWith('-->')) continue;

    // Headings
    const headingMatch = /^#{1,6}\s+/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[0].trim().length;
      nodes.push({ type: 'heading', level, text: trimmed, lineIndex: i });
      continue;
    }

    // List items
    const listMatch = /^(\s*)([-*+]|\d+\.)\s+/.exec(line);
    if (listMatch) {
      const indentSpaces = listMatch[1].length;
      const indentBucket = Math.floor(indentSpaces / 2);
      nodes.push({ type: 'list-item', indentBucket, text: line, lineIndex: i });
      continue;
    }

    // Paragraph
    nodes.push({ type: 'paragraph', text: line, lineIndex: i });
  }

  return nodes;
}

function nodesMatch(a: StructNode, b: StructNode): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'heading') return a.level === b.level;
  if (a.type === 'list-item') {
    const aIndent = a.indentBucket ?? 0;
    const bIndent = b.indentBucket ?? 0;
    return aIndent === bIndent;
  }
  return true;
}

function findMissingNodesWithPositions(
  canonical: StructNode[],
  localized: StructNode[]
): Array<{ node: StructNode; canIdx: number; insertAfterLocIdx: number }> {
  const missing: Array<{ node: StructNode; canIdx: number; insertAfterLocIdx: number }> = [];
  
  let i = 0; // canonical index
  let j = 0; // localized index
  let lastMatchedLocIdx = -1;

  while (i < canonical.length) {
    const canNode = canonical[i];
    let found = false;

    // Try to find this canonical node in remaining localized nodes
    for (let k = j; k < localized.length; k++) {
      if (nodesMatch(canNode, localized[k])) {
        found = true;
        j = k + 1;
        lastMatchedLocIdx = k;
        break;
      }
    }

    if (!found) {
      // This canonical node is missing
      missing.push({
        node: canNode,
        canIdx: i,
        insertAfterLocIdx: lastMatchedLocIdx
      });
    }

    i++;
  }

  return missing;
}

// Translation dictionary
const translations: Record<string, string> = {
  'How to Play': 'プレイ方法',
  'Game Features': 'ゲームの特徴',
  'Tips and Tricks': 'ヒントとコツ',
  'Controls': 'コントロール',
  'Gameplay': 'ゲームプレイ',
  'About': 'について',
  'Features': '特徴',
  'Why Play': 'なぜプレイするのか',
  'Getting Started': '始め方',
  'Game Modes': 'ゲームモード',
  'Strategy': '戦略',
  'Objectives': '目標',
  'Rules': 'ルール',
  'FAQ': 'よくある質問',
  'Frequently Asked Questions': 'よくある質問',
  'Detailed Game Introduction': '詳細なゲーム紹介',
  'Gameplay Strategy & Walkthrough': 'ゲームプレイ戦略とウォークスルー',
  'Controls Guide': 'コントロールガイド',
  'Frequently Asked Questions (FAQ)': 'よくある質問（FAQ）',
};

function translateText(text: string): string {
  // Extract the actual text from markdown
  let cleanText = text.replace(/^#{1,6}\s+/, '').replace(/^(\s*)([-*+]|\d+\.)\s+/, '').trim();
  
  // Try exact match
  if (translations[cleanText]) {
    return translations[cleanText];
  }
  
  // Try partial matches
  for (const [en, ja] of Object.entries(translations)) {
    if (cleanText.includes(en)) {
      return cleanText.replace(en, ja);
    }
  }
  
  // Return original if no translation
  return cleanText;
}

async function fixFile(canonicalPath: string, localizedPath: string): Promise<boolean> {
  const canonicalRaw = fs.readFileSync(canonicalPath, 'utf-8');
  const localizedRaw = fs.readFileSync(localizedPath, 'utf-8');
  
  const { content: canonicalContent } = matter(canonicalRaw);
  const { content: localizedContent, data: localizedFrontmatter } = matter(localizedRaw);
  
  const canonicalNodes = parseMarkdownStructure(canonicalContent);
  const localizedNodes = parseMarkdownStructure(localizedContent);
  
  const missing = findMissingNodesWithPositions(canonicalNodes, localizedNodes);
  
  if (missing.length === 0) {
    return false; // No changes needed
  }
  
  // Build the new content by inserting missing nodes
  const localizedLines = localizedContent.split(/\r?\n/);
  
  // Sort missing nodes by insertion position (reverse order to maintain indices)
  missing.sort((a, b) => b.insertAfterLocIdx - a.insertAfterLocIdx);
  
  for (const { node, insertAfterLocIdx } of missing) {
    // Find the actual line index to insert after
    let insertLineIdx: number;
    
    if (insertAfterLocIdx === -1) {
      // Insert at the beginning (after any initial empty lines)
      insertLineIdx = 0;
      while (insertLineIdx < localizedLines.length && !localizedLines[insertLineIdx].trim()) {
        insertLineIdx++;
      }
    } else {
      // Insert after the matched node
      const matchedNode = localizedNodes[insertAfterLocIdx];
      insertLineIdx = matchedNode.lineIndex + 1;
      
      // Skip any immediately following empty lines
      while (insertLineIdx < localizedLines.length && !localizedLines[insertLineIdx].trim()) {
        insertLineIdx++;
      }
    }
    
    // Create the line to insert
    let lineToInsert = '';
    if (node.type === 'heading') {
      const hashes = '#'.repeat(node.level || 1);
      const translatedText = translateText(node.text);
      lineToInsert = `${hashes} ${translatedText}`;
    } else if (node.type === 'list-item') {
      const indent = '  '.repeat(node.indentBucket || 0);
      const translatedText = translateText(node.text);
      lineToInsert = `${indent}- ${translatedText}`;
    } else {
      lineToInsert = translateText(node.text);
    }
    
    // Insert with proper spacing
    localizedLines.splice(insertLineIdx, 0, '', lineToInsert);
  }
  
  // Reconstruct the file with frontmatter
  const newContent = matter.stringify(localizedLines.join('\n'), localizedFrontmatter);
  fs.writeFileSync(localizedPath, newContent, 'utf-8');
  
  return true;
}

async function main() {
  console.log('🔧 Fixing remaining ja structure mismatches...\n');
  
  // Read the structure report
  const reportPath = 'i18n-structure-report.json';
  if (!fs.existsSync(reportPath)) {
    console.error('❌ Structure report not found. Run validation first.');
    process.exit(1);
  }
  
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  const jaMismatches = report.mismatches.filter((m: any) => m.locale === 'ja');
  
  console.log(`Found ${jaMismatches.length} ja mismatches to fix\n`);
  
  let fixed = 0;
  let skipped = 0;
  
  for (const mismatch of jaMismatches) {
    const canonicalPath = path.join('src/content/games', mismatch.canonicalFile);
    const localizedPath = path.join('src/content/games', mismatch.localizedFile);
    
    if (!fs.existsSync(canonicalPath) || !fs.existsSync(localizedPath)) {
      console.log(`⚠️  Skipping ${mismatch.urlstr} - files not found`);
      skipped++;
      continue;
    }
    
    try {
      const changed = await fixFile(canonicalPath, localizedPath);
      if (changed) {
        console.log(`✅ Fixed: ${mismatch.urlstr}`);
        fixed++;
      } else {
        console.log(`⏭️  Already aligned: ${mismatch.urlstr}`);
        skipped++;
      }
    } catch (error) {
      console.error(`❌ Error fixing ${mismatch.urlstr}:`, error);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Fixed: ${fixed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log('='.repeat(60));
  console.log('\nRun validation again to verify:');
  console.log('  npm run validate:i18n');
}

main().catch(console.error);
