#!/usr/bin/env tsx

/**
 * Validates i18n JSON key completeness across all supported languages
 * Ensures all languages have the same keys as the English reference
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPPORTED_LOCALES = ['en', 'zh', 'ja', 'es', 'fr', 'de', 'ko'];
const I18N_DIR = path.join(__dirname, '..', 'src', 'i18n');

interface I18nData {
  [key: string]: any;
}

interface ValidationResult {
  locale: string;
  missingKeys: string[];
  extraKeys: string[];
}

/**
 * Recursively get all keys from a nested object
 */
function getAllKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * Load JSON file for a given locale
 */
function loadLocaleData(locale: string): I18nData | null {
  const filePath = path.join(I18N_DIR, `${locale}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return null;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error parsing ${locale}.json:`, error);
    return null;
  }
}

/**
 * Validate all locales against the English reference
 */
function validateI18nKeys(): ValidationResult[] {
  console.log('🔍 Validating i18n JSON key completeness...\n');
  
  // Load English as reference
  const enData = loadLocaleData('en');
  if (!enData) {
    console.error('❌ Cannot load English reference file. Aborting.');
    process.exit(1);
  }
  
  const enKeys = getAllKeys(enData).sort();
  console.log(`📋 English reference has ${enKeys.length} keys\n`);
  
  const results: ValidationResult[] = [];
  let hasErrors = false;
  
  // Validate each locale
  for (const locale of SUPPORTED_LOCALES) {
    if (locale === 'en') continue; // Skip English itself
    
    const localeData = loadLocaleData(locale);
    if (!localeData) {
      hasErrors = true;
      continue;
    }
    
    const localeKeys = getAllKeys(localeData).sort();
    
    // Find missing keys (in English but not in locale)
    const missingKeys = enKeys.filter(key => !localeKeys.includes(key));
    
    // Find extra keys (in locale but not in English)
    const extraKeys = localeKeys.filter(key => !enKeys.includes(key));
    
    results.push({
      locale,
      missingKeys,
      extraKeys
    });
    
    // Report results for this locale
    if (missingKeys.length === 0 && extraKeys.length === 0) {
      console.log(`✅ ${locale.toUpperCase()}: All keys match (${localeKeys.length} keys)`);
    } else {
      hasErrors = true;
      console.log(`❌ ${locale.toUpperCase()}: Issues found`);
      
      if (missingKeys.length > 0) {
        console.log(`   Missing ${missingKeys.length} key(s):`);
        missingKeys.forEach(key => console.log(`     - ${key}`));
      }
      
      if (extraKeys.length > 0) {
        console.log(`   Extra ${extraKeys.length} key(s):`);
        extraKeys.forEach(key => console.log(`     - ${key}`));
      }
    }
    console.log('');
  }
  
  // Summary
  console.log('═'.repeat(60));
  if (hasErrors) {
    console.log('❌ Validation FAILED: Some locales have missing or extra keys');
    console.log('   Please update the JSON files to match the English reference');
  } else {
    console.log('✅ Validation PASSED: All locales have matching keys');
  }
  console.log('═'.repeat(60));
  
  return results;
}

/**
 * Generate a report file with validation results
 */
function generateReport(results: ValidationResult[]): void {
  const reportPath = path.join(__dirname, '..', 'i18n-json-validation-report.json');
  
  const report = {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      totalLocales: results.length,
      localesWithIssues: results.filter(r => r.missingKeys.length > 0 || r.extraKeys.length > 0).length,
      localesComplete: results.filter(r => r.missingKeys.length === 0 && r.extraKeys.length === 0).length
    }
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);
}

// Main execution
const results = validateI18nKeys();
generateReport(results);

// Exit with error code if validation failed
const hasErrors = results.some(r => r.missingKeys.length > 0 || r.extraKeys.length > 0);
process.exit(hasErrors ? 1 : 0);
