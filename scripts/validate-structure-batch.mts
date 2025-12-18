#!/usr/bin/env node
/**
 * Validate i18n content structure for a specific batch of game markdown files.
 *
 * This script is a focused version of validate-i18n-structure.mts that only
 * checks the (urlstr, locale) pairs specified in a batch file.
 *
 * Usage:
 *   node --experimental-strip-types scripts/validate-structure-batch.mts --batch structure-batches/zh-batch-1.json
 *
 * This implements the batch validation requirement from
 * .kiro/specs/i18n-structure-alignment/requirements.md (Requirements 4.2, 5.3).
 */

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');

type Locale = 'en' | 'zh' | 'ja' | 'es' | 'fr' | 'de' | 'ko';

interface BatchItem {
  urlstr: string;
  canonicalFile: string;
  localizedFile: string;
  reasons: string[];
}

interface BatchFile {
  locale: Locale;
  batchNumber: number;
  items: BatchItem[];
  totalMismatches: number;
}

interface GameFile {
  filename: string;
  locale: Locale;
  urlstr: string;
  content: string;
}

type NodeType = 'heading' | 'list-item' | 'paragraph';

interface StructureNode {
  type: NodeType;
  level?: number;      // for headings
  indentBucket?: number; // for list items (coarse indentation level)
}

interface MismatchDetail {
  urlstr: string;
  locale: Locale;
  canonicalFile: string;
  localizedFile: string;
  reason: string;
}

interface BatchValidationReport {
  timestamp: string;
  batchFile: string;
  locale: Locale;
  batchNumber: number;
  summary: {
    totalItemsInBatch: number;
    checkedPairs: number;
    mismatchCount: number;
    fixedCount: number;
  };
  mismatches: MismatchDetail[];
  fixed: string[]; // urlstr values that are now aligned
}

async function readBatchFile(batchPath: string): Promise<BatchFile> {
  const raw = await fs.readFile(batchPath, 'utf-8');
  return JSON.parse(raw) as BatchFile;
}

async function readGameFile(filename: string): Promise<GameFile | null> {
  try {
    const filePath = path.join(GAMES_DIR, filename);
    const raw = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(raw);

    const locale: Locale = (data.locale || 'en') as Locale;
    const urlstr: string =
      typeof data.urlstr === 'string' && data.urlstr.trim() !== ''
        ? data.urlstr
        : filename.replace(/\.(en|zh|ja|es|fr|de|ko)\.md$/, '');

    return {
      filename,
      locale,
      urlstr,
      content,
    };
  } catch (error) {
    console.warn(`⚠️  Could not read file ${filename}:`, error);
    return null;
  }
}

/**
 * Parse markdown body into a sequence of structural nodes.
 * This is a lightweight line-based parser that focuses on:
 * - headings (# .. ######)
 * - list items (-, *, +, 1., 2., ...)
 * - paragraphs (any other non-empty text line)
 */
function parseMarkdownStructure(body: string): StructureNode[] {
  const lines = body.split(/\r?\n/);
  const nodes: StructureNode[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      continue;
    }

    // Skip pure HTML comments (often used for stub markers)
    if (trimmed.startsWith('<!--') && trimmed.endsWith('-->')) {
      continue;
    }

    // Headings: #, ##, ###, etc.
    const headingMatch = /^#{1,6}\s+/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[0].trim().length; // number of #'s
      nodes.push({ type: 'heading', level });
      continue;
    }

    // List items (unordered or ordered), preserve coarse indentation level
    const listMatch = /^(\s*)([-*+]|\d+\.)\s+/.exec(line);
    if (listMatch) {
      const indentSpaces = listMatch[1].length;
      // bucketize indentation to reduce sensitivity to exact spaces
      const indentBucket = Math.floor(indentSpaces / 2);
      nodes.push({ type: 'list-item', indentBucket });
      continue;
    }

    // Fallback: treat as paragraph-level content
    nodes.push({ type: 'paragraph' });
  }

  return nodes;
}

function nodesMatch(a: StructureNode, b: StructureNode): boolean {
  if (a.type !== b.type) return false;

  if (a.type === 'heading') {
    return a.level === b.level;
  }

  if (a.type === 'list-item') {
    const aIndent = a.indentBucket ?? 0;
    const bIndent = b.indentBucket ?? 0;
    return aIndent === bIndent;
  }

  return true;
}

/**
 * Compare structures in a tolerant way:
 * - All canonical nodes must appear in the localized sequence, in order
 * - Localized may contain extra nodes (e.g., additional paragraphs)
 */
function compareStructures(
  canonical: StructureNode[],
  localized: StructureNode[]
): { ok: boolean; reason?: string } {
  let i = 0; // index in canonical
  let j = 0; // index in localized

  while (i < canonical.length && j < localized.length) {
    const a = canonical[i];
    const b = localized[j];

    if (nodesMatch(a, b)) {
      i++;
      j++;
    } else {
      // Skip extra localized node and keep looking
      j++;
    }
  }

  if (i < canonical.length) {
    const missing = canonical[i];
    return {
      ok: false,
      reason: `Canonical structure node missing in localized content at index ${i} (type=${missing.type}${
        missing.type === 'heading' ? `, level=${missing.level}` : ''
      })`,
    };
  }

  return { ok: true };
}

async function validateBatch(batchPath: string): Promise<BatchValidationReport> {
  const batch = await readBatchFile(batchPath);
  const mismatches: MismatchDetail[] = [];
  const fixed: string[] = [];
  let checkedPairs = 0;

  console.log(`\n📦 Processing batch: ${batch.locale}-batch-${batch.batchNumber}`);
  console.log(`   Total items in batch: ${batch.items.length}\n`);

  for (const item of batch.items) {
    const canonical = await readGameFile(item.canonicalFile);
    const localized = await readGameFile(item.localizedFile);

    if (!canonical) {
      console.warn(`⚠️  Skipping ${item.urlstr}: canonical file not found`);
      continue;
    }

    if (!localized) {
      console.warn(`⚠️  Skipping ${item.urlstr}: localized file not found`);
      continue;
    }

    checkedPairs++;

    const canonicalStructure = parseMarkdownStructure(canonical.content);
    const localizedStructure = parseMarkdownStructure(localized.content);
    const result = compareStructures(canonicalStructure, localizedStructure);

    if (!result.ok) {
      mismatches.push({
        urlstr: item.urlstr,
        locale: batch.locale,
        canonicalFile: item.canonicalFile,
        localizedFile: item.localizedFile,
        reason: result.reason || 'Unknown mismatch',
      });
    } else {
      // This item was in the batch but is now fixed!
      fixed.push(item.urlstr);
    }
  }

  return {
    timestamp: new Date().toISOString(),
    batchFile: path.basename(batchPath),
    locale: batch.locale,
    batchNumber: batch.batchNumber,
    summary: {
      totalItemsInBatch: batch.items.length,
      checkedPairs,
      mismatchCount: mismatches.length,
      fixedCount: fixed.length,
    },
    mismatches,
    fixed,
  };
}

function printReport(report: BatchValidationReport) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 Batch Validation Results');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`Batch: ${report.batchFile}`);
  console.log(`Locale: ${report.locale}`);
  console.log(`Batch Number: ${report.batchNumber}`);
  console.log(`Timestamp: ${report.timestamp}\n`);

  console.log('Summary:');
  console.log(`  Total items in batch: ${report.summary.totalItemsInBatch}`);
  console.log(`  Checked pairs: ${report.summary.checkedPairs}`);
  console.log(`  ✅ Fixed: ${report.summary.fixedCount}`);
  console.log(`  ❌ Still mismatched: ${report.summary.mismatchCount}\n`);

  if (report.fixed.length > 0) {
    console.log('✅ Fixed items (now aligned):');
    for (const urlstr of report.fixed) {
      console.log(`  ✓ ${urlstr}`);
    }
    console.log();
  }

  if (report.mismatches.length > 0) {
    console.log('❌ Still mismatched:');
    for (const m of report.mismatches) {
      console.log(`  ✗ ${m.urlstr}`);
      console.log(`    File: ${m.localizedFile}`);
      console.log(`    Reason: ${m.reason}\n`);
    }
  }

  // Overall status
  if (report.summary.mismatchCount === 0) {
    console.log('🎉 All items in this batch are now structurally aligned!\n');
  } else {
    const percentage = Math.round(
      (report.summary.fixedCount / report.summary.totalItemsInBatch) * 100
    );
    console.log(
      `📈 Progress: ${percentage}% of batch items fixed (${report.summary.fixedCount}/${report.summary.totalItemsInBatch})\n`
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const batchIndex = args.indexOf('--batch');

  if (batchIndex === -1 || !args[batchIndex + 1]) {
    console.error('❌ Error: --batch parameter is required\n');
    console.error('Usage:');
    console.error(
      '  node --experimental-strip-types scripts/validate-structure-batch.mts --batch <path-to-batch.json>\n'
    );
    console.error('Example:');
    console.error(
      '  node --experimental-strip-types scripts/validate-structure-batch.mts --batch structure-batches/zh-batch-1.json\n'
    );
    process.exit(1);
  }

  const batchPath = args[batchIndex + 1];

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📐 I18n Structure Batch Validation');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const report = await validateBatch(batchPath);
    printReport(report);

    // Exit with non-zero if there are still mismatches
    if (report.summary.mismatchCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Fatal error during batch validation:', error);
    process.exit(1);
  }
}

main();
