#!/bin/bash

echo "Collecting Phase 4 baseline..."

# Create baseline directory
mkdir -p reports/phase4-baseline

# Function to extract meta tags
extract_meta() {
  local file=$1
  local name=$(basename $(dirname $file))
  
  echo "=== $name ===" >> reports/phase4-baseline/meta.txt
  grep -o '<title>[^<]*</title>' "$file" | head -1 >> reports/phase4-baseline/meta.txt
  grep '<meta name="description"' "$file" | head -1 >> reports/phase4-baseline/meta.txt
  grep '<link rel="canonical"' "$file" | head -1 >> reports/phase4-baseline/meta.txt
  echo "Hreflang count: $(grep -c 'rel="alternate" hreflang' "$file")" >> reports/phase4-baseline/meta.txt
  echo "Script tags: $(grep -c '<script' "$file")" >> reports/phase4-baseline/meta.txt
  echo "" >> reports/phase4-baseline/meta.txt
}

# Collect from key pages
extract_meta "dist/index.html"
extract_meta "dist/colorbox-mustard/index.html"
extract_meta "dist/zh/index.html"
extract_meta "dist/zh/colorbox-mustard/index.html"

# Count total lines in key files
echo "=== Source code metrics ===" > reports/phase4-baseline/metrics.txt
echo "Total lines in [...slug].astro: $(wc -l < src/pages/[...slug].astro)" >> reports/phase4-baseline/metrics.txt
echo "Total lines in GameHero.astro: $(wc -l < src/components/GameHero.astro 2>/dev/null || echo 0)" >> reports/phase4-baseline/metrics.txt
echo "Total lines in SoundSample.astro: $(wc -l < src/components/SoundSample.astro 2>/dev/null || echo 0)" >> reports/phase4-baseline/metrics.txt
echo "" >> reports/phase4-baseline/metrics.txt

# List top 10 largest files
echo "=== Top 10 largest source files ===" >> reports/phase4-baseline/metrics.txt
find src -type f \( -name "*.astro" -o -name "*.ts" -o -name "*.tsx" \) -exec wc -l {} \; | sort -rn | head -10 >> reports/phase4-baseline/metrics.txt

echo "Baseline collected in reports/phase4-baseline/"
