#!/usr/bin/env tsx

/**
 * Validates structural alignment of long-form pages (privacy, terms) across all languages
 * Ensures heading hierarchy and section order match the English reference
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPPORTED_LOCALES = ['en', 'zh', 'ja', 'es', 'fr', 'de', 'ko'];
const PAGES_TO_VALIDATE = ['privacy', 'terms-of-service'];
const PAGES_DIR = path.join(__dirname, '..', 'src', 'pages');

interface PageStructure {
  headings: Array<{
    level: number;
    text: string;
  }>;
  paragraphCount: number;
  listCount: number;
}

interface ValidationResult {
  page: string;
  locale: string;
  issues: string[];
  structure: PageStructure;
}

/**
 * Extract structure from an Astro page file
 */
function extractPageStructure(filePath: string): PageStructure | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract the HTML content between the layout tags
    // Look for content after the closing --- of frontmatter
    const htmlMatch = content.match(/---[\s\S]*?---[\s\S]*?<BaseLayout[\s\S]*?>([\s\S]*)<\/BaseLayout>/);
    
    if (!htmlMatch) {
      console.warn(`⚠️  Could not extract HTML content from ${filePath}`);
      return null;
    }
    
    const htmlContent = htmlMatch[1];
    const $ = cheerio.load(htmlContent);
    
    // Extract headings
    const headings: Array<{ level: number; text: string }> = [];
    $('h1, h2, h3, h4, h5, h6').each((_, elem) => {
      const $elem = $(elem);
      const level = parseInt($elem.prop('tagName').substring(1));
      const text = $elem.text().trim();
      headings.push({ level, text });
    });
    
    // Count paragraphs and lists
    const paragraphCount = $('p').length;
    const listCount = $('ul, ol').length;
    
    return {
      headings,
      paragraphCount,
      listCount
    };
  } catch (error) {
    console.error(`❌ Error parsing ${filePath}:`, error);
    return null;
  }
}

/**
 * Get file path for a page in a given locale
 */
function getPagePath(page: string, locale: string): string {
  if (locale === 'en') {
    return path.join(PAGES_DIR, `${page}.astro`);
  } else {
    return path.join(PAGES_DIR, locale, `${page}.astro`);
  }
}

/**
 * Compare two page structures
 */
function compareStructures(
  referencePage: string,
  referenceStructure: PageStructure,
  targetLocale: string,
  targetStructure: PageStructure
): string[] {
  const issues: string[] = [];
  
  // Compare heading count
  if (referenceStructure.headings.length !== targetStructure.headings.length) {
    issues.push(
      `Heading count mismatch: English has ${referenceStructure.headings.length} headings, ` +
      `${targetLocale} has ${targetStructure.headings.length} headings`
    );
  }
  
  // Compare heading levels (hierarchy)
  const refLevels = referenceStructure.headings.map(h => h.level);
  const targetLevels = targetStructure.headings.map(h => h.level);
  
  const minLength = Math.min(refLevels.length, targetLevels.length);
  for (let i = 0; i < minLength; i++) {
    if (refLevels[i] !== targetLevels[i]) {
      issues.push(
        `Heading level mismatch at position ${i + 1}: ` +
        `English has h${refLevels[i]} ("${referenceStructure.headings[i].text}"), ` +
        `${targetLocale} has h${targetLevels[i]} ("${targetStructure.headings[i].text}")`
      );
    }
  }
  
  // Compare paragraph count (with tolerance)
  const paragraphDiff = Math.abs(referenceStructure.paragraphCount - targetStructure.paragraphCount);
  const paragraphTolerance = Math.ceil(referenceStructure.paragraphCount * 0.1); // 10% tolerance
  
  if (paragraphDiff > paragraphTolerance) {
    issues.push(
      `Paragraph count significantly different: English has ${referenceStructure.paragraphCount} paragraphs, ` +
      `${targetLocale} has ${targetStructure.paragraphCount} paragraphs (diff: ${paragraphDiff})`
    );
  }
  
  // Compare list count
  if (referenceStructure.listCount !== targetStructure.listCount) {
    issues.push(
      `List count mismatch: English has ${referenceStructure.listCount} lists, ` +
      `${targetLocale} has ${targetStructure.listCount} lists`
    );
  }
  
  return issues;
}

/**
 * Validate all pages across all locales
 */
function validatePageStructures(): ValidationResult[] {
  console.log('🔍 Validating page structure alignment...\n');
  
  const results: ValidationResult[] = [];
  let hasErrors = false;
  
  for (const page of PAGES_TO_VALIDATE) {
    console.log(`📄 Validating ${page}...`);
    
    // Load English reference
    const enPath = getPagePath(page, 'en');
    const enStructure = extractPageStructure(enPath);
    
    if (!enStructure) {
      console.error(`❌ Cannot load English reference for ${page}`);
      hasErrors = true;
      continue;
    }
    
    console.log(`   English reference: ${enStructure.headings.length} headings, ` +
                `${enStructure.paragraphCount} paragraphs, ${enStructure.listCount} lists`);
    
    // Validate each locale
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === 'en') continue;
      
      const localePath = getPagePath(page, locale);
      const localeStructure = extractPageStructure(localePath);
      
      if (!localeStructure) {
        const issue = `File not found or could not be parsed`;
        results.push({
          page,
          locale,
          issues: [issue],
          structure: { headings: [], paragraphCount: 0, listCount: 0 }
        });
        hasErrors = true;
        console.log(`   ❌ ${locale.toUpperCase()}: ${issue}`);
        continue;
      }
      
      // Compare structures
      const issues = compareStructures(page, enStructure, locale, localeStructure);
      
      results.push({
        page,
        locale,
        issues,
        structure: localeStructure
      });
      
      if (issues.length === 0) {
        console.log(`   ✅ ${locale.toUpperCase()}: Structure matches`);
      } else {
        hasErrors = true;
        console.log(`   ❌ ${locale.toUpperCase()}: ${issues.length} issue(s) found`);
        issues.forEach(issue => console.log(`      - ${issue}`));
      }
    }
    
    console.log('');
  }
  
  // Summary
  console.log('═'.repeat(60));
  if (hasErrors) {
    console.log('❌ Validation FAILED: Some pages have structural misalignments');
    console.log('   Please review and fix the issues above');
  } else {
    console.log('✅ Validation PASSED: All pages have matching structure');
  }
  console.log('═'.repeat(60));
  
  return results;
}

/**
 * Generate a report file with validation results
 */
function generateReport(results: ValidationResult[]): void {
  const reportPath = path.join(__dirname, '..', 'page-structure-validation-report.json');
  
  const report = {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      totalPages: PAGES_TO_VALIDATE.length,
      totalValidations: results.length,
      validationsWithIssues: results.filter(r => r.issues.length > 0).length,
      validationsComplete: results.filter(r => r.issues.length === 0).length
    }
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);
}

// Main execution
const results = validatePageStructures();
generateReport(results);

// Exit with error code if validation failed
const hasErrors = results.some(r => r.issues.length > 0);
process.exit(hasErrors ? 1 : 0);
