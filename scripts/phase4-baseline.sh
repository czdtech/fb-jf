#!/bin/bash

echo "Collecting Phase 4 baseline..."

# Create baseline directory
mkdir -p reports/phase4-baseline

# Function to extract meta tags
extract_meta() {
  local file=$1
  local name=$2
  
  if [ -f "$file" ]; then
    echo "=== $name ===" >> reports/phase4-baseline/meta.txt
    grep -o '<title>[^<]*</title>' "$file" | head -1 >> reports/phase4-baseline/meta.txt
    grep '<meta name="description"' "$file" | head -1 >> reports/phase4-baseline/meta.txt
    grep '<link rel="canonical"' "$file" | head -1 >> reports/phase4-baseline/meta.txt
    echo "Hreflang count: $(grep -c 'rel="alternate" hreflang' "$file")" >> reports/phase4-baseline/meta.txt
    echo "Script tags: $(grep -c '<script' "$file")" >> reports/phase4-baseline/meta.txt
    echo "GA present: $(grep -c 'G-9JME3P55QJ' "$file")" >> reports/phase4-baseline/meta.txt
    echo "" >> reports/phase4-baseline/meta.txt
  else
    echo "File not found: $file" >> reports/phase4-baseline/meta.txt
  fi
}

# Clear previous baseline
> reports/phase4-baseline/meta.txt

# Collect from key pages
extract_meta "dist/index.html" "Homepage (en)"
extract_meta "dist/sprunki-phase-1/index.html" "Game: sprunki-phase-1 (en)"
extract_meta "dist/zh/index.html" "Homepage (zh)"
extract_meta "dist/zh/sprunki-phase-1/index.html" "Game: sprunki-phase-1 (zh)"
extract_meta "dist/games/index.html" "Games listing (en)"

# Count total lines in key files
echo "=== Source code metrics ===" > reports/phase4-baseline/metrics.txt
echo "Total lines in [...slug].astro: $(wc -l < src/pages/[...slug].astro)" >> reports/phase4-baseline/metrics.txt

# Check if components exist
if [ -f "src/components/GameHero.astro" ]; then
  echo "Total lines in GameHero.astro: $(wc -l < src/components/GameHero.astro)" >> reports/phase4-baseline/metrics.txt
else
  echo "GameHero.astro not found" >> reports/phase4-baseline/metrics.txt
fi

if [ -f "src/components/SoundSample.astro" ]; then
  echo "Total lines in SoundSample.astro: $(wc -l < src/components/SoundSample.astro)" >> reports/phase4-baseline/metrics.txt
else
  echo "SoundSample.astro not found" >> reports/phase4-baseline/metrics.txt
fi

echo "" >> reports/phase4-baseline/metrics.txt

# List top 10 largest files
echo "=== Top 10 largest source files ===" >> reports/phase4-baseline/metrics.txt
find src -type f \( -name "*.astro" -o -name "*.ts" -o -name "*.tsx" \) -exec wc -l {} \; | sort -rn | head -10 >> reports/phase4-baseline/metrics.txt

# Extract sample DOM structure from game page
echo "=== Sample DOM structure ===" > reports/phase4-baseline/dom-sample.txt
if [ -f "dist/sprunki-phase-1/index.html" ]; then
  # Extract game hero section if exists
  grep -A 5 -B 5 'game-hero\|GameHero' "dist/sprunki-phase-1/index.html" >> reports/phase4-baseline/dom-sample.txt 2>/dev/null || echo "No GameHero found" >> reports/phase4-baseline/dom-sample.txt
fi

echo "Baseline collected in reports/phase4-baseline/"
cat reports/phase4-baseline/meta.txt
