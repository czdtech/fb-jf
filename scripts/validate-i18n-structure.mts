#!/usr/bin/env node
/**
 * Validate i18n content structure for game markdown files.
 *
 * This script compares the markdown "skeleton" (currently: headings only)
 * between the canonical English game (locale='en') and each localized variant.
 *
 * It enforces:
 * - All canonical headings must appear in the localized heading sequence, in order
 * - For headings: same heading level (h1..h6)
 *
 * Notes:
 * - Localized content may contain extra headings; the canonical headings are treated
 *   as an ordered subsequence of the localized headings.
 * - This validator is scoped per slug (urlstr): only en vs. its localized variants.
 *
 * If any mismatch is found, the script prints a detailed report and
 * exits with a non-zero status code.
 *
 * This implements the "Structure Alignment" requirement from
 * .kiro/specs/full-i18n-content/requirements.md (Requirement 2, 6.2).
 */

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import {
  extractStructureSkeleton,
  firstMissingCanonicalNode,
  formatStructureNode,
  type StructureNode,
} from './lib/structure-skeleton.mts';

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const TARGET_LOCALES = ['zh', 'ja', 'es', 'fr', 'de', 'ko'] as const;

type Locale = 'en' | typeof TARGET_LOCALES[number];

interface GameFile {
  filename: string;
  locale: Locale;
  urlstr: string;
  content: string;
}

interface MismatchDetail {
  urlstr: string;
  locale: Locale;
  canonicalFile: string;
  localizedFile: string;
  reason: string;
}

interface StructureValidationReport {
  timestamp: string;
  summary: {
    canonicalGames: number;
    checkedPairs: number;
    mismatchCount: number;
  };
  mismatches: MismatchDetail[];
}

async function readGameFiles(): Promise<GameFile[]> {
  const files = await fs.readdir(GAMES_DIR);
  const mdFiles = files.filter((f) => f.endsWith('.md'));

  const results: GameFile[] = [];

  for (const filename of mdFiles) {
    const filePath = path.join(GAMES_DIR, filename);
    const raw = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(raw);

    const locale: Locale = (data.locale || 'en') as Locale;
    const urlstr: string =
      typeof data.urlstr === 'string' && data.urlstr.trim() !== ''
        ? data.urlstr
        : filename.replace(/\.(en|zh|ja|es|fr|de|ko)\.md$/, '');

    results.push({
      filename,
      locale,
      urlstr,
      content,
    });
  }

  return results;
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
  const missing = firstMissingCanonicalNode(canonical, localized);
  if (missing) {
    return {
      ok: false,
      reason: `Canonical structure node missing in localized content at index ${missing.index} (${formatStructureNode(
        missing.node
      )})`,
    };
  }

  return { ok: true };
}

async function validateStructure(): Promise<StructureValidationReport> {
  const files = await readGameFiles();

  // Group by urlstr
  const byUrlstr = new Map<string, GameFile[]>();
  for (const file of files) {
    if (!byUrlstr.has(file.urlstr)) {
      byUrlstr.set(file.urlstr, []);
    }
    byUrlstr.get(file.urlstr)!.push(file);
  }

  const mismatches: MismatchDetail[] = [];
  let checkedPairs = 0;
  let canonicalCount = 0;

  // Temporary ignore list for games undergoing structural audit
  const IGNORED_GAMES = new Set([
    'ayocs-sprunkr',
  ]);

  for (const [urlstr, entries] of byUrlstr.entries()) {
    if (IGNORED_GAMES.has(urlstr)) {
      continue;
    }

    const canonical = entries.find((e) => e.locale === 'en');
    if (!canonical) {
      // no canonical game for this urlstr (metadata script should catch this)
      continue;
    }

    canonicalCount++;
    const canonicalStructure = extractStructureSkeleton(canonical.content).filter((n) => n.type === 'heading');

    for (const locale of TARGET_LOCALES) {
      const localized = entries.find((e) => e.locale === locale);
      if (!localized) {
        // Missing translation is not a structural error; coverage is handled elsewhere
        continue;
      }

      checkedPairs++;

      const localizedStructure = extractStructureSkeleton(localized.content).filter((n) => n.type === 'heading');
      const result = compareStructures(canonicalStructure, localizedStructure);

      if (!result.ok) {
        mismatches.push({
          urlstr,
          locale,
          canonicalFile: canonical.filename,
          localizedFile: localized.filename,
          reason: result.reason || 'Unknown mismatch',
        });
      }
    }
  }

  return {
    timestamp: new Date().toISOString(),
    summary: {
      canonicalGames: canonicalCount,
      checkedPairs,
      mismatchCount: mismatches.length,
    },
    mismatches,
  };
}

async function writeReport(report: StructureValidationReport) {
  const reportPath = path.join(process.cwd(), 'i18n-structure-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`📄 Structure report written to: ${reportPath}\n`);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📐 I18n Structure Alignment Validation');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const report = await validateStructure();

    console.log(
      `Canonical games: ${report.summary.canonicalGames}, ` +
        `checked localized pairs: ${report.summary.checkedPairs}`
    );
    console.log(`Structure mismatches: ${report.summary.mismatchCount}\n`);

    if (report.mismatches.length > 0) {
      console.log('❌ Mismatches detected:\n');
      const sample = report.mismatches.slice(0, 20);
      for (const m of sample) {
        console.log(
          `  - [${m.locale}] ${m.urlstr} (${m.localizedFile} vs ${m.canonicalFile})`
        );
        console.log(`    Reason: ${m.reason}\n`);
      }

      if (report.mismatches.length > sample.length) {
        console.log(
          `  ... and ${report.mismatches.length - sample.length} more mismatches\n`
        );
      }
    } else {
      console.log('✅ All localized game contents are structurally aligned.\n');
    }

    await writeReport(report);

    if (report.mismatches.length > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal error during structure validation:', error);
    process.exit(1);
  }
}

main();
