#!/usr/bin/env node

import fs from "fs";
import glob from "fast-glob";

async function removeInlineScripts() {
  // Find all index pages
  const indexPages = await glob([
    "src/pages/index.astro",
    "src/pages/*/index.astro",
  ]);

  for (const file of indexPages) {
    let content = fs.readFileSync(file, "utf8");

    // Check if it has the inline script pattern
    if (
      content.includes('<script type="module" is:inline>') &&
      content.includes("sound-samples-section")
    ) {
      // Find the inline script block and replace it
      const scriptStart = content.indexOf('<script type="module" is:inline>');
      const scriptEnd =
        content.indexOf("</script>", scriptStart) + "</script>".length;

      if (scriptStart !== -1 && scriptEnd !== -1) {
        const newScript = `<script type="module">
    import { initHomepage } from '@/scripts/pages/homepage.js';
    initHomepage();
  </script>`;

        content =
          content.substring(0, scriptStart) +
          newScript +
          content.substring(scriptEnd);
        fs.writeFileSync(file, content);
        console.log(`✨ Updated ${file}`);
      }
    }
  }

  // Handle zh privacy and terms pages
  const zhPages = [
    "src/pages/zh/privacy.astro",
    "src/pages/zh/terms-of-service.astro",
  ];

  for (const file of zhPages) {
    if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, "utf8");

      // Remove the inline script for nav toggle
      if (content.includes("<script is:inline>")) {
        // Find and remove the entire script block
        const scriptPattern = /<script\s+is:inline>[\s\S]*?<\/script>/g;
        content = content.replace(scriptPattern, "");
        fs.writeFileSync(file, content);
        console.log(`✨ Removed inline script from ${file}`);
      }
    }
  }

  console.log("\nDone removing inline scripts!");
}

removeInlineScripts().catch(console.error);
