#!/usr/bin/env node
/**
 * Structure Compare Script
 * 
 * Compares structure snapshots to detect breaking changes during UI redesign.
 * Exits with code 1 if structural regressions are detected.
 * 
 * Allowed changes:
 * - Adding/changing CSS classes
 * - Adding data attributes
 * - Adding internal wrapper elements (within existing sections)
 * 
 * Disallowed changes:
 * - Removing/reordering main sections
 * - Changing heading levels (especially H1)
 * - Removing navigation links
 * - Breaking semantic structure
 * 
 * Usage:
 *   node scripts/structure-compare.mjs
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

const SNAPSHOTS_DIR = 'scripts/snapshots';
const BASELINE_FILE = 'structure-baseline.json';
const AFTER_FILE = 'structure-after.json';

function normalizeText(text) {
  return (text || '').toString().replace(/\s+/g, ' ').trim();
}

function mainOutlineKey(item) {
  if (!item) return 'unknown';
  const tag = item.tag || 'unknown';
  const id = item.id ? `#${item.id}` : '';
  if (id) return `${tag}${id}`;

  if (item.firstHeading?.level) {
    return `${tag}|h${item.firstHeading.level}`;
  }

  return tag;
}

async function main() {
  console.log('🔍 Structure Compare Script');
  console.log('='.repeat(50));
  
  let baseline, after;
  
  try {
    const baselineContent = await readFile(join(SNAPSHOTS_DIR, BASELINE_FILE), 'utf-8');
    baseline = JSON.parse(baselineContent);
  } catch (e) {
    console.error(`❌ Error: Could not read ${BASELINE_FILE}`);
    console.error('   Run "npm run snapshot:structure" first.');
    process.exit(1);
  }
  
  try {
    const afterContent = await readFile(join(SNAPSHOTS_DIR, AFTER_FILE), 'utf-8');
    after = JSON.parse(afterContent);
  } catch (e) {
    console.error(`❌ Error: Could not read ${AFTER_FILE}`);
    console.error('   Run "npm run snapshot:structure:after" first.');
    process.exit(1);
  }
  
  const issues = [];
  const warnings = [];
  
  // Compare each route
  for (const [route, baselineStructure] of Object.entries(baseline.routes)) {
    const afterStructure = after.routes[route];
    
    if (!afterStructure) {
      issues.push(`❌ [${route}] Route missing in after snapshot`);
      continue;
    }
    
    // Enforce exactly one H1 in <main> (SEO + structure freeze)
    const afterH1Count = afterStructure?.semantic?.h1Count;
    if (afterH1Count !== 1) {
      issues.push(`❌ [${route}] Expected exactly 1 <main><h1>, found ${afterH1Count ?? 'unknown'}`);
    }
    
    // Check semantic elements
    if (baselineStructure?.semantic?.hasMain && !afterStructure?.semantic?.hasMain) {
      issues.push(`❌ [${route}] <main> element removed`);
    }
    if (baselineStructure?.semantic?.hasNav && !afterStructure?.semantic?.hasNav) {
      issues.push(`❌ [${route}] <nav> element removed`);
    }
    if (baselineStructure?.semantic?.hasHeader && !afterStructure?.semantic?.hasHeader) {
      issues.push(`❌ [${route}] <header> element removed`);
    }
    if (baselineStructure?.semantic?.hasFooter && !afterStructure?.semantic?.hasFooter) {
      issues.push(`❌ [${route}] <footer> element removed`);
    }

    // Compare heading hierarchy (levels + order) inside <main>
    if (!Array.isArray(baselineStructure.headings) || !Array.isArray(afterStructure.headings)) {
      issues.push(`❌ [${route}] Missing headings data (re-run snapshots with updated script)`);
    } else {
      const baselineLevels = baselineStructure.headings.map(h => h.level).join(',');
      const afterLevels = afterStructure.headings.map(h => h.level).join(',');
      if (baselineLevels !== afterLevels) {
        issues.push(`❌ [${route}] Heading hierarchy changed (levels/order)`);
      }
    }

    // Compare main outline (direct children of <main>)
    if (!Array.isArray(baselineStructure.mainOutline) || !Array.isArray(afterStructure.mainOutline)) {
      issues.push(`❌ [${route}] Missing mainOutline data (re-run snapshots with updated script)`);
    } else {
      const baselineKeys = baselineStructure.mainOutline.map(mainOutlineKey);
      const afterKeys = afterStructure.mainOutline.map(mainOutlineKey);

      if (baselineKeys.length !== afterKeys.length) {
        issues.push(`❌ [${route}] <main> top-level child count changed: ${baselineKeys.length} → ${afterKeys.length}`);
      } else {
        for (let i = 0; i < baselineKeys.length; i++) {
          if (baselineKeys[i] !== afterKeys[i]) {
            issues.push(`❌ [${route}] <main> outline changed at #${i + 1}: "${baselineKeys[i]}" → "${afterKeys[i]}"`);
            break;
          }
        }
      }
    }

    // Check header links (should not shrink)
    if (!Array.isArray(baselineStructure.headerLinks) || !Array.isArray(afterStructure.headerLinks)) {
      issues.push(`❌ [${route}] Missing headerLinks data (re-run snapshots with updated script)`);
      continue;
    }

    const baselineHeaderHrefs = new Set(baselineStructure.headerLinks.map(l => l.href));
    const afterHeaderHrefs = new Set(afterStructure.headerLinks.map(l => l.href));
    
    for (const href of baselineHeaderHrefs) {
      if (!afterHeaderHrefs.has(href)) {
        issues.push(`❌ [${route}] Header link removed: ${href}`);
      }
    }
    
    // Check for new header links (allowed, just note)
    for (const href of afterHeaderHrefs) {
      if (!baselineHeaderHrefs.has(href)) {
        warnings.push(`✓ [${route}] Header link added: ${href}`);
      }
    }
    
    // Check footer links (should not shrink)
    if (!Array.isArray(baselineStructure.footerLinks) || !Array.isArray(afterStructure.footerLinks)) {
      issues.push(`❌ [${route}] Missing footerLinks data (re-run snapshots with updated script)`);
      continue;
    }

    const baselineFooterHrefs = new Set(baselineStructure.footerLinks.map(l => l.href));
    const afterFooterHrefs = new Set(afterStructure.footerLinks.map(l => l.href));
    
    for (const href of baselineFooterHrefs) {
      if (!afterFooterHrefs.has(href)) {
        issues.push(`❌ [${route}] Footer link removed: ${href}`);
      }
    }
    
    // Check heading structure (levels should be consistent)
    const baselineH1Texts = baselineStructure.headings.filter(h => h.level === 1).map(h => h.text);
    const afterH1Texts = afterStructure.headings.filter(h => h.level === 1).map(h => h.text);
    
    // H1 content should remain (SEO critical)
    for (const text of baselineH1Texts) {
      const found = afterH1Texts.some(t => t.includes(text.slice(0, 20)) || text.includes(t.slice(0, 20)));
      if (!found && text.length > 5) {
        warnings.push(`⚠️ [${route}] H1 text changed: "${text.slice(0, 40)}..."`);
      }
    }
  }
  
  // Check for missing routes
  for (const route of Object.keys(after.routes)) {
    if (!baseline.routes[route]) {
      warnings.push(`✓ New route added: ${route}`);
    }
  }
  
  // Report results
  console.log('\n📋 Comparison Results:');
  console.log(`   Baseline routes: ${baseline.totalRoutes}`);
  console.log(`   After routes: ${after.totalRoutes}`);
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings (acceptable changes):');
    warnings.forEach(w => console.log(`   ${w}`));
  }
  
  if (issues.length > 0) {
    console.log('\n❌ Issues (structure violations):');
    issues.forEach(i => console.log(`   ${i}`));
    console.log('\n❌ Structure freeze violated! Please review changes.');
    process.exit(1);
  } else {
    console.log('\n✅ Structure freeze maintained - all checks passed!');
  }
}

main().catch(console.error);
