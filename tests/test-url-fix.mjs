import UrlService from './src/utils/url-service.ts';

// 模拟Astro content collection的游戏数据
const testGames = [
  {
    id: 'zh-pikmin-no-sprunki',
    data: {
      slug: 'zh-pikmin-no-sprunki',
      title: 'Pikmin No Sprunki'
    }
  },
  {
    id: 'es-ayocs-sprunkr', 
    data: {
      slug: 'es-ayocs-sprunkr',
      title: 'Ayocs Sprunkr'
    }
  },
  {
    id: 'pikmin-no-sprunki',
    data: {
      slug: 'pikmin-no-sprunki', 
      title: 'Pikmin No Sprunki'
    }
  }
];

console.log('🧪 测试URL生成修复\n');

testGames.forEach((game, index) => {
  console.log(`--- 测试游戏 ${index + 1}: ${game.id} ---`);
  
  // 标准化数据
  const normalized = UrlService.normalizeGameData(game);
  console.log('标准化数据:', normalized);
  
  // 测试不同语言的URL生成
  ['en', 'zh', 'es'].forEach(locale => {
    const result = UrlService.generateFromGame(game, locale);
    console.log(`${locale}: ${result.url}`);
  });
  
  console.log('');
});