/**
 * 分页系统最终验证测试
 * 测试所有统一工具和分页逻辑的正确性
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  validateGameIdFormat,
  filterEnglishGames,
  calculatePagination,
  getPaginatedGames,
  validateGameData,
  getEnglishGamesPaginated,
  SUPPORTED_LANGUAGES
} from '../content';
import { PAGINATION_CONFIG } from '../../config/pagination';

// 模拟游戏数据
const mockGames = [
  {
    id: 'fiddlebops.md',
    data: {
      slug: 'fiddlebops',
      title: 'Fiddlebops',
      image: '/images/fiddlebops.jpg',
      category: 'popular',
      description: 'Music game'
    }
  },
  {
    id: 'zh-fiddlebops.md',
    data: {
      slug: 'zh-fiddlebops',
      title: 'Fiddlebops 中文版',
      image: '/images/zh-fiddlebops.jpg',
      category: 'popular',
      description: '音乐游戏'
    }
  },
  {
    id: 'sprunki-retake.md',
    data: {
      slug: 'sprunki-retake',
      title: 'Sprunki Retake',
      image: '/images/sprunki-retake.jpg',
      category: 'trending',
      description: 'Rhythm game'
    }
  },
  {
    id: 'es-sprunki-retake.md',
    data: {
      slug: 'es-sprunki-retake',
      title: 'Sprunki Retake Español',
      image: '/images/es-sprunki-retake.jpg',
      category: 'trending',
      description: 'Juego de ritmo'
    }
  }
];

// 生成大量测试数据用于分页测试
function generateMockGames(count: number) {
  const games = [];
  for (let i = 1; i <= count; i++) {
    games.push({
      id: `game-${i}.md`,
      data: {
        slug: `game-${i}`,
        title: `Game ${i}`,
        image: `/images/game-${i}.jpg`,
        category: i % 2 === 0 ? 'popular' : 'trending',
        description: `Test game ${i}`
      }
    });
  }
  return games;
}

describe('游戏ID格式验证', () => {
  it('应该正确验证英文游戏ID', () => {
    const result = validateGameIdFormat('fiddlebops.md');
    expect(result.isValid).toBe(true);
    expect(result.language).toBe('en');
    expect(result.baseName).toBe('fiddlebops');
  });

  it('应该正确验证多语言游戏ID', () => {
    const result = validateGameIdFormat('zh-fiddlebops.md');
    expect(result.isValid).toBe(true);
    expect(result.language).toBe('zh');
    expect(result.baseName).toBe('fiddlebops');
  });

  it('应该拒绝无效的语言代码', () => {
    const result = validateGameIdFormat('invalid-fiddlebops.md');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Unsupported language code');
  });

  it('应该拒绝无效的格式', () => {
    const result = validateGameIdFormat('Game_With_Invalid*Chars.md');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid game ID format');
  });
});

describe('英文游戏筛选', () => {
  it('应该只返回英文游戏', () => {
    const englishGames = filterEnglishGames(mockGames as any);
    expect(englishGames.length).toBe(2); // fiddlebops, sprunki-retake
    expect(englishGames.every(game => 
      !SUPPORTED_LANGUAGES.some(lang => game.id.startsWith(`${lang}-`))
    )).toBe(true);
  });

  it('应该过滤掉格式无效的游戏', () => {
    const invalidGames = [
      ...mockGames,
      {
        id: 'Invalid_Game.md',
        data: { slug: 'invalid', title: 'Invalid', image: '/invalid.jpg' }
      }
    ];
    
    const englishGames = filterEnglishGames(invalidGames as any);
    expect(englishGames.length).toBe(2); // 只有两个有效的英文游戏
  });
});

describe('统一分页计算', () => {
  it('应该正确计算基本分页信息', () => {
    const result = calculatePagination(100, 1, 30);
    expect(result.totalPages).toBe(4); // Math.ceil(100/30)
    expect(result.currentPage).toBe(1);
    expect(result.startIndex).toBe(0);
    expect(result.endIndex).toBe(30);
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPrevPage).toBe(false);
  });

  it('应该处理边界情况', () => {
    const result = calculatePagination(0, 1, 30);
    expect(result.totalPages).toBe(1);
    expect(result.isEmpty).toBe(true);
  });

  it('应该修正无效的页码', () => {
    const result = calculatePagination(100, 999, 30);
    expect(result.currentPage).toBe(4); // 最大页数
    expect(result.isValidPage).toBe(false); // 原始页码无效
  });

  it('应该使用默认配置', () => {
    const result = calculatePagination(100); // 使用默认值
    expect(result.totalPages).toBe(Math.ceil(100 / PAGINATION_CONFIG.GAMES_PER_PAGE));
  });
});

describe('分页游戏获取', () => {
  const testGames = generateMockGames(100);

  it('应该返回正确的分页数据', () => {
    const result = getPaginatedGames(testGames, 2, 20);
    expect(result.games.length).toBe(20);
    expect(result.currentPage).toBe(2);
    expect(result.startIndex).toBe(20);
    expect(result.endIndex).toBe(40);
  });

  it('应该处理最后一页的不完整数据', () => {
    const result = getPaginatedGames(testGames, 5, 30); // 第5页，每页30个
    expect(result.games.length).toBe(10); // 剩余10个
    expect(result.endIndex).toBe(100);
  });
});

describe('游戏数据验证', () => {
  it('应该验证有效的游戏数据', () => {
    const validGame = {
      data: {
        slug: 'test-game',
        title: 'Test Game',
        image: '/test.jpg'
      }
    };
    expect(validateGameData(validGame)).toBe(true);
  });

  it('应该拒绝无效的游戏数据', () => {
    const invalidGames = [
      null,
      {},
      { data: {} },
      { data: { slug: 'test' } }, // 缺少title和image
      { data: { slug: 'test', title: 'Test' } } // 缺少image
    ];

    invalidGames.forEach(game => {
      expect(validateGameData(game)).toBe(false);
    });
  });
});

describe('集成测试：完整分页流程', () => {
  it('应该完整处理分页请求', async () => {
    // 这个测试需要实际的Astro环境，这里模拟基本逻辑
    const testGames = generateMockGames(75);
    
    // 模拟分页逻辑
    const page1 = getPaginatedGames(testGames, 1);
    const page2 = getPaginatedGames(testGames, 2);
    const lastPage = getPaginatedGames(testGames, page1.totalPages);
    
    // 验证第一页
    expect(page1.currentPage).toBe(1);
    expect(page1.games.length).toBe(PAGINATION_CONFIG.GAMES_PER_PAGE);
    expect(page1.hasPrevPage).toBe(false);
    expect(page1.hasNextPage).toBe(true);
    
    // 验证第二页
    expect(page2.currentPage).toBe(2);
    expect(page2.hasPrevPage).toBe(true);
    
    // 验证最后一页
    expect(lastPage.hasNextPage).toBe(false);
    expect(lastPage.games.length).toBe(75 % PAGINATION_CONFIG.GAMES_PER_PAGE || PAGINATION_CONFIG.GAMES_PER_PAGE);
  });

  it('应该正确处理分类筛选和分页', () => {
    const testGames = generateMockGames(50);
    const popularGames = testGames.filter(game => game.data.category === 'popular');
    
    const result = getPaginatedGames(popularGames, 1);
    
    expect(result.games.every(game => game.data.category === 'popular')).toBe(true);
    expect(result.totalItems).toBe(popularGames.length);
  });
});

describe('错误处理和边缘情况', () => {
  it('应该处理空游戏列表', () => {
    const result = getPaginatedGames([], 1);
    expect(result.games.length).toBe(0);
    expect(result.isEmpty).toBe(true);
    expect(result.totalPages).toBe(1);
  });

  it('应该处理负数页码', () => {
    const result = calculatePagination(100, -5);
    expect(result.currentPage).toBe(1); // 修正为最小值
  });

  it('应该处理非整数输入', () => {
    const result = calculatePagination(100.7, 2.3);
    expect(result.totalItems).toBe(100); // 向下取整
    expect(result.currentPage).toBe(2); // 向下取整
  });
});

describe('配置一致性', () => {
  it('应该使用统一的分页配置', () => {
    const result = calculatePagination(100);
    expect(result.totalPages).toBe(Math.ceil(100 / PAGINATION_CONFIG.GAMES_PER_PAGE));
  });

  it('应该支持所有定义的语言', () => {
    SUPPORTED_LANGUAGES.forEach(lang => {
      const result = validateGameIdFormat(`${lang}-test-game.md`);
      expect(result.isValid).toBe(true);
      expect(result.language).toBe(lang);
    });
  });
});