#!/usr/bin/env node
/**
 * Create Snapshot Script
 * 
 * Runs all snapshot scripts to create SEO snapshots.
 * 
 * Usage: 
 *   npm run baseline              # Create baseline snapshots (rebuilds first)
 *   npm run baseline -- --no-build  # Skip rebuild (use existing dist)
 *   npm run snapshot:after        # Create after-refactor snapshots (rebuilds first)
 *   npm run snapshot:after -- --no-build  # Skip rebuild
 */

import { spawn } from 'child_process';
import { stat } from 'fs/promises';

const DIST_DIR = 'dist';

function runScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit',
      shell: true,
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script ${scriptPath} exited with code ${code}`));
      }
    });
    
    child.on('error', reject);
  });
}

function runBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'build'], {
      stdio: 'inherit',
      shell: true,
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Build failed with code ${code}`));
      }
    });
    
    child.on('error', reject);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const skipBuild = args.includes('--no-build');
  const isAfter = args.includes('--after');
  
  const snapshotType = isAfter ? 'After-Refactor' : 'Baseline';
  const snapshotArgs = isAfter ? ['--after'] : [];
  
  console.log(`🚀 Creating ${snapshotType} SEO Snapshots`);
  console.log('='.repeat(60));
  console.log('');
  
  if (skipBuild) {
    try {
      await stat(DIST_DIR);
      console.log(`⚠️  Using existing ${DIST_DIR} directory (--no-build flag)`);
      console.log('   Note: This may not reflect current source changes.');
    } catch (e) {
      console.error(`❌ Error: ${DIST_DIR} directory not found.`);
      console.error('   Cannot use --no-build without an existing build.');
      console.error('   Run without --no-build to build first.');
      process.exit(1);
    }
  } else {
    console.log('🔨 Building project...');
    console.log('');
    await runBuild();
  }
  
  // Run sitemap snapshot
  console.log('');
  console.log('📋 Step 1/3: Creating sitemap snapshot...');
  console.log('-'.repeat(60));
  await runScript('scripts/sitemap-snapshot.mjs', snapshotArgs);
  
  // Run URL snapshot
  console.log('');
  console.log('📋 Step 2/3: Creating URL list snapshot...');
  console.log('-'.repeat(60));
  await runScript('scripts/url-snapshot.mjs', snapshotArgs);
  
  // Run SEO snapshot
  console.log('');
  console.log('📋 Step 3/3: Creating SEO elements snapshot...');
  console.log('-'.repeat(60));
  await runScript('scripts/seo-snapshot.mjs', snapshotArgs);
  
  const prefix = isAfter ? 'after-refactor' : 'baseline';
  
  console.log('');
  console.log('='.repeat(60));
  console.log(`✅ ${snapshotType} snapshot creation complete!`);
  console.log('');
  console.log('📁 Snapshot files created in scripts/snapshots/:');
  console.log(`   - sitemap-${prefix}.xml (raw sitemap)`);
  console.log(`   - sitemap-${prefix}.json (parsed sitemap)`);
  console.log(`   - url-${prefix}.json (all generated URLs)`);
  console.log(`   - seo-${prefix}.json (SEO elements for all pages)`);
  
  if (!isAfter) {
    console.log('');
    console.log('💡 After refactoring, run: npm run snapshot:after');
    console.log('   Then compare with: npm run compare:seo');
  }
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
