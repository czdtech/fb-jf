# 项目概览

- 站点：Play Fiddlebops（域名见 `astro.config.mjs` 的 `site`，默认 `https://www.playfiddlebops.com`）
- 类型：多语言静态网站（Astro `output: "static"`）
- 语言与国际化：内置 7 种语言 `en/zh/es/fr/de/ja/ko`，`en` 为默认语言且不加路径前缀（见 `astro.config.mjs -> i18n`）。
- 技术栈：Astro + TypeScript + React + Tailwind（集成 `@astrojs/react`、`@astrojs/tailwind`；Tailwind 基础样式关闭以配合 shadcn/ui）。
- 运行端口：开发服务器在 `localhost:4321`（见 `astro.config.mjs -> server`）。
- 环境变量：`PUBLIC_SITE_URL` 可覆盖 `site`，用于生成正确的 hreflang/SEO URL。

关键能力
- 内容模型：通过 `src/content/config.ts` 定义集合：
  - `games`（Markdown，多语言游戏内容）
  - `staticData`（JSON，导航/首页/SEO 模板等）
  - `i18nUI`（JSON，UI 文案翻译）
  - `legal`（JSON，隐私/条款）
- 路由结构：
  - 首页与法务页：`/`、`/privacy`、`/terms-of-service` 及对应语言版本（`/zh/...` 等）
  - 分类与游戏列表：`/[category]/[...page]`、`/[lang]/games/[...page]` 等（分页由 `src/utils/pagination.ts` 驱动）
- SEO 与多语言：`src/utils/hreflang.ts`、`src/utils/i18n.ts`、`sitemap.xml.ts`，并在布局与页面中注入 meta/hreflang。
- 组件与布局：Astro 组件为主，局部交互使用 React TSX（如 `AudioSlider.tsx`）；布局在 `src/layouts/`。

开发流
- 内容/翻译校验与类型生成脚本集中在 `scripts/`，配套 npm scripts（`content:*`、`i18n:*`）。
- 视觉对比工具：`visual:*` 脚本可在 `reports/visual-diff` 输出基线对比结果。
