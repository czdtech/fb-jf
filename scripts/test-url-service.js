// 运行需要: npm run build 或 tsx scripts/test-url-service.js
// 这里我们直接导入源文件用于测试
import {
  UrlService,
  extractBaseSlug,
  getGameLocalizedPath,
} from "../src/utils/url-service.ts";

// 测试样本
const testCases = [
  {
    input: { slug: "sprunki-dandys-world", title: "Test Game" },
    locale: "en",
    expected: "/sprunki-dandys-world/",
  },
  {
    input: { slug: "zh-sprunki-dandys-world", title: "测试游戏" },
    locale: "zh",
    expected: "/zh/sprunki-dandys-world/",
  },
  {
    input: { id: "es-incredibox.md", data: { title: "Incredibox" } },
    locale: "es",
    expected: "/es/incredibox/",
  },
  {
    input: { slug: "ja/cool-game", title: "クールゲーム" },
    locale: "ja",
    expected: "/ja/cool-game/",
  },
];

console.log("🧪 Testing UrlService after refactoring...\n");

// Test normalizeGameData
console.log("Testing normalizeGameData:");
testCases.forEach(({ input }) => {
  const result = UrlService.normalizeGameData(input);
  console.log(`  Input: ${JSON.stringify(input)}`);
  console.log(
    `  Output: baseSlug="${result.baseSlug}", title="${result.title}"\n`,
  );
});

// Test URL generation
console.log("Testing URL generation:");
testCases.forEach(({ input, locale, expected }) => {
  const url = UrlService.getGameUrl(input, locale);
  const passed = url === expected;
  console.log(
    `  ${passed ? "✅" : "❌"} Locale: ${locale}, Expected: ${expected}, Got: ${url}`,
  );
});

// Test compatibility functions
console.log("\nTesting compatibility functions:");
console.log(
  `  extractBaseSlug('zh-sprunki'): ${extractBaseSlug("zh-sprunki")}`,
);
console.log(`  extractBaseSlug('en/game'): ${extractBaseSlug("en/game")}`);
console.log(
  `  getGameLocalizedPath('test', 'en'): ${getGameLocalizedPath("test", "en")}`,
);
console.log(
  `  getGameLocalizedPath('test', 'zh'): ${getGameLocalizedPath("test", "zh")}`,
);

console.log("\n✨ UrlService refactoring test complete!");
