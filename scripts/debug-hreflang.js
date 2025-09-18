import { getCollection } from "astro:content";

const allGames = await getCollection("games");
const gameSlug = "sprunki-dandys-world";

console.log("=== 调试 hreflang 问题 ===");
console.log(`总游戏数: ${allGames.length}`);
console.log("\n查找 sprunki-dandys-world 相关的游戏:");

const relatedGames = allGames.filter((game) =>
  game.id.includes("sprunki-dandys-world"),
);

relatedGames.forEach((game) => {
  console.log(`  ID: ${game.id}`);
  console.log(`  Slug: ${game.slug}`);
});

console.log("\n检查各语言匹配:");
const languages = ["en", "zh", "es", "fr", "de", "ja", "ko"];

for (const lang of languages) {
  const matches = allGames.filter((game) => {
    const gameId = game.id.replace(/\.md$/, "");
    if (lang === "en") {
      return gameId === `en/${gameSlug}` || gameId === gameSlug;
    } else {
      return gameId === `${lang}/${gameSlug}`;
    }
  });
  console.log(`  ${lang}: ${matches.length} 个匹配`);
  if (matches.length > 0) {
    console.log(`    -> ${matches[0].id}`);
  }
}
