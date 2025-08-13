import { z, defineCollection } from "astro:content";

const gamesCollection = defineCollection({
  type: "content",
  schema: z
    .object({
      id: z.string().optional(), // 多语言版本可能不需要重新定义id
      title: z.string(),
      description: z.string(),
      image: z.string(),
      iframe: z.string().url(),
      category: z.string(),
      meta: z.object({
        title: z.string(),
        description: z.string(),
        canonical: z.string().url().optional(), // 多语言canonical会自动生成
        ogImage: z.string().optional(),
      }),
      seo: z
        .object({
          title: z.string().optional(),
          description: z.string().optional(),
          keywords: z.string().optional(),
          canonical: z.string().url().optional(),
          ogImage: z.string().optional(),
          schema: z
            .object({
              name: z.string().optional(),
              alternateName: z.string().optional(),
              url: z.string().url().optional(),
            })
            .optional(),
        })
        .optional(),
      rating: z
        .object({
          score: z.number(),
          maxScore: z.number(),
          votes: z.number(),
          stars: z.number(),
        })
        .optional(),
      breadcrumb: z
        .object({
          home: z.string(),
          current: z.string(),
        })
        .optional(),
      pageType: z.string().optional(),
      isDemo: z.boolean().optional(),
    })
    .passthrough(),
});

// 多语言首页内容（使用 Markdown 管理 about 内容，避免 set:html）
const i18nHomeCollection = defineCollection({
  type: "content",
  schema: z.object({
    lang: z.string(),
    title: z.string(),
    description: z.string(),
  }),
});

// UI界面翻译内容集合
const i18nUICollection = defineCollection({
  type: "data",
  schema: z.object({
    // 导航相关翻译
    navigation: z.object({
      home: z.string(),
      games: z.string(),
      newGames: z.string(),
      popularGames: z.string(),
      trendingGames: z.string(),
      aboutUs: z.string(),
      privacy: z.string(),
      terms: z.string(),
      language: z.string(),
    }),
    // 页面标题和描述
    meta: z.object({
      title: z.string(),
      description: z.string(),
      keywords: z.string(),
    }),
    // 首页hero section
    hero: z.object({
      title: z.string(),
      subtitle: z.string(),
    }),
    // 页面section标题
    sections: z.object({
      howToPlay: z.string(),
      newGames: z.string(),
      popularGames: z.string(),
      trendingGames: z.string(),
      about: z.string(),
      videos: z.string(),
    }),
    // 如何游玩部分
    howToPlay: z.object({
      description: z.string(),
      quickStart: z.object({
        title: z.string(),
        subtitle: z.string(),
        steps: z.object({
          pick: z.object({
            title: z.string(),
            description: z.string(),
          }),
          drag: z.object({
            title: z.string(),
            description: z.string(),
          }),
          create: z.object({
            title: z.string(),
            description: z.string(),
          }),
        }),
      }),
      characters: z.object({
        title: z.string(),
        beats: z.string(),
        effects: z.string(),
        melodies: z.string(),
        voices: z.string(),
      }),
      bonusCharacters: z.object({
        title: z.string(),
        wordsWithFriends: z.string(),
        fredFigglehorn: z.string(),
        scrubDaddy: z.string(),
        jummbox: z.string(),
      }),
      features: z.object({
        title: z.string(),
        bpm: z.string(),
        jokeMod: z.string(),
        easyControls: z.string(),
        animations: z.string(),
      }),
      mechanics: z.object({
        title: z.string(),
        soundCombination: z.string(),
        rhythm: z.string(),
        loop: z.string(),
        explore: z.string(),
      }),
    }).optional(),
    // 关于部分
    about: z.object({
      description: z.string(),
      gameInfo: z.object({
        title: z.string(),
        officialName: z.string(),
        officialNameValue: z.string(),
        releaseDate: z.string(),
        releaseDateValue: z.string(),
        bpm: z.string(),
        bpmValue: z.string(),
        characterCount: z.string(),
        characterCountValue: z.string(),
        modType: z.string(),
        modTypeValue: z.string(),
        creators: z.string(),
        creatorsValue: z.string(),
      }),
      characterCategories: z.object({
        title: z.string(),
        beats: z.object({
          title: z.string(),
          thisIsGarrett: z.string(),
          greenDrumMachine: z.string(),
          mrMoon: z.string(),
          snaireCombi: z.string(),
        }),
        effects: z.object({
          title: z.string(),
          description: z.string(),
          subtitle: z.string(),
        }),
        melodies: z.object({
          title: z.string(),
          description: z.string(),
          subtitle: z.string(),
        }),
        voices: z.object({
          title: z.string(),
          description: z.string(),
          subtitle: z.string(),
        }),
        bonus: z.object({
          title: z.string(),
          description: z.string(),
          subtitle: z.string(),
        }),
      }),
      features: z.object({
        title: z.string(),
        comedy: z.object({
          title: z.string(),
          description: z.string(),
        }),
        highEnergy: z.object({
          title: z.string(),
          description: z.string(),
        }),
        animations: z.object({
          title: z.string(),
          description: z.string(),
        }),
        antiPiracy: z.object({
          title: z.string(),
          description: z.string(),
        }),
      }),
      platform: z.object({
        title: z.string(),
        categories: z.object({
          title: z.string(),
          description: z.string(),
        }),
        access: z.object({
          title: z.string(),
          mainPlatform: z.string(),
          mainPlatformValue: z.string(),
          alsoAvailable: z.string(),
          alsoAvailableValue: z.string(),
          price: z.string(),
          priceValue: z.string(),
          noDownload: z.string(),
        }),
      }),
      community: z.object({
        title: z.string(),
        mods: z.object({
          title: z.string(),
          fiddlebopsSprunki: z.string(),
          fiddlebopsFix: z.string(),
          sprunksters: z.string(),
          pyramixed: z.string(),
          exploreMore: z.string(),
        }),
        share: z.object({
          title: z.string(),
          joinCommunity: z.string(),
          youtube: z.string(),
          youtubeDesc: z.string(),
          tiktok: z.string(),
          tiktokDesc: z.string(),
          twitter: z.string(),
          twitterDesc: z.string(),
          screenRecord: z.string(),
        }),
      }),
    }).optional(),
    // 游戏相关UI
    games: z.object({
      playNow: z.string(),
      loading: z.string(),
      error: z.string(),
      retry: z.string(),
      viewMore: z.string(),
      noGames: z.string(),
      category: z.string(),
      rating: z.string(),
    }),
    // 通用UI文本
    common: z.object({
      loading: z.string(),
      error: z.string(),
      retry: z.string(),
      back: z.string(),
      next: z.string(),
      previous: z.string(),
      close: z.string(),
      menu: z.string(),
    }),
    // 页脚
    footer: z.object({
      aboutUs: z.string(),
      privacy: z.string(),
      terms: z.string(),
      copyright: z.string(),
      legal: z.string(),
      contactUs: z.string(),
      quickLinks: z.string(),
      tagline: z.string(),
      description: z.string(),
    }),
    // 错误页面相关翻译
    error: z.object({
      "404": z.object({
        title: z.string(),
        message: z.string(),
        backToHome: z.string(),
        suggestionsTitle: z.string(),
        suggestionsDescription: z.string(),
        originalExperience: z.string(),
        sprunikiExperience: z.string(),
        incrediboxExperience: z.string(),
      }),
    }),
  }),
});

export const collections = {
  games: gamesCollection,
  i18nHome: i18nHomeCollection,
  i18nUI: i18nUICollection,
};
