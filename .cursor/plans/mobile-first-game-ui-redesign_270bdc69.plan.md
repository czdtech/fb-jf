---
name: mobile-first-game-ui-redesign
overview: 在不损失 SEO（只能增强）的前提下，并且不允许页面结构发生重大变化（DOM 骨架/区块顺序/语义层级稳定），把站点升级成移动优先的“游戏产品站”视觉体系；优先覆盖 `/`、`/:gameSlug/` 与多语言首页，确保 URL/Meta/结构化数据/内容输出可回归验证且稳定。
todos:
  - id: seo-guardrails
    content: 把 SEO 护栏与回归门禁纳入改造流程（build + snapshot:seo/sitemap/urls + compare + tests），确保无回退
    status: completed
  - id: structure-freeze
    content: 增加“页面结构冻结”护栏与门禁（关键路由 DOM 骨架/标题层级/nav-footer 链接快照 + diff），只允许样式与少量属性/类名增量
    status: completed
  - id: design-tokens
    content: 重定义 public/styles/variables.css 为“明亮游戏产品站”tokens（颜色/排版/圆角/阴影/动效/可访问性）
    status: completed
  - id: base-css-reset
    content: 重做 public/main.css：浅色基底+高对比文字、移除全局 block 链接副作用、sticky footer、移动优先排版默认值、浮层不挡 CTA
    status: completed
  - id: header-mobile-first
    content: 在结构冻结前提下改造 src/components/Header.astro：移动端抽屉/覆盖导航（尽量 CSS 实现），菜单链接保持在 HTML 内（可爬），语言切换样式与可访问性
    status: completed
  - id: homepage-redesign
    content: 在结构冻结前提下改造 src/components/HomePage.astro + public/styles/homepage.css：移动优先 hero、横滑卡片轨道、统一卡片语言；保留 SEO_COPY/hreflang/长文内容不删除
    status: completed
  - id: gamepage-redesign
    content: 在结构冻结前提下改造 src/layouts/GameLayout.astro + public/styles/components.css：以 Play 为核心的视觉层级、aspect-ratio 游戏容器降 CLS、相关内容移动端横滑；保持 meta/JSON-LD 不回退
    status: completed
  - id: i18n-typography
    content: 为多语言首页补齐字体 fallback、断行策略与长文案适配（基于 html[lang] 选择器）
    status: completed
  - id: ui-smoke-optional
    content: （可选）加入 headless Playwright UI smoke：访问首页/多语言首页/示例游戏页并截图+收集 console errors
    status: completed
---

# SEO 安全 + 结构冻结的移动优先游戏站视觉重做计划

## 目标

- **风格**：明亮卡通/玩具感的“游戏产品站”。
- **移动优先**：先把 390px 做到产品级体验，再向上增强桌面。
- **重点页面**：`/`、`/:gameSlug/`、多语言首页（同一套组件/样式一致）。
- **SEO**：**不允许损失**，只能增强；所有改动必须可回归验证。
- **结构稳定（次于 SEO）**：不允许页面结构发生重大变化；以 CSS 为主完成布局与视觉升级，DOM 骨架/区块顺序/语义层级保持稳定。

## SEO 不可触碰的护栏（写死在执行标准里）

- **URL/路由不变**：不改 `src/pages` 的路径结构、不改 slug 规则。
- **Meta 不变（除非加法增强）**：保持现有 `<title>`、`description`、canonical、hreflang、robots/noindex 行为一致；只允许补充缺失项或增强语义。
- **SSR HTML 可爬**：关键内容/链接必须在服务端 HTML 中；不把主体内容“靠 JS 注入”或默认折叠到需要点击才出现的容器里（避免被判为隐藏内容）。
- **标题层级稳定**：每页一个 H1；现有关键词覆盖的正文不删除，只做排版与组织。
- **结构化数据保留**：JSON-LD（Game）继续输出，字段不减少。
- **内部链接不缩水**：Header/Footer/面包屑/相关推荐等内部链接保持或增强（提升抓取与分发）。

## 页面结构冻结护栏（次于 SEO）

定义“重大结构变化”并明确禁止项：**SEO > 结构稳定 > 视觉升级**。

- **DOM 骨架稳定**：`main` 下的一级内容区块（sections/主要容器）**不增删、不换序**；不把长文/相关推荐/游戏容器等模块挪位置。
- **语义层级稳定**：标题层级（H1/H2/H3）与关键语义标签（nav/main/footer/aside）不做破坏性替换；不为了样式把语义改回 div。
- **阅读顺序稳定**：禁止用 `order`/绝对定位等手段改变主要内容的阅读顺序（避免可访问性/SEO 误伤）。
- **链接结构稳定**：Header/Footer 的链接集合与层级不缩水；允许“加法增强”（新增链接/更清晰的入口），但不移除/改写现有链接目标。
- **允许的最小改动**：新增 class/数据属性、补充 aria、为样式增加**少量**内部 wrapper（仅在现有区块内部；不得新增新的顶层区块）。

## 回归验证（把 SEO 风险变成“可量化门禁”）

利用项目里已有脚本（package.json 已提供），并补一个“结构快照”门禁：

- **改动前基线**：
- `npm run build`
- `npm run snapshot:seo`
- `npm run snapshot:sitemap`
- `npm run snapshot:urls`
- `npm run snapshot:structure`（新增：关键路由 DOM 骨架/标题层级/nav-footer 链接）
- **改动后对比**：
- `npm run build`
- `npm run snapshot:seo:after` + `npm run compare:seo`
- `npm run snapshot:sitemap:after` + `npm run compare:sitemap`
- `npm run snapshot:urls:after`（对比 URL 列表数量/前缀分布）
- `npm run snapshot:structure:after` + `npm run compare:structure`（新增：结构差异只允许 class/属性/少量内部 wrapper）
- **单测门禁**：`npm test`（含 SEOHead、sitemap 等测试）。

## 新视觉设计语言（落地为可维护的 tokens）

在 [public/styles/variables.css](public/styles/variables.css) 建立“明亮游戏站”基础：

- **色彩**：浅背景 + 高对比文字 + 品牌主色（橙）+ 辅助强调色；明确 `--color-focus`。
- **排版**：统一字号/行高/标题 scale；CJK fallback（按 `html[lang]`）。
- **组件形状**：圆角体系（按钮/卡片/面板），阴影克制，hover 不用廉价 scale 抖动。
- **动效**：统一 duration/easing，支持 `prefers-reduced-motion`。

## 设计系统规格（像素级：所有页面/组件统一引用）

你说“每一个像素”，我就把像素收敛到可维护的 token 上：**任何新增的尺寸，只能来自 tokens**。否则后续改一次 UI，要全站找魔法数字，那就是自找死路。

### 断点（mobile-first）

- **XS**：`< 480px`（默认）
- **SM**：`>= 480px`
- **MD**：`>= 768px`
- **LG**：`>= 1024px`
- **XL**：`>= 1280px`
- **2XL**：`>= 1440px`

### 版心与阅读宽度

- **全局容器 `.container`**（保留现有类名，减少结构扰动）：  
- XS：`padding-inline: 16px`
- MD：`padding-inline: 24px`
- XL：`max-width: 1200px; margin: 0 auto; padding-inline: 24px`
- **长文阅读宽度**（隐私/条款/游戏正文/长内容）：`max-width: 68ch`

### 4px 网格与间距（统一的“每一个像素”来源）

- **基础网格**：4px（任何新增 margin/padding 只能取该 scale）
- **间距 tokens（将写入 `public/styles/variables.css`）**：
- `--spacing-0: 0px`
- `--spacing-1: 4px`
- `--spacing-2: 8px`
- `--spacing-3: 12px`
- `--spacing-4: 16px`
- `--spacing-5: 20px`
- `--spacing-6: 24px`
- `--spacing-7: 32px`
- `--spacing-8: 40px`
- `--spacing-9: 48px`
- `--spacing-10: 64px`
- **区块垂直节奏（section spacing）**：
- XS：上下间距 `24px`（= `--spacing-6`）
- MD：上下间距 `32px`（= `--spacing-7`）
- XL：上下间距 `40px`（= `--spacing-8`）

### 排版系统（字号/行高/字重）

- **基础正文**：`16px / 24px`（移动端默认）
- **小字**：`14px / 20px`
- **标题 scale**：
- `h1`：
- XS：`28px / 34px`，`font-weight: 700`（Poppins 已有 700）
- MD：`36px / 44px`
- `h2`：
- XS：`22px / 28px`，`font-weight: 700`
- MD：`28px / 34px`
- `h3`：
- XS：`18px / 24px`，`font-weight: 700`
- MD：`20px / 26px`
- **段落间距**：`12px`（= `--spacing-3`）
- **列表项间距**：`8px`（= `--spacing-2`）

### 字体策略（多语言）

保持现有 Poppins（见 [src/components/BaseHead.astro](src/components/BaseHead.astro)），并在 `html[lang]` 上做 fallback，避免 CJK 渲染像拼图。

- `html[lang^="zh"]`：`system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`
- `html[lang="ja"]`：`"Noto Sans JP", system-ui, sans-serif`
- `html[lang="ko"]`：`"Noto Sans KR", system-ui, sans-serif`
- CJK 行高：`1.65`（仅在 CJK lang 下覆盖）

### 色彩（明亮卡通/玩具感，保证对比度）

原则：**浅背景 + 深文字**；品牌橙做强调，不做大面积底色。

- 背景/面板：
- `--color-bg-primary`: `#F6F7FF`
- `--color-bg-card`: `#FFFFFF`
- `--color-bg-gray`: `#EEF2FF`
- 文字：
- `--color-text-primary`: `#111827`
- `--color-text-muted`: `#4B5563`
- `--color-text-light`: `#6B7280`
- 品牌/强调：
- `--color-primary`: `#FF7A00`
- `--color-primary-dark`: `#E86200`
- `--color-secondary`: `#00C2FF`
- 边框：
- `--color-border`: `rgba(17, 24, 39, 0.12)`
- `--color-border-light`: `rgba(17, 24, 39, 0.08)`
- 链接：
- `--color-link`: `#0EA5E9`
- `--color-link-hover`: `#0284C7`
- focus：
- `--color-focus-shadow`: `rgba(14, 165, 233, 0.45)`

### 圆角/阴影/边框（质感来自一致性）

- 圆角 tokens：
- `--radius-sm: 12px`（按钮/输入）
- `--radius-md: 16px`（小卡片/标签）
- `--radius-lg: 20px`（游戏卡片）
- `--radius-xl: 24px`（hero 面板/大容器）
- 阴影 tokens（hover 用阴影+轻微位移，禁止 scale）：
- `--shadow-sm: 0 1px 2px rgba(17, 24, 39, 0.08)`
- `--shadow-md: 0 8px 20px rgba(17, 24, 39, 0.12)`
- `--shadow-lg: 0 14px 34px rgba(17, 24, 39, 0.16)`

### 动效（可控，不炫技）

- `--transition-fast: 120ms cubic-bezier(0.2, 0.8, 0.2, 1)`
- `--transition-normal: 180ms cubic-bezier(0.2, 0.8, 0.2, 1)`
- `prefers-reduced-motion: reduce` 下禁用位移与滚动吸附动画

### 可访问性与交互硬指标

- 最小点击面积：44x44px
- focus ring：`outline: 3px solid rgba(14,165,233,.55); outline-offset: 2px`
- 对比度：正文 AA（4.5:1），大字至少 3:1

## 页面/组件清单（覆盖全站，避免实现时“漏上下文”）

### 入口与全局样式

- CSS/资源入口：
- [src/components/BaseHead.astro](src/components/BaseHead.astro) 引入 `/main.css`
- [public/main.css](public/main.css) 全站基础样式（必须清掉全局副作用，如 `a { display:block }`）
- [public/styles/variables.css](public/styles/variables.css) tokens
- [public/styles/homepage.css](public/styles/homepage.css) 首页增量
- [public/styles/components.css](public/styles/components.css) 组件共享增量

### 组件规格（按文件逐个列出）

- [src/components/Analytics.astro](src/components/Analytics.astro)
- 不属于视觉组件，但属于“上线真实世界”：必须继续遵守同意前不加载第三方脚本（GA/AdSense）的合规模型；改 UI 时不得破坏其注入时机。
- [src/components/BaseHead.astro](src/components/BaseHead.astro)
- 必须继续引入 `/main.css` 与字体资源；不改动 SEO/性能关键的 head 基础结构。
- [src/components/SEOHead.astro](src/components/SEOHead.astro)
- 这是 SEO 输出核心：meta/canonical/hreflang/JSON-LD 不减少，只允许“加法增强”（例如可选的 BreadcrumbList）。
- [src/components/Header.astro](src/components/Header.astro)
- XS：56px 高，左右 16px；抽屉宽 `min(320px,86vw)`；nav 链接必须存在于 HTML（SEO 内链）
- MD+：64px 高；nav 横排；语言选择器 40px 高
- [src/components/Footer.astro](src/components/Footer.astro)
- XS：纵向堆叠；链接行高 44；footer 面板浅底 + 细边框
- MD+：横向布局（允许），但保持同一视觉语言
- [src/components/CookieConsent.astro](src/components/CookieConsent.astro)
- 视觉 tokens 化；出现时不得遮挡 CTA（通过 `main` bottom padding 门禁）
- [src/components/ShareButtons.astro](src/components/ShareButtons.astro)
- XS：禁止 `position: fixed` 悬浮遮挡内容；保持当前 DOM 位置随文档流展示（必要时仅用 CSS 关闭悬浮样式）
- MD+：可保留右下悬浮，但 bottom 必须避开 cookie banner
- [src/components/HomePage.astro](src/components/HomePage.astro)
- 必须提供 H1（SEO 增强，但不改文案）；HeroPanel padding XS 16 / MD 24；CTA 高 44
- Popular/New/Trending/Recent 用统一 rail（卡片宽 160/180/200 随断点增长）
- LongContent 仅排版增强，不删文案
- [src/components/Common.astro](src/components/Common.astro)
- 这是首页的“精选入口”模块（一组固定链接）：视觉上必须复用同一套 GameCard/网格规则；不允许再出现单独的异形样式。
- [src/components/homepage/HomePageLongContent.*.astro](src/components/homepage/)
- 这些是各语言的长文内容：**不改文案结构**，只通过全局 typography（阅读宽度、标题/列表间距、链接样式）提升可读性。
- [src/components/GameCard.astro](src/components/GameCard.astro)
- 标题必须常显（不依赖 hover）；thumbnail 用 16:9；hover 仅位移 + shadow
- [src/components/PopularGames.astro](src/components/PopularGames.astro)
- [src/components/NewGames.astro](src/components/NewGames.astro)
- 保持现有输出结构与链接不变，仅通过 CSS 从“侧边栏 float 列表”呈现升级为 rail/网格模块（仍 SSR）
- [src/components/TrendingGames.astro](src/components/TrendingGames.astro)
- [src/components/IndexTrendingGames.astro](src/components/IndexTrendingGames.astro)
- 卡片样式统一；More 按钮高 44
- [src/components/RecentlyPlayed.astro](src/components/RecentlyPlayed.astro)
- client-only OK；样式必须复用 GameCard 语言；不出现 hover-only 信息
- [src/components/Categories.astro](src/components/Categories.astro)
- XS 2 列 / SM 3 列 / MD 4 列 / XL 6 列；卡片高 56，icon 20，文字 16
- [src/components/SearchSection.astro](src/components/SearchSection.astro)
- input 高 44，圆角 12；结果卡片圆角 16；颜色 tokens 化
- [src/components/StarRating.astro](src/components/StarRating.astro)
- 作为 meta 行组件，保持现有结构，统一颜色与间距
- [src/layouts/GameLayout.astro](src/layouts/GameLayout.astro)
- 首屏 H1 + GameFrame（16:9，min 240px，max 70vh）；Play CTA 不遮挡；slot 内容不折叠（SEO）

### 页面规格（按路由类型覆盖所有页面）

- 首页（英文与多语言）：
- `/`：[src/pages/index.astro](src/pages/index.astro)
- `/{locale}/`：如 [src/pages/zh/index.astro](src/pages/zh/index.astro)、[src/pages/de/index.astro](src/pages/de/index.astro)
- 游戏页（英文与多语言）：
- `/:gameSlug/`：[src/pages/[gameSlug].astro](src/pages/[gameSlug].astro)
- `/{locale}/:gameSlug/`：如 [src/pages/de/[gameSlug].astro](src/pages/de/[gameSlug].astro)
- 列表分页页：
- `/games/*`：[src/pages/games/[...page].astro](src/pages/games/[...page].astro)
- `/update-games/*`：[src/pages/update-games/[...page].astro](src/pages/update-games/[...page].astro)
- `/*-mod/*`：如 [src/pages/fiddlebops-mod/[...page].astro](src/pages/fiddlebops-mod/[...page].astro)（其它同理）
- 分类页：
- `/c/:slug/`：[src/pages/c/[slug].astro](src/pages/c/[slug].astro)
- 搜索页：
- `/search/`：[src/pages/search.astro](src/pages/search.astro)
- 法务/错误页：
- `/privacy/`：[src/pages/privacy.astro](src/pages/privacy.astro)
- `/terms-of-service/`：[src/pages/terms-of-service.astro](src/pages/terms-of-service.astro)
- `/404/`：[src/pages/404.astro](src/pages/404.astro)
- 管理页：
- `/admin/`：[src/pages/admin/index.astro](src/pages/admin/index.astro)（保持 noindex，不纳入 UI 改造）

## 页面规格（像素/断点行为：逐页面类型落地）

这里把你关心的“每一页、每个组件、每个像素”具体化。实现时如果出现偏差，只允许回到这里改规格，不允许开发者现场拍脑袋补丁。

### 首页 `/` 与 `/{locale}/`（HomePage）

对应组件：[src/components/HomePage.astro](src/components/HomePage.astro)

#### XS（<480px，移动优先）

- Header：
- 高 `56px`，`position: sticky; top: 0`（可选，但推荐，符合产品站）
- Logo 点击区域最小 `44x44px`
- 汉堡按钮 `44x44px`
- 语言选择器：高 `40px`，最小宽 `120px`
- Hero（首屏信息架构）：
- 外层：`margin-top: 16px`，`gap: 16px`（纵向堆叠）
- HeroPanel（浅底大面板）：
- `border-radius: 24px`
- `padding: 16px`
- H1：`28/34`，下间距 `8px`
- Subtitle：`14/20`，下间距 `16px`
- CTA Row：
- primary button：高 `44px`，左右 padding `16px`，圆角 `12px`
- secondary link/button：高 `44px`
- gap `12px`
- GamePreview（封面/iframe 容器）：
- `border-radius: 24px; overflow: hidden`
- `aspect-ratio: 16/9`
- Play overlay button：高 `48px`，最小宽 `160px`，圆角 `12px`
- 点击 Play 后加载 iframe；容器尺寸不变（减少 CLS）
- Rails（Popular/New/Trending/RecentlyPlayed）：
- 每个 section 顶部间距：`24px`
- section header：
- H2：`22/28`
- “More” 链接必须可见且可点击（增强内链）
- rail track：
- `overflow-x: auto; display:flex; gap: 12px`
- 左右内边距：`16px`（与 container 对齐）
- card：
- 宽 `160px`
- thumbnail：16:9
- title：2 行截断（常显）
- LongContent（SEO 长文）：
- 不删任何段落/标题，只做排版：`max-width: 68ch`
- h2/h3 使用上面的标题 scale；段落间距 12

#### MD（>=768px，平板/小桌面）

- Hero：
- 允许两列：左（文案+CTA）右（GamePreview）
- 列间距 `24px`
- H1：`36/44`
- GamePreview：最大高度 `520px`（仍基于 16:9 约束）
- Rails：
- card 宽 `200px`
- Trending 可选择切换为网格：3–4 列（仍保持卡片一致）

#### XL（>=1280px，桌面）

- 版心：max 1200
- Rails：
- 如果改网格：5–6 列（优先填满空间，避免右侧死空白）
- hover：
- 卡片 hover：`translateY(-2px)` + `--shadow-md`（禁止 scale）

### 游戏页 `/:gameSlug/` 与 `/{locale}/:gameSlug/`（GameLayout）

对应布局：[src/layouts/GameLayout.astro](src/layouts/GameLayout.astro)

#### XS（<480px）

- 顶部信息：
- Breadcrumb：`14/20`，上间距 `16px`，下间距 `8px`（可爬链接）
- H1：`28/34`（只用主标题，不要把 “Play … Online” 整句塞进 H1）
- Meta 行（评分+tags）：`gap 8px`，上间距 `8px`，下间距 `12px`
- Tag chip：
- 高 `28px`，左右 padding `10px`
- 圆角 `999px`
- GameFrame（核心）：
- `border-radius: 24px; overflow:hidden`
- `aspect-ratio: 16/9`
- `min-height: 240px; max-height: 70vh`
- Play overlay button：高 `48px`，最小宽 `180px`（更强主行动）
- Fullscreen button：`44x44px`，右上角 inset `12px`
- 点击 Play 后：iframe 显示；背景封面隐藏；不改变容器尺寸（控制 CLS）
- 次要动作（Share 等）：
- XS 不做右下角固定悬浮；放在 GameFrame 下方 action row：按钮高 `44px`，gap `12px`
- About（markdown slot 内容）：
- 作为可读面板：`border-radius: 24px; padding: 16px; background: --color-bg-card`
- 绝不折叠（SEO：内容必须可见）
- 相关推荐（Trending/New/Popular）：
- 统一 rail 结构；每段间距 24

#### MD（>=768px）

- H1：`36/44`
- GameFrame：允许更大但不写死高度：
- `max-height: 600px`
- 宽度随 container
- tags：最多显示 10 个（仍用 chip；溢出折叠为 “+N”）

### 列表分页页（/games、/update-games、/*-mod、/c/:slug）

对应页面文件：例如 [src/pages/games/[...page].astro](src/pages/games/[...page].astro)、[src/pages/c/[slug].astro](src/pages/c/[slug].astro)

- XS：
- H1：`28/34`，上间距 16，下间距 8
- 描述 p：`14/20`，下间距 16
- 网格：2 列，gap 12
- 卡片：圆角 20，padding 12
- pagination：按钮高 44，最小宽 44
- SM：3 列
- MD：4 列
- XL：5–6 列

### 搜索页 `/search/`

对应组件：[src/components/SearchSection.astro](src/components/SearchSection.astro)

- XS：
- H1：`28/34`
- input：高 44，圆角 12，padding 0 14
- results：单列，gap 10
- result card：圆角 16，padding 12/14

### 法务/错误页（/privacy、/terms-of-service、/404）

对应页面：[src/pages/privacy.astro](src/pages/privacy.astro)、[src/pages/terms-of-service.astro](src/pages/terms-of-service.astro)、[src/pages/404.astro](src/pages/404.astro)

- `.tab-content`：
- XS：radius 24，padding 16/24
- MD：padding 24/32
- 文本宽度 68ch
- 404 CTA：
- 按钮高 44，圆角 12，居中

## 实施步骤（CSS-first；结构冻结；SEO 仍为底线）

### 1) 基础 CSS “安全重启”（不改入口文件名）

目标文件：[public/main.css](public/main.css)

- body 改为**浅色背景 + 深色正文**（修复对比度灾难）。
- 移除全局副作用：例如全局 `a { display:block }`，改为默认 inline；卡片/导航链接用局部 class。
- `body`/`main` 做 sticky footer（短页不再断层大空白）。
- 建立移动优先的排版默认值（间距、最大宽度、段落可读性）。
- Cookie/Share：保证不遮挡首屏 CTA（通过安全间距或布局调整）。

### 2) Header：移动优先信息架构（同时保证可爬链接）

目标文件：[src/components/Header.astro](src/components/Header.astro)

- **尽量不改 DOM 骨架**：复用现有 nav 链接结构与顺序，通过 CSS 实现移动端抽屉/覆盖式展示；如确需新增，仅允许新增一个 toggle 按钮与一个抽屉容器 wrapper（不移动/不重排链接节点）。
- **SEO 关键**：菜单链接仍在 HTML 中（不靠 JS 生成），只是用 CSS 控制显示。
- 可访问性：focus、ESC、点击遮罩关闭；触控点击面积 >= 44px。

### 3) 首页（含多语言）：先产品首屏，再内容承接

目标文件：[src/components/HomePage.astro](src/components/HomePage.astro)、[public/styles/homepage.css](public/styles/homepage.css)

- **结构冻结**：不改 HomePage 的主要区块顺序与语义（Hero/Rails/LongContent 等）；以 CSS 为主完成移动优先布局与视觉升级。
- hero 单列优先：明确主 CTA（Play）与价值主张（不改文案结构，只改排版与视觉）。
- Popular/New/Trending/Recent 统一卡片语言；移动端使用原生横向滚动轨道（不引库、不换 DOM 结构）。
- **SEO 关键**：保留现有 `SEO_COPY`、hreflang、以及各语言长文内容组件（不删文案，只做排版）。

### 4) 游戏页（/:gameSlug/）：围绕“开玩”组织页面

目标文件：[src/layouts/GameLayout.astro](src/layouts/GameLayout.astro)、[public/styles/components.css](public/styles/components.css)

- **结构冻结**：保持现有内容区块与顺序（标题/标签/评分/游戏容器/正文/相关推荐等），优先用 CSS 强化“开玩”主行动的视觉层级。
- hero：标题/标签/评分 + 游戏容器 + Play CTA（不移动正文与相关推荐区块位置）。
- 游戏容器用 `aspect-ratio`/自适应高度，减少 CLS；Play 前封面明确可点击。
- 相关/热门/新游戏：移动端横滑，桌面端多列。
- **SEO 关键**：保持现有 title/description/canonical/hreflang/JSON-LD 输出；slot 的 markdown 内容不删除。

### 5) 多语言首页的排版专项

- `html[lang^="zh"]` 等：字体栈、行高、断行策略、长按钮文案适配。
- 不改翻译文本本身，避免语义漂移导致收录波动。

### 6) “只增强”的 SEO 增量项（安全、可验证）

- 提升可访问性（focus、对比度、语义标签）作为 SEO 侧向加分。
- 缩略图/关键图片的 alt 与尺寸属性补齐（减少 CLS/提升理解）。
- 内链增强：在不改 URL 的前提下增强“发现路径”（例如更清晰的面包屑/相关推荐入口）。

### 7) 可选：加入 headless UI smoke（回归截图/控制台错误）

- 作为 dev 依赖的 Playwright（headless）巡检 `/`、`/zh/`、随机 1 个 `/:gameSlug/`（含多语言版本），输出截图与 console errors。
- 只做门禁，不影响线上体积。

## 验收标准

- SEO：对比脚本结果 **无回退**（meta/sitemap/urls 不减少；允许“新增增强”）。
- 结构：结构快照 diff **无重大变化**（不增删/不换序主要区块；允许 class/属性增量与少量内部 wrapper）。
- 体验（390x844）：`/`、`/:gameSlug/`、`/zh/`、`/zh/:gameSlug/` 首屏 CTA 不被任何浮层遮挡；点击/滚动顺畅。
- 体验（键盘）：导航抽屉、语言选择、Play、分享均可 Tab 操作且 focus 可见（不允许“键盘走丢”）。
- 视觉一致性：卡片、按钮、输入、标题全部来自 tokens（间距/圆角/阴影/动效），不出现孤立 magic number。
- 工程：不再依赖 float + 固定高度来撑布局；关键区域用 flex/grid/aspect-ratio；全局 CSS 不再有副作用（例如全局 `a { display:block }`）。

## 防止“缺上下文导致瞎改”的执行门禁（实施时强制遵守）

- 改动顺序（严格按依赖推进，避免一次动太多导致定位不了问题）：
- tokens（`public/styles/variables.css`） -> base（`public/main.css`）
- Header（全站入口与内链）
- HomePage（`/` 与所有 `/{locale}/`）
- GameLayout（`/:gameSlug/` 与所有 `/{locale}/:gameSlug/`）
- 最后统一修复列表页/Search/法务页视觉（只动样式，尽量不动文案结构）
- 每个阶段必须跑的门禁：
- `npm run build`
- `npm run snapshot:seo` / `npm run snapshot:seo:after` + `npm run compare:seo`
- `npm run snapshot:sitemap` / `npm run snapshot:sitemap:after` + `npm run compare:sitemap`
- `npm run snapshot:urls` / `npm run snapshot:urls:after`（确认 URL 数量与前缀分布不回退）
- `npm run snapshot:structure` / `npm run snapshot:structure:after` + `npm run compare:structure`（结构冻结门禁）
- `npm test`
- 手工视觉回归（固定 3 个视口 + 4 条路由，避免“看着差不多就算了”）：