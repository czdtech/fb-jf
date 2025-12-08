#!/usr/bin/env node
/**
 * Markdown Game File Generator
 * 
 * Generates Content Collection markdown files from extracted game data.
 * 
 * Usage:
 *   node scripts/generate-game-md.mjs --input <json-file> --output <output-dir>
 *   
 * Or import as module:
 *   import { generateMarkdown, generateMarkdownFile } from './generate-game-md.mjs';
 * 
 * Requirements: 1.4
 */

import { writeFile, mkdir, stat } from 'fs/promises';
import { join, dirname } from 'path';

/**
 * @typedef {Object} GamePageData
 * @property {string} slug - URL slug
 * @property {string} title - Game title
 * @property {string} description - Meta description
 * @property {string} iframeSrc - Game iframe URL
 * @property {string} thumbnail - Thumbnail image path
 * @property {string} urlstr - URL string
 * @property {string[]} tags - Game tags
 * @property {string} [score] - Game score
 * @property {string} content - Markdown content
 */

/**
 * Escape special characters in YAML string values
 * @param {string} value - String value to escape
 * @returns {string}
 */
function escapeYamlString(value) {
  if (!value) return '""';
  
  // Check if the string needs quoting
  const needsQuotes = /[:#\[\]{}|>&*!?,\n"']/.test(value) || 
                      value.startsWith(' ') || 
                      value.endsWith(' ') ||
                      value.includes('\n');
  
  if (needsQuotes) {
    // Use double quotes and escape internal double quotes
    const escapedBackslashes = value.replace(/\\/g, '\\\\');
    const escaped = escapedBackslashes.replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
  
  return value;
}

/**
 * Generate frontmatter YAML from game data
 * @param {GamePageData} data - Game data
 * @returns {string}
 */
export function generateFrontmatter(data) {
  const lines = [
    '---',
    `title: ${escapeYamlString(data.title)}`,
    `description: ${escapeYamlString(data.description)}`,
    `iframeSrc: ${escapeYamlString(data.iframeSrc)}`,
    `thumbnail: ${escapeYamlString(data.thumbnail)}`,
    `urlstr: ${escapeYamlString(data.urlstr || data.slug)}`,
  ];
  
  // Add optional score
  if (data.score) {
    lines.push(`score: ${escapeYamlString(data.score)}`);
  }
  
  // Add tags array
  if (data.tags && data.tags.length > 0) {
    lines.push(`tags: [${data.tags.map(t => escapeYamlString(t)).join(', ')}]`);
  } else {
    lines.push('tags: ["game"]');
  }
  
  lines.push('---');
  
  return lines.join('\n');
}

/**
 * Generate complete markdown file content
 * @param {GamePageData} data - Game data
 * @returns {string}
 */
export function generateMarkdown(data) {
  const frontmatter = generateFrontmatter(data);
  const content = data.content || '';
  
  // Combine frontmatter and content with proper spacing
  return `${frontmatter}\n\n${content}\n`;
}

/**
 * Generate markdown file and write to disk
 * @param {GamePageData} data - Game data
 * @param {string} outputDir - Output directory path
 * @param {Object} options - Options
 * @param {boolean} options.dryRun - If true, don't write file
 * @param {boolean} options.overwrite - If true, overwrite existing files
 * @returns {Promise<{path: string, written: boolean, skipped: boolean, reason?: string}>}
 */
export async function generateMarkdownFile(data, outputDir, options = {}) {
  const { dryRun = false, overwrite = false } = options;
  const filename = `${data.slug}.md`;
  const outputPath = join(outputDir, filename);
  
  // Check if file exists
  let fileExists = false;
  try {
    await stat(outputPath);
    fileExists = true;
  } catch {
    fileExists = false;
  }
  
  // Skip if file exists and not overwriting
  if (fileExists && !overwrite) {
    return {
      path: outputPath,
      written: false,
      skipped: true,
      reason: 'File already exists (use --overwrite to replace)',
    };
  }
  
  const markdown = generateMarkdown(data);
  
  if (dryRun) {
    return {
      path: outputPath,
      written: false,
      skipped: false,
      reason: 'Dry run mode',
      content: markdown,
    };
  }
  
  // Ensure output directory exists
  await mkdir(dirname(outputPath), { recursive: true });
  
  // Write file
  await writeFile(outputPath, markdown, 'utf-8');
  
  return {
    path: outputPath,
    written: true,
    skipped: false,
  };
}

// CLI support - only run if this is the main module
import { fileURLToPath } from 'url';

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  (async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.length === 0) {
      console.log(`
Markdown Game File Generator

Usage:
  node scripts/generate-game-md.mjs --data '<json>' --output <output-dir> [options]

Options:
  --data <json>      JSON string with game data
  --output <dir>     Output directory (default: src/content/games)
  --dry-run          Don't write files, just show what would be done
  --overwrite        Overwrite existing files

Example:
  node scripts/generate-game-md.mjs --data '{"slug":"test","title":"Test Game","description":"A test","iframeSrc":"https://example.com","thumbnail":"/test.png","tags":["test"]}' --output src/content/games
`);
      return;
    }
    
    // Parse arguments
    let data = null;
    let outputDir = 'src/content/games';
    let dryRun = false;
    let overwrite = false;
    
    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--data':
          try {
            data = JSON.parse(args[++i]);
          } catch (e) {
            console.error('Error parsing JSON data:', e.message);
            process.exit(1);
          }
          break;
        case '--output':
          outputDir = args[++i];
          break;
        case '--dry-run':
          dryRun = true;
          break;
        case '--overwrite':
          overwrite = true;
          break;
      }
    }
    
    if (!data) {
      console.error('Error: --data is required');
      process.exit(1);
    }
    
    const result = await generateMarkdownFile(data, outputDir, { dryRun, overwrite });
    
    if (dryRun) {
      console.log('Dry run - would write to:', result.path);
      console.log('\nContent:');
      console.log(result.content);
    } else if (result.skipped) {
      console.log('Skipped:', result.path);
      console.log('Reason:', result.reason);
    } else {
      console.log('Written:', result.path);
    }
  })().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
