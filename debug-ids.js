import { getCollection } from "astro:content";

console.log("🔍 Debugging game IDs and language detection...");

const games = await getCollection("games");
console.log(`Total games: ${games.length}`);

// Check the first 10 games
console.log("\n📋 First 10 game IDs:");
games.slice(0, 10).forEach((game, index) => {
  console.log(`${index + 1}. ID: "${game.id}" | Slug: "${game.data.slug}" | Title: "${game.data.title}"`);
});

// Look for ayocs-sprunkr specifically
console.log("\n🔍 Looking for ayocs-sprunkr games:");
const ayocsGames = games.filter(g => g.data.slug?.includes('ayocs-sprunkr'));
ayocsGames.forEach(game => {
  const gameId = game.id.replace(/\.md$/, "");
  console.log(`- ID: "${game.id}" | Clean ID: "${gameId}" | Slug: "${game.data.slug}"`);
  console.log(`  Starts with "zh-": ${gameId.startsWith("zh-")}`);
  console.log(`  Starts with "en-": ${gameId.startsWith("en-")}`);
  console.log(`  Has slash: ${gameId.includes("/")}`);
});

// Check Chinese games detection
console.log("\n🔍 Testing Chinese games detection:");
const SUPPORTED_LOCALES = ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko'];
const chineseGames = games.filter((game) => {
  const gameId = game.id.replace(/\.md$/, "");
  return gameId.startsWith("zh-");
});
console.log(`Found ${chineseGames.length} Chinese games`);
chineseGames.slice(0, 5).forEach(game => {
  console.log(`- ID: "${game.id}" | Slug: "${game.data.slug}"`);
});

// Check English games detection  
console.log("\n🔍 Testing English games detection:");
const englishGames = games.filter((game) => {
  const gameId = game.id.replace(/\.md$/, "");
  return !SUPPORTED_LOCALES.some(lang => lang !== "en" && gameId.startsWith(`${lang}-`));
});
console.log(`Found ${englishGames.length} English games`);
englishGames.slice(0, 5).forEach(game => {
  console.log(`- ID: "${game.id}" | Slug: "${game.data.slug}"`);
});