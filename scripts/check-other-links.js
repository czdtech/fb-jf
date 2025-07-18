import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/games-extended.json'), 'utf8'));
const otherLinks = [];

Object.keys(data.categories).forEach(cat => {
  data.categories[cat].forEach(game => {
    const link = game.iframe || game.url || game.gameUrl;
    if (link && !link.includes('turbowarp.org')) {
      otherLinks.push({ title: game.title, link: link, category: cat });
    }
  });
});

console.log('Non-TurboWarp links:');
otherLinks.forEach((item, i) => {
  console.log(`${i+1}. ${item.title} (${item.category})`);
  console.log(`   ${item.link}`);
  console.log('');
});