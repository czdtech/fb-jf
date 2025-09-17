// Archived: historical reference only; superseded by new refactor plan.
# CLAUDE.md

紧急重构指令集（面向 Claude Code）

目标：在不牺牲功能的前提下，用 Astro 原生能力替换自建复杂层，删除冗余 70%–85% 代码，回到“内容优先、最少 JS、最少抽象”的架构。

状态基线（2025-09-12）
- 代码行数（.ts|.tsx|.astro）：约 31,525 行
- 测试行数（src/utils/__tests__）：约 3,556 行
- 内容文件（src/content）：约 467 个

仓库实情核对（基于代码扫描）
- URL 子系统仍被引用：
  - `src/pages/games/[...page].astro` 使用 `UrlService.normalizeGameData`
  - `src/pages/[...slug].astro` 使用 `extractBaseSlug`、`getGameLocalizedPath`、`UrlService.normalizeGameData`
  - `src/components/GameCard.astro` 使用 `UrlService.getGameUrl`
  - `src/utils/__tests__/url-service.test.ts`
- 音频子系统：`AudioPlayer.astro` 仅在 `src/pages/[...slug].astro` 中使用；`AudioPlayerManager.ts` 被 `AudioPlayer.astro` 引用。
- 导航：`src/components/Navigation.astro` 已导入 `getRelativeLocaleUrl`，但仍使用自定义 `buildLocaleUrl`。
- 内联脚本：`src/layouts/BaseLayout.astro` 多处 `script is:inline`，各语言页（如 `zh/privacy.astro`）仍有内联片段。
- 法务页体量大且多语言重复：`privacy.astro`/`terms-of-service.astro` 在 6+ 语言目录下重复（每个 ~650–770 行）。

四条红线（全程必须满足）
- 不损失 SEO：title/description/canonical/hreflang/JSON‑LD 完全一致。
- 不改变文本：渲染文本逐字一致（含空白与标点规则）。
- 不破坏样式：关键 DOM 结构与 CSS 类名不变，首屏渲染不抖动。
- 不改 URL 结构：站内链接与路由路径不变（英文无前缀，其它语言 `/{locale}/...`）。

……（原文保留，见历史版本）

