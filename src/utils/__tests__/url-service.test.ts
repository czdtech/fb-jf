/**
 * UrlService 完整测试套件
 * 涵盖所有核心功能和边界条件
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  UrlService,
  type GameUrlData,
  type UrlGenerationOptions,
  validateGameData,
  generateGameUrl,
} from "../url-service";

// 模拟 i18n 工具函数
jest.mock("../i18n", () => ({
  extractBaseSlug: jest.fn((slug: string) => {
    if (!slug) return "";
    const match = slug.match(/^(zh|es|fr|de|ja|ko)-(.+)$/);
    return match ? match[2] : slug;
  }),
  getGameLocalizedPath: jest.fn((baseSlug: string, locale: string) => {
    return locale === "en" ? `/${baseSlug}/` : `/${locale}/${baseSlug}/`;
  }),
}));

describe("UrlService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("normalizeGameData", () => {
    it("应该正确标准化基本游戏数据", () => {
      const game = {
        slug: "test-game",
        title: "Test Game",
        id: "test-id",
      };

      const result = UrlService.normalizeGameData(game);

      expect(result).toEqual({
        baseSlug: "test-game",
        directUrl: undefined,
        title: "Test Game",
        id: "test-id",
      });
    });

    it("应该处理嵌套的data属性", () => {
      const game = {
        data: {
          slug: "nested-game",
          title: "Nested Game",
          url: "https://external.com",
        },
        id: "nested-id",
      };

      const result = UrlService.normalizeGameData(game);

      expect(result).toEqual({
        baseSlug: "nested-game",
        directUrl: "https://external.com",
        title: "Nested Game",
        id: "nested-id",
      });
    });

    it("应该处理空值和undefined输入", () => {
      const testCases = [null, undefined, {}, { id: null }, { slug: "" }];

      testCases.forEach((testCase) => {
        const result = UrlService.normalizeGameData(testCase);
        expect(result.baseSlug).toBeDefined();
        expect(result.title).toBeDefined();
        expect(result.id).toBeDefined();
      });
    });

    it("应该优先使用slug而非id", () => {
      const game = {
        slug: "primary-slug",
        id: "fallback-id.md",
        title: "Priority Test",
      };

      const result = UrlService.normalizeGameData(game);
      expect(result.baseSlug).toBe("primary-slug");
    });

    it("应该移除.md扩展名", () => {
      const game = {
        id: "game-file.md",
      };

      const result = UrlService.normalizeGameData(game);
      expect(result.baseSlug).toBe("game-file");
    });

    it("应该过滤非外部URL的directUrl", () => {
      const testCases = [
        { url: "/local/path", expected: undefined },
        { url: "relative/path", expected: undefined },
        { url: "https://external.com", expected: "https://external.com" },
        { url: "http://external.com", expected: "http://external.com" },
      ];

      testCases.forEach(({ url, expected }) => {
        const game = { slug: "test", url };
        const result = UrlService.normalizeGameData(game);
        expect(result.directUrl).toBe(expected);
      });
    });

    it("应该提供默认值", () => {
      const game = {};
      const result = UrlService.normalizeGameData(game);

      expect(result.baseSlug).toBe("unknown-game"); // 空对象会返回默认的 unknown-game
      expect(result.title).toBe("Untitled Game");
      expect(result.id).toBe("unknown");
    });
  });

  describe("generateGameUrl", () => {
    const baseGameData: GameUrlData = {
      baseSlug: "test-game",
      title: "Test Game",
      id: "test-id",
    };

    it("应该生成基本的本地化URL", () => {
      const options: UrlGenerationOptions = { locale: "en" };
      const result = UrlService.generateGameUrl(baseGameData, options);

      expect(result).toEqual({
        url: "/test-game/",
        isExternal: false,
        isLocalized: false,
        baseSlug: "test-game",
      });
    });

    it("应该生成多语言URL", () => {
      const options: UrlGenerationOptions = { locale: "zh" };
      const result = UrlService.generateGameUrl(baseGameData, options);

      expect(result).toEqual({
        url: "/zh/test-game/",
        isExternal: false,
        isLocalized: true,
        baseSlug: "test-game",
      });
    });

    it("应该优先使用directUrl", () => {
      const gameWithDirectUrl: GameUrlData = {
        ...baseGameData,
        directUrl: "https://external.com/game",
      };

      const options: UrlGenerationOptions = { locale: "en" };
      const result = UrlService.generateGameUrl(gameWithDirectUrl, options);

      expect(result).toEqual({
        url: "https://external.com/game",
        isExternal: true,
        isLocalized: false,
        baseSlug: "test-game",
      });
    });

    it("应该强制使用本地路径", () => {
      const gameWithDirectUrl: GameUrlData = {
        ...baseGameData,
        directUrl: "https://external.com/game",
      };

      const options: UrlGenerationOptions = {
        locale: "en",
        forceLocalPath: true,
      };
      const result = UrlService.generateGameUrl(gameWithDirectUrl, options);

      expect(result.isExternal).toBe(false);
      expect(result.url).toBe("/test-game/");
    });

    it("应该生成绝对URL", () => {
      const options: UrlGenerationOptions = {
        locale: "en",
        absolute: true,
        siteUrl: "https://example.com",
      };
      const result = UrlService.generateGameUrl(baseGameData, options);

      expect(result.url).toBe("https://example.com/test-game/");
    });

    it("应该处理siteUrl的尾部斜杠", () => {
      const options: UrlGenerationOptions = {
        locale: "en",
        absolute: true,
        siteUrl: "https://example.com/",
      };
      const result = UrlService.generateGameUrl(baseGameData, options);

      expect(result.url).toBe("https://example.com/test-game/");
    });
  });

  describe("generateFromGame", () => {
    it("应该自动标准化并生成URL", () => {
      const rawGame = {
        slug: "raw-game",
        title: "Raw Game",
      };

      const result = UrlService.generateFromGame(rawGame, "en");

      expect(result.url).toBe("/raw-game/");
      expect(result.baseSlug).toBe("raw-game");
    });

    it("应该支持部分选项", () => {
      const rawGame = {
        slug: "partial-game",
        url: "https://external.com",
      };

      const result = UrlService.generateFromGame(rawGame, "en", {
        forceLocalPath: true,
      });

      expect(result.isExternal).toBe(false);
    });
  });

  describe("getGameUrl", () => {
    it("应该返回简单的URL字符串", () => {
      const game = { slug: "simple-game" };
      const url = UrlService.getGameUrl(game, "zh");

      expect(typeof url).toBe("string");
      expect(url).toBe("/zh/simple-game/");
    });
  });

  describe("generateBatchUrls", () => {
    const games = [
      { slug: "game-1", title: "Game 1" },
      { slug: "game-2", title: "Game 2", url: "https://external.com" },
      { slug: "game-3", title: "Game 3" },
    ];

    it("应该批量生成URL", () => {
      const result = UrlService.generateBatchUrls(games, "en");

      expect(result).toHaveLength(3);
      expect(result[0].url.url).toBe("/game-1/");
      expect(result[1].url.isExternal).toBe(true);
      expect(result[2].url.url).toBe("/game-3/");
    });

    it("应该保持游戏和URL的对应关系", () => {
      const result = UrlService.generateBatchUrls(games, "en");

      result.forEach((item, index) => {
        expect(item.game).toBe(games[index]);
      });
    });

    it("应该支持批量选项", () => {
      const result = UrlService.generateBatchUrls(games, "zh", {
        forceLocalPath: true,
      });

      // 所有URL都应该是本地路径
      result.forEach((item) => {
        expect(item.url.isExternal).toBe(false);
      });
    });

    it("应该处理空数组", () => {
      const result = UrlService.generateBatchUrls([], "en");
      expect(result).toEqual([]);
    });
  });

  describe("性能和缓存", () => {
    it("应该高效处理大量游戏", () => {
      const largeGameList = Array.from({ length: 1000 }, (_, i) => ({
        slug: `game-${i}`,
        title: `Game ${i}`,
      }));

      const startTime = Date.now();
      const result = UrlService.generateBatchUrls(largeGameList, "en");
      const endTime = Date.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });

    it("多次调用应该返回一致结果", () => {
      const game = { slug: "consistency-test" };

      const result1 = UrlService.getGameUrl(game, "en");
      const result2 = UrlService.getGameUrl(game, "en");
      const result3 = UrlService.getGameUrl(game, "en");

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });

  describe("错误处理和边界条件", () => {
    it("应该处理损坏的游戏数据", () => {
      const corruptedGames = [
        { slug: null },
        { title: undefined },
        { url: "invalid-url" },
        { nested: { deeply: { invalid: true } } },
      ];

      corruptedGames.forEach((game) => {
        expect(() => {
          UrlService.generateFromGame(game, "en");
        }).not.toThrow();
      });
    });

    it("应该处理极端的locale值", () => {
      const game = { slug: "test" };
      const extremeLocales = ["", "invalid-locale", "zh-CN-Hans", "123"];

      extremeLocales.forEach((locale) => {
        expect(() => {
          UrlService.getGameUrl(game, locale);
        }).not.toThrow();
      });
    });

    it("应该处理循环引用", () => {
      const circularGame: any = { slug: "circular" };
      circularGame.self = circularGame;

      expect(() => {
        UrlService.normalizeGameData(circularGame);
      }).not.toThrow();
    });
  });
});

describe("validateGameData", () => {
  it("应该验证有效的游戏数据", () => {
    const validGame = {
      slug: "valid-game",
      title: "Valid Game",
    };

    const result = validateGameData(validGame);
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("应该检测缺失的必需字段", () => {
    const invalidGame = {};

    const result = validateGameData(invalidGame);
    expect(result.isValid).toBe(false);
    expect(result.issues).toContain(
      "Missing baseSlug - no slug, data.slug, or id found",
    );
  });

  it("应该验证外部URL格式", () => {
    const gameWithInvalidUrl = {
      slug: "test",
      title: "Test",
      url: "/local/path",
    };

    const result = validateGameData(gameWithInvalidUrl);
    expect(result.isValid).toBe(true); // 本地路径是有效的，只是不会被作为directUrl
    expect(result.issues).toHaveLength(0);
  });

  it("应该处理null输入", () => {
    const result = validateGameData(null);
    expect(result.isValid).toBe(false);
    expect(result.issues).toContain("Game object is null or undefined");
  });
});

describe("兼容性", () => {
  it("兼容性函数应该正常工作", () => {
    const game = { slug: "compat-test" };
    const result = generateGameUrl(game, "en");

    expect(typeof result).toBe("string");
    expect(result).toBe("/compat-test/");
  });
});

describe("类型安全", () => {
  it("应该确保类型安全的接口契约", () => {
    const gameData: GameUrlData = {
      baseSlug: "typed-game",
      title: "Typed Game",
      id: "typed-id",
    };

    const options: UrlGenerationOptions = {
      locale: "en",
      forceLocalPath: false,
      absolute: true,
      siteUrl: "https://example.com",
    };

    const result = UrlService.generateGameUrl(gameData, options);

    // TypeScript编译时验证
    expect(result.url).toBeDefined();
    expect(result.isExternal).toBeDefined();
    expect(result.isLocalized).toBeDefined();
    expect(result.baseSlug).toBeDefined();
  });
});
