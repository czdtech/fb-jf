#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distPath = path.join(projectRoot, "dist");
const reportPath = path.join(projectRoot, "reports", "baseline");

// 法务页面路径模式（豁免社交分享检查）
const LEGAL_PAGE_PATTERN = /^\/(?:[a-z]{2}\/)?(?:privacy|terms-of-service)\/$/;

// 守卫规则配置
const GUARD_RULES = [
  {
    name: "Social Share Kit",
    selector: ".a2a_kit",
    pages: ["/", "/games/", "/zh/"],
    required: false,
    minCount: 1,
  },
  {
    name: "Canonical Link",
    selector: 'link[rel="canonical"]',
    pages: ["/", "/games/", "/privacy/", "/zh/"],
    required: true,
  },
  {
    name: "OG Image Meta",
    selector: 'meta[property="og:image"]',
    pages: ["/", "/games/", "/zh/"],
    required: true,
  },
];

// 测试页面列表
const TEST_PAGES = [
  { path: "/", name: "Homepage" },
  { path: "/games/", name: "Games List" },
  { path: "/privacy/", name: "Privacy Page" },
  { path: "/zh/", name: "Chinese Homepage" },
];

function readHtmlFile(pagePath) {
  const filePath = path.join(distPath, pagePath, "index.html");
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    console.error(`Failed to read ${filePath}:`, error.message);
    return null;
  }
}

function checkSelector(html, selector) {
  // 简单的选择器检查（不使用完整的DOM解析器）
  // 支持类选择器、标签选择器和属性选择器

  if (selector.startsWith(".")) {
    // 类选择器
    const className = selector.slice(1).split(" ")[0];
    const pattern = new RegExp(`class="[^"]*\\b${className}\\b[^"]*"`, "g");
    return html.match(pattern) || [];
  }

  if (selector.includes("[")) {
    // 属性选择器
    const match = selector.match(/(\w+)\[([^=]+)(?:="([^"]+)")?\]/);
    if (match) {
      const [, tag, attr, value] = match;
      if (value) {
        const pattern = new RegExp(`<${tag}[^>]*${attr}="${value}"[^>]*>`, "g");
        return html.match(pattern) || [];
      } else {
        const pattern = new RegExp(`<${tag}[^>]*${attr}[^>]*>`, "g");
        return html.match(pattern) || [];
      }
    }
  }

  // 标签选择器
  const pattern = new RegExp(`<${selector}[^>]*>`, "g");
  return html.match(pattern) || [];
}

function runGuards() {
  console.log("🔍 Running DOM/SEO guard checks...\n");

  // 确保报告目录存在
  if (!fs.existsSync(path.join(projectRoot, "reports"))) {
    fs.mkdirSync(path.join(projectRoot, "reports"));
  }
  if (!fs.existsSync(reportPath)) {
    fs.mkdirSync(reportPath, { recursive: true });
  }

  const results = {
    timestamp: new Date().toISOString(),
    pages: {},
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
    },
  };

  for (const page of TEST_PAGES) {
    console.log(`Checking ${page.name} (${page.path})...`);
    const html = readHtmlFile(page.path);

    if (!html) {
      console.error(`  ❌ Could not read page`);
      results.pages[page.path] = { error: "Could not read file" };
      results.summary.failed++;
      continue;
    }

    const pageResults = [];

    for (const rule of GUARD_RULES) {
      // 检查规则是否适用于当前页面
      if (!rule.pages.some((p) => page.path.startsWith(p))) {
        continue;
      }

      // 法务页面豁免社交分享检查
      if (
        rule.name === "Social Share Kit" &&
        LEGAL_PAGE_PATTERN.test(page.path)
      ) {
        const result = {
          rule: rule.name,
          selector: rule.selector,
          found: 0,
          required: false,
          status: "SKIP",
          exempted: true,
          reason: "Legal pages are exempt from social share requirements",
        };
        console.log(`  ➖ ${rule.name}: EXEMPTED (legal page)`);
        results.summary.passed++;
        results.summary.total++;
        pageResults.push(result);
        continue;
      }

      results.summary.total++;
      const matches = checkSelector(html, rule.selector);
      const count = matches.length;

      const result = {
        rule: rule.name,
        selector: rule.selector,
        found: count,
        required: rule.required,
      };

      if (rule.required && count === 0) {
        console.log(`  ❌ ${rule.name}: NOT FOUND (required)`);
        result.status = "FAIL";
        results.summary.failed++;
      } else if (rule.minCount && count < rule.minCount) {
        console.log(
          `  ⚠️  ${rule.name}: Found ${count} (expected min ${rule.minCount})`,
        );
        result.status = "WARN";
        results.summary.warnings++;
      } else if (count > 0) {
        console.log(`  ✅ ${rule.name}: Found ${count}`);
        result.status = "PASS";
        results.summary.passed++;
      } else {
        console.log(`  ➖ ${rule.name}: Not found (optional)`);
        result.status = "SKIP";
        results.summary.passed++;
      }

      pageResults.push(result);
    }

    results.pages[page.path] = {
      name: page.name,
      results: pageResults,
    };
  }

  // 写入报告
  const reportFile = path.join(reportPath, "dom-report.json");
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));

  // 输出总结
  console.log("\n📊 Summary:");
  console.log(`  Total checks: ${results.summary.total}`);
  console.log(`  Passed: ${results.summary.passed}`);
  console.log(`  Failed: ${results.summary.failed}`);
  console.log(`  Warnings: ${results.summary.warnings}`);
  console.log(`\n📄 Report saved to: ${reportFile}`);

  // 如果有失败，返回非零退出码
  if (results.summary.failed > 0) {
    console.error("\n❌ DOM/SEO guard checks failed!");
    process.exit(1);
  } else if (results.summary.warnings > 0) {
    console.warn("\n⚠️  DOM/SEO guard checks passed with warnings");
  } else {
    console.log("\n✅ All DOM/SEO guard checks passed!");
  }
}

// 运行守卫检查
runGuards();
