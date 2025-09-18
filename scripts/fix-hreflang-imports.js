#!/usr/bin/env node

import fs from "fs";
import glob from "fast-glob";

async function fixMissingImports() {
  const files = [
    "src/pages/es/privacy.astro",
    "src/pages/fr/privacy.astro",
    "src/pages/ja/privacy.astro",
    "src/pages/ko/privacy.astro",
    "src/pages/de/terms-of-service.astro",
    "src/pages/es/terms-of-service.astro",
    "src/pages/fr/terms-of-service.astro",
    "src/pages/ja/terms-of-service.astro",
    "src/pages/ko/terms-of-service.astro",
    "src/pages/terms-of-service.astro",
  ];

  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.log(`File not found: ${file}`);
      continue;
    }

    let content = fs.readFileSync(file, "utf8");

    // Check if already has the import
    if (content.includes("import { generateHreflangLinks }")) {
      console.log(`✅ ${file} already has import`);
      continue;
    }

    // Add the import after the extractedData import
    if (
      content.includes("import extractedData from '@/data/extracted-data.json'")
    ) {
      content = content.replace(
        "import extractedData from '@/data/extracted-data.json'",
        "import extractedData from '@/data/extracted-data.json'\nimport { generateHreflangLinks } from '@/utils/hreflang'",
      );
      fs.writeFileSync(file, content);
      console.log(`✨ Fixed import in ${file}`);
    } else {
      // Add after last import
      const importMatch = content.match(
        /(import[^;]+from[^;]+['"][^'"]+['"][^;]*\n)+/,
      );
      if (importMatch) {
        const lastImport = importMatch[0];
        content = content.replace(
          lastImport,
          lastImport +
            "import { generateHreflangLinks } from '@/utils/hreflang'\n",
        );
        fs.writeFileSync(file, content);
        console.log(`✨ Fixed import in ${file}`);
      } else {
        console.log(`⚠️  Could not fix import in ${file}`);
      }
    }
  }

  console.log("\nDone fixing imports!");
}

fixMissingImports().catch(console.error);
