#!/usr/bin/env node

import fs from "fs";
import path from "path";
import glob from "fast-glob";

async function updateHreflangInPages() {
  // Find all privacy and terms pages
  const patterns = [
    "src/pages/privacy.astro",
    "src/pages/terms-of-service.astro",
    "src/pages/*/privacy.astro",
    "src/pages/*/terms-of-service.astro",
  ];

  const files = await glob(patterns);
  console.log(`Found ${files.length} legal pages to update`);

  for (const file of files) {
    let content = fs.readFileSync(file, "utf8");

    // Check if already using the new approach
    if (content.includes("generateHreflangLinks")) {
      console.log(`✅ ${file} already using generateHreflangLinks`);
      continue;
    }

    // Add import if not present
    if (!content.includes("import { generateHreflangLinks }")) {
      content = content.replace(
        "import { getEntry } from 'astro:content'",
        "import { getEntry } from 'astro:content'\nimport { generateHreflangLinks } from '@/utils/hreflang'",
      );
    }

    // Determine the path based on the file location
    const isPrivacy = file.includes("privacy");
    const pagePath = isPrivacy ? "/privacy" : "/terms-of-service";

    // Replace the old hreflang generation
    const oldPattern =
      /const hreflangLinks = navigation\.languages\.map\([^)]+\) => \([^)]+\)\)/s;
    const newCode = `const hreflangLinks = generateHreflangLinks(
  navigation.languages.map((lang: any) => ({ code: lang.code, label: lang.label })),
  '${pagePath}',
  'https://www.playfiddlebops.com'
)`;

    if (oldPattern.test(content)) {
      content = content.replace(oldPattern, newCode);
      fs.writeFileSync(file, content);
      console.log(`✨ Updated ${file}`);
    } else {
      console.log(`⚠️  Could not find pattern in ${file}`);
    }
  }

  console.log("\nDone! All legal pages updated to use generateHreflangLinks");
}

updateHreflangInPages().catch(console.error);
