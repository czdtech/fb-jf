/**
 * i18n工具函数核心测试
 * 验证多语言游戏内容加载、路径生成和语言检测功能
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import type { CollectionEntry } from 'astro:content';

// Mock Astro content collection
const mockGames: CollectionEntry<'games'>[] = [
  {
    id: 'en/sprunki-retake.md',
    slug: 'sprunki-retake',
    body: 'English content',
    collection: 'games',
    data: {
      title: 'Sprunki Retake',
      description: 'English description',
      image: '/sprunki-retake.png',
      category: 'popular'
    },
    render: async () => ({ Content: () => 'English content' })
  },
  {
    id: 'zh/sprunki-retake.md',
    slug: 'sprunki-retake',
    body: '中文内容',
    collection: 'games',
    data: {
      title: 'Sprunki Retake',
      description: '如果你喜欢节奏游戏并对恐怖元素有特殊爱好，Sprunki Retake绝对会让你着迷！',
      image: '/sprunki-retake.png',
      category: 'popular'
    },
    render: async () => ({ Content: () => '中文内容' })
  },
  {
    id: 'en/incredibox.md',
    slug: 'incredibox',
    body: 'Incredibox English content',
    collection: 'games',
    data: {
      title: 'Incredibox',
      description: 'Create music with beatboxers',
      image: '/incredibox.png',
      category: 'trending'
    },
    render: async () => ({ Content: () => 'Incredibox English content' })
  }
];

// Mock getCollection function
jest.mock('astro:content', () => ({
  getCollection: jest.fn(() => Promise.resolve(mockGames))
}));

import { 
  getLocalizedGameContent, 
  generateMultiLanguageStaticPaths,
  getGameLocalizedPath,
  extractLocaleFromPath,
  isLocaleSupported,
  supportedLocales
} from '../i18n';

describe('i18n工具函数测试', () => {
  beforeEach(() => {
    // 重置mock状态
    jest.clearAllMocks();
  });

  describe('getLocalizedGameContent - 本地化内容加载', () => {
    it('应该正确加载英文游戏内容', async () => {
      const result = await getLocalizedGameContent('sprunki-retake', 'en');
      
      expect(result).not.toBeNull();
      expect(result!.id).toBe('en/sprunki-retake.md');
      expect(result!.data.title).toBe('Sprunki Retake');
      expect(result!.data.description).toContain('English');
    });

    it('应该正确加载中文游戏内容', async () => {
      const result = await getLocalizedGameContent('sprunki-retake', 'zh');
      
      expect(result).not.toBeNull();
      expect(result!.id).toBe('zh/sprunki-retake.md');
      expect(result!.data.description).toContain('如果你喜欢节奏游戏');
    });

    it('当目标语言不存在时应该fallback到英文', async () => {
      const result = await getLocalizedGameContent('sprunki-retake', 'es');
      
      // 应该fallback到英文版本
      expect(result).not.toBeNull();
      expect(result!.id).toBe('en/sprunki-retake.md');
      expect(result!.data.description).toContain('English');
    });

    it('当英文版本也不存在时应该返回null', async () => {
      const result = await getLocalizedGameContent('non-existent-game', 'zh');
      
      expect(result).toBeNull();
    });

    it('应该正确处理只有英文版本的游戏', async () => {
      const result = await getLocalizedGameContent('incredibox', 'zh');
      
      // 应该fallback到英文版本
      expect(result).not.toBeNull();
      expect(result!.id).toBe('en/incredibox.md');
      expect(result!.data.title).toBe('Incredibox');
    });
  });

  describe('generateMultiLanguageStaticPaths - 静态路径生成', () => {
    it('应该为所有英文游戏生成静态路径', async () => {
      const paths = await generateMultiLanguageStaticPaths();
      
      expect(paths).toHaveLength(2);
      
      const sprunkiPath = paths.find(p => p.params.slug === 'sprunki-retake');
      expect(sprunkiPath).toBeDefined();
      expect(sprunkiPath!.props.locale).toBe('en');
      
      const incrediboxPath = paths.find(p => p.params.slug === 'incredibox');
      expect(incrediboxPath).toBeDefined();
      expect(incrediboxPath!.props.locale).toBe('en');
    });

    it('生成的路径应该包含正确的游戏数据', async () => {
      const paths = await generateMultiLanguageStaticPaths();
      const sprunkiPath = paths.find(p => p.params.slug === 'sprunki-retake');
      
      expect(sprunkiPath!.props.game.data.title).toBe('Sprunki Retake');
      expect(sprunkiPath!.props.game.data.category).toBe('popular');
    });
  });

  describe('getGameLocalizedPath - 本地化路径生成', () => {
    it('英文路径应该不包含语言前缀', () => {
      const path = getGameLocalizedPath('sprunki-retake', 'en');
      expect(path).toBe('/sprunki-retake/');
    });

    it('非英文路径应该包含语言前缀', () => {
      const zhPath = getGameLocalizedPath('sprunki-retake', 'zh');
      expect(zhPath).toBe('/zh/sprunki-retake/');
      
      const esPath = getGameLocalizedPath('sprunki-retake', 'es');
      expect(esPath).toBe('/es/sprunki-retake/');
    });

    it('应该正确处理特殊字符的slug', () => {
      const path = getGameLocalizedPath('game-with-dashes', 'fr');
      expect(path).toBe('/fr/game-with-dashes/');
    });
  });

  describe('extractLocaleFromPath - 路径语言提取', () => {
    it('应该从多语言路径中正确提取语言代码', () => {
      expect(extractLocaleFromPath('/zh/sprunki-retake/')).toBe('zh');
      expect(extractLocaleFromPath('/es/incredibox/')).toBe('es');
      expect(extractLocaleFromPath('/fr/game-page/deep/')).toBe('fr');
    });

    it('英文路径应该返回en', () => {
      expect(extractLocaleFromPath('/sprunki-retake/')).toBe('en');
      expect(extractLocaleFromPath('/incredibox/')).toBe('en');
      expect(extractLocaleFromPath('/')).toBe('en');
    });

    it('应该处理无效的语言代码', () => {
      expect(extractLocaleFromPath('/invalid/sprunki-retake/')).toBe('en');
      expect(extractLocaleFromPath('/xx/game/')).toBe('en');
    });

    it('应该处理边缘情况的路径格式', () => {
      expect(extractLocaleFromPath('')).toBe('en');
      expect(extractLocaleFromPath('zh/game')).toBe('zh');
      expect(extractLocaleFromPath('/zh')).toBe('zh');
    });
  });

  describe('isLocaleSupported - 语言支持检查', () => {
    it('应该正确识别支持的语言', () => {
      expect(isLocaleSupported('en')).toBe(true);
      expect(isLocaleSupported('zh')).toBe(true);
      expect(isLocaleSupported('es')).toBe(true);
      expect(isLocaleSupported('fr')).toBe(true);
      expect(isLocaleSupported('de')).toBe(true);
      expect(isLocaleSupported('ja')).toBe(true);
      expect(isLocaleSupported('ko')).toBe(true);
    });

    it('应该拒绝不支持的语言', () => {
      expect(isLocaleSupported('xx')).toBe(false);
      expect(isLocaleSupported('invalid')).toBe(false);
      expect(isLocaleSupported('')).toBe(false);
    });
  });

  describe('supportedLocales - 支持的语言列表', () => {
    it('应该包含所有7种支持的语言', () => {
      expect(supportedLocales).toHaveLength(7);
      expect(supportedLocales).toContain('en');
      expect(supportedLocales).toContain('zh');
      expect(supportedLocales).toContain('es');
      expect(supportedLocales).toContain('fr');
      expect(supportedLocales).toContain('de');
      expect(supportedLocales).toContain('ja');
      expect(supportedLocales).toContain('ko');
    });

    it('英文应该是第一个语言（默认语言）', () => {
      expect(supportedLocales[0]).toBe('en');
    });
  });
});

describe('错误处理和边缘情况', () => {
  it('应该优雅处理getCollection失败', async () => {
    // Mock getCollection抛出错误
    const { getCollection } = await import('astro:content');
    (getCollection as jest.Mock).mockRejectedValueOnce(new Error('Collection not found'));

    const result = await getLocalizedGameContent('test-game', 'en');
    expect(result).toBeNull();
  });

  it('应该处理空的游戏集合', async () => {
    const { getCollection } = await import('astro:content');
    (getCollection as jest.Mock).mockResolvedValueOnce([]);

    const result = await getLocalizedGameContent('test-game', 'en');
    expect(result).toBeNull();
    
    const paths = await generateMultiLanguageStaticPaths();
    expect(paths).toHaveLength(0);
  });

  it('应该处理格式异常的游戏ID', async () => {
    const malformedGames = [
      {
        id: 'malformed-id',
        slug: 'test',
        body: '',
        collection: 'games',
        data: { title: 'Test' },
        render: async () => ({ Content: () => '' })
      }
    ];

    const { getCollection } = await import('astro:content');
    (getCollection as jest.Mock).mockResolvedValueOnce(malformedGames);

    const result = await getLocalizedGameContent('test', 'en');
    expect(result).toBeNull();
  });
});