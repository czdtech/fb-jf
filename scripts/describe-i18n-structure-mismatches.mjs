#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import process from 'process';
import matter from 'gray-matter';

const ROOT = process.cwd();
const GAMES_DIR = path.join(ROOT, 'src', 'content', 'games');
const REPORT_PATH = path.join(ROOT, 'i18n-structure-report.json');

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
      nodes.push({
        index: nodes.length,
        lineIndex,
        type: 'heading',
        level: headingMatch[0].trim().length,
        text: trimmed,
      });
      continue;
    }

    const listMatch = /^(\s*)([-*+]|\d+\.)\s+/.exec(line);
    if (listMatch) {
      nodes.push({
        index: nodes.length,
        lineIndex,
        type: 'list-item',
        indentBucket: Math.floor(listMatch[1].length / 2),
        text: trimmed,
      });
      continue;
    }

    nodes.push({ index: nodes.length, lineIndex, type: 'paragraph', text: trimmed });
  }

  return { lines, nodes };
}

function readBody(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return matter(raw).content;
}

function parseMissingIndex(reason) {
  const m = reason.match(/at index (\d+)/);
  return m ? parseInt(m[1], 10) : -1;
}

function main() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.error(`Missing report: ${REPORT_PATH}`);
    console.error('Run: npm run validate:i18n');
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  const mismatches = report.mismatches || [];

  for (const m of mismatches) {
    const missingIndex = parseMissingIndex(m.reason);
    const canonicalPath = path.join(GAMES_DIR, m.canonicalFile);
    if (!fs.existsSync(canonicalPath)) continue;

    const canonical = parseStructureWithLines(readBody(canonicalPath));
    const node = canonical.nodes[missingIndex];
    if (!node) continue;

    const lineNo = node.lineIndex + 1;
    const extra =
      node.type === 'heading'
        ? `level=${node.level}`
        : node.type === 'list-item'
          ? `indent=${node.indentBucket}`
          : '';

    // TSV: urlstr, locale, missingIndex, type, extra, canonicalLineNo, canonicalText
    console.log(
      [
        m.urlstr,
        m.locale,
        String(missingIndex),
        node.type,
        extra,
        String(lineNo),
        node.text.replace(/\t/g, ' '),
      ].join('\t')
    );
  }
}

main();

