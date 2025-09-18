# Phase 8 Cleanup Summary

Branch: `refactor/phase8-clean-sweep` (based on `homepage`)

## Scope
- T8-1 删除/迁移：移除未用 legacy 组件、将 src 下备份目录迁至 `archives/`
- T8-2 清理：移除 `pagination.ts` 弃用 API 与 `require()` 残留
- T8-3 模块化：内联脚本外提（LanguageSelectorNative、GameMainSection、Homepage、GameFilters、AudioPlayer/Progress/Simple）
- T8-4 拆分：GameIframe 覆盖层与观察者逻辑外提为模块
- T8-5 消噪：生产构建下静默内容校验告警（仅 DEV 输出）
- T8-6 收口：新增 `getProp<T>()` 与 `getSiteUrl()`，并接入 sitemap
  
追加（本轮）：
- Repo 清理：移除误加入的 worktree gitlinks（`tmp_homepage`、`tmp_phase0_pre`、`tmp_phase4_post`），并添加 `.gitignore: tmp_*/`
- Sitemap 告警：移除未使用的 `node:process` 导入
- 组件脚本：
  - `src/components/games/GameFilters.astro` → `src/scripts/games/filters.js`
  - `src/components/audio/AudioPlayer*.astro` → `src/scripts/audio/player.js`
  - `src/components/audio/AudioPlayerProgress.astro` → `src/scripts/audio/progress-fallback.js`
  - `LanguageSelectorNative.astro` 使用自初始化模块，去除内联初始化

## Gates
```
PUBLIC_SITE_URL=https://www.playfiddlebops.com
npm run build            # 构建 + postbuild 守卫 12/12
nohup npm run preview &  # 预览
    npm run dom:validate     # 预览式 DOM 校验（0 fail，3 条容器计数提示属基线差异）
npm test                 # 237/237 全绿
```

## Key Changes
- Deleted: `src/components/legacy/nav.astro`
- Moved: `src/content.backup/**`, `src/content/games.backup.phase3/**` → `archives/`
- Refactor: `src/utils/pagination.ts` drop deprecated funcs
- New: `src/scripts/lang-selector.js`, `src/scripts/game-main.js`, `src/scripts/iframe/cover-observer.js`
- Refactor: `LanguageSelectorNative.astro`, `GameMainSection.astro`, `pages/index.astro` 引入模块脚本
- Quiet logs: `src/utils/content.ts` DEV 门控
- Types/Util: `getProp<T>()` in `src/i18n/utils.ts`; `getSiteUrl()` in `src/utils/site.ts`; `sitemap.xml.ts` 使用该工具

## Invariants
- URL/DOM/SEO/文案：无变化
- 构建与预览守卫：通过
- 测试：237/237

## Follow-ups (Optional)
- 对大组件（SoundSample/GameHero）继续“向内拆分”，仅搬运脚本与样式，不改 DOM
- CI 增加“构建零噪音”断言（正则过滤日志）
