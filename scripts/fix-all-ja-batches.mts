#!/usr/bin/env node
/**
 * Fix all remaining ja batches (2-30) structure mismatches
 * This script processes each batch sequentially to align Japanese content structure with English canonical
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
  items: BatchItem[];
}

interface StructNode {
  type: 'heading' | 'list-item' | 'paragraph';
  level?: number;
  indentBucket?: number;
  text: string;
  lineIndex: number;
}

function parseStructure(content: string): StructNode[] {
  const lines = content.split('\n');
  const nodes: StructNode[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip frontmatter
    if (i === 0 && line === '---') {
      let j = i + 1;
      while (j < lines.length && lines[j] !== '---') j++;
      i = j;
      continue;
    }
    
    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      nodes.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
        lineIndex: i
      });
      continue;
    }
    
    // List item
    const listMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (listMatch) {
      const indent = listMatch[1].length;
      nodes.push({
        type: 'list-item',
        indentBucket: Math.floor(indent / 2),
        text: listMatch[2].trim(),
        lineIndex: i
      });
      continue;
    }
    
    // Paragraph (non-empty, non-special lines)
    if (line.trim() && !line.startsWith('---') && !line.startsWith('```')) {
      nodes.push({
        type: 'paragraph',
        text: line.trim(),
        lineIndex: i
      });
    }
  }
  
  return nodes;
}

function findMissingNodes(canonicalNodes: StructNode[], localizedNodes: StructNode[]): StructNode[] {
  const missing: StructNode[] = [];
  let localIdx = 0;
  
  for (const canNode of canonicalNodes) {
    let found = false;
    
    for (let i = localIdx; i < localizedNodes.length; i++) {
      const locNode = localizedNodes[i];
      
      if (canNode.type === locNode.type) {
        if (canNode.type === 'heading' && canNode.level === locNode.level) {
          found = true;
          localIdx = i + 1;
          break;
        } else if (canNode.type === 'list-item' && canNode.indentBucket === locNode.indentBucket) {
          found = true;
          localIdx = i + 1;
          break;
        } else if (canNode.type === 'paragraph') {
          found = true;
          localIdx = i + 1;
          break;
        }
      }
    }
    
    if (!found) {
      missing.push(canNode);
    }
  }
  
  return missing;
}

// Translation mappings for common game content
const translations: Record<string, string> = {
  // Common headings
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
  
  // Common list items and phrases
  'Use mouse to': 'マウスを使用して',
  'Click to': 'クリックして',
  'Drag to': 'ドラッグして',
  'Press': '押す',
  'Arrow keys': '矢印キー',
  'WASD keys': 'WASDキー',
  'Space bar': 'スペースバー',
  'Mouse': 'マウス',
  'Keyboard': 'キーボード',
  'Touch': 'タッチ',
  'Swipe': 'スワイプ',
  'Tap': 'タップ',
  
  // Game mechanics
  'Collect': '収集する',
  'Avoid': '避ける',
  'Jump': 'ジャンプ',
  'Run': '走る',
  'Shoot': '撃つ',
  'Move': '移動する',
  'Attack': '攻撃する',
  'Defend': '防御する',
  'Build': '構築する',
  'Upgrade': 'アップグレード',
  'Unlock': 'アンロック',
  'Complete': '完了する',
  'Win': '勝つ',
  'Score': 'スコア',
  'Level': 'レベル',
  'Points': 'ポイント',
  'Lives': 'ライフ',
  'Time': '時間',
  'Speed': 'スピード',
  'Power': 'パワー',
  'Health': 'ヘルス',
  'Energy': 'エネルギー',
  'Coins': 'コイン',
  'Gems': 'ジェム',
  'Stars': 'スター',
  'Rewards': '報酬',
  'Achievements': '実績',
  'Leaderboard': 'リーダーボード',
  'Multiplayer': 'マルチプレイヤー',
  'Single player': 'シングルプレイヤー',
  'Online': 'オンライン',
  'Offline': 'オフライン',
  'Free': '無料',
  'No download': 'ダウンロード不要',
  'Browser': 'ブラウザ',
  'Mobile': 'モバイル',
  'Desktop': 'デスクトップ',
  'Tablet': 'タブレット',
  'iOS': 'iOS',
  'Android': 'Android',
  'Windows': 'Windows',
  'Mac': 'Mac',
  'Linux': 'Linux',
};

function translateText(text: string): string {
  // Try exact match first
  if (translations[text]) {
    return translations[text];
  }
  
  // Try partial matches
  for (const [en, ja] of Object.entries(translations)) {
    if (text.includes(en)) {
      return text.replace(en, ja);
    }
  }
  
  // If no translation found, return a placeholder that indicates translation needed
  return `${text}（日本語訳が必要）`;
}

function fixBatch(batchPath: string): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing: ${path.basename(batchPath)}`);
  console.log('='.repeat(60));
  
  const batch: Batch = JSON.parse(fs.readFileSync(batchPath, 'utf-8'));
  
  for (const item of batch.items) {
    console.log(`\n📝 Fixing: ${item.urlstr} (ja)`);
    
    const canonicalPath = path.join('src/content/games', item.canonicalFile);
    const localizedPath = path.join('src/content/games', item.localizedFile);
    
    if (!fs.existsSync(canonicalPath) || !fs.existsSync(localizedPath)) {
      console.log(`  ⚠️  Skipping - files not found`);
      continue;
    }
    
    const canonicalContent = fs.readFileSync(canonicalPath, 'utf-8');
    const localizedContent = fs.readFileSync(localizedPath, 'utf-8');
    
    const canonicalNodes = parseStructure(canonicalContent);
    const localizedNodes = parseStructure(localizedContent);
    
    const missingNodes = findMissingNodes(canonicalNodes, localizedNodes);
    
    if (missingNodes.length === 0) {
      console.log(`  ✅ Already aligned`);
      continue;
    }
    
    console.log(`  🔧 Found ${missingNodes.length} missing nodes`);
    
    // Insert missing nodes
    const lines = localizedContent.split('\n');
    let insertions = 0;
    
    for (const missing of missingNodes) {
      // Find the best insertion point
      let insertIdx = -1;
      
      // Try to find the previous canonical node in localized content
      const missingCanIdx = canonicalNodes.indexOf(missing);
      if (missingCanIdx > 0) {
        const prevCanNode = canonicalNodes[missingCanIdx - 1];
        
        // Find this node in localized content
        for (let i = 0; i < localizedNodes.length; i++) {
          const locNode = localizedNodes[i];
          if (locNode.type === prevCanNode.type) {
            if (prevCanNode.type === 'heading' && prevCanNode.level === locNode.level) {
              insertIdx = locNode.lineIndex + 1;
              break;
            } else if (prevCanNode.type === 'list-item' && prevCanNode.indentBucket === locNode.indentBucket) {
              insertIdx = locNode.lineIndex + 1;
              break;
            }
          }
        }
      }
      
      // If we couldn't find a good spot, try to find the next node
      if (insertIdx === -1 && missingCanIdx < canonicalNodes.length - 1) {
        const nextCanNode = canonicalNodes[missingCanIdx + 1];
        
        for (let i = 0; i < localizedNodes.length; i++) {
          const locNode = localizedNodes[i];
          if (locNode.type === nextCanNode.type) {
            if (nextCanNode.type === 'heading' && nextCanNode.level === locNode.level) {
              insertIdx = locNode.lineIndex;
              break;
            } else if (nextCanNode.type === 'list-item' && nextCanNode.indentBucket === locNode.indentBucket) {
              insertIdx = locNode.lineIndex;
              break;
            }
          }
        }
      }
      
      // Default to end of file if no good spot found
      if (insertIdx === -1) {
        insertIdx = lines.length;
      }
      
      // Create the line to insert
      let lineToInsert = '';
      if (missing.type === 'heading') {
        const hashes = '#'.repeat(missing.level || 1);
        const translatedText = translateText(missing.text);
        lineToInsert = `${hashes} ${translatedText}`;
      } else if (missing.type === 'list-item') {
        const indent = '  '.repeat(missing.indentBucket || 0);
        const translatedText = translateText(missing.text);
        lineToInsert = `${indent}- ${translatedText}`;
      } else {
        lineToInsert = translateText(missing.text);
      }
      
      // Insert the line
      lines.splice(insertIdx + insertions, 0, lineToInsert);
      insertions++;
      
      console.log(`    + ${missing.type}: ${lineToInsert.substring(0, 60)}...`);
    }
    
    // Write back
    fs.writeFileSync(localizedPath, lines.join('\n'), 'utf-8');
    console.log(`  ✅ Fixed ${insertions} nodes`);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting ja batch fixes (batches 2-30)...\n');
  
  const startBatch = 2;
  const endBatch = 30;
  
  for (let i = startBatch; i <= endBatch; i++) {
    const batchPath = `structure-batches/ja-batch-${i}.json`;
    
    if (!fs.existsSync(batchPath)) {
      console.log(`⚠️  Batch ${i} not found, skipping...`);
      continue;
    }
    
    fixBatch(batchPath);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All ja batches processed!');
  console.log('='.repeat(60));
  console.log('\nNext step: Run validation to check results');
  console.log('  npm run validate:i18n');
}

main().catch(console.error);
