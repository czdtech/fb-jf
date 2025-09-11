import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function extractBaseline(htmlContent, filePath) {
  const result = {
    file: filePath,
    seo: {},
    dom: {},
    text: "",
  };

  // Extract title
  const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/);
  result.seo.title = titleMatch ? titleMatch[1] : null;

  // Extract description
  const descMatch = htmlContent.match(
    /<meta\s+name="description"\s+content="([^"]+)"/,
  );
  result.seo.description = descMatch ? descMatch[1] : null;

  // Extract canonical
  const canonicalMatch = htmlContent.match(
    /<link\s+rel="canonical"\s+href="([^"]+)"/,
  );
  result.seo.canonical = canonicalMatch ? canonicalMatch[1] : null;

  // Extract hreflang links
  const hreflangMatches = htmlContent.matchAll(
    /<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"/g,
  );
  result.seo.hreflang = Array.from(hreflangMatches)
    .map((m) => ({
      hreflang: m[1],
      href: m[2],
    }))
    .sort((a, b) => a.hreflang.localeCompare(b.hreflang));

  // Extract JSON-LD
  const jsonLdMatches = htmlContent.matchAll(
    /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  );
  result.seo.jsonLd = Array.from(jsonLdMatches)
    .map((m) => {
      try {
        const data = JSON.parse(m[1]);
        const normalized = JSON.stringify(data, null, 0);
        return {
          hash: crypto.createHash("md5").update(normalized).digest("hex"),
          type: data["@type"] || "unknown",
        };
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);

  // Extract key DOM elements (simplified)
  const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/);
  if (bodyMatch) {
    // Extract main container classes
    const containerMatches = bodyMatch[1].match(
      /<div\s+class="([^"]*container[^"]*)"/g,
    );
    result.dom.containers = containerMatches
      ? containerMatches.slice(0, 5).map((m) => m.match(/class="([^"]+)"/)[1])
      : [];

    // Extract text content (remove all tags, scripts, styles)
    let textContent = bodyMatch[1];
    textContent = textContent.replace(/<script[\s\S]*?<\/script>/g, "");
    textContent = textContent.replace(/<style[\s\S]*?<\/style>/g, "");
    textContent = textContent.replace(/<[^>]+>/g, " ");
    textContent = textContent.replace(/\s+/g, " ").trim();
    result.text = crypto.createHash("md5").update(textContent).digest("hex");
  }

  return result;
}

function collectBaselines() {
  const distDir = path.join(__dirname, "..", "dist");
  const reportsDir = path.join(__dirname, "..", "reports");

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const pages = [
    { path: "index.html", name: "homepage" },
    { path: "games/index.html", name: "games_list" },
    { path: "zh/index.html", name: "zh_homepage" },
    { path: "zh/games/index.html", name: "zh_games" },
    { path: "sprunki-dandys-world/index.html", name: "en_game_detail" },
    { path: "zh/sprunki-dandys-world/index.html", name: "zh_game_detail" },
  ];

  const baseline = {};

  pages.forEach(({ path: filePath, name }) => {
    const fullPath = path.join(distDir, filePath);
    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      baseline[name] = extractBaseline(content, filePath);
      console.log(`✓ Extracted ${name}: ${filePath}`);
    } catch (e) {
      console.error(`✗ Failed ${name}: ${e.message}`);
    }
  });

  // Save baseline
  const filename = process.argv.includes("--after")
    ? "baseline-after.json"
    : "baseline-before.json";

  fs.writeFileSync(
    path.join(reportsDir, filename),
    JSON.stringify(baseline, null, 2),
  );

  console.log(`\n📁 Baseline saved to reports/${filename}`);

  // Create summary
  const summary = Object.entries(baseline).map(([name, data]) => ({
    name,
    title: data.seo.title,
    hreflangCount: data.seo.hreflang.length,
    jsonLdCount: data.seo.jsonLd.length,
    textHash: data.text,
  }));

  console.log("\n📊 Baseline Summary:");
  console.table(summary);
}

collectBaselines();
