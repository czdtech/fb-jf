#!/usr/bin/env tsx
/**
 * DOM Validation Script - Compare current build against baseline
 * Validates critical DOM elements are present and match expectations
 */

import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

interface DOMRule {
  rule: string;
  selector: string;
  found: number;
  required: boolean;
  status: "PASS" | "FAIL" | "SKIP" | "WARNING";
  exempted?: boolean;
  reason?: string;
}

interface PageResults {
  name: string;
  results: DOMRule[];
}

interface BaselineReport {
  timestamp: string;
  pages: Record<string, PageResults>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

interface ValidationResult {
  page: string;
  rule: string;
  baseline: DOMRule;
  current: DOMRule | null;
  status: "MATCH" | "MISMATCH" | "MISSING" | "NEW";
  details?: string;
}

const PREVIEW_BASE = "http://localhost:4321";

// Pages to validate
const PAGES_TO_VALIDATE = [
  { path: "/", name: "Homepage" },
  { path: "/games/", name: "Games List" },
  { path: "/privacy/", name: "Privacy Page" },
  { path: "/zh/", name: "Chinese Homepage" },
];

// Critical selectors to check
const DOM_RULES = [
  {
    rule: "Social Share Kit",
    selector: ".a2a_kit",
    required: false,
  },
  {
    rule: "Canonical Link",
    selector: 'link[rel="canonical"]',
    required: true,
  },
  {
    rule: "OG Image Meta",
    selector: 'meta[property="og:image"]',
    required: true,
  },
];

async function fetchPageDOM(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    throw error;
  }
}

function countElements(html: string, selector: string): number {
  // Simple regex-based counting for common selectors
  // For production, use a proper HTML parser like jsdom or cheerio

  if (selector === ".a2a_kit") {
    const matches = html.match(/class=["'][^"']*\ba2a_kit\b[^"']*["']/gi);
    return matches ? matches.length : 0;
  }

  if (selector === 'link[rel="canonical"]') {
    const matches = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/gi);
    return matches ? matches.length : 0;
  }

  if (selector === 'meta[property="og:image"]') {
    const matches = html.match(/<meta[^>]+property=["']og:image["'][^>]*>/gi);
    return matches ? matches.length : 0;
  }

  // Default: try to match tag name
  const tagName = selector.match(/^(\w+)/)?.[1];
  if (tagName) {
    const regex = new RegExp(`<${tagName}[^>]*>`, "gi");
    const matches = html.match(regex);
    return matches ? matches.length : 0;
  }

  return 0;
}

async function validatePage(
  pagePath: string,
  pageName: string,
): Promise<PageResults> {
  const url = `${PREVIEW_BASE}${pagePath}`;
  console.log(`  Validating ${pageName} (${url})...`);

  try {
    const html = await fetchPageDOM(url);
    const results: DOMRule[] = [];

    for (const rule of DOM_RULES) {
      const count = countElements(html, rule.selector);

      // Special exemption for legal pages
      const isLegalPage =
        pagePath.includes("/privacy") || pagePath.includes("/terms");
      const isSocialShare = rule.rule === "Social Share Kit";

      if (isLegalPage && isSocialShare) {
        results.push({
          ...rule,
          found: count,
          status: "SKIP",
          exempted: true,
          reason: "Legal pages are exempt from social share requirements",
        });
      } else {
        const status = rule.required && count === 0 ? "FAIL" : "PASS";
        results.push({
          ...rule,
          found: count,
          status,
        });
      }
    }

    return { name: pageName, results };
  } catch (error) {
    console.error(`  Error validating ${pageName}:`, error);
    return {
      name: pageName,
      results: DOM_RULES.map((rule) => ({
        ...rule,
        found: 0,
        status: "FAIL",
        reason: "Failed to fetch page",
      })),
    };
  }
}

async function loadBaseline(): Promise<BaselineReport | null> {
  const baselinePath = path.join(
    process.cwd(),
    "reports/baseline/dom-report.json",
  );

  if (!existsSync(baselinePath)) {
    console.warn("⚠️  Baseline report not found at:", baselinePath);
    return null;
  }

  try {
    const content = await readFile(baselinePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to load baseline:", error);
    return null;
  }
}

async function compareWithBaseline(
  current: Record<string, PageResults>,
  baseline: BaselineReport | null,
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  if (!baseline) {
    console.log("\n📊 No baseline for comparison - showing current state only");
    return results;
  }

  // Compare each page
  for (const [pagePath, currentPage] of Object.entries(current)) {
    const baselinePage = baseline.pages[pagePath];

    if (!baselinePage) {
      // New page not in baseline
      for (const rule of currentPage.results) {
        results.push({
          page: pagePath,
          rule: rule.rule,
          baseline: null as any,
          current: rule,
          status: "NEW",
          details: "Page not in baseline",
        });
      }
      continue;
    }

    // Compare each rule
    for (const currentRule of currentPage.results) {
      const baselineRule = baselinePage.results.find(
        (r) => r.rule === currentRule.rule,
      );

      if (!baselineRule) {
        results.push({
          page: pagePath,
          rule: currentRule.rule,
          baseline: null as any,
          current: currentRule,
          status: "NEW",
          details: "Rule not in baseline",
        });
      } else {
        // Compare the rules
        const isMatch =
          currentRule.found === baselineRule.found &&
          currentRule.status === baselineRule.status;

        results.push({
          page: pagePath,
          rule: currentRule.rule,
          baseline: baselineRule,
          current: currentRule,
          status: isMatch ? "MATCH" : "MISMATCH",
          details: !isMatch
            ? `Expected ${baselineRule.found} (${baselineRule.status}), got ${currentRule.found} (${currentRule.status})`
            : undefined,
        });
      }
    }

    // Check for missing rules (in baseline but not current)
    for (const baselineRule of baselinePage.results) {
      if (!currentPage.results.find((r) => r.rule === baselineRule.rule)) {
        results.push({
          page: pagePath,
          rule: baselineRule.rule,
          baseline: baselineRule,
          current: null,
          status: "MISSING",
          details: "Rule missing in current validation",
        });
      }
    }
  }

  return results;
}

async function main() {
  console.log("🔍 DOM Validation Tool");
  console.log("=".repeat(60));

  // Check preview server
  try {
    await fetch(`${PREVIEW_BASE}/`);
    console.log("✅ Preview server is running at", PREVIEW_BASE);
  } catch {
    console.error(
      "❌ Preview server not running. Please run: npm run build && npm run preview",
    );
    process.exit(1);
  }

  // Load baseline
  const baseline = await loadBaseline();
  if (baseline) {
    console.log(
      "✅ Loaded baseline from",
      new Date(baseline.timestamp).toLocaleString(),
    );
  }

  console.log("\n📝 Validating pages...\n");

  // Validate current state
  const currentResults: Record<string, PageResults> = {};

  for (const page of PAGES_TO_VALIDATE) {
    const result = await validatePage(page.path, page.name);
    currentResults[page.path] = result;
  }

  // Calculate summary
  let totalRules = 0;
  let passedRules = 0;
  let failedRules = 0;
  let skippedRules = 0;

  for (const page of Object.values(currentResults)) {
    for (const rule of page.results) {
      totalRules++;
      if (rule.status === "PASS") passedRules++;
      else if (rule.status === "FAIL") failedRules++;
      else if (rule.status === "SKIP") skippedRules++;
    }
  }

  // Compare with baseline
  console.log("\n" + "=".repeat(60));
  const comparison = await compareWithBaseline(currentResults, baseline);

  if (comparison.length > 0 && baseline) {
    console.log("📊 Comparison with Baseline:\n");

    const matches = comparison.filter((r) => r.status === "MATCH");
    const mismatches = comparison.filter((r) => r.status === "MISMATCH");
    const missing = comparison.filter((r) => r.status === "MISSING");
    const newRules = comparison.filter((r) => r.status === "NEW");

    console.log(`  ✅ Matches: ${matches.length}`);
    console.log(`  ⚠️  Mismatches: ${mismatches.length}`);
    console.log(`  ❌ Missing: ${missing.length}`);
    console.log(`  🆕 New: ${newRules.length}`);

    if (mismatches.length > 0) {
      console.log("\n⚠️  Mismatches found:");
      for (const mismatch of mismatches) {
        console.log(
          `  - ${mismatch.page} > ${mismatch.rule}: ${mismatch.details}`,
        );
      }
    }

    if (missing.length > 0) {
      console.log("\n❌ Missing rules:");
      for (const miss of missing) {
        console.log(`  - ${miss.page} > ${miss.rule}`);
      }
    }
  }

  // Generate current report
  const currentReport: BaselineReport = {
    timestamp: new Date().toISOString(),
    pages: currentResults,
    summary: {
      total: totalRules,
      passed: passedRules,
      failed: failedRules,
      warnings: skippedRules,
    },
  };

  // Save current report
  const reportPath = path.join(
    process.cwd(),
    "reports/current-dom-validation.json",
  );
  await writeFile(reportPath, JSON.stringify(currentReport, null, 2));

  console.log("\n" + "=".repeat(60));
  console.log("📊 Validation Summary:\n");
  console.log(`  Total rules checked: ${totalRules}`);
  console.log(`  ✅ Passed: ${passedRules}`);
  console.log(`  ❌ Failed: ${failedRules}`);
  console.log(`  ⏭️  Skipped: ${skippedRules}`);

  console.log("\n📁 Report saved to:", reportPath);

  // Exit code based on results
  if (failedRules > 0) {
    console.log("\n❌ Validation failed with errors");
    process.exit(1);
  } else if (baseline && comparison.length > 0) {
    const mismatches = comparison.filter((r) => r.status === "MISMATCH");
    if (mismatches.length > 0) {
      console.log("\n⚠️  Validation passed but with baseline mismatches");
      process.exit(0); // Don't fail CI for mismatches, just warn
    }
  }

  console.log("\n✅ All validations passed!");
  process.exit(0);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
