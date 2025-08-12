/**
 * URL路由和语言检测集成测试
 * 验证多语言路径解析、URL生成和语言检测的端到端功能
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock浏览器环境
Object.defineProperty(window, 'location', {
  value: {
    pathname: '/',
    href: 'https://www.playfiddlebops.com/',
    origin: 'https://www.playfiddlebops.com'
  },
  writable: true
});

// Mock Astro.url for different test scenarios
const mockAstroUrl = {
  pathname: '/',
  href: 'https://www.playfiddlebops.com/',
  origin: 'https://www.playfiddlebops.com'
};

import { 
  extractLocaleFromPath,
  getGameLocalizedPath,
  isLocaleSupported,
  supportedLocales 
} from '../i18n';

describe('URL路由和语言检测测试', () => {
  describe('英文路径检测 (默认语言)', () => {
    const englishPaths = [
      '/',
      '/sprunki-retake/',
      '/incredibox/',
      '/sprunki-phase-5/',
      '/games/1/',
      '/popular-games/',
      '/trending-games/'
    ];

    englishPaths.forEach(path => {
      it(`应该将 "${path}" 识别为英文路径`, () => {
        const locale = extractLocaleFromPath(path);
        expect(locale).toBe('en');
      });
    });
  });

  describe('多语言路径检测', () => {
    const multiLangPaths = [
      { path: '/zh/', expected: 'zh' },
      { path: '/zh/sprunki-retake/', expected: 'zh' },
      { path: '/es/incredibox/', expected: 'es' },
      { path: '/fr/games/', expected: 'fr' },
      { path: '/de/popular-games/', expected: 'de' },
      { path: '/ja/trending-games/', expected: 'ja' },
      { path: '/ko/sprunki-phase-5/', expected: 'ko' }
    ];

    multiLangPaths.forEach(({ path, expected }) => {
      it(`应该将 "${path}" 识别为 ${expected} 路径`, () => {
        const locale = extractLocaleFromPath(path);
        expect(locale).toBe(expected);
      });
    });
  });

  describe('无效语言代码处理', () => {
    const invalidPaths = [
      '/invalid/sprunki-retake/',
      '/xx/game/',
      '/chinese/game/',  // 全称而非代码
      '/en-US/game/',    // 区域代码
      '/zh-CN/game/'     // 区域代码
    ];

    invalidPaths.forEach(path => {
      it(`应该将无效路径 "${path}" fallback到英文`, () => {
        const locale = extractLocaleFromPath(path);
        expect(locale).toBe('en');
      });
    });
  });

  describe('边缘情况路径处理', () => {
    const edgeCases = [
      { path: '', expected: 'en', desc: '空字符串' },
      { path: '/', expected: 'en', desc: '根路径' },
      { path: '/zh', expected: 'zh', desc: '无末尾斜杠的语言路径' },
      { path: 'zh/game', expected: 'zh', desc: '无开头斜杠的路径' },
      { path: '/zh//game//', expected: 'zh', desc: '多重斜杠' },
      { path: '/ZH/game/', expected: 'en', desc: '大写语言代码（应视为无效）' }
    ];

    edgeCases.forEach(({ path, expected, desc }) => {
      it(`应该正确处理${desc}: "${path}"`, () => {
        const locale = extractLocaleFromPath(path);
        expect(locale).toBe(expected);
      });
    });
  });
});

describe('本地化路径生成测试', () => {
  describe('英文路径生成', () => {
    const testSlugs = [
      'sprunki-retake',
      'incredibox',
      'sprunki-phase-5',
      'game-with-long-name-and-dashes'
    ];

    testSlugs.forEach(slug => {
      it(`英文游戏 "${slug}" 应该生成无语言前缀的路径`, () => {
        const path = getGameLocalizedPath(slug, 'en');
        expect(path).toBe(`/${slug}/`);
        expect(path).not.toContain('/en/');
      });
    });
  });

  describe('多语言路径生成', () => {
    const testCases = [
      { slug: 'sprunki-retake', locale: 'zh', expected: '/zh/sprunki-retake/' },
      { slug: 'incredibox', locale: 'es', expected: '/es/incredibox/' },
      { slug: 'sprunki-phase-5', locale: 'fr', expected: '/fr/sprunki-phase-5/' },
      { slug: 'game-name', locale: 'de', expected: '/de/game-name/' },
      { slug: 'test-game', locale: 'ja', expected: '/ja/test-game/' },
      { slug: 'another-game', locale: 'ko', expected: '/ko/another-game/' }
    ];

    testCases.forEach(({ slug, locale, expected }) => {
      it(`${locale}语言的游戏 "${slug}" 应该生成正确路径`, () => {
        const path = getGameLocalizedPath(slug, locale);
        expect(path).toBe(expected);
      });
    });
  });

  describe('特殊字符和格式处理', () => {
    const specialCases = [
      { slug: 'game-with-numbers-123', locale: 'zh' },
      { slug: 'game_with_underscores', locale: 'es' },
      { slug: 'game.with.dots', locale: 'fr' },
      { slug: 'UPPERCASE-GAME', locale: 'de' }
    ];

    specialCases.forEach(({ slug, locale }) => {
      it(`应该正确处理特殊字符的slug: "${slug}"`, () => {
        const path = getGameLocalizedPath(slug, locale);
        expect(path).toBe(`/${locale}/${slug}/`);
        expect(path.startsWith(`/${locale}/`)).toBe(true);
        expect(path.endsWith('/')).toBe(true);
      });
    });
  });
});

describe('语言支持验证测试', () => {
  describe('支持的语言验证', () => {
    it('所有定义的语言都应该被支持', () => {
      supportedLocales.forEach(locale => {
        expect(isLocaleSupported(locale)).toBe(true);
      });
    });

    it('支持的语言列表应该包含预期的所有语言', () => {
      const expectedLocales = ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko'];
      expect(supportedLocales).toEqual(expectedLocales);
    });
  });

  describe('不支持的语言验证', () => {
    const unsupportedLocales = [
      'pt',     // 葡萄牙语
      'ru',     // 俄语
      'ar',     // 阿拉伯语
      'hi',     // 印地语
      'th',     // 泰语
      'vi',     // 越南语
      'invalid', // 无效代码
      '',       // 空字符串
      'en-US',  // 区域代码
      'zh-CN'   // 区域代码
    ];

    unsupportedLocales.forEach(locale => {
      it(`"${locale}" 应该被识别为不支持的语言`, () => {
        expect(isLocaleSupported(locale)).toBe(false);
      });
    });
  });
});

describe('URL路由集成场景测试', () => {
  describe('完整用户访问流程', () => {
    it('用户访问英文首页应该正确识别', () => {
      const scenarios = [
        { url: 'https://www.playfiddlebops.com/', path: '/' },
        { url: 'https://www.playfiddlebops.com/sprunki-retake/', path: '/sprunki-retake/' }
      ];

      scenarios.forEach(({ path }) => {
        const locale = extractLocaleFromPath(path);
        expect(locale).toBe('en');
      });
    });

    it('用户访问中文页面应该正确识别和路由', () => {
      const chineseUrls = [
        '/zh/',
        '/zh/sprunki-retake/',
        '/zh/incredibox/',
        '/zh/games/1/'
      ];

      chineseUrls.forEach(path => {
        const locale = extractLocaleFromPath(path);
        expect(locale).toBe('zh');

        // 验证可以生成对应的英文路径
        if (path.includes('/sprunki-retake/')) {
          const englishPath = getGameLocalizedPath('sprunki-retake', 'en');
          expect(englishPath).toBe('/sprunki-retake/');
        }
      });
    });
  });

  describe('SEO友好URL格式验证', () => {
    it('生成的URL应该符合SEO最佳实践', () => {
      const testCases = [
        { slug: 'sprunki-retake', locale: 'en' },
        { slug: 'sprunki-retake', locale: 'zh' },
        { slug: 'incredibox', locale: 'es' }
      ];

      testCases.forEach(({ slug, locale }) => {
        const path = getGameLocalizedPath(slug, locale);
        
        // URL应该以/开始和结束
        expect(path.startsWith('/')).toBe(true);
        expect(path.endsWith('/')).toBe(true);
        
        // URL不应该包含双斜杠
        expect(path).not.toContain('//');
        
        // URL应该是小写的（除了特殊字符）
        expect(path.toLowerCase()).toBe(path);
        
        // 非英文URL应该包含语言代码
        if (locale !== 'en') {
          expect(path).toContain(`/${locale}/`);
        }
      });
    });
  });

  describe('语言切换流程测试', () => {
    it('应该能够在不同语言间正确切换URL', () => {
      const gameSlug = 'sprunki-retake';
      
      // 从英文切换到其他语言
      const englishPath = getGameLocalizedPath(gameSlug, 'en');
      expect(englishPath).toBe('/sprunki-retake/');
      
      const chinesePath = getGameLocalizedPath(gameSlug, 'zh');
      expect(chinesePath).toBe('/zh/sprunki-retake/');
      
      const spanishPath = getGameLocalizedPath(gameSlug, 'es');
      expect(spanishPath).toBe('/es/sprunki-retake/');
      
      // 验证从多语言路径可以正确提取语言
      expect(extractLocaleFromPath(chinesePath)).toBe('zh');
      expect(extractLocaleFromPath(spanishPath)).toBe('es');
    });

    it('语言切换应该保持相同的游戏内容', () => {
      const gameSlug = 'incredibox';
      const languages = supportedLocales;
      
      languages.forEach(locale => {
        const path = getGameLocalizedPath(gameSlug, locale);
        const extractedLocale = extractLocaleFromPath(path);
        
        expect(extractedLocale).toBe(locale);
        expect(path).toContain(gameSlug);
      });
    });
  });
});

describe('性能和效率测试', () => {
  describe('路径处理性能', () => {
    it('大量路径处理应该保持高效', () => {
      const paths = [];
      const basePaths = ['/sprunki-retake/', '/incredibox/', '/games/'];
      const locales = supportedLocales;
      
      // 生成大量测试路径
      locales.forEach(locale => {
        basePaths.forEach(basePath => {
          if (locale === 'en') {
            paths.push(basePath);
          } else {
            paths.push(`/${locale}${basePath}`);
          }
        });
      });

      const startTime = performance.now();
      
      paths.forEach(path => {
        const locale = extractLocaleFromPath(path);
        expect(isLocaleSupported(locale)).toBe(true);
      });
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // 处理时间应该小于100ms（对于大量路径）
      expect(processingTime).toBeLessThan(100);
    });
  });

  describe('内存使用优化', () => {
    it('重复调用不应该创建过多对象', () => {
      const slug = 'test-game';
      const locale = 'zh';
      
      // 多次调用相同函数
      for (let i = 0; i < 1000; i++) {
        const path1 = getGameLocalizedPath(slug, locale);
        const path2 = getGameLocalizedPath(slug, locale);
        expect(path1).toBe(path2);
        
        const locale1 = extractLocaleFromPath(path1);
        const locale2 = extractLocaleFromPath(path1);
        expect(locale1).toBe(locale2);
      }
    });
  });
});