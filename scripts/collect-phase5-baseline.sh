#!/bin/bash

echo "=== Collecting Phase 5 Baseline ==="

# Create baseline directory
mkdir -p reports/phase5-baseline

# SEO/Meta baseline
echo "=== SEO Baseline ===" > reports/phase5-baseline/seo-baseline.txt
for page in "dist/index.html" "dist/sprunki-phase-1/index.html" "dist/zh/index.html" "dist/zh/sprunki-phase-1/index.html"; do
  if [ -f "$page" ]; then
    echo "Page: $page" >> reports/phase5-baseline/seo-baseline.txt
    grep -o '<title>[^<]*</title>' "$page" | head -1 >> reports/phase5-baseline/seo-baseline.txt
    grep '<meta name="description"' "$page" | head -1 | sed 's/.*content="\([^"]*\)".*/\1/' >> reports/phase5-baseline/seo-baseline.txt
    grep '<link rel="canonical"' "$page" | head -1 | sed 's/.*href="\([^"]*\)".*/\1/' >> reports/phase5-baseline/seo-baseline.txt
    echo "Hreflang count: $(grep -c 'rel="alternate" hreflang' "$page")" >> reports/phase5-baseline/seo-baseline.txt
    echo "Script tags: $(grep -c '<script' "$page")" >> reports/phase5-baseline/seo-baseline.txt
    echo "" >> reports/phase5-baseline/seo-baseline.txt
  fi
done

# Code metrics
echo "=== Code Metrics ===" > reports/phase5-baseline/metrics.txt
echo "Total TS/TSX/Astro lines: $(find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.astro" \) -print0 | xargs -0 wc -l | tail -n1 | awk '{print $1}')" >> reports/phase5-baseline/metrics.txt
echo "Content files: $(find src/content -type f | wc -l)" >> reports/phase5-baseline/metrics.txt
echo "Inline scripts: $(rg -c "<script[^>]*is:inline" src 2>/dev/null || echo 0)" >> reports/phase5-baseline/metrics.txt
echo "" >> reports/phase5-baseline/metrics.txt

# Top 10 largest files
echo "=== Top 10 Largest Files ===" >> reports/phase5-baseline/metrics.txt
find src -type f \( -name "*.astro" -o -name "*.ts" -o -name "*.tsx" \) -exec wc -l {} \; | sort -rn | head -10 >> reports/phase5-baseline/metrics.txt

# Package count
echo "" >> reports/phase5-baseline/metrics.txt
echo "=== Package Count ===" >> reports/phase5-baseline/metrics.txt
echo "Total dependencies: $(npm ls --depth=0 2>/dev/null | grep -c '─' || echo 'N/A')" >> reports/phase5-baseline/metrics.txt
echo "Production deps: $(cat package.json | jq '.dependencies | length')" >> reports/phase5-baseline/metrics.txt
echo "Dev deps: $(cat package.json | jq '.devDependencies | length')" >> reports/phase5-baseline/metrics.txt

echo "Baseline collected in reports/phase5-baseline/"
