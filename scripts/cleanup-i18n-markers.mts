#!/usr/bin/env node
/**
 * Cleanup I18n Language Markers
 * 
 * This script removes language markers ([FR], [DE], [ES], [KO], [JA], [ZH], [EN])
 * from the beginning of lines in the markdown body content of game files.
 * 
 * It only processes content AFTER the frontmatter block and preserves:
 * - Markdown structure (headings, lists, paragraphs)
 * - Frontmatter metadata
 * - All other content
 * 
 * Usage:
 *   npm run cleanup-markers -- --dry-run
 *   npm run cleanup-markers -- --filter "*.fr.md"
 *   npm run cleanup-markers -- --filter "*.fr.md" --dry-run
 * 
 * Options:
 *   --dry-run           Show what would be changed without writing files
 *   --filter <glob>     Only process files matching this glob pattern
 *                       Example: "*.fr.md" or "sprunki*.md"
 * 
 * Requirements: R1, R2, R4
 */

import fs from 'fs/promises';
import path from 'path';

// Configuration
const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const LANGUAGE_MARKERS = ['FR', 'DE', 'ES', 'KO', 'JA', 'ZH', 'EN'] as const;

// Regex to match language markers in markdown content
// Handles markers after markdown syntax (headings, lists) and with optional bold formatting
// Captures: (prefix including markdown syntax)(optional bold)(marker)(optional bold)(space)(rest)
const MARKER_REGEX = /^((?:\s*(?:#{1,6}\s+|-\s+))?)(\*\*)?(\[(FR|DE|ES|KO|JA|ZH|EN)\])(\*\*)?\s+(.*)$/;

interface CleanupResult {
  filename: string;
  originalPath: string;
  linesChanged: number;
  changes: LineChange[];
}

interface LineChange {
  lineNumber: number;
  before: string;
  after: string;
}

interface CleanupOptions {
  dryRun: boolean;
  filter?: string;
}

interface CleanupSummary {
  totalFiles: number;
  filesModified: number;
  totalLinesChanged: number;
  results: CleanupResult[];
}

/**
 * Parse command line arguments
 */
function parseArgs(): CleanupOptions {
  const args = process.argv.slice(2);
  const options: CleanupOptions = {
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--filter' && i + 1 < args.length) {
      options.filter = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Cleanup I18n Language Markers

This script removes language markers ([FR], [DE], [ES], [KO], [JA], [ZH], [EN])
from the beginning of lines in game markdown files.

Usage:
  npm run cleanup-markers -- [options]

Options:
  --dry-run           Show what would be changed without writing files
                      Use this to preview changes before applying them
  
  --filter <glob>     Only process files matching this glob pattern
                      Pattern is matched against filename (not full path)
                      Examples:
                        --filter "*.fr.md"      (all French files)
                        --filter "sprunki*.md"  (all Sprunki games)
                        --filter "*.de.md"      (all German files)

Examples:
  # Preview changes for all files
  npm run cleanup-markers -- --dry-run

  # Clean up all French game files
  npm run cleanup-markers -- --filter "*.fr.md"

  # Preview changes for German Sprunki games
  npm run cleanup-markers -- --filter "sprunki*.de.md" --dry-run

  # Clean up all files (use with caution!)
  npm run cleanup-markers
`);
}

/**
 * Convert glob pattern to regex
 */
function globToRegex(pattern: string): RegExp {
  // Escape special regex characters except * and ?
  let regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  
  return new RegExp(`^${regexPattern}$`);
}

/**
 * Find all markdown files in the games directory
 */
async function findGameFiles(filterPattern?: string): Promise<string[]> {
  const allFiles = await fs.readdir(GAMES_DIR);
  const mdFiles = allFiles.filter(f => f.endsWith('.md'));

  if (!filterPattern) {
    return mdFiles;
  }

  // Use glob pattern matching
  const regex = globToRegex(filterPattern);
  
  return mdFiles.filter(f => regex.test(f));
}

/**
 * Split file content into frontmatter and body
 * Returns the frontmatter block (including delimiters) and the body content
 */
function splitFrontmatterAndBody(content: string): { frontmatter: string; body: string } {
  const lines = content.split(/\r?\n/);
  
  // Find frontmatter boundaries
  let firstDelimiter = -1;
  let secondDelimiter = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (firstDelimiter === -1) {
        firstDelimiter = i;
      } else {
        secondDelimiter = i;
        break;
      }
    }
  }

  // If no valid frontmatter found, treat entire content as body
  if (firstDelimiter === -1 || secondDelimiter === -1) {
    return {
      frontmatter: '',
      body: content,
    };
  }

  // Split at the second delimiter
  const frontmatterLines = lines.slice(0, secondDelimiter + 1);
  const bodyLines = lines.slice(secondDelimiter + 1);

  return {
    frontmatter: frontmatterLines.join('\n'),
    body: bodyLines.join('\n'),
  };
}

/**
 * Clean language markers from body content
 * Returns cleaned content and list of changes made
 */
function cleanLanguageMarkers(body: string): { cleaned: string; changes: LineChange[] } {
  const lines = body.split(/\r?\n/);
  const changes: LineChange[] = [];
  const cleanedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = MARKER_REGEX.exec(line);

    if (match) {
      // Extract parts: prefix (whitespace + markdown syntax), optional bold, marker, optional bold, rest
      const [, prefix, , , , , rest] = match;
      
      // Reconstruct line without the marker (preserving prefix including markdown syntax)
      const cleanedLine = prefix + rest;
      
      cleanedLines.push(cleanedLine);
      changes.push({
        lineNumber: i + 1, // 1-indexed for human readability
        before: line,
        after: cleanedLine,
      });
    } else {
      cleanedLines.push(line);
    }
  }

  return {
    cleaned: cleanedLines.join('\n'),
    changes,
  };
}

/**
 * Process a single file
 */
async function processFile(
  filename: string,
  dryRun: boolean
): Promise<CleanupResult | null> {
  const filePath = path.join(GAMES_DIR, filename);
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Split into frontmatter and body
    const { frontmatter, body } = splitFrontmatterAndBody(content);
    
    // Clean the body
    const { cleaned, changes } = cleanLanguageMarkers(body);
    
    // If no changes, return null
    if (changes.length === 0) {
      return null;
    }

    // If not dry run, write the file back
    if (!dryRun) {
      const newContent = frontmatter + '\n' + cleaned;
      await fs.writeFile(filePath, newContent, 'utf-8');
    }

    return {
      filename,
      originalPath: filePath,
      linesChanged: changes.length,
      changes,
    };
  } catch (error) {
    console.error(`❌ Error processing ${filename}:`, error);
    return null;
  }
}

/**
 * Print summary of cleanup operation
 */
function printSummary(summary: CleanupSummary, options: CleanupOptions): void {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         I18n Language Marker Cleanup Summary              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No files were modified\n');
  }

  if (options.filter) {
    console.log(`Filter pattern: "${options.filter}"`);
  }

  console.log(`Total files scanned: ${summary.totalFiles}`);
  console.log(`Files with markers: ${summary.filesModified}`);
  console.log(`Total lines cleaned: ${summary.totalLinesChanged}\n`);
}

/**
 * Print detailed results
 */
function printResults(results: CleanupResult[], limit: number = 10): void {
  if (results.length === 0) {
    console.log('✅ No language markers found! All files are already clean.\n');
    return;
  }

  console.log('Files with changes:\n');
  
  const displayResults = results.slice(0, limit);
  
  for (const result of displayResults) {
    console.log(`📄 ${result.filename}`);
    console.log(`   Lines changed: ${result.linesChanged}`);
    
    // Show first few changes as examples
    const exampleChanges = result.changes.slice(0, 3);
    for (const change of exampleChanges) {
      console.log(`   Line ${change.lineNumber}:`);
      console.log(`     Before: ${change.before.substring(0, 80)}${change.before.length > 80 ? '...' : ''}`);
      console.log(`     After:  ${change.after.substring(0, 80)}${change.after.length > 80 ? '...' : ''}`);
    }
    
    if (result.changes.length > 3) {
      console.log(`     ... and ${result.changes.length - 3} more changes`);
    }
    console.log('');
  }

  if (results.length > limit) {
    console.log(`... and ${results.length - limit} more files\n`);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const options = parseArgs();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║       I18n Language Marker Cleanup for FiddleBops         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Step 1: Find files to process
    console.log('📖 Finding game files...');
    const files = await findGameFiles(options.filter);
    console.log(`   Found ${files.length} files to scan\n`);

    if (files.length === 0) {
      console.log('⚠️  No files found matching criteria.\n');
      process.exit(0);
    }

    // Step 2: Process files
    console.log('🔍 Scanning for language markers...\n');
    
    const results: CleanupResult[] = [];
    let processedCount = 0;

    for (const file of files) {
      const result = await processFile(file, options.dryRun);
      
      if (result) {
        results.push(result);
      }

      processedCount++;
      if (processedCount % 50 === 0) {
        process.stdout.write(`   Processed ${processedCount}/${files.length} files...\r`);
      }
    }

    if (processedCount >= 50) {
      console.log(''); // New line after progress indicator
    }

    // Step 3: Calculate summary
    const summary: CleanupSummary = {
      totalFiles: files.length,
      filesModified: results.length,
      totalLinesChanged: results.reduce((sum, r) => sum + r.linesChanged, 0),
      results,
    };

    // Step 4: Print results
    printSummary(summary, options);
    printResults(results, options.dryRun ? 20 : 10);

    // Step 5: Final message
    if (options.dryRun && results.length > 0) {
      console.log('✅ Dry run complete. Remove --dry-run flag to apply changes.\n');
    } else if (results.length > 0) {
      console.log('✅ Cleanup complete! Files have been modified.\n');
      console.log('⚠️  Remember to run validation:');
      console.log('   npm run validate:i18n');
      console.log('   npm test\n');
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Cleanup Complete                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
