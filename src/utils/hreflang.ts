/**
 * 统一的hreflang链接生成工具
 * 解决[slug].astro与GamePageLayout.astro重复实现问题
 */

interface Language {
  code: string;
  label: string;
}

interface HreflangLink {
  code: string;
  url: string;
  label: string;
}

/**
 * 生成规范化的hreflang链接
 * @param languages 语言配置数组
 * @param path 页面路径 (如: '/sprunki-retake/' 或 '/')
 * @param baseUrl 站点基础URL
 */
export function generateHreflangLinks(
  languages: Language[],
  path: string = '/',
  baseUrl: string = 'https://www.playfiddlebops.com'
): HreflangLink[] {
  if (!languages || languages.length === 0) {
    return [];
  }

  // 确保路径以/开始和结束
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const finalPath = normalizedPath.endsWith('/') ? normalizedPath : `${normalizedPath}/`;

  return languages.map((lang: Language) => ({
    code: lang.code === 'en' ? 'x-default' : lang.code,
    url: lang.code === 'en'
      ? `${baseUrl}${finalPath}`
      : `${baseUrl}/${lang.code}${finalPath}`,
    label: lang.label,
  }));
}

/**
 * 为首页生成hreflang
 */
export function generateHomeHreflangLinks(
  languages: Language[],
  baseUrl: string = 'https://www.playfiddlebops.com'
): HreflangLink[] {
  return generateHreflangLinks(languages, '/', baseUrl);
}

/**
 * 为游戏详情页生成hreflang - 支持多语言内容检测
 */
export async function generateGameHreflangLinks(
  languages: Language[],
  gameSlug: string,
  baseUrl: string = 'https://www.playfiddlebops.com'
): Promise<HreflangLink[]> {
  const { getCollection } = await import('astro:content');
  
  if (!languages || languages.length === 0) {
    return [];
  }

  const allGames = await getCollection('games');
  const availableLinks: HreflangLink[] = [];

  for (const lang of languages) {
    // 检查该语言是否有此游戏的翻译
    const hasTranslation = allGames.some(game => {
      const gameId = game.id.replace(/\.md$/, '');
      if (lang.code === 'en') {
        return gameId === `en/${gameSlug}` || gameId === gameSlug;
      } else {
        return gameId === `${lang.code}/${gameSlug}`;
      }
    });

    if (hasTranslation) {
      availableLinks.push({
        code: lang.code === 'en' ? 'x-default' : lang.code,
        url: lang.code === 'en'
          ? `${baseUrl}/${gameSlug}/`
          : `${baseUrl}/${lang.code}/${gameSlug}/`,
        label: lang.label,
      });
    }
  }

  return availableLinks;
}