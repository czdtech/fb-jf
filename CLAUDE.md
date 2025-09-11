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

执行风格
- 删 > 改 > 增：能删就删；如需保留，先用 Astro 内置替代再删旧代码。
- 小步提交，可回滚：每一步都能独立通过构建与路由冒烟测试。
- 可验证、可度量：每个阶段附“进入/退出准入条件”和度量命令。

基线快照（第一步立即执行，每阶段复用）
- 构建产物：`npm run build && ls -la dist`
- 采集页面集合（至少）：`/`, `/games/`, `/zh/`, `/zh/games/`, 任一英文游戏页、任一非英文游戏页。
- SEO 快照（对 dist/*.html 执行）：
  - `<title>`、`<meta name="description">`、`<link rel="canonical">`
  - 所有 `<link rel="alternate" hreflang>`（按 hreflang 排序后保存）
  - JSON‑LD 片段（去空白后做 hash）
- 样式基线：主页与详情页首屏关键 DOM 与类名片段（保存到 `reports/dom-baseline.txt`）。
- 文本基线：移除脚本/样式后 body 纯文本（保存到 `reports/text-baseline.txt`）。

关键里程碑
- M1：移除重型 URL 与音频子系统；导航/i18n 回归 Astro；构建时间和包体显著下降。
- M2：内容“单文件多语言”落地；目录结构收敛；hreflang 统一。
- M3：消除页面内联脚本；BaseLayout 模块化；JS 仅服务交互组件。

安全保护（必须遵守）
- 先建分支：`git switch -c refactor/astro-slim`
- 工作区需干净：`git status` 显示无未提交变更
- 每次删除前做“无引用检查”并在构建后再提交

常用命令
```bash
# 开发/构建
npm run dev
npm run build && npm run preview

# 内容与 i18n 校验
npm run content:validate
npm run i18n:validate

# 统计度量
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.astro" \) -print0 | xargs -0 wc -l | tail -n1
find src/content -type f | wc -l
```

分阶段计划（可逐日推进）

## Phase 0｜兼容层替换（当日完成，零对外差异）
进入条件
- 分支已创建，工作区干净。

步骤
0A) 建立“前”基线（见上文基线快照），记录哈希/列表。

0B) UrlService：保留对外 API，薄化内部（不改任何调用点）
— 新增超轻路径工具（不超过 20 行）：`src/utils/paths.ts`
```ts
export const LOCALES = ['en','zh','es','fr','de','ja','ko'] as const
export function deriveBaseSlug(idOrSlug: string): string {
  if (!idOrSlug) return ''
  const p = idOrSlug.replace(/\.md$/, '')
  const m = p.match(/^(en|zh|es|fr|de|ja|ko)[\/-](.+)$/)
  return m ? m[2] : p
}
export function localizedPath(baseSlug: string, locale: string) {
  return locale === 'en' ? `/${baseSlug}/` : `/${locale}/${baseSlug}/`
}
```
— 在 `src/utils/url-service.ts` 内部改为调用上述两个方法，导出名与方法签名保持不变；新增最小单测样本（英文/中文各若干）验证输出一致。

0C) 音频组件：保留文件名与外层 DOM/类名，瘦身内部
— 保留 `src/components/audio/AudioPlayer.astro` 名称与对外 props/容器类；
— 精简内部实现，移除复杂状态与管理器（`AudioPlayerManager.ts`）但保持控件结构与 aria 属性一致；
— 若需拆分子组件，保留原文件名与导出或提供兼容 wrapper 保证 DOM 一致；
— 验收：详情页 `AudioPlayer` 外层 DOM、关键按钮与类名一致；可播可控无报错。

0D) 构建 + “后”基线快照
— 对比前/后：路由/链接、SEO 标签、JSON‑LD、首屏 DOM/类名、页面纯文本全部一致；
— 提交：`refactor(url,audio): thin internals behind same public API (no external changes)`

0E) 仅在零差异确认后再清理
— 删除 `AudioPlayerManager.ts` 等确证无引用的实现文件；UrlService 暂不删除，作为“薄壳”保留到 Phase 5 再评估移除；
— 提交：`chore(cleanup): remove unused audio manager impl`

退出条件
- 构建通过；`npm run preview` 路由冒烟正常；四条红线全部通过基线比对；删除项均无剩余引用。

## Phase 1｜内容迁移：单文件多语言（第 1–2 天）
意图
- 将 `src/content/games/<locale>/slug.md` 合并为 `src/content/games/slug.md`，在 frontmatter 增加 `translations` 字段（含 title/description/meta）。

迁移脚本（新增：scripts/migrate-content.ts）
```ts
// scripts/migrate-content.ts
import { glob } from 'fast-glob'
import { readFile, writeFile, rm, cp } from 'fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

const LOCALES = ['en','zh','es','fr','de','ja','ko'] as const

async function exists(file: string) {
  try { await readFile(file); return true } catch { return false }
}

async function migrate() {
  const baseFiles = await glob('src/content/games/*.md')

  for (const gamePath of baseFiles) {
    const slug = path.basename(gamePath, '.md')
    const translations: Record<string, any> = {}

    for (const locale of LOCALES) {
      const localePath = locale === 'en' ? gamePath : `src/content/games/${locale}/${slug}.md`
      if (await exists(localePath)) {
        const raw = await readFile(localePath, 'utf-8')
        const { data } = matter(raw)
        translations[locale] = {
          title: data.title,
          description: data.description,
          meta: data.meta
        }
      }
    }

    // 将英文文件作为唯一载体，写回合并后的 frontmatter
    const baseRaw = await readFile(gamePath, 'utf-8')
    const { data: baseData, content } = matter(baseRaw)
    const merged = matter.stringify(content || '', { ...baseData, translations })
    await writeFile(gamePath, merged)
  }

  // 可选：删除语言子目录（确认后再执行）
  for (const locale of LOCALES.filter(l => l !== 'en')) {
    await rm(`src/content/games/${locale}`, { recursive: true, force: true })
  }
}

if (process.argv.includes('--execute')) migrate()
else console.log('Dry-run complete. Use --execute to write changes.')
```

执行与验证
```bash
# 备份
cp -r src/content src/content.backup

# Dry-run / 执行
tsx scripts/migrate-content.ts          # 观察日志
tsx scripts/migrate-content.ts --execute

# 结果检查：文件数应显著下降
ls -la src/content/games | wc -l

# 构建+预览
npm run build && npm run preview

git add -A && git commit -m "feat(content): migrate to single-file multilingual frontmatter"
```

补充：法务与静态页收敛（可与 Phase 1 并行）
- 将 `privacy.astro` 与 `terms-of-service.astro` 内容迁移为 `src/content/staticData/{locale}.md`（或 JSON），页面仅保留模板与渲染逻辑。
- 目标：每个语言 1 个内容文件 + 1 个通用模板（行数显著下降）。

## Phase 2｜i18n 一致性收敛（第 2 天）
### 2.1 导航回归 Astro 官方 API
- 文件：`src/components/Navigation.astro`
- 替换自定义 `buildLocaleUrl`，直接使用 `getRelativeLocaleUrl(currentLocale, path)` 生成链接。
```diff
- const buildLocaleUrl = (locale: string, path: string): string => { /* ... */ }
+ import { getRelativeLocaleUrl } from 'astro:i18n'

- url: buildLocaleUrl(currentLocale, '/games')
+ url: getRelativeLocaleUrl(currentLocale, '/games')
```
进入条件：`npm run build` 可过，并且 `rg -n "buildLocaleUrl\s*\(" src` 无命中或仅余此文件。

### 2.2 hreflang 统一
- 工具：`src/utils/hreflang.ts`
- 所有页面统一从 utils 生成 hreflang 链接，签名：
```ts
generateHreflangLinks(SUPPORTED_LOCALES.map(code => ({ code, label: '' })), Astro.url.pathname, Astro.site)
```
- 验证：主索引页与 /games 页检查 `<link rel="alternate" hreflang>` 是否齐全。

## Phase 3｜性能：移除内联脚本（第 3 天）
### 3.1 新增模块化脚本
```js
// src/scripts/analytics.js
export function initAnalytics() {
  if (import.meta.env.PROD) {
    window.dataLayer = window.dataLayer || []
    function gtag(){window.dataLayer.push(arguments)}
    gtag('js', new Date())
    gtag('config', 'G-9JME3P55QJ')
  }
}

// src/scripts/critical.js
export function initCritical() {
  // 合并所有关键初始化逻辑
}
```

### 3.2 BaseLayout 最小化（文件：`src/layouts/BaseLayout.astro`）
```astro
<script defer src="https://www.googletagmanager.com/gtag/js?id=G-9JME3P55QJ"></script>
<script type="module">
  import { initAnalytics } from '@/scripts/analytics.js'
  import { initCritical } from '@/scripts/critical.js'
  initAnalytics();
  initCritical();
</script>
```
验证：页面不再存在 `is:inline` 的 GA 与通用初始化脚本；构建后 HTML 体积下降；脚本标签顺序与数量与基线一致（文本允许不同）。

补充：清理页面级内联脚本
- 搜索并删除：`rg -n "<script[^>]*is:inline" src/pages`
- 示例：`src/pages/zh/privacy.astro`、`src/pages/zh/terms-of-service.astro` 尾部内联脚本合并进 `critical.js`。

## Phase 4｜页面与路由简化（第 4 天）
### 4.1 动态页面收敛（文件：`src/pages/[...slug].astro`）
- 直接依赖 `getCollection('games')` 与 `translations[locale]`，避免中间服务层。
```astro
---
import { getCollection } from 'astro:content'
import Layout from '@/layouts/BaseLayout.astro'

export async function getStaticPaths() {
  const games = await getCollection('games')
  const locales = ['en','zh','es','fr','de','ja','ko']
  return games.flatMap(game => locales.map(locale => ({
    params: { slug: locale === 'en' ? game.data.slug : `${locale}/${game.data.slug}` },
    props: { game, locale }
  })))
}

const { game, locale } = Astro.props
const t = game.data.translations[locale] || game.data.translations.en
---
<Layout title={t.meta?.title} description={t.meta?.description}>
  <h1>{t.title}</h1>
  <p>{t.description}</p>
  <iframe src={game.data.iframe} />
</Layout>
```

### 4.2 复杂度阈值（策略）
- 单文件 < 100 行、单函数 < 20 行为目标；超过阈值优先拆分或删除冗余路径。
- 不进行“为抽象而抽象”的通用化；具体问题具体代码。

建议的体量削减手段（结合仓库现状）
- `terms-of-service.astro`/`privacy.astro` 多语言重复：改成“模板 + 内容集合”，单页预计 < 80 行。
- `GameHero.astro`、`SoundSample.astro`（>800 行）：拆为“视图+UI块”，减少每文件体积并提升可删除性。

## Phase 5｜依赖与最终清理（第 5 天）
### 5.1 依赖清理
```bash
# 识别未引用包（示例，可按需替换为本地工具）
# 手动审阅 import 与 package.json，再执行：
npm uninstall <unused-packages>
npm prune
```

### 5.2 质量与度量
```bash
# 代码行数（目标 < 7,000 行）
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.astro" \) -print0 | xargs -0 wc -l | tail -n1

# 内容文件数（目标 ~ 68 个游戏内容）
find src/content/games -maxdepth 1 -type f -name "*.md" | wc -l

# 构建验证
npm run build && npm run preview
```

## 验收标准（Done 定义）
- 路由与主要页面端到端可用（首页、/games、任一游戏详情、各语言首页）。
- 代码行数显著下降（目标 < 7k）；内容文件合并到单层。
- 导航、hreflang、GA 注入按 Astro 最佳实践实现，零自建重型服务层。
- 四条红线全部满足（以基线快照对比为依据）。

## 架构原则（长期）
1) Astro 内置优先：`getRelativeLocaleUrl`, `getCollection` 等取代自建 URL/内容服务。
2) 数据结构胜于代码：单文件多语言 + 明确 frontmatter 结构，而非运行期拼装。
3) 最少 JS：仅在需要交互时使用 React，其他为 Astro 纯组件。
4) 可删除性：任何模块都必须“可被删除且影响可预测”。

## 附：常见重构清单（供 Claude 执行时逐项打勾）
- [ ] `src/utils/url-service.ts` 内部薄化且行为一致（Phase 0 保留文件，Phase 5 评估移除）
- [ ] `src/components/audio/*` 内部瘦身且 DOM/类名一致（仅删除确证无用的管理器/工具）
- [ ] `Navigation.astro` 使用 `getRelativeLocaleUrl`
- [ ] 所有页面使用 `utils/hreflang` 统一输出
- [ ] `BaseLayout.astro` 无内联 GA/初始化脚本
- [ ] `[...slug].astro` 仅依赖 `getCollection` 与 `translations`
- [ ] 内容迁移完成：`src/content/games/<locale>/` 目录移除
- [ ] 法务页改为“模板 + 内容集合”，删除重复大文件

> “Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.”
