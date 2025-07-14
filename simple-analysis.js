const fs = require('fs');

try {
  // 读取游戏数据
  const gamesData = JSON.parse(fs.readFileSync('./src/data/games-extended.json', 'utf8'));

  let totalGames = 0;
  let hasStructuredContent = 0;
  let hasOnlyOther = 0;
  let hasNoContent = 0;

  // 分析分类数据
  Object.keys(gamesData.categories).forEach(category => {
    const games = gamesData.categories[category];
    console.log(`分类 ${category}: ${games.length} 个游戏`);

    games.forEach(game => {
      totalGames++;

      if (!game.content) {
        hasNoContent++;
        console.log(`❌ 无内容: ${game.title}`);
      } else {
        const chapters = Object.keys(game.content);
        const hasStructured = chapters.some(ch =>
          ['introduction', 'features', 'gameplay', 'advantages', 'accessibility', 'conclusion'].includes(ch)
        );

        if (hasStructured) {
          hasStructuredContent++;
        } else if (chapters.includes('other') && chapters.length === 1) {
          hasOnlyOther++;
          console.log(`⚠️  只有other: ${game.title}`);
        }
      }
    });
  });

  // 分析扩展数据
  if (gamesData.extendedData) {
    console.log(`\n扩展数据: ${Object.keys(gamesData.extendedData).length} 个游戏`);

    Object.values(gamesData.extendedData).forEach(game => {
      totalGames++;

      if (!game.content) {
        hasNoContent++;
        console.log(`❌ 扩展无内容: ${game.title}`);
      } else {
        const chapters = Object.keys(game.content);
        const hasStructured = chapters.some(ch =>
          ['introduction', 'features', 'gameplay', 'advantages', 'accessibility', 'conclusion'].includes(ch)
        );

        if (hasStructured) {
          hasStructuredContent++;
        } else if (chapters.includes('other') && chapters.length === 1) {
          hasOnlyOther++;
          console.log(`⚠️  扩展只有other: ${game.title}`);
        }
      }
    });
  }

  console.log('\n=== 统计结果 ===');
  console.log(`总游戏数: ${totalGames}`);
  console.log(`有完整结构: ${hasStructuredContent} (${(hasStructuredContent/totalGames*100).toFixed(1)}%)`);
  console.log(`只有other: ${hasOnlyOther} (${(hasOnlyOther/totalGames*100).toFixed(1)}%)`);
  console.log(`无内容: ${hasNoContent} (${(hasNoContent/totalGames*100).toFixed(1)}%)`);

} catch (error) {
  console.error('错误:', error.message);
}
