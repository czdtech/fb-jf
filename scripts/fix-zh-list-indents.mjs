#!/usr/bin/env node
// Fix remaining zh list-item structure mismatches by aligning list indentation
// with the canonical English markdown, using text-based matching.

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const GAMES_DIR = path.join(ROOT, 'src', 'content', 'games');
const REPORT_PATH = path.join(ROOT, 'i18n-structure-report.json');

function loadReport() {
  const raw = fs.readFileSync(REPORT_PATH, 'utf8');
  return JSON.parse(raw);
}

function extractBody(raw) {
  const fmMatch = raw.match(/^---[\s\S]*?---\s*/);
  if (!fmMatch) return { frontmatter: '', body: raw };
  const frontmatter = fmMatch[0];
  const body = raw.slice(fmMatch.index + fmMatch[0].length);
  return { frontmatter, body };
}

function parseListItemsWithText(body) {
  const lines = body.split(/\r?\n/);
  const infos = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(line);
    if (!m) continue;

    const indentSpaces = m[1].length;
    const indentBucket = Math.floor(indentSpaces / 2);
    let content = m[3].trim();

    // Strip stub marker for matching
    content = content.replace(/^\[ZH TRANSLATION NEEDED\]\s+/, '');

    // Remove emphasis markers when building snippet
    const snippet = content.replace(/\*\*/g, '').slice(0, 80);

    infos.push({
      lineIndex: i,
      indentBucket,
      marker: m[2],
      content,
      snippet,
    });
  }

  return { lines, infos };
}

function alignFileIndent(canonicalFile, localizedFile) {
  const cPath = path.join(GAMES_DIR, canonicalFile);
  const lPath = path.join(GAMES_DIR, localizedFile);

  const cRaw = fs.readFileSync(cPath, 'utf8');
  const lRaw = fs.readFileSync(lPath, 'utf8');

  const { body: cBody } = extractBody(cRaw);
  const { frontmatter: lFm, body: lBody } = extractBody(lRaw);

  const cParsed = parseListItemsWithText(cBody);
  const lParsed = parseListItemsWithText(lBody);

  let changed = false;

  for (const cItem of cParsed.infos) {
    const targetBucket = cItem.indentBucket;
    const snippet = cItem.snippet;
    if (!snippet) continue;

    // Try to find a matching localized list item by snippet text
    const idx = lParsed.infos.findIndex((li) => {
      if (!li.snippet) return false;
      return li.snippet.includes(snippet) || snippet.includes(li.snippet);
    });

    if (idx === -1) continue;

    const lItem = lParsed.infos[idx];
    if (lItem.indentBucket === targetBucket) continue; // already aligned

    const targetIndentSpaces = targetBucket * 2;
    const originalLine = lParsed.lines[lItem.lineIndex];
    const m = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(originalLine);
    if (!m) continue;

    const newLine = `${' '.repeat(targetIndentSpaces)}${m[2]} ${m[3]}`;
    lParsed.lines[lItem.lineIndex] = newLine;
    changed = true;
  }

  if (changed) {
    const output = lFm ? `${lFm}${lParsed.lines.join('\n')}` : lParsed.lines.join('\n');
    fs.writeFileSync(lPath, output, 'utf8');
    console.log(`Aligned list indents for ${localizedFile}`);
  }
}

function main() {
  const report = loadReport();
  const mismatches = report.mismatches.filter(
    (m) => m.locale === 'zh' && m.reason.includes('type=list-item')
  );

  if (mismatches.length === 0) {
    console.log('No zh list-item mismatches to fix.');
    return;
  }

  console.log(`Fixing ${mismatches.length} zh list-item mismatches...`);

  for (const m of mismatches) {
    alignFileIndent(m.canonicalFile, m.localizedFile);
  }
}

main();
