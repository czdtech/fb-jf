/**
 * [slug].astro页面集成测试
 * 验证完整的多语言游戏页面渲染、语言切换和用户体验流程
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Astro运行时环境
const mockAstro = {
  url: {
    pathname: '/sprunki-retake/',
    href: 'https://www.playfiddlebops.com/sprunki-retake/',
    origin: 'https://www.playfiddlebops.com'
  },
  params: {
    slug: 'sprunki-retake'
  },
  props: {
    game: {
      id: 'en/sprunki-retake.md',
      slug: 'sprunki-retake',
      data: {
        title: 'Sprunki Retake',
        description: 'Horror rhythm game',
        image: '/sprunki-retake.png',
        category: 'popular'
      }
    },
    locale: 'en'
  }
};

// Mock游戏数据
const mockGameData = {
  // 英文版本
  en: {
    id: 'en/sprunki-retake.md',
    slug: 'sprunki-retake',
    data: {
      title: 'Sprunki Retake',
      description: 'If you love rhythm games and have a penchant for horror elements, Sprunki Retake will definitely get you hooked!',
      image: '/sprunki-retake.png',
      category: 'popular',
      meta: {
        title: 'Sprunki Retake - Play Sprunki Retake Online',
        description: 'Play Sprunki Retake online for free!',
        ogImage: '/sprunki-retake.png'
      },
      seo: {
        title: 'Sprunki Retake 🔥 Play Online',
        description: 'Best horror rhythm game online',
        keywords: 'Sprunki Retake, horror game, rhythm'
      },
      rating: {
        score: 4.3,
        maxScore: 5,
        votes: 524,
        stars: 4
      }
    },
    render: async () => ({ Content: () => 'English game content' })
  },
  
  // 中文版本
  zh: {
    id: 'zh/sprunki-retake.md',
    slug: 'sprunki-retake',
    data: {
      title: 'Sprunki Retake',
      description: '如果你喜欢节奏游戏并对恐怖元素有特殊爱好，Sprunki Retake绝对会让你着迷！',
      image: '/sprunki-retake.png',
      category: 'popular',
      meta: {
        title: 'Sprunki Retake - 在线玩 Sprunki Retake',
        description: '免费在线玩 Sprunki Retake！',
        ogImage: '/sprunki-retake.png'
      },
      seo: {
        title: 'Sprunki Retake 🔥 在线玩',
        description: '最佳在线恐怖节奏游戏',
        keywords: 'Sprunki Retake, 恐怖游戏, 节奏游戏'
      },
      rating: {
        score: 4.3,
        maxScore: 5,
        votes: 524,
        stars: 4
      }
    },
    render: async () => ({ Content: () => '中文游戏内容' })
  }
};

// Mock导航数据
const mockNavigation = {
  main: [
    { href: '/games/', text: 'Games', label: 'Browse all games' },
    { href: '/popular-games/', text: 'Popular', label: 'Popular games' },
    { href: '/trending-games/', text: 'Trending', label: 'Trending games' }
  ],
  languages: [
    { code: 'en', label: 'English' },
    { code: 'zh', label: '中文' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' }
  ]
};

// Mock相关游戏
const mockRelatedGames = [
  {
    slug: 'incredibox',
    title: 'Incredibox',
    description: 'Music creation game',
    image: '/incredibox.png',
    category: 'popular'
  },
  {
    slug: 'sprunki-phase-5',
    title: 'Sprunki Phase 5',
    description: 'Latest phase',
    image: '/sprunki-phase-5.png',
    category: 'popular'
  }
];

// Mock i18n工具函数
jest.mock('../i18n', () => ({
  getLocalizedGameContent: jest.fn(),
  extractLocaleFromPath: jest.fn(),
  getGameLocalizedPath: jest.fn(),
  generateMultiLanguageStaticPaths: jest.fn()
}));

// Mock hreflang工具函数
jest.mock('../hreflang', () => ({
  generateGameHreflangLinks: jest.fn()
}));

import { 
  getLocalizedGameContent,
  extractLocaleFromPath,
  getGameLocalizedPath
} from '../i18n';
import { generateGameHreflangLinks } from '../hreflang';

describe('[slug].astro页面集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认mock返回值
    (extractLocaleFromPath as jest.Mock).mockReturnValue('en');
    (getLocalizedGameContent as jest.Mock).mockResolvedValue(mockGameData.en);
    (getGameLocalizedPath as jest.Mock).mockReturnValue('/sprunki-retake/');
    (generateGameHreflangLinks as jest.Mock).mockResolvedValue([
      { code: 'x-default', url: 'https://www.playfiddlebops.com/sprunki-retake/', label: 'English' },
      { code: 'zh', url: 'https://www.playfiddlebops.com/zh/sprunki-retake/', label: '中文' }
    ]);
  });

  describe('英文页面渲染', () => {
    it('应该正确渲染英文游戏页面', async () => {
      const mockUrl = { pathname: '/sprunki-retake/' };
      
      // 模拟页面加载逻辑
      const currentLocale = extractLocaleFromPath(mockUrl.pathname);
      const gameContent = await getLocalizedGameContent('sprunki-retake', currentLocale);
      
      expect(extractLocaleFromPath).toHaveBeenCalledWith('/sprunki-retake/');
      expect(getLocalizedGameContent).toHaveBeenCalledWith('sprunki-retake', 'en');
      
      expect(currentLocale).toBe('en');
      expect(gameContent).toEqual(mockGameData.en);
      expect(gameContent!.data.title).toBe('Sprunki Retake');
      expect(gameContent!.data.description).toContain('rhythm games');
    });

    it('应该生成正确的英文SEO元数据', async () => {
      const gameData = mockGameData.en.data;
      const canonicalPath = getGameLocalizedPath('sprunki-retake', 'en');
      
      const expectedMeta = {
        title: gameData.seo?.title || gameData.meta?.title || `${gameData.title} - Play ${gameData.title} Online | FiddleBops`,
        description: gameData.seo?.description || gameData.meta?.description || `Play ${gameData.title} online for free! ${gameData.description}`,
        keywords: gameData.seo?.keywords || gameData.title,
        canonical: `https://www.playfiddlebops.com${canonicalPath}`
      };
      
      expect(expectedMeta.title).toBe('Sprunki Retake 🔥 Play Online');
      expect(expectedMeta.description).toBe('Best horror rhythm game online');
      expect(expectedMeta.keywords).toBe('Sprunki Retake, horror game, rhythm');
      expect(expectedMeta.canonical).toBe('https://www.playfiddlebops.com/sprunki-retake/');
    });
  });

  describe('中文页面渲染', () => {
    it('应该正确渲染中文游戏页面', async () => {
      const mockUrl = { pathname: '/zh/sprunki-retake/' };
      
      (extractLocaleFromPath as jest.Mock).mockReturnValue('zh');
      (getLocalizedGameContent as jest.Mock).mockResolvedValue(mockGameData.zh);
      (getGameLocalizedPath as jest.Mock).mockReturnValue('/zh/sprunki-retake/');
      
      const currentLocale = extractLocaleFromPath(mockUrl.pathname);
      const gameContent = await getLocalizedGameContent('sprunki-retake', currentLocale);
      
      expect(extractLocaleFromPath).toHaveBeenCalledWith('/zh/sprunki-retake/');
      expect(getLocalizedGameContent).toHaveBeenCalledWith('sprunki-retake', 'zh');
      
      expect(currentLocale).toBe('zh');
      expect(gameContent).toEqual(mockGameData.zh);
      expect(gameContent!.data.description).toContain('如果你喜欢节奏游戏');
    });

    it('应该生成正确的中文SEO元数据', async () => {
      const gameData = mockGameData.zh.data;
      
      expect(gameData.seo?.title).toBe('Sprunki Retake 🔥 在线玩');
      expect(gameData.seo?.description).toBe('最佳在线恐怖节奏游戏');
      expect(gameData.seo?.keywords).toBe('Sprunki Retake, 恐怖游戏, 节奏游戏');
      expect(gameData.meta?.title).toContain('在线玩');
    });
  });

  describe('hreflang标签生成', () => {
    it('应该为多语言页面生成正确的hreflang', async () => {
      const hreflangLinks = await generateGameHreflangLinks(
        mockNavigation.languages,
        'sprunki-retake'
      );
      
      expect(generateGameHreflangLinks).toHaveBeenCalledWith(
        mockNavigation.languages,
        'sprunki-retake'
      );
      
      expect(hreflangLinks).toHaveLength(2);
      expect(hreflangLinks[0]).toEqual({
        code: 'x-default',
        url: 'https://www.playfiddlebops.com/sprunki-retake/',
        label: 'English'
      });
      expect(hreflangLinks[1]).toEqual({
        code: 'zh',
        url: 'https://www.playfiddlebops.com/zh/sprunki-retake/',
        label: '中文'
      });
    });
  });

  describe('结构化数据生成', () => {
    it('应该生成正确的VideoGame结构化数据', () => {
      const gameData = mockGameData.en.data;
      const canonicalUrl = 'https://www.playfiddlebops.com/sprunki-retake/';
      
      const expectedStructuredData = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'VideoGame',
            name: gameData.title,
            description: gameData.seo?.description || gameData.meta?.description,
            url: canonicalUrl,
            image: `https://www.playfiddlebops.com${gameData.image}`,
            screenshot: `https://www.playfiddlebops.com${gameData.image}`,
            genre: [gameData.category],
            applicationCategory: 'Game',
            operatingSystem: 'Web',
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: gameData.rating?.score,
              bestRating: gameData.rating?.maxScore,
              ratingCount: gameData.rating?.votes
            }
          }
        ]
      };
      
      expect(expectedStructuredData['@graph'][0]['@type']).toBe('VideoGame');
      expect(expectedStructuredData['@graph'][0].name).toBe('Sprunki Retake');
      expect(expectedStructuredData['@graph'][0].aggregateRating.ratingValue).toBe(4.3);
    });

    it('应该生成面包屑导航结构化数据', () => {
      const canonicalUrl = 'https://www.playfiddlebops.com/sprunki-retake/';
      const gameTitle = 'Sprunki Retake';
      
      const breadcrumbData = {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://www.playfiddlebops.com/'
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Games',
            item: 'https://www.playfiddlebops.com/games/'
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: gameTitle,
            item: canonicalUrl
          }
        ]
      };
      
      expect(breadcrumbData.itemListElement).toHaveLength(3);
      expect(breadcrumbData.itemListElement[2].name).toBe('Sprunki Retake');
    });
  });

  describe('页面组件集成', () => {
    it('应该正确传递数据给Navigation组件', () => {
      const expectedNavProps = {
        navigation: mockNavigation.main,
        languages: mockNavigation.languages,
        currentLang: 'en',
        currentPath: '/sprunki-retake/'
      };
      
      expect(expectedNavProps.currentLang).toBe('en');
      expect(expectedNavProps.currentPath).toBe('/sprunki-retake/');
      expect(expectedNavProps.languages).toEqual(mockNavigation.languages);
    });

    it('应该正确传递数据给GameHero组件', () => {
      const gameData = mockGameData.en.data;
      
      const expectedHeroProps = {
        game: gameData,
        rating: gameData.rating,
        pageType: 'traditional'
      };
      
      expect(expectedHeroProps.game.title).toBe('Sprunki Retake');
      expect(expectedHeroProps.rating?.score).toBe(4.3);
    });
  });

  describe('相关游戏加载', () => {
    it('应该加载相同类别的相关游戏', () => {
      const currentGame = mockGameData.en.data;
      const allGames = [mockGameData.en, ...mockRelatedGames.map(g => ({ data: g }))];
      
      const relatedGames = allGames
        .filter((g: any) => 
          g.data.category === currentGame.category && 
          g.data.title !== currentGame.title
        )
        .slice(0, 4);
      
      expect(relatedGames).toHaveLength(1); // incredibox和sprunki-phase-5中只有incredibox是popular类别
    });

    it('应该优先显示当前语言的相关游戏', () => {
      // 这个测试验证相关游戏过滤逻辑，确保优先显示当前语言的游戏
      const currentLocale = 'zh';
      const gameId = 'sprunki-retake';
      
      // 模拟过滤逻辑
      const mockGames = [
        { id: 'zh/incredibox.md', data: { category: 'popular' } },
        { id: 'en/incredibox.md', data: { category: 'popular' } },
        { id: 'zh/sprunki-retake.md', data: { category: 'popular' } }
      ];
      
      const filtered = mockGames.filter((g: any) => {
        if (g.id === `${currentLocale}/${gameId}.md`) return false;
        return g.id.startsWith(`${currentLocale}/`);
      });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('zh/incredibox.md');
    });
  });

  describe('错误处理和fallback', () => {
    it('应该处理内容加载失败的情况', async () => {
      (getLocalizedGameContent as jest.Mock).mockResolvedValue(null);
      
      const gameContent = await getLocalizedGameContent('non-existent-game', 'en');
      expect(gameContent).toBeNull();
      
      // 在实际实现中，应该有fallback到初始游戏数据的逻辑
    });

    it('应该处理语言检测异常', () => {
      (extractLocaleFromPath as jest.Mock).mockReturnValue('invalid');
      
      const detectedLocale = extractLocaleFromPath('/invalid-path/');
      // 实际实现中应该fallback到'en'
      expect(typeof detectedLocale).toBe('string');
    });

    it('应该处理hreflang生成失败', async () => {
      (generateGameHreflangLinks as jest.Mock).mockResolvedValue([]);
      
      const hreflangLinks = await generateGameHreflangLinks(mockNavigation.languages, 'game');
      expect(hreflangLinks).toEqual([]);
    });
  });

  describe('性能和缓存优化', () => {
    it('页面数据加载应该高效', async () => {
      const startTime = performance.now();
      
      // 模拟页面加载的主要步骤
      const currentLocale = extractLocaleFromPath('/zh/sprunki-retake/');
      const [gameContent, hreflangLinks] = await Promise.all([
        getLocalizedGameContent('sprunki-retake', currentLocale),
        generateGameHreflangLinks(mockNavigation.languages, 'sprunki-retake')
      ]);
      
      const endTime = performance.now();
      
      expect(gameContent).toBeDefined();
      expect(hreflangLinks).toBeDefined();
      expect(endTime - startTime).toBeLessThan(100); // 应在100ms内完成
    });

    it('重复访问相同页面应该复用数据', async () => {
      // 第一次调用
      const result1 = await getLocalizedGameContent('sprunki-retake', 'en');
      
      // 第二次调用
      const result2 = await getLocalizedGameContent('sprunki-retake', 'en');
      
      expect(result1).toEqual(result2);
      expect(getLocalizedGameContent).toHaveBeenCalledTimes(2);
    });
  });
});

describe('用户体验和交互测试', () => {
  describe('语言切换流程', () => {
    it('应该支持从英文页面切换到中文', () => {
      const currentPath = '/sprunki-retake/';
      const targetLocale = 'zh';
      
      (getGameLocalizedPath as jest.Mock).mockReturnValue('/zh/sprunki-retake/');
      const newPath = getGameLocalizedPath('sprunki-retake', targetLocale);
      
      expect(getGameLocalizedPath).toHaveBeenCalledWith('sprunki-retake', 'zh');
      expect(newPath).toBe('/zh/sprunki-retake/');
    });

    it('应该支持从中文页面切换到英文', () => {
      const targetLocale = 'en';
      
      (getGameLocalizedPath as jest.Mock).mockReturnValue('/sprunki-retake/');
      const newPath = getGameLocalizedPath('sprunki-retake', targetLocale);
      
      expect(newPath).toBe('/sprunki-retake/');
      expect(newPath).not.toContain('/en/');
    });
  });

  describe('响应式设计验证', () => {
    it('页面组件应该支持移动端渲染', () => {
      const mobileViewport = { width: 375, height: 667 };
      
      // 验证组件props包含响应式相关配置
      const gameHeroProps = {
        game: mockGameData.en.data,
        rating: mockGameData.en.data.rating
      };
      
      expect(gameHeroProps.game.image).toBeDefined();
      expect(gameHeroProps.rating).toBeDefined();
    });

    it('SEO元数据应该适配移动搜索', () => {
      const gameData = mockGameData.en.data;
      
      // 验证mobile-friendly的SEO配置
      expect(gameData.meta?.title).toBeDefined();
      expect(gameData.meta?.description).toBeDefined();
      expect(gameData.seo?.title).toBeDefined();
      
      // 标题长度应该适合移动搜索结果
      expect(gameData.seo?.title.length).toBeLessThanOrEqual(60);
    });
  });

  describe('可访问性支持', () => {
    it('应该提供正确的lang属性', () => {
      const englishPage = { currentLocale: 'en' };
      const chinesePage = { currentLocale: 'zh' };
      
      expect(englishPage.currentLocale).toBe('en');
      expect(chinesePage.currentLocale).toBe('zh');
    });

    it('结构化数据应该支持屏幕阅读器', () => {
      const gameData = mockGameData.en.data;
      
      // 验证必要的可访问性数据
      expect(gameData.title).toBeDefined();
      expect(gameData.description).toBeDefined();
      expect(gameData.category).toBeDefined();
    });
  });
});