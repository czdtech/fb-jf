import { getCollection } from "astro:content";

// 这个脚本用于测试内容集合是否正确加载所有游戏文件
console.log("🔍 Testing content collection loading...");

try {
  const allGames = await getCollection("games");
  
  console.log(`📊 Total games loaded: ${allGames.length}`);
  
  // 按语言分类统计
  const stats = {
    en: 0,
    zh: 0,
    es: 0,
    fr: 0,
    de: 0,
    ja: 0,
    ko: 0
  };
  
  const gamesByLanguage = {
    en: [],
    zh: [],
    es: [],
    fr: [],
    de: [],
    ja: [],
    ko: []
  };
  
  for (const game of allGames) {
    const gameId = game.id.replace(/\.md$/, "");
    
    if (gameId.includes("/")) {
      // 多语言游戏：{locale}/{slug}
      const [locale] = gameId.split("/");
      if (stats[locale] !== undefined) {
        stats[locale]++;
        gamesByLanguage[locale].push(gameId);
      }
    } else {
      // 英文游戏：{slug}
      stats.en++;
      gamesByLanguage.en.push(gameId);
    }
  }
  
  // 打印统计信息
  console.log("📊 Games by language:");
  for (const [lang, count] of Object.entries(stats)) {
    console.log(`  ${lang}: ${count} games`);
  }
  
  // 检查特定游戏的所有版本
  console.log("\n🔍 Checking 'ayocs-sprunkr' across all languages:");
  const ayocsGames = allGames.filter(game => {
    return game.data.slug === "ayocs-sprunkr";
  });
  
  console.log(`Found ${ayocsGames.length} versions of 'ayocs-sprunkr':`);
  for (const game of ayocsGames) {
    console.log(`  ID: ${game.id}`);
    console.log(`  Title: ${game.data.title}`);
    console.log(`  Slug: ${game.data.slug}`);
    console.log(`  First 50 chars of description: ${game.data.description.substring(0, 50)}...`);
    console.log("---");
  }
  
} catch (error) {
  console.error("❌ Error loading games:", error);
}