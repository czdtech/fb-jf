#!/usr/bin/env node
/**
 * Baseline I18n Analysis Script
 * 
 * This script performs three key tasks:
 * 1. Enumerate all Canonical Games (locale=en, filename pattern: slug.md)
 * 2. Calculate localization coverage for each target language (zh, ja, es, fr, de, ko)
 * 3. Validate frontmatter completeness for all game content files
 * 
 * Requirements: 1.1, 3.1, 3.3, 6.1, 6.3
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const GAMES_DIR = path.join(__dirname, '../src/content/games');
const TARGET_LANGUAGES = ['zh', 'ja', 'es', 'fr', 'de', 'ko'] as const;
// Note: 'locale' has a default value of 'en' in the schema, so it's not strictly required in frontmatter
const REQUIRED_FIELDS = ['title', 'description', 'iframeSrc', 'thumbnail', 'tags', 'urlstr'] as const;

type Locale = 'en' | typeof TARGET_LANGUAGES[number];

interface GameMetadata {
  slug: string;
  urlstr: string;
  title: string;
  tags: string[];
  locale: Locale;
  filename: string;
  hasAllRequiredFields: boolean;
  missingFields: string[];
}

interface CanonicalGame {
  slug: string;
  urlstr: string;
  title: string;
  tags: string[];
  filename: string;
}

interface LocalizationCoverage {
  locale: Locale;
  totalCanonical: number;
  translatedCount: number;
  coveragePercent: number;
  missingUrlstrs: string[];
}

interface ValidationIssue {
  filename: string;
  locale: string;
  missingFields: string[];
}

/**
 * Parse frontmatter from a markdown file
 */
function parseFrontmatter(content: string): Record<string, any> {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return {};
  }

  const frontmatterText = match[1];
  const frontmatter: Record<string, any> = {};

  // Simple YAML parser for our needs
  const lines = frontmatterText.split('\n');
  let currentKey = '';
  let inArray = false;
  let arrayItems: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Array item
    if (trimmed.startsWith('-') && inArray) {
      const item = trimmed.substring(1).trim().replace(/^["']|["']$/g, '');
      arrayItems.push(item);
      continue;
    }

    // Key-value pair
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      // Save previous array if exists
      if (inArray && currentKey) {
        frontmatter[currentKey] = arrayItems;
        arrayItems = [];
        inArray = false;
      }

      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();

      currentKey = key;

      if (value === '' || value === '[]') {
        // Empty value or empty array indicator
        inArray = true;
        arrayItems = [];
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // Inline array
        const items = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
        frontmatter[key] = items;
        inArray = false;
      } else {
        // Regular value
        frontmatter[key] = value.replace(/^["']|["']$/g, '');
        inArray = false;
      }
    }
  }

  // Save last array if exists
  if (inArray && currentKey) {
    frontmatter[currentKey] = arrayItems;
  }

  return frontmatter;
}

/**
 * Read and parse a game file
 */
async function parseGameFile(filename: string): Promise<GameMetadata | null> {
  try {
    const filePath = path.join(GAMES_DIR, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    // Extract slug from filename
    const slug = filename.replace(/\.(md|zh\.md|ja\.md|es\.md|fr\.md|de\.md|ko\.md)$/, '');
    
    // Check required fields
    const missingFields: string[] = [];
    for (const field of REQUIRED_FIELDS) {
      if (!frontmatter[field] || frontmatter[field] === '') {
        missingFields.push(field);
      }
    }

    // Parse tags if it's a string
    let tags = frontmatter.tags || [];
    if (typeof tags === 'string') {
      tags = tags.split(',').map((t: string) => t.trim());
    }

    return {
      slug,
      urlstr: frontmatter.urlstr || slug,
      title: frontmatter.title || '',
      tags,
      locale: frontmatter.locale || 'en',
      filename,
      hasAllRequiredFields: missingFields.length === 0,
      missingFields,
    };
  } catch (error) {
    console.error(`Error parsing ${filename}:`, error);
    return null;
  }
}

/**
 * Task 1.1: Enumerate Canonical Games
 */
async function enumerateCanonicalGames(): Promise<CanonicalGame[]> {
  console.log('\n=== Task 1.1: Enumerating Canonical Games ===\n');

  const files = await fs.readdir(GAMES_DIR);
  
  // Filter for canonical game files (slug.md pattern, not slug.lang.md)
  const canonicalFiles = files.filter(f => {
    return f.endsWith('.md') && 
           !f.match(/\.(zh|ja|es|fr|de|ko)\.md$/);
  });

  console.log(`Found ${canonicalFiles.length} potential canonical game files\n`);

  const canonicalGames: CanonicalGame[] = [];

  for (const filename of canonicalFiles) {
    const metadata = await parseGameFile(filename);
    
    if (!metadata) continue;

    // Verify it's actually a canonical game (locale should be 'en')
    if (metadata.locale !== 'en') {
      console.warn(`⚠️  Warning: ${filename} has locale '${metadata.locale}' but filename suggests canonical game`);
      continue;
    }

    canonicalGames.push({
      slug: metadata.slug,
      urlstr: metadata.urlstr,
      title: metadata.title,
      tags: metadata.tags,
      filename,
    });
  }

  console.log(`✓ Verified ${canonicalGames.length} Canonical Games (locale=en)\n`);
  
  // Display sample
  console.log('Sample Canonical Games:');
  canonicalGames.slice(0, 10).forEach(game => {
    console.log(`  - ${game.urlstr}: "${game.title}" [${game.tags.join(', ')}]`);
  });
  
  if (canonicalGames.length > 10) {
    console.log(`  ... and ${canonicalGames.length - 10} more\n`);
  }

  return canonicalGames;
}

/**
 * Task 1.2: Calculate localization coverage
 */
async function calculateLocalizationCoverage(
  canonicalGames: CanonicalGame[]
): Promise<LocalizationCoverage[]> {
  console.log('\n=== Task 1.2: Calculating Localization Coverage ===\n');

  const files = await fs.readdir(GAMES_DIR);
  const coverageResults: LocalizationCoverage[] = [];

  // Build a map of urlstr -> canonical game
  const canonicalMap = new Map<string, CanonicalGame>();
  for (const game of canonicalGames) {
    canonicalMap.set(game.urlstr, game);
  }

  for (const locale of TARGET_LANGUAGES) {
    // Find all localized files for this language
    const localizedFiles = files.filter(f => f.endsWith(`.${locale}.md`));
    
    const translatedUrlstrs = new Set<string>();

    for (const filename of localizedFiles) {
      const metadata = await parseGameFile(filename);
      if (metadata && metadata.locale === locale) {
        translatedUrlstrs.add(metadata.urlstr);
      }
    }

    const translatedCount = translatedUrlstrs.size;
    const totalCanonical = canonicalGames.length;
    const coveragePercent = totalCanonical > 0 
      ? Math.round((translatedCount / totalCanonical) * 100 * 100) / 100 
      : 0;

    // Find missing urlstrs
    const missingUrlstrs: string[] = [];
    for (const game of canonicalGames) {
      if (!translatedUrlstrs.has(game.urlstr)) {
        missingUrlstrs.push(game.urlstr);
      }
    }

    coverageResults.push({
      locale,
      totalCanonical,
      translatedCount,
      coveragePercent,
      missingUrlstrs,
    });

    console.log(`${locale.toUpperCase()}: ${translatedCount}/${totalCanonical} (${coveragePercent}%)`);
  }

  console.log('\nDetailed Missing Translations:');
  for (const result of coverageResults) {
    if (result.missingUrlstrs.length > 0) {
      console.log(`\n${result.locale.toUpperCase()} - Missing ${result.missingUrlstrs.length} translations:`);
      result.missingUrlstrs.slice(0, 5).forEach(urlstr => {
        const canonical = canonicalMap.get(urlstr);
        console.log(`  - ${urlstr}${canonical ? ` ("${canonical.title}")` : ''}`);
      });
      if (result.missingUrlstrs.length > 5) {
        console.log(`  ... and ${result.missingUrlstrs.length - 5} more`);
      }
    }
  }

  return coverageResults;
}

/**
 * Task 1.3: Validate frontmatter completeness
 */
async function validateFrontmatterCompleteness(): Promise<ValidationIssue[]> {
  console.log('\n=== Task 1.3: Validating Frontmatter Completeness ===\n');

  const files = await fs.readdir(GAMES_DIR);
  const gameFiles = files.filter(f => f.endsWith('.md'));

  const issues: ValidationIssue[] = [];
  let validCount = 0;

  for (const filename of gameFiles) {
    const metadata = await parseGameFile(filename);
    
    if (!metadata) {
      issues.push({
        filename,
        locale: 'unknown',
        missingFields: ['Failed to parse file'],
      });
      continue;
    }

    if (!metadata.hasAllRequiredFields) {
      issues.push({
        filename,
        locale: metadata.locale,
        missingFields: metadata.missingFields,
      });
    } else {
      validCount++;
    }
  }

  console.log(`✓ ${validCount}/${gameFiles.length} files have complete frontmatter`);
  console.log(`✗ ${issues.length} files have missing or invalid fields\n`);

  if (issues.length > 0) {
    console.log('Files with Issues:');
    issues.slice(0, 20).forEach(issue => {
      console.log(`  - ${issue.filename} [${issue.locale}]: Missing ${issue.missingFields.join(', ')}`);
    });
    if (issues.length > 20) {
      console.log(`  ... and ${issues.length - 20} more issues\n`);
    }
  }

  return issues;
}

/**
 * Generate JSON report
 */
async function generateReport(
  canonicalGames: CanonicalGame[],
  coverage: LocalizationCoverage[],
  issues: ValidationIssue[]
) {
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalCanonicalGames: canonicalGames.length,
      totalValidationIssues: issues.length,
      coverageByLanguage: coverage.map(c => ({
        locale: c.locale,
        translated: c.translatedCount,
        total: c.totalCanonical,
        percent: c.coveragePercent,
        missing: c.missingUrlstrs.length,
      })),
    },
    canonicalGames: canonicalGames.map(g => ({
      urlstr: g.urlstr,
      title: g.title,
      tags: g.tags,
      filename: g.filename,
    })),
    coverage,
    validationIssues: issues,
  };

  const reportPath = path.join(__dirname, '../i18n-baseline-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  
  console.log(`\n📄 Full report saved to: ${reportPath}\n`);
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   I18n Baseline Analysis for FiddleBops Game Content      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Task 1.1: Enumerate Canonical Games
    const canonicalGames = await enumerateCanonicalGames();

    // Task 1.2: Calculate Localization Coverage
    const coverage = await calculateLocalizationCoverage(canonicalGames);

    // Task 1.3: Validate Frontmatter Completeness
    const issues = await validateFrontmatterCompleteness();

    // Generate comprehensive report
    await generateReport(canonicalGames, coverage, issues);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Analysis Complete                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Exit with error code if there are validation issues
    if (issues.length > 0) {
      console.log('⚠️  Warning: Validation issues found. Please review the report.');
      process.exit(1);
    }

  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  }
}

main();
