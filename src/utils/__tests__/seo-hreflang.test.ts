/**
 * SEO元数据和hreflang链接生成测试
 * 验证多语言SEO数据生成、hreflang链接准确性和搜索引擎优化
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type { CollectionEntry } from "astro:content";

// Mock游戏内容数据，模拟不同翻译状态
const mockGamesForSEO: CollectionEntry<"games">[] = [
  // 完整多语言游戏
  {
    id: "en/sprunki-retake.md",
    slug: "sprunki-retake",
    body: "",
    collection: "games",
    data: {
      title: "Sprunki Retake",
      description: "Horror rhythm game",
      image: "/sprunki-retake.png",
      category: "popular",
    },
    render: async () => ({ Content: () => "" }),
  },
  {
    id: "zh/sprunki-retake.md",
    slug: "sprunki-retake",
    body: "",
    collection: "games",
    data: {
      title: "Sprunki Retake",
      description: "恐怖节奏游戏",
      image: "/sprunki-retake.png",
      category: "popular",
    },
    render: async () => ({ Content: () => "" }),
  },
  {
    id: "es/sprunki-retake.md",
    slug: "sprunki-retake",
    body: "",
    collection: "games",
    data: {
      title: "Sprunki Retake",
      description: "Juego de ritmo horror",
      image: "/sprunki-retake.png",
      category: "popular",
    },
    render: async () => ({ Content: () => "" }),
  },

  // 只有英文和中文的游戏
  {
    id: "en/incredibox.md",
    slug: "incredibox",
    body: "",
    collection: "games",
    data: {
      title: "Incredibox",
      description: "Music creation game",
      image: "/incredibox.png",
      category: "trending",
    },
    render: async () => ({ Content: () => "" }),
  },
  {
    id: "zh/incredibox.md",
    slug: "incredibox",
    body: "",
    collection: "games",
    data: {
      title: "Incredibox",
      description: "音乐创作游戏",
      image: "/incredibox.png",
      category: "trending",
    },
    render: async () => ({ Content: () => "" }),
  },

  // 只有英文的游戏
  {
    id: "en/sprunki-phase-5.md",
    slug: "sprunki-phase-5",
    body: "",
    collection: "games",
    data: {
      title: "Sprunki Phase 5",
      description: "Latest phase game",
      image: "/sprunki-phase-5.png",
      category: "new",
    },
    render: async () => ({ Content: () => "" }),
  },
];

// Mock语言配置
const mockLanguages = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
];

jest.mock("astro:content", () => ({
  getCollection: jest.fn(() => Promise.resolve(mockGamesForSEO)),
}));

import {
  generateHreflangLinks,
  generateHomeHreflangLinks,
  generateGameHreflangLinks,
} from "../hreflang";

describe("SEO元数据和hreflang测试", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("基础hreflang链接生成", () => {
    it("应该为所有语言生成正确的hreflang链接", () => {
      const links = generateHreflangLinks(mockLanguages, "/test-page/");

      expect(links).toHaveLength(7);

      // 检查英文链接（x-default）
      const englishLink = links.find((link) => link.code === "x-default");
      expect(englishLink).toBeDefined();
      expect(englishLink!.url).toBe(
        "https://www.playfiddlebops.com/test-page/",
      );
      expect(englishLink!.label).toBe("English");

      // 检查中文链接
      const chineseLink = links.find((link) => link.code === "zh");
      expect(chineseLink).toBeDefined();
      expect(chineseLink!.url).toBe(
        "https://www.playfiddlebops.com/zh/test-page/",
      );
      expect(chineseLink!.label).toBe("中文");
    });

    it("应该正确处理不同的路径格式", () => {
      const testCases = [
        { input: "/", expected: "/" },
        { input: "/game/", expected: "/game/" },
        { input: "game", expected: "/game/" },
        { input: "/game", expected: "/game/" },
        { input: "game/", expected: "/game/" },
      ];

      testCases.forEach(({ input, expected }) => {
        const links = generateHreflangLinks(mockLanguages, input);
        const englishLink = links.find((link) => link.code === "x-default");
        expect(englishLink!.url).toBe(
          `https://www.playfiddlebops.com${expected}`,
        );
      });
    });

    it("应该支持自定义基础URL", () => {
      const customBaseUrl = "https://custom-domain.com";
      const links = generateHreflangLinks(
        mockLanguages,
        "/page/",
        customBaseUrl,
      );

      const englishLink = links.find((link) => link.code === "x-default");
      expect(englishLink!.url).toBe("https://custom-domain.com/page/");

      const chineseLink = links.find((link) => link.code === "zh");
      expect(chineseLink!.url).toBe("https://custom-domain.com/zh/page/");
    });
  });

  describe("首页hreflang生成", () => {
    it("应该为首页生成正确的hreflang", () => {
      const links = generateHomeHreflangLinks(mockLanguages);

      expect(links).toHaveLength(7);

      const englishLink = links.find((link) => link.code === "x-default");
      expect(englishLink!.url).toBe("https://www.playfiddlebops.com/");

      const chineseLink = links.find((link) => link.code === "zh");
      expect(chineseLink!.url).toBe("https://www.playfiddlebops.com/zh/");
    });
  });

  describe("游戏页面hreflang生成（全语言版本）", () => {
    it("应该为所有语言生成hreflang链接", async () => {
      // 当前实现为所有游戏生成全语言版本的hreflang
      const links = await generateGameHreflangLinks(
        mockLanguages,
        "sprunki-retake",
      );

      expect(links).toHaveLength(7); // 所有语言

      const codes = links.map((link) => link.code);
      expect(codes).toContain("x-default"); // 英文
      expect(codes).toContain("zh"); // 中文
      expect(codes).toContain("es"); // 西班牙文
      expect(codes).toContain("fr");
      expect(codes).toContain("de");
      expect(codes).toContain("ja");
      expect(codes).toContain("ko");
    });

    it("所有游戏都应该生成全部语言hreflang", async () => {
      const links = await generateGameHreflangLinks(
        mockLanguages,
        "incredibox",
      );

      expect(links).toHaveLength(7);

      const codes = links.map((link) => link.code);
      expect(codes).toContain("x-default"); // 英文
      expect(codes).toContain("zh"); // 中文
      expect(codes).toContain("es");
    });

    it("任何游戏都应该生成完整语言列表", async () => {
      const links = await generateGameHreflangLinks(
        mockLanguages,
        "sprunki-phase-5",
      );

      expect(links).toHaveLength(7);

      const englishLink = links.find((link) => link.code === "x-default");
      expect(englishLink).toBeDefined();
      expect(englishLink!.url).toBe(
        "https://www.playfiddlebops.com/sprunki-phase-5/",
      );
    });

    it("不存在的游戏也会返回全语言链接", async () => {
      // 当前实现不检查游戏是否存在
      const links = await generateGameHreflangLinks(
        mockLanguages,
        "non-existent-game",
      );
      expect(links).toHaveLength(7);
    });
  });

  describe("hreflang URL格式验证", () => {
    it("生成的URL应该符合SEO规范", async () => {
      const links = await generateGameHreflangLinks(
        mockLanguages,
        "sprunki-retake",
      );

      links.forEach((link) => {
        // URL应该是绝对路径
        expect(link.url.startsWith("https://")).toBe(true);

        // URL应该以/结尾
        expect(link.url.endsWith("/")).toBe(true);

        // URL不应该包含双斜杠（除了协议部分）
        const urlWithoutProtocol = link.url.replace(/^https?:\/\//, "");
        expect(urlWithoutProtocol).not.toContain("//");

        // 非英文URL应该包含正确的语言前缀
        if (link.code !== "x-default") {
          expect(link.url).toContain(`/${link.code}/`);
        }
      });
    });

    it("应该正确处理特殊字符的游戏slug", async () => {
      // 添加特殊字符游戏的mock数据
      const { getCollection } = await import("astro:content");
      const specialGame = {
        id: "en/game-with-dashes-123.md",
        slug: "game-with-dashes-123",
        body: "",
        collection: "games",
        data: {
          title: "Test Game",
          description: "Test",
          image: "/test.png",
          category: "test",
        },
        render: async () => ({ Content: () => "" }),
      };

      (getCollection as jest.Mock).mockResolvedValueOnce([specialGame]);

      const links = await generateGameHreflangLinks(
        mockLanguages,
        "game-with-dashes-123",
      );

      expect(links).toHaveLength(7); // 当前实现为所有游戏生成全语言链接
      const defaultLink = links.find((link) => link.code === "x-default");
      expect(defaultLink!.url).toBe(
        "https://www.playfiddlebops.com/game-with-dashes-123/",
      );
    });
  });

  describe("错误处理和边缘情况", () => {
    it("空语言列表应该返回空数组", () => {
      const links = generateHreflangLinks([], "/test/");
      expect(links).toHaveLength(0);
    });

    it("null语言列表应该返回空数组", () => {
      const links = generateHreflangLinks(null as any, "/test/");
      expect(links).toHaveLength(0);
    });

    it("应该优雅处理getCollection错误", async () => {
      const { getCollection } = await import("astro:content");
      (getCollection as jest.Mock).mockRejectedValueOnce(
        new Error("Database error"),
      );

      const links = await generateGameHreflangLinks(mockLanguages, "test-game");
      expect(links).toHaveLength(7); // 生成全部语言链接，不管游戏是否存在
    });

    it("应该处理空的游戏集合", async () => {
      const { getCollection } = await import("astro:content");
      (getCollection as jest.Mock).mockResolvedValueOnce([]);

      const links = await generateGameHreflangLinks(mockLanguages, "test-game");
      expect(links).toHaveLength(7); // 生成全部语言链接，不管游戏是否存在
    });
  });
});

describe("SEO标签和元数据验证", () => {
  describe("hreflang标签格式", () => {
    it("应该生成符合Google标准的hreflang属性", async () => {
      const links = await generateGameHreflangLinks(
        mockLanguages,
        "sprunki-retake",
      );

      links.forEach((link) => {
        // 语言代码应该符合ISO 639-1标准
        const validCodes = ["x-default", "zh", "es", "fr", "de", "ja", "ko"];
        expect(validCodes).toContain(link.code);

        // 标签内容应该包含必要信息
        expect(link.label).toBeDefined();
        expect(link.url).toBeDefined();
      });
    });

    it("x-default应该始终指向英文版本", () => {
      const links = generateHreflangLinks(mockLanguages, "/game/");

      const defaultLink = links.find((link) => link.code === "x-default");
      expect(defaultLink).toBeDefined();
      expect(defaultLink!.url).not.toContain("/en/"); // 英文不包含语言前缀
      expect(defaultLink!.url).toBe("https://www.playfiddlebops.com/game/");
    });
  });

  describe("SEO URL结构验证", () => {
    it("URL结构应该对SEO友好", async () => {
      const links = await generateGameHreflangLinks(
        mockLanguages,
        "sprunki-retake",
      );

      links.forEach((link) => {
        const url = new URL(link.url);

        // 应该使用HTTPS
        expect(url.protocol).toBe("https:");

        // 域名应该正确
        expect(url.hostname).toBe("www.playfiddlebops.com");

        // 路径应该简洁明了
        expect(url.pathname.split("/").length).toBeLessThanOrEqual(4); // 最多3级路径
      });
    });

    it("多语言URL应该保持一致的结构", async () => {
      const links = await generateGameHreflangLinks(
        mockLanguages,
        "incredibox",
      );

      const englishUrl = links.find((link) => link.code === "x-default")!.url;
      const chineseUrl = links.find((link) => link.code === "zh")!.url;

      expect(englishUrl).toBe("https://www.playfiddlebops.com/incredibox/");
      expect(chineseUrl).toBe("https://www.playfiddlebops.com/zh/incredibox/");

      // 两个URL的游戏slug部分应该相同
      expect(englishUrl.split("/").pop()).toBe(chineseUrl.split("/").pop());
    });
  });

  describe("国际化标准合规性", () => {
    it("语言代码应该符合HTML lang属性标准", () => {
      const links = generateHreflangLinks(mockLanguages, "/");

      // 验证每个语言代码
      const expectedMappings = {
        "x-default": "English",
        zh: "中文",
        es: "Español",
        fr: "Français",
        de: "Deutsch",
        ja: "日本語",
        ko: "한국어",
      };

      links.forEach((link) => {
        expect(
          expectedMappings[link.code as keyof typeof expectedMappings],
        ).toBe(link.label);
      });
    });

    it("应该提供正确的双向语言映射", async () => {
      const gameLinks = await generateGameHreflangLinks(
        mockLanguages,
        "sprunki-retake",
      );

      // 每个链接都应该能被其他链接引用
      gameLinks.forEach((sourceLink) => {
        gameLinks.forEach((targetLink) => {
          if (sourceLink !== targetLink) {
            // 不同语言的相同游戏应该相互引用
            expect(sourceLink.url).not.toBe(targetLink.url);
            expect(sourceLink.code).not.toBe(targetLink.code);
          }
        });
      });
    });
  });
});

describe("性能和缓存优化", () => {
  describe("hreflang生成性能", () => {
    it("大量游戏的hreflang生成应该高效", async () => {
      const startTime = performance.now();

      const gamePromises = [
        generateGameHreflangLinks(mockLanguages, "sprunki-retake"),
        generateGameHreflangLinks(mockLanguages, "incredibox"),
        generateGameHreflangLinks(mockLanguages, "sprunki-phase-5"),
      ];

      const results = await Promise.all(gamePromises);
      const endTime = performance.now();

      // 所有结果都应该正确
      expect(results[0].length).toBeGreaterThan(0);
      expect(results[1].length).toBeGreaterThan(0);
      expect(results[2].length).toBeGreaterThan(0);

      // 处理时间应该合理
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe("重复调用优化", () => {
    it("相同参数的重复调用应该保持一致", async () => {
      const result1 = await generateGameHreflangLinks(
        mockLanguages,
        "sprunki-retake",
      );
      const result2 = await generateGameHreflangLinks(
        mockLanguages,
        "sprunki-retake",
      );

      expect(result1).toEqual(result2);
      expect(result1.length).toBe(result2.length);

      // 验证每个链接都相同
      result1.forEach((link1, index) => {
        const link2 = result2[index];
        expect(link1.code).toBe(link2.code);
        expect(link1.url).toBe(link2.url);
        expect(link1.label).toBe(link2.label);
      });
    });
  });
});
