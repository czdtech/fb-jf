import fs from 'fs';
import matter from 'gray-matter';

function parseMarkdownStructure(body: string) {
  const lines = body.split(/\r?\n/);
  const nodes: any[] = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith('<!--') && trimmed.endsWith('-->')) {
      continue;
    }

    const headingMatch = /^#{1,6}\s+/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[0].trim().length;
      nodes.push({ type: 'heading', level, lineIdx, line: line.substring(0, 50) });
      continue;
    }

    const listMatch = /^(\s*)([-*+]|\d+\.)\s+/.exec(line);
    if (listMatch) {
      const indentSpaces = listMatch[1].length;
      const indentBucket = Math.floor(indentSpaces / 2);
      nodes.push({ type: 'list-item', indentBucket, lineIdx, line: line.substring(0, 50) });
      continue;
    }

    nodes.push({ type: 'paragraph', lineIdx, line: line.substring(0, 50) });
  }

  return nodes;
}

const canonicalRaw = fs.readFileSync('src/content/games/sprunki-christmas.en.md', 'utf-8');
const { content: canonicalContent } = matter(canonicalRaw);
const canonicalNodes = parseMarkdownStructure(canonicalContent);

console.log('Canonical nodes around index 8:');
canonicalNodes.slice(5, 12).forEach((n, i) => {
  console.log(`${i+5}:`, n);
});
