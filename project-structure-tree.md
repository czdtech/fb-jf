├── astro.config.mjs  // 【Astro核心配置】定义项目构建行为与集成。`site` URL用于SEO；`i18n`配置了7种语言，英文为默认且无URL前缀；集成了Tailwind CSS（禁用了基础样式以兼容shadcn/ui）和React。
├── components.json  // 【shadcn/ui配置】定义了UI组件库的风格、Tailwind CSS集成方式、CSS变量以及路径别名（如 @/components -> src/components），简化了组件导入。
├── fix-multilingual-consistency.js                                    // JavaScript 配置文件/脚本
├── jest.config.js                                                     // JavaScript 配置文件/脚本
├── jest.setup.js                                                      // JavaScript 配置文件/脚本
├── MIGRATION-GUIDE.md                                                 // 项目文档 (Markdown)
├── MULTILINGUAL_CONTENT_BEST_PRACTICES.md                             // 项目文档 (Markdown)
├── package.json  // 【Node.js核心】定义项目依赖(如Astro, React, Tailwind)与脚本。包含大量自定义脚本用于内容校验(content:*)和i18n检查(i18n:*)，体现了项目的自动化质量保证流程。
├── project-structure-tree.md                                          // 项目文档 (Markdown)
├── public                                                             // 静态资源目录
│   ├── ads.txt
│   ├── ... (and 140 more assets)
│   ├── characters
│   │   ├── images
│   │   │   ├── beat1.png                                              // 图像资源
│   │   │   ├── beat2.png                                              // 图像资源
│   │   │   ├── beat3.png                                              // 图像资源
│   │   │   ├── ... (and 22 more images)
│   │   └── sounds
│   │       ├── beat1.wav                                              // 音频资源
│   │       ├── beat2.wav                                              // 音频资源
│   │       ├── beat3.wav                                              // 音频资源
│   │       ├── ... (and 22 more sounds)
│   ├── favicon.ico                                                    // 图像资源
│   ├── robots.txt                                                // 图像资源
├── route-patterns-analysis.csv
├── scripts                                                            // Node.js 构建/验证脚本目录
│   ├── generate-content-types.ts                                      // TypeScript 脚本/配置文件
│   ├── normalize-game-slugs.ts                                        // TypeScript 脚本/配置文件
│   ├── test-content-loading.mjs
│   ├── test-slug-fix.ts                                               // TypeScript 脚本/配置文件
│   ├── validate-content.ts                                            // TypeScript 脚本/配置文件
│   ├── validate-game-ids.ts                                           // TypeScript 脚本/配置文件
│   └── validate-translations.js                                       // JavaScript 配置文件/脚本
├── src  // 【源代码】项目的所有核心代码，包括页面、组件、布局、样式和业务逻辑。构建过程会处理此目录下的文件以生成最终网站。
│   ├── assets  // 【构建资源】存放需要经过Astro构建流程优化、压缩或添加哈希值的静态资源（如CSS引用的图片），与直接复制的`public`目录不同。
│   │   ├── astro.svg                                                  // 图像资源
│   │   └── background.svg                                             // 图像资源
│   ├── components  // 【UI组件】存放所有可复用的前端组件。通过功能（audio, games）、页面区块（sections）和基础UI（ui，由shadcn/ui生成）进行组织，是项目模块化的核心。
│   │   ├── audio
│   │   │   ├── AudioPlayer.astro
│   │   │   ├── AudioPlayerControls.astro                              // Astro 可复用UI组件
│   │   │   ├── AudioPlayerError.astro
│   │   │   ├── AudioPlayerManager.ts                                  // TypeScript 脚本/配置文件
│   │   │   ├── AudioPlayerProgress.astro
│   │   │   └── AudioPlayerTime.astro
│   │   ├── AudioPlayerSkeleton.astro
│   │   ├── AudioSlider.tsx                                            // React 组件 (TSX)
│   │   ├── Breadcrumb.astro
│   │   ├── ContentRenderer.astro
│   │   ├── EmptyState.astro
│   │   ├── Footer.astro
│   │   ├── GameCard.astro
│   │   ├── GameErrorBoundary.astro
│   │   ├── GameGrid.astro
│   │   ├── GameGridSkeleton.astro
│   │   ├── GameHero.astro
│   │   ├── GameIframe.astro
│   │   ├── GameRating.astro
│   │   ├── games
│   │   │   ├── GameCard.astro
│   │   │   ├── GameFilters.astro
│   │   │   └── GamesHero.astro
│   │   ├── GamesList.astro
│   │   ├── I18nPageContent.astro
│   │   ├── LanguageSelector.astro
│   │   ├── LanguageSelectorNative.astro
│   │   ├── LanguageSelectorSkeleton.astro
│   │   ├── legacy
│   │   │   ├── common.astro
│   │   │   ├── header.astro
│   │   │   └── nav.astro
│   │   ├── MobileSheetNav.tsx                                         // React 组件 (TSX)
│   │   ├── Navigation.astro
│   │   ├── NavigationSkeleton.astro
│   │   ├── ResponsivePicture.astro
│   │   ├── sections
│   │   │   ├── AboutSection.astro
│   │   │   ├── FAQSection.astro
│   │   │   ├── GameFeaturesSection.astro
│   │   │   ├── GameHowToPlaySection.astro
│   │   │   ├── GameMainSection.astro
│   │   │   ├── GameRelatedSection.astro
│   │   │   ├── HeroCommunityGames.astro
│   │   │   ├── HeroGamesSidebar.astro
│   │   │   ├── HeroHeader.astro
│   │   │   ├── HeroMainGame.astro
│   │   │   ├── HeroSection.astro
│   │   │   ├── HeroSectionNew.astro
│   │   │   ├── HeroTrendingGames.astro
│   │   │   ├── HowToPlaySection.astro
│   │   │   ├── NewGamesSection.astro
│   │   │   ├── PopularGamesSection.astro
│   │   │   ├── SoundSamplesSection.astro
│   │   │   ├── TrendingGamesSection.astro
│   │   │   └── VideosSection.astro
│   │   ├── SoundSample.astro
│   │   ├── ui
│   │   │   ├── alert.tsx                                              // React 组件 (TSX)
│   │   │   ├── badge.tsx                                              // React 组件 (TSX)
│   │   │   ├── button.tsx                                             // React 组件 (TSX)
│   │   │   ├── card.tsx                                               // React 组件 (TSX)
│   │   │   ├── error-alert.tsx                                        // React 组件 (TSX)
│   │   │   ├── error-boundary.tsx                                     // React 组件 (TSX)
│   │   │   ├── game-card-error.tsx                                    // React 组件 (TSX)
│   │   │   ├── game-card-skeleton.tsx                                 // React 组件 (TSX)
│   │   │   ├── grid-validation.astro
│   │   │   ├── index.ts                                               // TypeScript 脚本/配置文件
│   │   │   ├── input.tsx                                              // React 组件 (TSX)
│   │   │   ├── sheet.tsx                                              // React 组件 (TSX)
│   │   │   ├── skeleton.tsx                                           // React 组件 (TSX)
│   │   │   ├── slider.tsx                                             // React 组件 (TSX)
│   │   │   └── verify-components.ts                                   // TypeScript 脚本/配置文件
│   │   ├── UnifiedPagination.astro
│   │   └── Welcome.astro
│   ├── config  // 【业务配置】存放与业务逻辑相关的配置文件，将可变设置（如每页数量、显示条目数）与代码分离，便于维护。
│   │   ├── game-config.ts                                               // TypeScript 脚本/配置文件
│   │   └── pagination.ts                                                // TypeScript 脚本/配置文件
│   ├── content  // 【内容核心】使用Astro Content Collections管理所有内容。`config.ts`定义了数据结构(Schema)，`games`存放游戏Markdown数据，`i18nUI`存放UI翻译JSON，实现了内容与代码的完全分离。
│   │   ├── config.ts                                                  // TypeScript 脚本/配置文件
│   │   ├── games
│   │   │   ├── ayocs-sprunkr.md                                         // 游戏内容数据 (Markdown)
│   │   │   ├── dandyrunki-retake.md                                   // 项目文档 (Markdown)
│   │   │   ├── ... (and 60 more files)
│   │   │   ├── de
│   │   │   │   ├── ayocs-sprunkr.md                                   // 项目文档 (Markdown)
│   │   │   │   ├── ... (and 64 more files)
│   │   │   ├── es
│   │   │   │   ├── ayocs-sprunkr.md                                   // 项目文档 (Markdown)
│   │   │   │   ├── ... (and 64 more files)
│   │   │   ├── fr
│   │   │   │   ├── ayocs-sprunkr.md                                   // 项目文档 (Markdown)
│   │   │   │   ├── ... (and 64 more files)
│   │   │   ├── ja
│   │   │   │   ├── ayocs-sprunkr.md                                   // 项目文档 (Markdown)
│   │   │   │   ├── ... (and 64 more files)
│   │   │   ├── ko
│   │   │   │   ├── ayocs-sprunkr.md                                   // 项目文档 (Markdown)
│   │   │   │   ├── ... (and 64 more files)
│   │   │   └── zh
│   │   │       ├── ayocs-sprunkr.md                                   // 项目文档 (Markdown)
│   │   │       ├── ... (and 64 more files)
│   │   ├── i18nUI
│   │   │   ├── de.json                                                // 配置文件/数据 (JSON)
│   │   │   ├── en.json                                                // 配置文件/数据 (JSON)
│   │   │   ├── es.json                                                // 配置文件/数据 (JSON)
│   │   │   ├── fr.json                                                // 配置文件/数据 (JSON)
│   │   │   ├── ja.json                                                // 配置文件/数据 (JSON)
│   │   │   ├── ko.json                                                // 配置文件/数据 (JSON)
│   │   │   └── zh.json                                                // 配置文件/数据 (JSON)
│   │   └── staticData
│   │       └── en.json                                                // 配置文件/数据 (JSON)
│   ├── data
│   │   └── extracted-data.json                                        // 配置文件/数据 (JSON)
│   ├── i18n
│   │   └── utils.ts                                                   // TypeScript 脚本/配置文件
│   ├── layouts  // 【页面骨架】定义可复用的页面结构。`BaseLayout.astro`是所有页面的基础，负责HTML框架、全局SEO标签注入、样式表加载以及生产/开发环境下的脚本管理（如GA）。
│   │   ├── BaseLayout.astro
│   │   ├── GamePageLayout.astro                                         // Astro 页面布局组件
│   │   └── Layout.astro                                                 // Astro 页面布局组件
│   ├── lib
│   │   ├── content-simple
│   │   │   └── SimpleContentManager.ts                                // TypeScript 脚本/配置文件
│   │   └── utils.ts                                                   // TypeScript 脚本/配置文件
│   ├── pages  // 【文件路由】此目录结构直接映射为网站URL。`index.astro`是首页，`[slug].astro`等动态路由用于生成游戏详情页和分类页。各语言子目录(de, es, zh)复制此结构以实现多语言路由。
│   │   ├── 404.astro
│   │   ├── content-demo.astro                                           // Astro 页面路由组件
│   │   ├── content-manager-verification.astro                           // Astro 页面路由组件
│   │   ├── de
│   │   │   ├── games
│   │   │   │   └── [...page].astro
│   │   │   ├── index.astro
│   │   │   ├── privacy.astro
│   │   │   ├── terms-of-service.astro
│   │   │   └── [category]
│   │   │       └── [...page].astro
│   │   ├── es
│   │   │   ├── games
│   │   │   │   └── [...page].astro
│   │   │   ├── index.astro
│   │   │   ├── privacy.astro
│   │   │   ├── terms-of-service.astro
│   │   │   └── [category]
│   │   │       └── [...page].astro
│   │   ├── fr
│   │   │   ├── games
│   │   │   │   └── [...page].astro
│   │   │   ├── index.astro
│   │   │   ├── privacy.astro
│   │   │   ├── terms-of-service.astro
│   │   │   └── [category]
│   │   │       └── [...page].astro
│   │   ├── games
│   │   │   └── [...page].astro
│   │   ├── index.astro
│   │   ├── ja
│   │   │   ├── games
│   │   │   │   └── [...page].astro
│   │   │   ├── index.astro
│   │   │   ├── privacy.astro
│   │   │   ├── terms-of-service.astro
│   │   │   └── [category]
│   │   │       └── [...page].astro
│   │   ├── ko
│   │   │   ├── games
│   │   │   │   └── [...page].astro
│   │   │   ├── index.astro
│   │   │   ├── privacy.astro
│   │   │   ├── terms-of-service.astro
│   │   │   └── [category]
│   │   │       └── [...page].astro
│   │   ├── privacy.astro
│   │   ├── sitemap.xml.ts                                             // TypeScript 脚本/配置文件
│   │   ├── terms-of-service.astro
│   │   ├── zh
│   │   │   ├── games
│   │   │   │   └── [...page].astro
│   │   │   ├── index.astro
│   │   │   ├── privacy.astro
│   │   │   ├── terms-of-service.astro
│   │   │   ├── [category]
│   │   │   │   └── [...page].astro
│   │   │   └── [slug].astro
│   │   ├── [category]
│   │   │   └── [...page].astro
│   │   └── [slug].astro
│   ├── scripts
│   │   ├── accessibility-manager.js                                   // JavaScript 配置文件/脚本
│   │   ├── audio-error-handler.js                                     // JavaScript 配置文件/脚本
│   │   ├── global-error-handler.js                                    // JavaScript 配置文件/脚本
│   │   ├── interactions.js                                            // JavaScript 配置文件/脚本
│   │   ├── music-notes-animation.js                                   // JavaScript 配置文件/脚本
│   │   └── sound-sample-player.js                                     // JavaScript 配置文件/脚本
│   ├── styles
│   │   ├── accessibility.css                                          // CSS 样式文件
│   │   ├── components
│   │   │   ├── audio.css                                              // CSS 样式文件
│   │   │   ├── game-grids.css                                         // CSS 样式文件
│   │   │   └── hero.css                                               // CSS 样式文件
│   │   ├── components.css                                             // CSS 样式文件
│   │   ├── cross-browser-fixes.css                                    // CSS 样式文件
│   │   ├── design-tokens.css                                          // CSS 样式文件
│   │   ├── globals.css                                                // CSS 样式文件
│   │   └── responsive-optimizations.css                               // CSS 样式文件
│   ├── types
│   │   ├── game.ts                                                    // TypeScript 脚本/配置文件
│   │   ├── index.ts                                                   // TypeScript 脚本/配置文件
│   │   └── navigation.ts                                              // TypeScript 脚本/配置文件
│   └── utils
│       ├── content.ts                                                 // TypeScript 脚本/配置文件
│       ├── hreflang.ts                                                // TypeScript 脚本/配置文件
│       ├── i18n.ts                                                    // TypeScript 脚本/配置文件
│       ├── pagination.ts                                              // TypeScript 脚本/配置文件
│       ├── __mocks__
│       │   └── astro-content.ts                                       // TypeScript 脚本/配置文件
│       └── __tests__
│           ├── content-translation.test.ts                            // TypeScript 单元测试文件
│           ├── i18n.test.ts                                           // TypeScript 单元测试文件
│           ├── navigation-fix-validation.test.ts                      // TypeScript 单元测试文件
│           ├── page-integration.test.ts                               // TypeScript 单元测试文件
│           ├── pagination-system-final.test.ts                        // TypeScript 单元测试文件
│           ├── performance-build.test.ts                              // TypeScript 单元测试文件
│           ├── README.md                                              // 项目文档 (Markdown)
│           ├── seo-hreflang.test.ts                                   // TypeScript 单元测试文件
│           └── url-routing.test.ts                                    // TypeScript 单元测试文件
├── tailwind.config.mjs                                                // Tailwind CSS 配置文件
├── tests                                                              // 测试文件目录
│   ├── i18n-fail-fast.test.md                                         // 项目文档 (Markdown)
│   ├── integration-test.js                                            // JavaScript 配置文件/脚本
│   ├── manual-testing-checklist.md                                    // 项目文档 (Markdown)
│   ├── quick-test.sh
│   ├── README.md                                                      // 项目文档 (Markdown)
│   ├── run-i18n-tests.sh
│   ├── SUMMARY.md                                                     // 项目文档 (Markdown)
│   └── validate-translations.js                                       // JavaScript 配置文件/脚本
├── tsconfig.json                                                      // 配置文件/数据 (JSON)
├── validate-multilingual-consistency.js                               // JavaScript 配置文件/脚本
