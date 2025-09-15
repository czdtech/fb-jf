#!/bin/bash

echo "=== Verifying Phase 4 Output ==="

# Check a game page
echo "Checking game page structure..."
grep -c '<title>Sprunki Phase 1' dist/sprunki-phase-1/index.html
grep -c 'rel="canonical" href="https://www.playfiddlebops.com/sprunki-phase-1/"' dist/sprunki-phase-1/index.html
grep -c 'G-9JME3P55QJ' dist/sprunki-phase-1/index.html
grep -c 'game-iframe-container' dist/sprunki-phase-1/index.html

echo ""
echo "Checking Chinese version..."
grep -c '<title>Sprunki Phase 1' dist/zh/sprunki-phase-1/index.html
grep -c 'rel="canonical" href="https://www.playfiddlebops.com/zh/sprunki-phase-1/"' dist/zh/sprunki-phase-1/index.html

echo ""
echo "Line count changes:"
echo "Previous [...slug].astro: 541 lines"
echo "New [...slug].astro: $(wc -l < src/pages/[...slug].astro) lines"
echo "Helper file: $(wc -l < src/utils/game-helpers.ts) lines"
echo "Total: $(( $(wc -l < src/pages/[...slug].astro) + $(wc -l < src/utils/game-helpers.ts) )) lines"
echo "Reduction: $(( 541 - $(wc -l < src/pages/[...slug].astro) )) lines ($(( (541 - $(wc -l < src/pages/[...slug].astro)) * 100 / 541 ))%)"
