# 代码结构（要点）

顶层
- `astro.config.mjs`：站点/i18n/集成与 Vite 优化
- `package.json`：依赖与脚本；无 `test` 脚本（可用 `npx jest`）
- `eslint.config.js`、`.prettierrc.json`、`.editorconfig`
- `docs/`：项目结构与迁移/报告文档
- `scripts/`：内容与翻译校验、可视化对比、数据迁移工具

`src/`
- `pages/`：路由页（首页、法务、多语言索引、分类与分页、sitemap）；如 `src/pages/[category]/[...page].astro`
- `components/`：UI 组件（Astro/React），分 `audio/`、`games/`、`sections/`、`ui/`
- `layouts/`：`BaseLayout.astro`、`GamePageLayout.astro` 等
- `utils/`：`i18n.ts`、`hreflang.ts`、`pagination.ts`、`url-service.ts` 等
- `content/`：
  - `games/`：各语言 Markdown 内容
  - `i18nUI/`：各语言 UI 文案 JSON（受 `config.ts` 约束）
  - `staticData/`：导航/首页/SEO 模板等 JSON
  - `legal/`：隐私与条款 JSON
- `utils/__tests__/`：Jest 测试（URL 路由、i18n、分页、SEO 等）

`public/`
- 静态资源直接拷贝到构建产物（图像/音频/robots/ads 等）