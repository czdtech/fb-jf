#!/usr/bin/env node
/**
 * Generate I18n Translation Stubs
 * 
 * This script generates stub files for missing localized game variants.
 * It preserves the structure of the canonical English game while marking
 * text that needs translation.
 * 
 * Usage:
 *   npm run generate-stubs -- --lang zh,ja --filter sprunki --dry-run
 * 
 * Options:
 *   --lang <locales>     Comma-separated list of target languages (default: all)
 *   --filter <pattern>   Only process games matching this pattern in urlstr
 *   --dry-run           Show what would be generated without writing files
 * 
 * Requirements: 3.1, 3.2, 7.1
 */

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

// Configuration
const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const SUPPORTED_LOCALES = ['en', 'zh', 'ja', 'es', 'fr', 'de', 'ko'] as const;
const TARGET_LOCALES = SUPPORTED_LOCALES.filter(l => l !== 'en');

type Locale = typeof SUPPORTED_LOCALES[number];

interface CanonicalGame {
  urlstr: string;
  filename: string;
  frontmatter: Record<string, any>;
  content: string;
}

interface StubGenerationTask {
  urlstr: string;
  locale: Locale;
  sourceFile: string;
  targetFile: string;
  canonicalGame: CanonicalGame;
}

interface GenerationOptions {
  languages: Locale[];
  filter?: string;
  dryRun: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): GenerationOptions {
  const args = process.argv.slice(2);
  const options: GenerationOptions = {
    languages: [...TARGET_LOCALES],
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--lang' && i + 1 < args.length) {
      const langStr = args[++i];
      const langs = langStr.split(',').map(l => l.trim());
      
      // Validate languages
      const invalid = langs.filter(l => !TARGET_LOCALES.includes(l as any));
      if (invalid.length > 0) {
        console.error(`❌ Invalid language(s): ${invalid.join(', ')}`);
        console.error(`   Supported: ${TARGET_LOCALES.join(', ')}`);
        process.exit(1);
      }
      
      options.languages = langs as Locale[];
    } else if (arg === '--filter' && i + 1 < args.length) {
      options.filter = args[++i];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
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
Generate I18n Translation Stubs

Usage:
  npm run generate-stubs -- [options]

Options:
  --lang <locales>     Comma-separated list of target languages
                       Available: ${TARGET_LOCALES.join(', ')}
                       Default: all target languages
  
  --filter <pattern>   Only process games where urlstr contains this pattern
                       Example: --filter sprunki
  
  --dry-run           Show what would be generated without writing files

Examples:
  # Generate stubs for Chinese and Japanese
  npm run generate-stubs -- --lang zh,ja

  # Generate stubs for all Sprunki games in all languages
  npm run generate-stubs -- --filter sprunki

  # Preview what would be generated for Spanish games
  npm run generate-stubs -- --lang es --dry-run
`);
}

/**
 * Read all canonical games from the games directory
 */
async function readCanonicalGames(filterPattern?: string): Promise<CanonicalGame[]> {
  const files = await fs.readdir(GAMES_DIR);
  
  // Canonical games are stored as `<urlstr>.en.md`.
  const canonicalFiles = files.filter((f) => f.endsWith('.en.md'));

  const canonicalGames: CanonicalGame[] = [];

  for (const filename of canonicalFiles) {
    const filePath = path.join(GAMES_DIR, filename);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(fileContent);

    // Verify it's a canonical game (locale should be 'en' or default)
    const locale = frontmatter.locale || 'en';
    if (locale !== 'en') {
      continue;
    }

    const urlstr =
      frontmatter.urlstr ||
      filename.replace(/\.en\.md$/, '').replace(/\.md$/, '');

    // Apply filter if provided
    if (filterPattern && !urlstr.includes(filterPattern)) {
      continue;
    }

    canonicalGames.push({
      urlstr,
      filename,
      frontmatter,
      content,
    });
  }

  return canonicalGames;
}

/**
 * Check which localized variants already exist
 */
async function findExistingVariants(
  canonicalGames: CanonicalGame[],
  targetLocales: Locale[]
): Promise<Set<string>> {
  const existing = new Set<string>();

  for (const game of canonicalGames) {
    for (const locale of targetLocales) {
      const variantFile = `${game.urlstr}.${locale}.md`;
      const variantPath = path.join(GAMES_DIR, variantFile);

      try {
        await fs.access(variantPath);
        existing.add(`${game.urlstr}:${locale}`);
      } catch {
        // File doesn't exist, which is fine
      }
    }
  }

  return existing;
}

/**
 * Generate list of stub generation tasks
 */
function generateTasks(
  canonicalGames: CanonicalGame[],
  targetLocales: Locale[],
  existingVariants: Set<string>
): StubGenerationTask[] {
  const tasks: StubGenerationTask[] = [];

  for (const game of canonicalGames) {
    for (const locale of targetLocales) {
      const key = `${game.urlstr}:${locale}`;
      
      if (!existingVariants.has(key)) {
        const targetFile = `${game.urlstr}.${locale}.md`;
        
        tasks.push({
          urlstr: game.urlstr,
          locale,
          sourceFile: game.filename,
          targetFile,
          canonicalGame: game,
        });
      }
    }
  }

  return tasks;
}

/**
 * Generate stub content for a localized variant
 */
function generateStubContent(task: StubGenerationTask): string {
  const { canonicalGame, locale } = task;
  const { frontmatter, content } = canonicalGame;

  // Create localized frontmatter
  const localizedFrontmatter: Record<string, any> = {
    locale,
    urlstr: frontmatter.urlstr || canonicalGame.urlstr,
    title: `[${locale.toUpperCase()}] ${frontmatter.title}`,
    description: `[${locale.toUpperCase()}] ${frontmatter.description}`,
    iframeSrc: frontmatter.iframeSrc,
    thumbnail: frontmatter.thumbnail,
    tags: frontmatter.tags || [],
  };

  // Include optional fields if present
  if (frontmatter.score) {
    localizedFrontmatter.score = frontmatter.score;
  }
  if (frontmatter.developer) {
    localizedFrontmatter.developer = frontmatter.developer;
  }
  if (frontmatter.releaseDate) {
    localizedFrontmatter.releaseDate = frontmatter.releaseDate;
  }

  // Generate stub body with structure preserved
  const stubBody = generateStubBody(content, locale);

  // Combine frontmatter and body
  const frontmatterYaml = matter.stringify('', localizedFrontmatter);
  return frontmatterYaml + '\n' + stubBody;
}

/**
 * Generate stub body preserving markdown structure
 */
function generateStubBody(content: string, locale: string): string {
  if (!content || content.trim() === '') {
    return `<!-- [${locale.toUpperCase()}] Translation needed -->\n\n`;
  }

  const lines = content.split('\n');
  const stubLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Preserve empty lines
    if (trimmed === '') {
      stubLines.push('');
      continue;
    }

    // Preserve headings with translation marker
    if (trimmed.startsWith('#')) {
      const level = trimmed.match(/^#+/)?.[0] || '#';
      const headingText = trimmed.substring(level.length).trim();
      stubLines.push(`${level} **[${locale.toUpperCase()}]** ${headingText}`);
      continue;
    }

    // Preserve list items with translation marker
    if (trimmed.match(/^[\*\-\+]\s+/) || trimmed.match(/^\d+\.\s+/)) {
      const marker = trimmed.match(/^([\*\-\+]|\d+\.)\s+/)?.[0] || '* ';
      const itemText = trimmed.substring(marker.length);
      stubLines.push(`${marker}**[${locale.toUpperCase()}]** ${itemText}`);
      continue;
    }

    // Regular paragraphs - add translation marker
    stubLines.push(`**[${locale.toUpperCase()}]** ${line}`);
  }

  return stubLines.join('\n');
}

/**
 * Write stub file to disk
 */
async function writeStubFile(task: StubGenerationTask, content: string): Promise<void> {
  const targetPath = path.join(GAMES_DIR, task.targetFile);
  await fs.writeFile(targetPath, content, 'utf-8');
}

/**
 * Print summary of generation tasks
 */
function printSummary(
  tasks: StubGenerationTask[],
  options: GenerationOptions
): void {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         I18n Translation Stub Generation Summary           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be written\n');
  }

  console.log(`Target languages: ${options.languages.join(', ')}`);
  if (options.filter) {
    console.log(`Filter pattern: "${options.filter}"`);
  }
  console.log(`\nTotal stubs to generate: ${tasks.length}\n`);

  // Group by language
  const byLanguage = new Map<Locale, StubGenerationTask[]>();
  for (const task of tasks) {
    if (!byLanguage.has(task.locale)) {
      byLanguage.set(task.locale, []);
    }
    byLanguage.get(task.locale)!.push(task);
  }

  console.log('Breakdown by language:');
  for (const [locale, localeTasks] of byLanguage.entries()) {
    console.log(`  ${locale.toUpperCase()}: ${localeTasks.length} stubs`);
  }

  console.log('\n');
}

/**
 * Print detailed task list
 */
function printTaskList(tasks: StubGenerationTask[], limit: number = 20): void {
  if (tasks.length === 0) {
    console.log('✅ No missing translations found! All games are fully localized.\n');
    return;
  }

  console.log('Files to be generated:');
  const displayTasks = tasks.slice(0, limit);
  
  for (const task of displayTasks) {
    console.log(`  📄 ${task.targetFile}`);
    console.log(`     Source: ${task.sourceFile}`);
    console.log(`     Game: ${task.urlstr} (${task.locale})\n`);
  }

  if (tasks.length > limit) {
    console.log(`  ... and ${tasks.length - limit} more\n`);
  }
}

/**
 * Execute stub generation
 */
async function executeGeneration(
  tasks: StubGenerationTask[],
  dryRun: boolean
): Promise<void> {
  if (tasks.length === 0) {
    return;
  }

  if (dryRun) {
    console.log('✅ Dry run complete. Use without --dry-run to generate files.\n');
    return;
  }

  console.log('Generating stub files...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const task of tasks) {
    try {
      const stubContent = generateStubContent(task);
      await writeStubFile(task, stubContent);
      successCount++;
      
      if (successCount % 10 === 0) {
        process.stdout.write(`  Generated ${successCount}/${tasks.length} files...\r`);
      }
    } catch (error) {
      errorCount++;
      console.error(`\n❌ Error generating ${task.targetFile}:`, error);
    }
  }

  console.log(`\n✅ Successfully generated ${successCount} stub files`);
  
  if (errorCount > 0) {
    console.log(`❌ Failed to generate ${errorCount} files\n`);
    process.exit(1);
  } else {
    console.log('');
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const options = parseArgs();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║       I18n Translation Stub Generator for FiddleBops      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Step 1: Read canonical games
    console.log('📖 Reading canonical games...');
    const canonicalGames = await readCanonicalGames(options.filter);
    console.log(`   Found ${canonicalGames.length} canonical games\n`);

    if (canonicalGames.length === 0) {
      console.log('⚠️  No canonical games found matching criteria.\n');
      process.exit(0);
    }

    // Step 2: Find existing variants
    console.log('🔍 Checking for existing localized variants...');
    const existingVariants = await findExistingVariants(
      canonicalGames,
      options.languages
    );
    console.log(`   Found ${existingVariants.size} existing variants\n`);

    // Step 3: Generate task list
    const tasks = generateTasks(
      canonicalGames,
      options.languages,
      existingVariants
    );

    // Step 4: Print summary
    printSummary(tasks, options);
    printTaskList(tasks, options.dryRun ? 50 : 20);

    // Step 5: Execute generation
    await executeGeneration(tasks, options.dryRun);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Generation Complete                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
