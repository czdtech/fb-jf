# 风险点与修复方案（Risk Fix Plan）

> 目标：把当前仓库中已识别的主要风险点沉淀为可执行的修复计划，包含：风险说明、影响范围、涉及文件、修复方案（最小改动/推荐方案）、以及验收标准。

## 项目背景（简述）

- 技术栈：Astro 5 + Node.js（ESM）
- 页面类型：静态站点构建输出（SEO 导向），游戏通过 iframe 懒加载嵌入
- 多语言：通过 `src/pages/<locale>/...` 手动路由 + `hreflang` + 自定义 language switcher 脚本实现（Astro 内建 i18n 已关闭）

## 风险清单总览

| ID  | 风险点                                                                  | 严重度 | 主要影响                                           | 主要位置                                                                                                                          |
| --- | ----------------------------------------------------------------------- | -----: | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| R1  | 数据源分裂：`src/data/games.js` 与 `astro:content` 双轨并存             |     高 | 列表/Trending 与详情/分类不一致，维护成本高        | `src/data/games.js`、`src/pages/*/games/*`、`src/components/*Trending*`、`src/pages/[gameSlug].astro`、`src/pages/c/[slug].astro` |
| R2  | Trending 随机逻辑原地 `sort()` 修改 `allGames`，导致全局污染/构建不稳定 |     高 | 构建输出不稳定、分页顺序可能被污染、难以做快照对比 | `src/components/TrendingGames.astro`、`src/components/IndexTrendingGames.astro`                                                   |
| R3  | 多语言首页仍使用旧模板（未统一 `BaseLayout`），逻辑/脚本重复            |  中-高 | SEO/head/脚本初始化漂移，修复成本高                | `src/pages/de/index.astro` 等                                                                                                     |
| R4  | `LANGUAGE_PREFIXES` 重复定义多处                                        |     中 | 扩语言/改前缀规则易漏改，bug 隐蔽                  | Header/Footer/Nav/Categories/GameCard/GameLayout/language-switcher 等                                                             |
| R5  | 分类页 tags 假设过强：slug 生成可能冲突（`Puzzle` vs `puzzle`）         |     中 | 生成重复路由、构建期冲突/覆盖                      | `src/pages/c/[slug].astro`                                                                                                        |
| R6  | 脚本依赖 `node --experimental-strip-types`，对 Node 版本敏感            |     中 | CI/新机器执行校验脚本不稳定                        | `package.json` scripts、`scripts/*.mts`                                                                                           |

---

## R1：数据源分裂（`games.js` vs `astro:content`）

### 风险说明（R1）

当前站点存在两套“游戏列表/元数据”来源：

- `astro:content`（`src/content/games/*.md`）
  - 用于：游戏详情页（`/[gameSlug]/`）与分类页（`/c/[slug]/`）
- `src/data/games.js`（`allGames` 数组）
  - 用于：列表分页页（`/games/` 及各语言版本）与 Trending 模块

两套数据很容易出现不同步：新增/下架/改标题/改缩略图时，需要改两份，否则会出现“列表能点但详情不存在（404）”、“详情存在但列表不展示”等问题。

### 影响范围（R1）

- 维护成本：高
- SEO/UX 风险：中-高（死链、内容不一致、hreflang/ canonical 误配）

### 涉及文件（R1，非穷举）

- `src/data/games.js`
- `src/pages/games/[...page].astro` 以及 `src/pages/<locale>/games/[...page].astro`
- `src/components/TrendingGames.astro`
- `src/components/IndexTrendingGames.astro`
- `src/pages/[gameSlug].astro`（内容集合详情页）
- `src/pages/c/[slug].astro`（分类页）

### 修复方案（R1）

#### 方案 A（推荐）：统一以 `astro:content` 为唯一真源（Single Source of Truth）

- **目标**：所有列表/Trending/分页都从 `getCollection('games')` 派生，只以 `locale === 'en'` 的 canonical 条目作为基础列表。

##### 实施步骤（R1-A）

1. 新增一个共享模块（建议放 `src/data/` 或 `src/lib/`）
   - 提供 `getCanonicalGames()`：内部调用 `getCollection('games')`，过滤 `locale === 'en'`，并映射到统一的卡片结构（slug/title/thumbnail/…）。
2. 将 `/games/` 与各语言 `/xx/games/` 分页页的数据源从 `allGames` 改为 `getCanonicalGames()` 的结果。
3. 将 Trending 组件改为使用同一份 canonical 列表（并修复 R2：不要原地排序）。
4. 如无历史包袱，可逐步弃用 `src/data/games.js`（或保留但改为构建期自动生成产物）。

##### 验收标准（R1-A）

- 新增/删除一个 canonical 游戏 markdown 后：
  - 详情页路由可访问
  - `/games/` 列表自动出现/消失
  - Trending 自动同步
- `npm run build` 后产物不出现死链（可配合 sitemap/URL 快照脚本验证）

#### 方案 B（最小改动）：保留双源，但新增“同步校验”硬门禁

- **目标**：继续使用 `src/data/games.js`，但通过脚本保证其与 `astro:content` 至少“同集合一致”。

##### 实施步骤（R1-B）

1. 新增校验脚本（例如 `scripts/validate-games-js-sync.mts`）：
   - 读取 `src/data/games.js` 中的 href/slug
   - 扫描 `src/content/games/*.md` 的 canonical 条目（按 `urlstr`/slug 对齐）
   - 输出缺失/多余项，并 `process.exit(1)`
2. 把校验脚本接入 `npm run test` 或 CI。

##### 验收标准（R1-B）

- 当 `games.js` 与 content 不一致时，CI/本地 test 会失败并给出明确报错。

---

## R2：Trending 原地 `sort()` 污染全局数组（构建不稳定）

### 风险说明（R2）

`Array.prototype.sort()` 会原地修改数组。当前 Trending 组件对 `allGames` 做随机排序：

- 可能影响其他使用 `allGames` 的页面（如分页顺序）
- 导致每次构建产物不一致（快照对比、SEO diff、缓存命中都受影响）

### 涉及文件（R2）

- `src/components/TrendingGames.astro`
- `src/components/IndexTrendingGames.astro`

### 修复方案（R2）

#### 方案 A（推荐，最小改动）：拷贝后再 shuffle/sort

- 将 `allGames.sort(...)` 改为：
  - `const shuffled = [...allGames].sort(...)` 或写一个不修改原数组的 shuffle

#### 方案 B（可选）：构建输出可重复（引入 seed）

- 使用固定 seed（例如日期/commit hash）做伪随机，保证同一版本构建一致。

#### 方案 C（更 SEO/可控）：取消随机，改为确定性排序

- 例如按 `score` 或 `releaseDate` 或固定名单优先。

##### 验收标准（R2）

- 同一 commit 连续执行两次 `npm run build`，Trending 列表顺序保持一致（若选择确定性方案）
- `allGames` 的分页顺序不受 Trending 影响

---

## R3：多语言首页旧模板未统一 `BaseLayout`

### 风险说明（R3）

英文首页已使用 `BaseLayout`（统一 SEOHead/BaseHead/Analytics/Header/Footer），但多语言首页仍存在大段手写 HTML，导致：

- 多份 head/analytics/脚本初始化逻辑并存
- 更容易出现语言切换脚本重复绑定（旧实现 + 新模块）
- 维护成本高（改一次要改多份）

### 涉及文件（R3）

- `src/pages/de/index.astro`
- `src/pages/es/index.astro`
- `src/pages/fr/index.astro`
- `src/pages/ja/index.astro`
- `src/pages/ko/index.astro`

### 修复方案（R3）

#### 方案 A（推荐）：分两阶段统一

- **阶段 1（结构统一）**：把多语言首页迁移到 `BaseLayout`，复用 `Header/Footer/SEOHead/BaseHead/Analytics`。
- **阶段 2（模板复用）**：抽一个共享的 `HomePage` 组件/模板，语言页只传入 `title/description/lang` 与少量差异文案。

#### 方案 B（最小改动）：只移除旧的语言切换/导航脚本

- 保留旧 HTML 结构，但确保只初始化一次 `initLanguageSwitcher`。

##### 验收标准（R3）

- 所有语言首页都输出一致的 `<head>` 结构（至少 analytics/基础 meta 一致）
- 语言切换在所有语言首页行为一致且无重复事件监听

---

## R4：`LANGUAGE_PREFIXES` 多处重复定义

### 风险说明（R4）

`LANGUAGE_PREFIXES` 在多个组件/脚本中重复出现，任何语言扩展或规则变更都需要修改多处，且容易漏改。

### 涉及文件（R4，部分）

- `src/components/Header.astro`
- `src/components/Footer.astro`
- `src/components/Nav.astro`
- `src/components/Categories.astro`
- `src/components/GameCard.astro`
- `src/components/TrendingGames.astro`
- `src/layouts/GameLayout.astro`
- `src/scripts/language-switcher.ts`

### 修复方案（R4）

#### 方案 A（推荐）：统一用 `i18n/utils.ts` 的 locale 与 `getLocalizedPath()`

- 组件只接收 `lang`（如 `zh-CN`），内部通过 `getLocaleFromLangAttr(lang)` 得到 locale（如 `zh`），再统一用 `getLocalizedPath()` 拼路径。

#### 方案 B：集中导出一份前缀函数

- 在单一文件中导出 `getPrefixFromLangAttr(lang)` 或 `LANGUAGE_PREFIXES`，其余文件只 import。

##### 验收标准（R4）

- 仓库内仅保留 1 处语言前缀映射源（或全部改为 `getLocalizedPath`）
- 新增语言时只需改一个文件

---

## R5：分类页 tag slug 可能冲突

### 风险说明（R5）

分类页基于 canonical games 的 `tags` 生成静态路径。

- 当前去重依赖 tag 字符串本身，但 slugify 会转小写
- 若存在 `Puzzle` 与 `puzzle`（或前后空格差异），可能生成同一个 `/c/puzzle/`，导致冲突

### 涉及文件

- `src/pages/c/[slug].astro`

### 修复方案（R5）

#### 方案 A（推荐）：在生成 slug 前统一标准化 tag

- 在收集 tags 时：`normalize = tag.trim().toLowerCase()`，并仅以 normalize 作为 key。
- 对展示名再做格式化（首字母大写等）。

#### 方案 B（配套）：增加 tags 规范校验脚本

- 校验 canonical games 的 tags 均为小写、无首尾空格。

##### 验收标准（R5）

- 构建期不会出现重复分类路径
- 同一分类不会因大小写差异重复出现

---

## R6：脚本依赖 `node --experimental-strip-types`

### 风险说明（R6）

多个脚本通过 `node --experimental-strip-types` 运行 `.mts`，对 Node 版本有要求；不同环境可能失败。

### 涉及位置（R6）

- `package.json` 中的 `baseline:i18n` / `validate:*` 等
- `scripts/*.mts`

### 修复方案（R6）

#### 方案 A（推荐工程化）：固定 Node 版本

- 在 `package.json` 增加 `engines.node`
- 在 CI / 本地开发说明中固定 Node 版本（例如 `nvm`/`volta`）

#### 方案 B：统一用 `tsx` 执行 TS 脚本

- 把相关命令替换为 `tsx scripts/xxx.mts`（并在 devDependencies 确保 `tsx` 可用）

##### 验收标准（R6）

- 在干净环境中执行 `npm run validate:i18n` 稳定可复现

---

## 推荐落地顺序（Roadmap）

### P0（立刻修，收益最大）

- 修复 **R2：Trending 原地 sort 污染**（几分钟级别，降低不可预期输出）
- 修复 **R5：分类 tag 标准化**（避免潜在路由冲突）

### P1（结构性改造）

- 处理 **R1：统一数据源**（推荐方案 A）
- 处理 **R4：收敛语言前缀生成**（统一到 `getLocalizedPath` 或单点导出）

### P2（维护性与一致性）

- 处理 **R3：多语言首页统一 BaseLayout**（分阶段）

### P3（工程稳定性）

- 处理 **R6：脚本执行方式/Node 版本固定**

---

## 常用验证命令（建议）

- `npm run build`
- `npm run validate:i18n`
- `npm run validate:pages`
- `npm run test`

> 如果你选择做 R1（统一数据源），建议在改动后额外跑 sitemap/URL/SEO 快照与对比脚本，确认链接与 meta 输出符合预期。
