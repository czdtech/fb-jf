#!/usr/bin/env node
/**
 * Static Game Page Parser
 * 
 * Extracts game data from static .astro files for migration to Content Collection.
 * 
 * Usage:
 *   node scripts/parse-static-page.mjs <path-to-astro-file>
 *   
 * Or import as module:
 *   import { extractGameData } from './parse-static-page.mjs';
 * 
 * Requirements: 1.1, 1.3
 */

import { readFile } from 'fs/promises';
import { basename } from 'path';

/**
 * @typedef {Object} GamePageData
 * @property {string} slug - URL slug derived from filename
 * @property {string} title - Game title from <title> tag
 * @property {string} description - Meta description
 * @property {string} iframeSrc - Game iframe URL
 * @property {string} thumbnail - Thumbnail image path
 * @property {string} urlstr - URL string (same as slug)
 * @property {string[]} tags - Game tags extracted from keywords
 * @property {string} [score] - Game score if available
 * @property {string} content - Markdown content from about section
 */

/**
 * Extract title from HTML content
 * @param {string} content - HTML content
 * @returns {string|null}
 */
export function extractTitle(content) {
  const match = content.match(/<title>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract meta description from HTML content
 * @param {string} content - HTML content
 * @returns {string|null}
 */
export function extractDescription(content) {
  const match = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
                content.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract iframe src from the loadIframe function or script
 * @param {string} content - HTML content
 * @returns {string|null}
 */
export function extractIframeSrc(content) {
  // Look for iframe.src = "..." pattern in the script
  const match = content.match(/iframe\.src\s*=\s*["']([^"']+)["']/i);
  if (!match) return null;
  
  let src = match[1].trim();
  
  // Convert relative paths to full URLs
  if (src.startsWith('/')) {
    src = `https://www.playfiddlebops.com${src}`;
  }
  
  return src;
}

/**
 * Extract thumbnail from og:image meta tag
 * @param {string} content - HTML content
 * @returns {string|null}
 */
export function extractThumbnail(content) {
  // Try og:image first
  let match = content.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
              content.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  
  if (match) {
    // Extract just the path from the full URL
    const url = match[1];
    try {
      const urlObj = new URL(url);
      // Return the pathname (e.g., /sprunki-retake.png)
      return urlObj.pathname;
    } catch {
      // If not a valid URL, return as-is
      return url;
    }
  }
  
  // Try background-image in style as fallback
  match = content.match(/--bg-image:\s*url\(([^)]+)\)/i);
  if (match) {
    return match[1].replace(/['"]/g, '').trim();
  }
  
  return null;
}

/**
 * Extract keywords/tags from meta keywords
 * @param {string} content - HTML content
 * @returns {string[]}
 */
export function extractTags(content) {
  const match = content.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/i) ||
                content.match(/<meta\s+content=["']([^"']+)["']\s+name=["']keywords["']/i);
  
  if (match) {
    return match[1].split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean);
  }
  return [];
}

/**
 * Extract score from the stars section
 * @param {string} content - HTML content
 * @returns {string|null}
 */
export function extractScore(content) {
  // Look for score pattern like "4.3/5  (524 votes)"
  const match = content.match(/(\d+\.?\d*\/5\s*\(\d+\s*votes?\))/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract the about section content and convert to Markdown
 * @param {string} content - HTML content
 * @returns {string}
 */
export function extractContent(content) {
  // Find the about section
  const aboutMatch = content.match(/<section\s+class=["']about["'][^>]*>([\s\S]*?)<\/section>/i);
  if (!aboutMatch) {
    return '';
  }
  
  const aboutSection = aboutMatch[1];
  
  // Find the about-content div
  const contentMatch = aboutSection.match(/<div\s+class=["']about-content["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
  if (!contentMatch) {
    return '';
  }
  
  let htmlContent = contentMatch[1];
  
  // Remove breadcrumb and stars sections
  htmlContent = htmlContent.replace(/<p><a[^>]*>home<\/a>[^<]*<\/p>/gi, '');
  htmlContent = htmlContent.replace(/<div\s+class=["']stars["'][^>]*>[\s\S]*?<\/div>/gi, '');
  
  // Convert HTML to Markdown
  return htmlToMarkdown(htmlContent);
}

/**
 * Convert HTML content to Markdown
 * @param {string} html - HTML content
 * @returns {string}
 */
export function htmlToMarkdown(html) {
  let md = html;
  
  // Remove extra whitespace
  md = md.replace(/\s+/g, ' ');
  
  // Convert headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n');
  
  // Convert paragraphs
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n');
  
  // Convert lists
  md = md.replace(/<ul[^>]*>/gi, '\n');
  md = md.replace(/<\/ul>/gi, '\n');
  md = md.replace(/<ol[^>]*>/gi, '\n');
  md = md.replace(/<\/ol>/gi, '\n');
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  
  // Convert bold and strong
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  
  // Convert italic and em
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  
  // Convert links
  md = md.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Remove hr tags
  md = md.replace(/<hr\s*\/?>/gi, '\n---\n');
  
  // Remove remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/&nbsp;/g, ' ');
  
  // Clean up multiple newlines
  md = md.replace(/\n{3,}/g, '\n\n');
  
  // Trim whitespace
  md = md.trim();
  
  return md;
}

/**
 * Extract all game data from an .astro file
 * @param {string} filePath - Path to the .astro file
 * @returns {Promise<GamePageData>}
 */
export async function extractGameData(filePath) {
  const content = await readFile(filePath, 'utf-8');
  return extractGameDataFromContent(content, filePath);
}

/**
 * Extract all game data from content string
 * @param {string} content - File content
 * @param {string} filePath - Path to the file (for slug extraction)
 * @returns {GamePageData}
 */
export function extractGameDataFromContent(content, filePath) {
  const filename = basename(filePath);
  const slug = filename.replace('.astro', '');
  
  const title = extractTitle(content);
  const description = extractDescription(content);
  const iframeSrc = extractIframeSrc(content);
  const thumbnail = extractThumbnail(content);
  const tags = extractTags(content);
  const score = extractScore(content);
  const markdownContent = extractContent(content);
  
  return {
    slug,
    title: title || slug,
    description: description || '',
    iframeSrc: iframeSrc || '',
    thumbnail: thumbnail || '',
    urlstr: slug,
    tags: tags.length > 0 ? tags : ['game'],
    score: score || undefined,
    content: markdownContent,
  };
}

// CLI support - only run if this is the main module
import { fileURLToPath } from 'url';

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  const args = process.argv.slice(2);
  if (args.length > 0 && args[0] !== '--help') {
    const filePath = args[0];
    extractGameData(filePath)
      .then(data => {
        console.log(JSON.stringify(data, null, 2));
      })
      .catch(err => {
        console.error(`Error parsing ${filePath}:`, err.message);
        process.exit(1);
      });
  } else if (args[0] === '--help' || args.length === 0) {
    console.log(`
Static Game Page Parser

Usage:
  node scripts/parse-static-page.mjs <path-to-astro-file>

Example:
  node scripts/parse-static-page.mjs src/pages/sprunki-retake.astro

Output:
  JSON object with extracted game data:
  - slug: URL slug
  - title: Game title
  - description: Meta description
  - iframeSrc: Game iframe URL
  - thumbnail: Thumbnail image path
  - urlstr: URL string
  - tags: Array of tags
  - score: Game score (optional)
  - content: Markdown content
`);
  }
}
