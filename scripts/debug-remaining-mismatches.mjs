#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const GAMES_DIR = path.join(ROOT, 'src', 'content', 'games');

function bodyOf(filename) {
  const raw = fs.readFileSync(path.join(GAMES_DIR, filename), 'utf8');
  const m = raw.match(/^---[\s\S]*?---\s*/);
  return m ? raw.slice(m.index + m[0].length) : raw;
}

function parseStructure(body) {
  const lines = body.split(/\r?\n/);
  const nodes = [];
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('<!--') && trimmed.endsWith('-->')) continue;

    const headingMatch = /^#{1,6}\s+/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[0].trim().length;
      nodes.push({ index: nodes.length, lineIndex, type: 'heading', level });
      continue;
    }

    const listMatch = /^(\s*)([-*+]|\d+\.)\s+/.exec(line);
    if (listMatch) {
      const indentSpaces = listMatch[1].length;
      const indentBucket = Math.floor(indentSpaces / 2);
      nodes.push({ index: nodes.length, lineIndex, type: 'list-item', indentBucket });
      continue;
    }

    nodes.push({ index: nodes.length, lineIndex, type: 'paragraph' });
  }
  return { lines, nodes };
}

function nodesMatch(a, b) {
  if (!b) return false;
  if (a.type !== b.type) return false;
  if (a.type === 'heading') return a.level === b.level;
  if (a.type === 'list-item') {
    const ai = a.indentBucket ?? 0;
    const bi = b.indentBucket ?? 0;
    return ai === bi;
  }
  return true;
}

function compare(name) {
  const c = parseStructure(bodyOf(`${name}.en.md`));
  const l = parseStructure(bodyOf(`${name}.zh.md`));

  let i = 0;
  let j = 0;
  const pairs = [];

  while (i < c.nodes.length && j < l.nodes.length) {
    const a = c.nodes[i];
    const b = l.nodes[j];
    const ok = nodesMatch(a, b);
    pairs.push({ step: pairs.length, i, j, a, b, ok });
    if (ok) {
      i++;
      j++;
    } else {
      j++;
    }
  }

  const missingIndex = i < c.nodes.length ? i : -1;
  return { canonical: c, localized: l, pairs, missingIndex };
}

for (const name of ['bubble-tower', 'bubble-woods-ultimate', 'crossyroad']) {
  console.log('====', name, '====');
  const result = compare(name);
  console.log('missingIndex:', result.missingIndex);
  console.log('canonical nodes:', result.canonical.nodes);
  console.log('localized nodes:', result.localized.nodes);
  console.log('pairs (first 30):', result.pairs.slice(0, 30));
  console.log();
}
