import fs from 'fs';
import matter from 'gray-matter';

function parseMarkdownStructure(body: string) {
  const lines = body.split(/\r?\n/);
  const nodes: any[] = [];

  for (const line of lines) {
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
      nodes.push({ type: 'heading', level });
      continue;
    }

    const listMatch = /^(\s*)([-*+]|\d+\.)\s+/.exec(line);
    if (listMatch) {
      const indentSpaces = listMatch[1].length;
      const indentBucket = Math.floor(indentSpaces / 2);
      nodes.push({ type: 'list-item', indentBucket });
      continue;
    }

    nodes.push({ type: 'paragraph' });
  }

  return nodes;
}

const canonicalRaw = fs.readFileSync('src/content/games/incredibox-kochari.en.md', 'utf-8');
const localizedRaw = fs.readFileSync('src/content/games/incredibox-kochari.es.md', 'utf-8');

const { content: canonicalContent } = matter(canonicalRaw);
const { content: localizedContent } = matter(localizedRaw);

const canonicalNodes = parseMarkdownStructure(canonicalContent);
const localizedNodes = parseMarkdownStructure(localizedContent);

console.log('Canonical nodes:', canonicalNodes.length);
console.log('Localized nodes:', localizedNodes.length);

console.log('\nFirst 10 canonical nodes:');
canonicalNodes.slice(0, 10).forEach((n, i) => console.log(`${i}:`, n));

console.log('\nFirst 10 localized nodes:');
localizedNodes.slice(0, 10).forEach((n, i) => console.log(`${i}:`, n));
