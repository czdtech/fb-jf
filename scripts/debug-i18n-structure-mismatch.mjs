#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import process from 'process';
import matter from 'gray-matter';

const ROOT = process.cwd();
const GAMES_DIR = path.join(ROOT, 'src', 'content', 'games');

function parseArgs(argv) {
  const args = { urlstr: null, locale: 'zh' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--urlstr') args.urlstr = argv[++i];
    else if (a === '--locale') args.locale = argv[++i];
  }
  if (!args.urlstr) {
    console.error('Usage: node scripts/debug-i18n-structure-mismatch.mjs --urlstr <slug> [--locale zh]');
    process.exit(1);
  }
  return args;
}

function readBody(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { content } = matter(raw);
  return content;
}

function parseStructureWithLines(body) {
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
      nodes.push({ index: nodes.length, lineIndex, type: 'heading', level, text: trimmed });
      continue;
    }

    const listMatch = /^(\s*)([-*+]|\d+\.)\s+/.exec(line);
    if (listMatch) {
      const indentSpaces = listMatch[1].length;
      const indentBucket = Math.floor(indentSpaces / 2);
      nodes.push({ index: nodes.length, lineIndex, type: 'list-item', indentBucket, text: trimmed });
      continue;
    }

    nodes.push({ index: nodes.length, lineIndex, type: 'paragraph', text: trimmed });
  }

  return { lines, nodes };
}

function nodesMatch(a, b) {
  if (!b) return false;
  if (a.type !== b.type) return false;
  if (a.type === 'heading') return a.level === b.level;
  if (a.type === 'list-item') return (a.indentBucket ?? 0) === (b.indentBucket ?? 0);
  return true;
}

function compare(canonical, localized) {
  let i = 0;
  let j = 0;

  while (i < canonical.nodes.length && j < localized.nodes.length) {
    const a = canonical.nodes[i];
    const b = localized.nodes[j];
    if (nodesMatch(a, b)) {
      i++;
      j++;
    } else {
      j++;
    }
  }

  return { missingIndex: i < canonical.nodes.length ? i : -1 };
}

function printContext(parsed, node, label) {
  const start = Math.max(0, node.lineIndex - 2);
  const end = Math.min(parsed.lines.length - 1, node.lineIndex + 2);
  console.log(`\n--- ${label} (line ${node.lineIndex + 1}) ---`);
  for (let k = start; k <= end; k++) {
    const prefix = k === node.lineIndex ? '>' : ' ';
    console.log(`${prefix} ${String(k + 1).padStart(4, ' ')} | ${parsed.lines[k]}`);
  }
}

function main() {
  const { urlstr, locale } = parseArgs(process.argv);

  const canonicalPath = path.join(GAMES_DIR, `${urlstr}.en.md`);
  const localizedPath = path.join(GAMES_DIR, `${urlstr}.${locale}.md`);

  if (!fs.existsSync(canonicalPath)) {
    console.error(`Missing canonical: ${canonicalPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(localizedPath)) {
    console.error(`Missing localized: ${localizedPath}`);
    process.exit(1);
  }

  const canonical = parseStructureWithLines(readBody(canonicalPath));
  const localized = parseStructureWithLines(readBody(localizedPath));

  const { missingIndex } = compare(canonical, localized);

  console.log(`urlstr=${urlstr} locale=${locale}`);
  console.log(`canonical nodes=${canonical.nodes.length} localized nodes=${localized.nodes.length}`);
  console.log(`missingIndex=${missingIndex}`);

  if (missingIndex === -1) {
    console.log('✅ All canonical nodes are present in localized structure.');
    return;
  }

  const missingNode = canonical.nodes[missingIndex];
  console.log('\n❌ Missing canonical node:');
  console.log(missingNode);

  printContext(canonical, missingNode, 'CANONICAL');

  console.log('\nTip: Add a matching node in localized after the last matched section.');
}

main();

