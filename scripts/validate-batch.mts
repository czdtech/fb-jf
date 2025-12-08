#!/usr/bin/env node
/**
 * Batch Translation Validation Script
 * 
 * This script validates a batch of translations after completion.
 * It runs both metadata and structure validation and provides clear feedback.
 * 
 * Usage:
 *   npm run validate-batch -- --lang es --batch 1
 *   npm run validate-batch -- --lang fr
 *   npm run validate-batch
 * 
 * Requirements: 2.2, 6.2, 7.3
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ValidationResult {
  script: string;
  passed: boolean;
  output: string;
  error?: string;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options: { lang?: string; batch?: number } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lang' && i + 1 < args.length) {
      options.lang = args[i + 1];
      i++;
    } else if (args[i] === '--batch' && i + 1 < args.length) {
      options.batch = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return options;
}

/**
 * Run a validation script
 */
async function runValidationScript(scriptPath: string, scriptName: string): Promise<ValidationResult> {
  return new Promise((resolve) => {
    let output = '';
    let error = '';

    const child = spawn('node', ['--experimental-strip-types', scriptPath], {
      cwd: path.join(__dirname, '..'),
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      error += text;
      process.stderr.write(text);
    });

    child.on('close', (code) => {
      resolve({
        script: scriptName,
        passed: code === 0,
        output,
        error: error || undefined,
      });
    });
  });
}

/**
 * Main validation function
 */
async function validateBatch() {
  const options = parseArgs();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           Batch Translation Validation                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (options.lang) {
    console.log(`Target Language: ${options.lang.toUpperCase()}`);
  } else {
    console.log('Target Language: ALL');
  }

  if (options.batch) {
    console.log(`Batch Number: ${options.batch}`);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  const results: ValidationResult[] = [];

  // Run metadata validation
  console.log('Running metadata validation...\n');
  const metadataResult = await runValidationScript(
    path.join(__dirname, 'validate-i18n-metadata.mts'),
    'Metadata Validation'
  );
  results.push(metadataResult);

  console.log('\n' + '='.repeat(60) + '\n');

  // Run structure validation
  console.log('Running structure validation...\n');
  const structureResult = await runValidationScript(
    path.join(__dirname, 'validate-i18n-structure.mts'),
    'Structure Validation'
  );
  results.push(structureResult);

  console.log('\n' + '='.repeat(60) + '\n');

  // Summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                  Validation Summary                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const allPassed = results.every(r => r.passed);

  results.forEach(result => {
    const status = result.passed ? '✓ PASSED' : '✗ FAILED';
    const icon = result.passed ? '✓' : '✗';
    console.log(`${icon} ${result.script}: ${status}`);
  });

  console.log('\n' + '='.repeat(60) + '\n');

  if (allPassed) {
    console.log('🎉 All validations passed! The batch is ready to commit.\n');
    console.log('Next steps:');
    console.log('1. Review the changes');
    console.log('2. Commit the translations');
    console.log('3. Move to the next batch\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some validations failed. Please review the errors above.\n');
    console.log('Common issues:');
    console.log('- Missing required frontmatter fields');
    console.log('- Structural differences from canonical game');
    console.log('- Missing sections or content blocks\n');
    console.log('Fix the issues and run validation again.\n');
    process.exit(1);
  }
}

// Main execution
validateBatch().catch(error => {
  console.error('Error during validation:', error);
  process.exit(1);
});
