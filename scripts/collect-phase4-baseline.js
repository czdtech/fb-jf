import { readFileSync } from 'fs';
import { writeFileSync } from 'fs';
import { parse } from 'node-html-parser';

const pages = [
  'dist/index.html',
  'dist/colorbox-mustard/index.html',
  'dist/zh/index.html',
  'dist/zh/colorbox-mustard/index.html'
];

const baseline = {};

pages.forEach(page => {
  try {
    const html = readFileSync(page, 'utf-8');
    const root = parse(html);
    
    const pageName = page.replace('dist/', '').replace('/index.html', '');
    
    baseline[pageName] = {
      title: root.querySelector('title')?.text || '',
      description: root.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      canonical: root.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
      hreflangCount: root.querySelectorAll('link[rel="alternate"][hreflang]').length,
      scriptTags: root.querySelectorAll('script').length,
      hasGA: html.includes('gtag') && html.includes('G-9JME3P55QJ'),
      jsonLdBlocks: root.querySelectorAll('script[type="application/ld+json"]').length,
      gameHeroExists: html.includes('game-hero') || html.includes('GameHero'),
      soundSampleExists: html.includes('sound-sample') || html.includes('SoundSample')
    };
    
    // Extract first script tag for order verification
    const firstScript = root.querySelector('script');
    if (firstScript) {
      baseline[pageName].firstScriptType = firstScript.getAttribute('type') || 'text/javascript';
      baseline[pageName].firstScriptSrc = firstScript.getAttribute('src') || 'inline';
    }
  } catch (err) {
    console.error(`Error processing ${page}:`, err.message);
  }
});

writeFileSync('reports/phase4-baseline.json', JSON.stringify(baseline, null, 2));
console.log('Phase 4 baseline collected:', Object.keys(baseline).length, 'pages');
console.log(JSON.stringify(baseline, null, 2));
