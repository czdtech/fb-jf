import { getCollection } from 'astro:content';

// AURA-X: Add - 动态 Sitemap 生成（覆盖多语言首页、游戏列表分页、游戏详情）。Confirmed via 寸止。
export async function GET() {
  const SITE_URL = (import.meta.env.PUBLIC_SITE_URL || 'https://www.playfiddlebops.com').replace(/\/$/, '');

  // 语言首页（从已存在的语言目录推断）
  const langCodes = ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko'];

  // 游戏详情
  const games = await getCollection('games');

  // 列表分页（保持与实现一致：每页 30）
  const pageSize = 30;
  const totalPages = Math.ceil(games.length / pageSize);

  const urls: { loc: string; lastmod?: string; changefreq?: string; priority?: string }[] = [];

  // 根首页
  urls.push({ loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' });

  // 多语言首页
  for (const code of langCodes) {
    if (code === 'en') continue; // en 用根首页
    urls.push({ loc: `${SITE_URL}/${code}/`, changefreq: 'weekly', priority: '0.8' });
  }

  // 游戏列表（分页）
  for (let i = 1; i <= totalPages; i++) {
    const path = i === 1 ? '/games/' : `/games/${i}/`;
    urls.push({ loc: `${SITE_URL}${path}`, changefreq: 'daily', priority: i === 1 ? '0.9' : '0.7' });
  }

  // 游戏详情页
  for (const game of games) {
    const slug = game.slug.replace(/\/$/, '');
    const loc = `${SITE_URL}/${slug}/`;
    // 优先使用 frontmatter 中的 lastUpdated/updated/日期字段（若存在）
    const lastmod = (game.data?.updated as string) || (game.data?.lastUpdated as string) || undefined;
    urls.push({ loc, lastmod, changefreq: 'weekly', priority: '0.8' });
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => {
      return [
        '  <url>',
        `    <loc>${u.loc}</loc>`,
        u.lastmod ? `    <lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : '',
        u.changefreq ? `    <changefreq>${u.changefreq}</changefreq>` : '',
        u.priority ? `    <priority>${u.priority}</priority>` : '',
        '  </url>'
      ].filter(Boolean).join('\n');
    }).join('\n') +
    `\n</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
}
