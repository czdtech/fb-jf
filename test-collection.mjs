import { getCollection } from 'astro:content';

try {
  console.log('Testing Astro content collection...\n');
  
  const allGames = await getCollection('games');
  console.log(`Total games loaded: ${allGames.length}`);
  
  const englishGames = allGames.filter(game => game.id.startsWith('games/en/') || game.slug.includes('/en/'));
  const chineseGames = allGames.filter(game => game.id.startsWith('games/zh/') || game.slug.includes('/zh/'));
  
  console.log(`English games: ${englishGames.length}`);
  console.log(`Chinese games: ${chineseGames.length}`);
  
  if (englishGames.length === 0) {
    console.log('\n❌ NO ENGLISH GAMES FOUND!');
    console.log('This indicates the collection loading issue.');
  }
  
  // Show some sample IDs to understand the structure
  console.log('\n=== SAMPLE GAME IDS ===');
  allGames.slice(0, 10).forEach(game => {
    console.log(`ID: ${game.id}, Slug: ${game.slug}`);
  });
  
} catch (error) {
  console.error('Error loading games collection:', error);
}