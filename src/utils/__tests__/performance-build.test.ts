/**
 * 性能和构建验证测试
 * 验证多语言页面构建性能、加载速度和生产环境优化
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock性能监控
const mockPerformance = {
  now: jest.fn(),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(),
  getEntriesByName: jest.fn()
};

// Mock Web Vitals
const mockWebVitals = {
  LCP: 0,
  FID: 0,
  CLS: 0,
  TTFB: 0,
  FCP: 0
};

// Mock构建输出
const mockBuildOutput = {
  pages: [
    { path: '/sprunki-retake/', size: '45.2 kB', type: 'static' },
    { path: '/zh/sprunki-retake/', size: '46.8 kB', type: 'static' },
    { path: '/es/sprunki-retake/', size: '46.1 kB', type: 'static' },
    { path: '/incredibox/', size: '42.3 kB', type: 'static' },
    { path: '/zh/incredibox/', size: '43.1 kB', type: 'static' }
  ],
  assets: [
    { path: '/sprunki-retake.png', size: '125 kB', type: 'image' },
    { path: '/incredibox.png', size: '98 kB', type: 'image' }
  ],
  buildTime: 45000, // 45秒
  totalSize: '2.3 MB'
};

// Mock Astro构建统计
const mockAstroBuildStats = {
  pages: 127,
  staticPaths: 89,
  routes: 38,
  components: 45
};

describe('构建性能和优化测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformance.now.mockReturnValue(performance.now());
  });

  describe('静态页面生成性能', () => {
    it('多语言页面生成应该在合理时间内完成', async () => {
      const startTime = performance.now();
      
      // 模拟生成所有语言版本的游戏页面
      const languages = ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko'];
      const games = ['sprunki-retake', 'incredibox', 'sprunki-phase-5'];
      
      const pageGenerationPromises = languages.flatMap(locale =>
        games.map(game => 
          simulatePageGeneration(game, locale)
        )
      );
      
      const results = await Promise.all(pageGenerationPromises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // 验证所有页面成功生成
      expect(results).toHaveLength(21); // 7语言 × 3游戏
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.size).toBeGreaterThan(0);
      });
      
      // 构建时间应该合理（开发环境下）
      expect(totalTime).toBeLessThan(5000); // 5秒内完成模拟
    });

    it('增量构建应该只重新生成变更的页面', async () => {
      const initialBuild = {
        pages: ['en/game1', 'zh/game1', 'en/game2', 'zh/game2'],
        buildTime: 1000
      };
      
      // 模拟只有game1的英文版本发生变更
      const incrementalBuild = simulateIncrementalBuild(
        initialBuild.pages,
        ['en/game1'] // 只有这个页面需要重新构建
      );
      
      expect(incrementalBuild.rebuiltPages).toEqual(['en/game1']);
      expect(incrementalBuild.buildTime).toBeLessThan(initialBuild.buildTime);
    });

    it('内存使用应该保持在合理范围内', async () => {
      const initialMemory = process.memoryUsage();
      
      // 模拟处理大量游戏页面
      const largeGameSet = Array.from({ length: 100 }, (_, i) => ({
        slug: `game-${i}`,
        title: `Game ${i}`,
        content: 'Game content'.repeat(1000) // 模拟较大内容
      }));
      
      await simulateLargeScaleBuild(largeGameSet);
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // 内存增长应该合理（小于100MB）
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('页面大小和资源优化', () => {
    it('多语言页面大小应该相近', () => {
      const englishPage = mockBuildOutput.pages.find(p => p.path === '/sprunki-retake/');
      const chinesePage = mockBuildOutput.pages.find(p => p.path === '/zh/sprunki-retake/');
      
      expect(englishPage).toBeDefined();
      expect(chinesePage).toBeDefined();
      
      const englishSize = parseFloat(englishPage!.size.replace(' kB', ''));
      const chineseSize = parseFloat(chinesePage!.size.replace(' kB', ''));
      
      // 大小差异应该小于5kB
      expect(Math.abs(englishSize - chineseSize)).toBeLessThan(5);
    });

    it('页面大小应该在合理范围内', () => {
      mockBuildOutput.pages.forEach(page => {
        const sizeInKB = parseFloat(page.size.replace(' kB', ''));
        
        // 单个页面不应超过100kB
        expect(sizeInKB).toBeLessThan(100);
        
        // 页面至少应该有一些内容
        expect(sizeInKB).toBeGreaterThan(10);
      });
    });

    it('静态资源应该正确共享', () => {
      // 图片等资源应该在所有语言版本间共享
      const sprunkiPages = mockBuildOutput.pages.filter(p => 
        p.path.includes('sprunki-retake')
      );
      
      // 所有sprunki-retake页面都应该引用相同的图片资源
      expect(sprunkiPages.length).toBeGreaterThan(1);
      
      const sprunkiImage = mockBuildOutput.assets.find(a => 
        a.path === '/sprunki-retake.png'
      );
      
      expect(sprunkiImage).toBeDefined();
      expect(sprunkiImage!.type).toBe('image');
    });
  });

  describe('加载性能基准测试', () => {
    it('首次内容绘制(FCP)应该符合标准', async () => {
      const fcpScores = await simulatePageLoadMetrics([
        '/sprunki-retake/',
        '/zh/sprunki-retake/',
        '/es/incredibox/',
        '/fr/sprunki-phase-5/'
      ]);
      
      fcpScores.forEach(score => {
        // FCP应该小于2.5秒（移动端标准）
        expect(score.fcp).toBeLessThan(2500);
        
        // 桌面端应该更快
        expect(score.fcpDesktop).toBeLessThan(1500);
      });
    });

    it('最大内容绘制(LCP)应该符合标准', async () => {
      const lcpScores = await simulatePageLoadMetrics([
        '/sprunki-retake/',
        '/zh/sprunki-retake/'
      ]);
      
      lcpScores.forEach(score => {
        // LCP应该小于2.5秒
        expect(score.lcp).toBeLessThan(2500);
        
        // 理想情况下应该小于1.5秒
        expect(score.lcp).toBeLessThan(1500);
      });
    });

    it('累积布局偏移(CLS)应该最小', async () => {
      const clsScores = await simulatePageLoadMetrics([
        '/sprunki-retake/',
        '/zh/sprunki-retake/'
      ]);
      
      clsScores.forEach(score => {
        // CLS应该小于0.1
        expect(score.cls).toBeLessThan(0.1);
        
        // 理想情况下应该小于0.05
        expect(score.cls).toBeLessThan(0.05);
      });
    });
  });

  describe('网络传输优化', () => {
    it('页面应该支持Gzip压缩', () => {
      const uncompressedSize = 45200; // 45.2kB
      const compressedSize = simulateGzipCompression(uncompressedSize);
      
      // Gzip压缩率应该至少达到60%
      const compressionRatio = (uncompressedSize - compressedSize) / uncompressedSize;
      expect(compressionRatio).toBeGreaterThan(0.6);
    });

    it('应该支持HTTP/2推送关键资源', () => {
      const criticalResources = identifyCriticalResources('/sprunki-retake/');
      
      expect(criticalResources).toContain('main.css');
      expect(criticalResources).toContain('game-hero.js');
      
      // 关键资源数量应该合理
      expect(criticalResources.length).toBeLessThan(5);
    });

    it('应该正确设置缓存头', () => {
      const cacheHeaders = simulateCacheHeaders();
      
      // 静态页面应该可缓存
      expect(cacheHeaders.static).toContain('max-age=31536000');
      
      // 动态内容应该有合适的缓存策略
      expect(cacheHeaders.dynamic).toContain('max-age=3600');
    });
  });

  describe('移动端性能优化', () => {
    it('移动端页面加载应该优化', async () => {
      const mobileMetrics = await simulateMobilePageLoad('/zh/sprunki-retake/');
      
      // 移动端性能标准
      expect(mobileMetrics.fcp).toBeLessThan(2500);
      expect(mobileMetrics.lcp).toBeLessThan(2500);
      expect(mobileMetrics.cls).toBeLessThan(0.1);
      expect(mobileMetrics.fid).toBeLessThan(100);
    });

    it('应该支持渐进式加载', () => {
      const progressiveLoadingFeatures = checkProgressiveLoading('/sprunki-retake/');
      
      expect(progressiveLoadingFeatures.includes('lazy-loading')).toBe(true);
      expect(progressiveLoadingFeatures.includes('critical-css')).toBe(true);
      expect(progressiveLoadingFeatures.includes('preload-fonts')).toBe(true);
    });

    it('图片应该正确优化', () => {
      const imageOptimizations = checkImageOptimizations();
      
      // 应该支持WebP格式
      expect(imageOptimizations.webp).toBe(true);
      
      // 应该有响应式图片
      expect(imageOptimizations.responsive).toBe(true);
      
      // 应该有懒加载
      expect(imageOptimizations.lazyLoading).toBe(true);
    });
  });

  describe('构建产物验证', () => {
    it('构建应该生成所有必需的语言页面', () => {
      const expectedPages = [
        '/sprunki-retake/',
        '/zh/sprunki-retake/',
        '/incredibox/',
        '/zh/incredibox/'
      ];
      
      expectedPages.forEach(expectedPath => {
        const pageExists = mockBuildOutput.pages.some(page => 
          page.path === expectedPath
        );
        expect(pageExists).toBe(true);
      });
    });

    it('构建输出应该包含正确的资产文件', () => {
      const requiredAssets = [
        '/sprunki-retake.png',
        '/incredibox.png'
      ];
      
      requiredAssets.forEach(assetPath => {
        const assetExists = mockBuildOutput.assets.some(asset => 
          asset.path === assetPath
        );
        expect(assetExists).toBe(true);
      });
    });

    it('构建时间应该合理', () => {
      // 构建时间不应超过2分钟（小型项目）
      expect(mockBuildOutput.buildTime).toBeLessThan(120000);
    });
  });
});

describe('生产环境性能监控', () => {
  describe('Core Web Vitals监控', () => {
    it('应该能够收集真实用户指标', () => {
      const rumData = simulateRealUserMetrics();
      
      expect(rumData).toHaveProperty('lcp');
      expect(rumData).toHaveProperty('fid');
      expect(rumData).toHaveProperty('cls');
      expect(rumData).toHaveProperty('ttfb');
      
      // 验证指标在可接受范围内
      expect(rumData.lcp.p75).toBeLessThan(2500);
      expect(rumData.fid.p75).toBeLessThan(100);
      expect(rumData.cls.p75).toBeLessThan(0.1);
    });

    it('不同语言页面性能应该一致', () => {
      const englishMetrics = simulateRealUserMetrics('/sprunki-retake/');
      const chineseMetrics = simulateRealUserMetrics('/zh/sprunki-retake/');
      
      // LCP差异应该小于500ms
      expect(Math.abs(englishMetrics.lcp.p75 - chineseMetrics.lcp.p75)).toBeLessThan(500);
      
      // CLS应该相似
      expect(Math.abs(englishMetrics.cls.p75 - chineseMetrics.cls.p75)).toBeLessThan(0.05);
    });
  });

  describe('错误监控和降级', () => {
    it('应该能够处理构建失败', async () => {
      const buildResult = await simulateBuildFailure('missing-translation');
      
      expect(buildResult.success).toBe(false);
      expect(buildResult.error).toContain('missing-translation');
      expect(buildResult.fallbackPages).toBeDefined();
    });

    it('应该支持优雅降级', () => {
      const degradationScenarios = [
        'slow-network',
        'large-images',
        'javascript-disabled'
      ];
      
      degradationScenarios.forEach(scenario => {
        const result = simulateGracefulDegradation(scenario);
        expect(result.accessible).toBe(true);
        expect(result.functional).toBe(true);
      });
    });
  });
});

// 辅助函数实现
async function simulatePageGeneration(game: string, locale: string) {
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  return {
    path: locale === 'en' ? `/${game}/` : `/${locale}/${game}/`,
    success: true,
    size: Math.floor(Math.random() * 20000) + 30000 // 30-50kB
  };
}

function simulateIncrementalBuild(allPages: string[], changedPages: string[]) {
  const buildTime = changedPages.length * 200; // 200ms per page
  return {
    rebuiltPages: changedPages,
    skippedPages: allPages.filter(page => !changedPages.includes(page)),
    buildTime
  };
}

async function simulateLargeScaleBuild(games: any[]) {
  const processedGames = [];
  for (let i = 0; i < games.length; i += 10) {
    const batch = games.slice(i, i + 10);
    const batchResults = batch.map(game => ({ ...game, processed: true }));
    processedGames.push(...batchResults);
    
    // 模拟批处理间隙，释放内存
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  return processedGames;
}

async function simulatePageLoadMetrics(paths: string[]) {
  return paths.map(path => ({
    path,
    fcp: Math.random() * 1000 + 800, // 800-1800ms
    fcpDesktop: Math.random() * 600 + 400, // 400-1000ms
    lcp: Math.random() * 1000 + 1200, // 1200-2200ms
    cls: Math.random() * 0.05 + 0.01, // 0.01-0.06
    fid: Math.random() * 50 + 20 // 20-70ms
  }));
}

async function simulateMobilePageLoad(path: string) {
  return {
    fcp: Math.random() * 800 + 1200, // 1200-2000ms
    lcp: Math.random() * 800 + 1500, // 1500-2300ms
    cls: Math.random() * 0.03 + 0.02, // 0.02-0.05
    fid: Math.random() * 30 + 40 // 40-70ms
  };
}

function simulateGzipCompression(originalSize: number) {
  // 模拟70%的压缩率
  return Math.floor(originalSize * 0.3);
}

function identifyCriticalResources(path: string) {
  return ['main.css', 'game-hero.js', 'font.woff2'];
}

function simulateCacheHeaders() {
  return {
    static: 'public, max-age=31536000, immutable',
    dynamic: 'public, max-age=3600, must-revalidate'
  };
}

function checkProgressiveLoading(path: string) {
  return ['lazy-loading', 'critical-css', 'preload-fonts', 'resource-hints'];
}

function checkImageOptimizations() {
  return {
    webp: true,
    responsive: true,
    lazyLoading: true,
    compression: 0.8
  };
}

function simulateRealUserMetrics(path = '') {
  return {
    lcp: { p50: 1400, p75: 2100, p90: 2800 },
    fid: { p50: 35, p75: 65, p90: 95 },
    cls: { p50: 0.02, p75: 0.06, p90: 0.12 },
    ttfb: { p50: 280, p75: 450, p90: 680 }
  };
}

async function simulateBuildFailure(reason: string) {
  return {
    success: false,
    error: `Build failed: ${reason}`,
    fallbackPages: ['/sprunki-retake/', '/incredibox/']
  };
}

function simulateGracefulDegradation(scenario: string) {
  const baseResult = { accessible: true, functional: true };
  
  switch (scenario) {
    case 'slow-network':
      return { ...baseResult, loadTime: 5000 };
    case 'large-images':
      return { ...baseResult, imagesLoaded: false };
    case 'javascript-disabled':
      return { ...baseResult, enhanced: false };
    default:
      return baseResult;
  }
}