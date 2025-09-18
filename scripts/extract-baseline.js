#!/usr/bin/env node

import fs from "fs";
import path from "path";

function extractSEOTags(htmlPath) {
  const html = fs.readFileSync(htmlPath, "utf8");

  // Extract title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1] : null;

  // Extract description
  const descMatch = html.match(
    /<meta\s+name="description"\s+content="([^"]+)"/,
  );
  const description = descMatch ? descMatch[1] : null;

  // Extract canonical
  const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/);
  const canonical = canonicalMatch ? canonicalMatch[1] : null;

  // Extract all hreflang links
  const hreflangPattern =
    /<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"/g;
  const hreflangs = [];
  let match;
  while ((match = hreflangPattern.exec(html)) !== null) {
    hreflangs.push({ lang: match[1], href: match[2] });
  }

  return {
    path: htmlPath,
    title,
    description,
    canonical,
    hreflangs: hreflangs.sort((a, b) => a.lang.localeCompare(b.lang)),
  };
}

function extractBaseline() {
  const pages = [
    "dist/index.html",
    "dist/games/index.html",
    "dist/zh/index.html",
    "dist/zh/games/index.html",
    "dist/privacy/index.html",
    "dist/sprunki-dandys-world/index.html",
    "dist/zh/sprunki-dandys-world/index.html",
  ];

  const baseline = {};

  pages.forEach((page) => {
    if (fs.existsSync(page)) {
      baseline[page] = extractSEOTags(page);
    }
  });

  // Save baseline
  fs.writeFileSync(
    "reports/baseline-phase1.json",
    JSON.stringify(baseline, null, 2),
  );

  console.log("Baseline extracted to reports/baseline-phase1.json");
  console.log("\nSample data:");
  console.log(JSON.stringify(baseline["dist/index.html"], null, 2));
}

extractBaseline();
