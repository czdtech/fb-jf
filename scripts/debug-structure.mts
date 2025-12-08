#!/usr/bin/env node
import fs from 'fs';
import matter from 'gray-matter';

const canonicalFile = fs.readFileSync('src/content/games/2048-fusion.md', 'utf-8');
const jaFile = fs.readFileSync('src/content/games/2048-fusion.ja.md', 'utf-8');

const { content: canonicalContent } = matter(canonicalFile);
const { content: jaContent } = matter(jaFile);

function parseStructure(content: string, label: string) {
  const lines = content.split(/\r?\n/);
  const nodes: any[] = [];
  
  console.log(`\n=== ${label} ===\n`);
  
  let index = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('<!--') && trimmed.endsWith('-->')) continue;
    
    const headingMatch = /^#{1,6}\s+/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[0].trim().length;
      console.log(`${index}: heading level=${level} | ${trimmed.substring(0, 60)}`);
      nodes.push({ type: 'heading', level });
      index++;
      continue;
    }
    
    const listMatch = /^(\s*)([-*+]|\d+\.)\s+/.exec(line);
    if (listMatch) {
      const indentBucket = Math.floor(listMatch[1].length / 2);
      console.log(`${index}: list-item indent=${indentBucket} | ${trimmed.substring(0, 60)}`);
      nodes.push({ type: 'list-item', indentBucket });
      index++;
      continue;
    }
    
    console.log(`${index}: paragraph | ${trimmed.substring(0, 60)}`);
    nodes.push({ type: 'paragraph' });
    index++;
  }
  
  return nodes;
}

const canonicalNodes = parseStructure(canonicalContent, 'CANONICAL (EN)');
const jaNodes = parseStructure(jaContent, 'JAPANESE (JA)');

console.log(`\n\n=== COMPARISON ===`);
console.log(`Canonical nodes: ${canonicalNodes.length}`);
console.log(`Japanese nodes: ${jaNodes.length}`);

// Find first mismatch
let i = 0, j = 0;
while (i < canonicalNodes.length && j < jaNodes.length) {
  const a = canonicalNodes[i];
  const b = jaNodes[j];
  
  const match = a.type === b.type && 
    (a.type !== 'heading' || a.level === b.level) &&
    (a.type !== 'list-item' || a.indentBucket === b.indentBucket);
  
  if (match) {
    i++;
    j++;
  } else {
    j++;
  }
}

if (i < canonicalNodes.length) {
  const missing = canonicalNodes[i];
  console.log(`\n❌ Missing canonical node at index ${i}:`);
  console.log(`   Type: ${missing.type}`);
  if (missing.type === 'heading') console.log(`   Level: ${missing.level}`);
  if (missing.type === 'list-item') console.log(`   Indent: ${missing.indentBucket}`);
} else {
  console.log(`\n✅ All canonical nodes found in Japanese version`);
}
