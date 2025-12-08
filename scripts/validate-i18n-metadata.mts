#!/usr/bin/env node
/**
 * Validate i18n metadata for game content files
 * 
 * This script:
 * 1. Scans src/content/games directory and reads all Markdown frontmatter
 * 2. Validates that locale is in the supported set and urlstr is non-empty
 * 3. For each Localized Game Variant, confirms a unique Canonical Game exists
 *    (locale='en' with the same urlstr)
 * 4. Outputs coverage statistics per language
 */

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

// Supported locales
const SUPPORTED_LOCALES = ['en', 'zh', 'ja', 'es', 'fr', 'de', 'ko'] as const;
type Locale = typeof SUPPORTED_LOCALES[number];

// Game metadata interface
interface GameMetadata {
  locale: Locale;
  urlstr: string;
  title: string;
  filePath: string;
  fileName: string;
}

// Validation result interface
interface ValidationResult {
  totalFiles: number;
  validFiles: number;
  errors: ValidationError[];
  canonicalGames: Map<string, GameMetadata>;
  localizedVariants: Map<string, GameMetadata[]>;
  coverageStats: CoverageStats;
}

interface ValidationError {
  type: 'missing_locale' | 'invalid_locale' | 'missing_urlstr' | 'missing_canonical' | 'duplicate_canonical' | 'parse_error';
  filePath: string;
  message: string;
}

interface CoverageStats {
  [locale: string]: {
    total: number;
    percentage: number;
    missing: string[];
  };
}

/**
 * Read all game files from the games directory
 */
async function readGameFiles(gamesDir: string): Promise<string[]> {
  const files = await fs.readdir(gamesDir);
  return files
    .filter(file => file.endsWith('.md'))
    .map(file => path.join(gamesDir, file));
}

/**
 * Parse frontmatter from a markdown file
 */
async function parseGameFile(filePath: string): Promise<GameMetadata | ValidationError> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const { data } = matter(content);
    const fileName = path.basename(filePath);

    // Validate locale field (allow default 'en' from schema)
    const locale = data.locale || 'en';
    
    if (!data.locale) {
      // Note: This is acceptable due to schema default, but we track it
      // Uncomment below to enforce explicit locale declaration:
      // return {
      //   type: 'missing_locale',
      //   filePath,
      //   message: `Missing 'locale' field in frontmatter (using default 'en')`
      // };
    }

    if (!SUPPORTED_LOCALES.includes(locale)) {
      return {
        type: 'invalid_locale',
        filePath,
        message: `Invalid locale '${locale}'. Must be one of: ${SUPPORTED_LOCALES.join(', ')}`
      };
    }

    // Validate urlstr field
    if (!data.urlstr || typeof data.urlstr !== 'string' || data.urlstr.trim() === '') {
      return {
        type: 'missing_urlstr',
        filePath,
        message: `Missing or empty 'urlstr' field in frontmatter`
      };
    }

    return {
      locale: locale as Locale,
      urlstr: data.urlstr,
      title: data.title || 'Untitled',
      filePath,
      fileName
    };
  } catch (error) {
    return {
      type: 'parse_error',
      filePath,
      message: `Failed to parse file: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Validate all game files
 */
async function validateGameFiles(gamesDir: string): Promise<ValidationResult> {
  const filePaths = await readGameFiles(gamesDir);
  const errors: ValidationError[] = [];
  const canonicalGames = new Map<string, GameMetadata>();
  const localizedVariants = new Map<string, GameMetadata[]>();

  console.log(`\n📂 Scanning ${filePaths.length} game files...\n`);

  // Parse all files
  for (const filePath of filePaths) {
    const result = await parseGameFile(filePath);

    if ('type' in result) {
      // It's an error
      errors.push(result);
      continue;
    }

    // Categorize by locale
    if (result.locale === 'en') {
      // Check for duplicate canonical games
      if (canonicalGames.has(result.urlstr)) {
        errors.push({
          type: 'duplicate_canonical',
          filePath,
          message: `Duplicate Canonical Game for urlstr '${result.urlstr}'. Already defined in ${canonicalGames.get(result.urlstr)?.filePath}`
        });
      } else {
        canonicalGames.set(result.urlstr, result);
      }
    } else {
      // Localized variant
      if (!localizedVariants.has(result.urlstr)) {
        localizedVariants.set(result.urlstr, []);
      }
      localizedVariants.get(result.urlstr)!.push(result);
    }
  }

  // Validate that each localized variant has a canonical game
  for (const [urlstr, variants] of localizedVariants.entries()) {
    if (!canonicalGames.has(urlstr)) {
      for (const variant of variants) {
        errors.push({
          type: 'missing_canonical',
          filePath: variant.filePath,
          message: `Localized variant for urlstr '${urlstr}' (locale: ${variant.locale}) has no corresponding Canonical Game (locale='en')`
        });
      }
    }
  }

  // Calculate coverage statistics
  const coverageStats = calculateCoverage(canonicalGames, localizedVariants);

  return {
    totalFiles: filePaths.length,
    validFiles: filePaths.length - errors.length,
    errors,
    canonicalGames,
    localizedVariants,
    coverageStats
  };
}

/**
 * Calculate coverage statistics for each target language
 */
function calculateCoverage(
  canonicalGames: Map<string, GameMetadata>,
  localizedVariants: Map<string, GameMetadata[]>
): CoverageStats {
  const stats: CoverageStats = {};
  const totalCanonical = canonicalGames.size;
  const targetLocales = SUPPORTED_LOCALES.filter(l => l !== 'en');

  for (const locale of targetLocales) {
    const translatedUrlstrs = new Set<string>();

    // Find all urlstrs that have this locale
    for (const [urlstr, variants] of localizedVariants.entries()) {
      if (variants.some(v => v.locale === locale)) {
        translatedUrlstrs.add(urlstr);
      }
    }

    const translated = translatedUrlstrs.size;
    const percentage = totalCanonical > 0 ? (translated / totalCanonical) * 100 : 0;

    // Find missing urlstrs
    const missing: string[] = [];
    for (const [urlstr] of canonicalGames.entries()) {
      if (!translatedUrlstrs.has(urlstr)) {
        missing.push(urlstr);
      }
    }

    stats[locale] = {
      total: translated,
      percentage: Math.round(percentage * 100) / 100,
      missing
    };
  }

  return stats;
}

/**
 * Print validation results
 */
function printResults(result: ValidationResult): void {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 VALIDATION RESULTS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`Total files scanned: ${result.totalFiles}`);
  console.log(`Valid files: ${result.validFiles}`);
  console.log(`Canonical Games (en): ${result.canonicalGames.size}`);
  console.log(`Errors found: ${result.errors.length}\n`);

  // Print errors
  if (result.errors.length > 0) {
    console.log('❌ ERRORS:\n');
    for (const error of result.errors) {
      console.log(`  [${error.type}] ${path.basename(error.filePath)}`);
      console.log(`    ${error.message}\n`);
    }
  }

  // Print coverage statistics
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🌍 COVERAGE STATISTICS BY LANGUAGE');
  console.log('═══════════════════════════════════════════════════════════\n');

  const targetLocales = SUPPORTED_LOCALES.filter(l => l !== 'en');
  for (const locale of targetLocales) {
    const stats = result.coverageStats[locale];
    const bar = generateProgressBar(stats.percentage);
    
    console.log(`${locale.toUpperCase()}: ${stats.total}/${result.canonicalGames.size} (${stats.percentage}%)`);
    console.log(`  ${bar}`);
    
    if (stats.missing.length > 0 && stats.missing.length <= 10) {
      console.log(`  Missing: ${stats.missing.slice(0, 5).join(', ')}${stats.missing.length > 5 ? '...' : ''}`);
    } else if (stats.missing.length > 10) {
      console.log(`  Missing: ${stats.missing.length} games`);
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════\n');
}

/**
 * Generate a simple progress bar
 */
function generateProgressBar(percentage: number, width: number = 40): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

/**
 * Write machine-readable report to file
 */
async function writeReport(result: ValidationResult, outputPath: string): Promise<void> {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: result.totalFiles,
      validFiles: result.validFiles,
      canonicalGames: result.canonicalGames.size,
      errorCount: result.errors.length
    },
    errors: result.errors,
    coverage: result.coverageStats
  };

  await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`📄 Report written to: ${outputPath}\n`);
}

/**
 * Main execution
 */
async function main() {
  const gamesDir = path.join(process.cwd(), 'src', 'content', 'games');
  const reportPath = path.join(process.cwd(), 'i18n-metadata-report.json');

  try {
    const result = await validateGameFiles(gamesDir);
    printResults(result);
    await writeReport(result, reportPath);

    // Exit with error code if there are errors
    if (result.errors.length > 0) {
      console.error('❌ Validation failed with errors.\n');
      process.exit(1);
    } else {
      console.log('✅ All validations passed!\n');
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
