#!/usr/bin/env node

/**
 * Translation File Validation Utility
 * 
 * This script validates that all translation files have consistent key structures
 * and helps identify missing translations before deployment.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TRANSLATION_DIR = path.join(process.cwd(), 'src/content/i18nUI');
const SUPPORTED_LOCALES = ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko'];
const REFERENCE_LOCALE = 'en'; // Use English as the reference for key structure

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function colorLog(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Recursively extract all keys from a nested object
 */
function extractKeys(obj, prefix = '') {
    const keys = new Set();
    
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        keys.add(fullKey);
        
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            const nestedKeys = extractKeys(value, fullKey);
            nestedKeys.forEach(k => keys.add(k));
        }
    }
    
    return keys;
}

/**
 * Load and parse a translation file
 */
function loadTranslationFile(locale) {
    const filePath = path.join(TRANSLATION_DIR, `${locale}.json`);
    
    try {
        if (!fs.existsSync(filePath)) {
            return { error: `File not found: ${filePath}` };
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        return { data, keys: extractKeys(data) };
    } catch (error) {
        return { error: `Error loading ${filePath}: ${error.message}` };
    }
}

/**
 * Validate translation completeness
 */
function validateTranslations() {
    colorLog('cyan', '🔍 Translation File Validation');
    colorLog('cyan', '================================');
    
    const results = {};
    const allErrors = [];
    
    // Load reference locale (English)
    colorLog('blue', `📖 Loading reference locale: ${REFERENCE_LOCALE}`);
    const reference = loadTranslationFile(REFERENCE_LOCALE);
    
    if (reference.error) {
        colorLog('red', `❌ Failed to load reference locale: ${reference.error}`);
        return false;
    }
    
    const referenceKeys = reference.keys;
    colorLog('green', `✅ Reference locale loaded with ${referenceKeys.size} keys`);
    
    // Validate each locale
    for (const locale of SUPPORTED_LOCALES) {
        colorLog('blue', `\n🌐 Validating locale: ${locale}`);
        
        const translation = loadTranslationFile(locale);
        
        if (translation.error) {
            colorLog('red', `❌ ${translation.error}`);
            allErrors.push(`${locale}: ${translation.error}`);
            results[locale] = { status: 'error', error: translation.error };
            continue;
        }
        
        const localeKeys = translation.keys;
        
        // Find missing keys
        const missingKeys = [...referenceKeys].filter(key => !localeKeys.has(key));
        
        // Find extra keys (not in reference)
        const extraKeys = [...localeKeys].filter(key => !referenceKeys.has(key));
        
        if (missingKeys.length === 0 && extraKeys.length === 0) {
            colorLog('green', `✅ Complete (${localeKeys.size} keys)`);
            results[locale] = { status: 'complete', keyCount: localeKeys.size };
        } else {
            colorLog('yellow', `⚠️  Issues found:`);
            
            if (missingKeys.length > 0) {
                colorLog('red', `   Missing ${missingKeys.length} keys:`);
                missingKeys.forEach(key => {
                    colorLog('red', `     - ${key}`);
                    allErrors.push(`${locale}: Missing key "${key}"`);
                });
            }
            
            if (extraKeys.length > 0) {
                colorLog('yellow', `   Extra ${extraKeys.length} keys:`);
                extraKeys.forEach(key => {
                    colorLog('yellow', `     + ${key}`);
                });
            }
            
            results[locale] = {
                status: 'incomplete',
                keyCount: localeKeys.size,
                missingKeys: missingKeys.length,
                extraKeys: extraKeys.length
            };
        }
    }
    
    // Summary
    colorLog('cyan', '\n📊 VALIDATION SUMMARY');
    colorLog('cyan', '===================');
    
    let completeCount = 0;
    let incompleteCount = 0;
    let errorCount = 0;
    
    for (const [locale, result] of Object.entries(results)) {
        switch (result.status) {
            case 'complete':
                completeCount++;
                colorLog('green', `✅ ${locale}: Complete (${result.keyCount} keys)`);
                break;
            case 'incomplete':
                incompleteCount++;
                colorLog('yellow', `⚠️  ${locale}: Missing ${result.missingKeys} keys, ${result.extraKeys} extra keys`);
                break;
            case 'error':
                errorCount++;
                colorLog('red', `❌ ${locale}: ${result.error}`);
                break;
        }
    }
    
    colorLog('blue', `\n📈 Statistics:`);
    colorLog('green', `   Complete: ${completeCount}/${SUPPORTED_LOCALES.length}`);
    colorLog('yellow', `   Incomplete: ${incompleteCount}/${SUPPORTED_LOCALES.length}`);
    colorLog('red', `   Errors: ${errorCount}/${SUPPORTED_LOCALES.length}`);
    
    const isValid = incompleteCount === 0 && errorCount === 0;
    
    if (isValid) {
        colorLog('green', '\n🎉 All translation files are complete and valid!');
    } else {
        colorLog('red', '\n🚨 Translation files have issues that need to be resolved.');
        
        if (allErrors.length > 0) {
            colorLog('red', '\nDetailed Error List:');
            allErrors.forEach(error => colorLog('red', `  • ${error}`));
        }
        
        colorLog('yellow', '\nTo fix these issues:');
        colorLog('yellow', '1. Add missing keys to the respective translation files');
        colorLog('yellow', '2. Use the English translation as a reference');
        colorLog('yellow', '3. Ensure all translation files have the same key structure');
        colorLog('yellow', `4. Run this script again to verify fixes`);
    }
    
    return isValid;
}

/**
 * Generate a template translation file based on the reference locale
 */
function generateTemplate(targetLocale) {
    colorLog('cyan', `🏗️  Generating template for locale: ${targetLocale}`);
    
    const reference = loadTranslationFile(REFERENCE_LOCALE);
    
    if (reference.error) {
        colorLog('red', `❌ Cannot generate template: ${reference.error}`);
        return false;
    }
    
    // Create a template with placeholder values
    function createTemplate(obj, depth = 0) {
        const template = {};
        
        for (const [key, value] of Object.entries(obj)) {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                template[key] = createTemplate(value, depth + 1);
            } else {
                template[key] = `[TRANSLATE] ${value}`;
            }
        }
        
        return template;
    }
    
    const template = createTemplate(reference.data);
    const templatePath = path.join(TRANSLATION_DIR, `${targetLocale}.template.json`);
    
    try {
        fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
        colorLog('green', `✅ Template created: ${templatePath}`);
        colorLog('yellow', '📝 Replace "[TRANSLATE]" prefixes with actual translations');
        return true;
    } catch (error) {
        colorLog('red', `❌ Failed to create template: ${error.message}`);
        return false;
    }
}

/**
 * List all translation keys with their values
 */
function listKeys(locale = REFERENCE_LOCALE) {
    colorLog('cyan', `📋 Listing all keys for locale: ${locale}`);
    colorLog('cyan', '=====================================');
    
    const translation = loadTranslationFile(locale);
    
    if (translation.error) {
        colorLog('red', `❌ ${translation.error}`);
        return false;
    }
    
    function printKeys(obj, prefix = '', depth = 0) {
        const indent = '  '.repeat(depth);
        
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                colorLog('blue', `${indent}📁 ${key}/`);
                printKeys(value, fullKey, depth + 1);
            } else {
                colorLog('green', `${indent}🔑 ${key}: "${value}"`);
            }
        }
    }
    
    printKeys(translation.data);
    colorLog('blue', `\nTotal keys: ${translation.keys.size}`);
    return true;
}

// Command line interface
function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
        case 'validate':
        case 'check':
        case undefined:
            const isValid = validateTranslations();
            process.exit(isValid ? 0 : 1);
            break;
            
        case 'template':
            const locale = args[1];
            if (!locale) {
                colorLog('red', '❌ Please specify a locale for template generation');
                colorLog('yellow', 'Usage: node validate-translations.js template <locale>');
                process.exit(1);
            }
            generateTemplate(locale);
            break;
            
        case 'list':
        case 'keys':
            const listLocale = args[1] || REFERENCE_LOCALE;
            listKeys(listLocale);
            break;
            
        case 'help':
        case '--help':
        case '-h':
            colorLog('cyan', 'Translation Validation Utility');
            colorLog('cyan', '=============================');
            colorLog('yellow', '\nUsage:');
            colorLog('green', '  node validate-translations.js [command] [options]');
            colorLog('yellow', '\nCommands:');
            colorLog('green', '  validate, check    Validate all translation files (default)');
            colorLog('green', '  template <locale>  Generate translation template');
            colorLog('green', '  list [locale]      List all keys for a locale');
            colorLog('green', '  help               Show this help message');
            colorLog('yellow', '\nExamples:');
            colorLog('green', '  node validate-translations.js');
            colorLog('green', '  node validate-translations.js template zh');
            colorLog('green', '  node validate-translations.js list en');
            break;
            
        default:
            colorLog('red', `❌ Unknown command: ${command}`);
            colorLog('yellow', 'Run "node validate-translations.js help" for usage information');
            process.exit(1);
    }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export {
    validateTranslations,
    generateTemplate,
    listKeys,
    extractKeys,
    loadTranslationFile
};