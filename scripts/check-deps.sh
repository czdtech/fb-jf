#!/bin/bash

set -euo pipefail

echo "=== Dependency Usage Analysis (Production only) ==="
echo ""

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required." >&2
  exit 1
fi

# Read production dependencies from package.json dynamically
mapfile -t deps < <(jq -r '.dependencies | keys[]' package.json)

echo "Checking $((${#deps[@]})) production dependencies for usage..."
echo ""

echo "| Package | Import Hits | Config Hits | Status |"
echo "|---------|-------------|-------------|--------|"

for dep in "${deps[@]}"; do
  # Escape for grep
  escaped_dep=$(printf '%s' "$dep" | sed 's/[[\\.*^$()+?{|]/\\&/g')

  # Count source imports/usages (list unique files that reference the dep)
  import_hits=$( { rg -l \
      -e "from ['\"]${escaped_dep}['\"]" \
      -e "from ['\"]${escaped_dep}/" \
      -e "require\\(['\"]${escaped_dep}['\"]\\)" \
      src 2>/dev/null || true; } | wc -l )

  # Count config references
  config_hits=0
  for f in astro.config.mjs tailwind.config.mjs tsconfig.json; do
    if [ -f "$f" ] && grep -q "$escaped_dep" "$f" 2>/dev/null; then
      config_hits=$((config_hits + 1))
    fi
  done

  total=$((import_hits + config_hits))
  status="✅ Used"
  if [ "$total" -eq 0 ]; then
    status="❌ UNUSED"
  fi

  echo "| $dep | $import_hits | $config_hits | $status |"
done

echo ""
echo "=== Analysis Complete ==="
echo ""

# Additional repo signals
echo "Additional checks:"
echo "- React components: $(find src/components -name '*.tsx' -o -name '*.jsx' 2>/dev/null | wc -l) files"
echo "- Tailwind classes: $(rg -c 'className=' src 2>/dev/null | wc -l) files"
echo "- Radix UI usage: $(rg -c '@radix-ui' src 2>/dev/null | wc -l) files"
