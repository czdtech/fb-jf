# 内容运营与数据规则（Decap + Astro Content）

> 目标：保证 **URL 稳定（SEO 安全）**、列表页/侧栏/Mod 页 **可配置且不硬编码**、Trending **可接入 GA4**。

## 1) Canonical 规则（最重要）

- 站内所有游戏内容在 `src/content/games/`
- **英文 canonical** 文件名固定为：`<urlstr>.en.md`
- 路由与 canonical 唯一来源：`urlstr`（不允许重复）

已加约束（测试）：`tests/content/ContentConstraints.test.ts`

## 2) Decap CMS（新增/编辑游戏）

- 后台入口：`/admin/`
- CMS 只索引英文 canonical（`*.en.md`），避免 4753 文件导致卡死
- 已开启 `use_graphql: true`（减少 GitHub API 请求数，提升列表加载速度）
- 新增游戏时：
  - `urlstr` 必须唯一、且只用 `a-z0-9-`
  - 文件名会按 `urlstr` 生成（`<urlstr>.en.md`）
  - 图片上传默认到：`public/new-images`（引用路径 `/new-images/...`）

排查后台“能打开但数据加载不出来”：
- 确认你登录的 GitHub 账号对仓库有写权限（至少要能 push）
- 确认 OAuth 代理（`backend.base_url`）可访问
- 清理一次浏览器站点数据（localStorage/sessionStorage）后重试

## 3) 列表页数据来源（已动态化）

- `/update-games/`：从 canonical 游戏集合动态分页生成（每页 60）
- `/sprunki-mod/`、`/incredibox-mod/`、`/fiddlebops-mod/`：按 `modType` 从 canonical 动态筛选生成

## 3.1) Taxonomy（分类/标签）

- `tags` 用于 **关键词**（SEO keywords / 推荐 / 搜索）  
- 但不会为所有 tag 都生成分类页（避免大量“只有 1 个游戏”的薄内容页）
- 只为 **核心分类** 生成 `/c/<slug>/` 页面（与首页 Categories 区块一致）

### 3.1.1) tags 约定（少而精）

建议约定：
- 全部小写、去掉首尾空格
- 多词用连字符：`tower-defense`、`2-player`（避免 `tower defense` / `2 player` 这种重复）

辅助脚本：
```bash
npm run tags:report
npm run tags:normalize
```

如果你只生成核心分类页 `/c/<slug>/`，建议每个游戏至少带 1 个核心分类 tag。可用脚本做“最佳猜测”回填（先 dry-run 看结果再写入）：

```bash
npm run backfill:coreTags
npm run backfill:coreTags -- --write
```

## 4) 侧栏（New / Popular）

字段（写在英文 canonical 的 frontmatter）：
- `sidebarNew: 1..4`
- `sidebarPopular: 1..4`

规则：
- 同一个列表内 **slot 不能重复**
- 不足 4 个时会用 canonical 列表自动兜底补齐

## 4.1) Featured（Trending 置顶/精选）

字段（写在英文 canonical 的 frontmatter）：
- `featured: true | false`
- `featuredRank: 1..3`（当 `featured: true` 时必填，用于排序；不允许重复）

规则：
- 最多展示 3 个，按 `featuredRank` 升序
- 允许只设置 1–2 个（不补齐）
- 若全站没有任何 `featured: true` 的内容配置，组件会回退到历史默认 slugs（仅兜底，避免 UI 直接变空）

## 5) releaseDate（用于排序）

- `releaseDate` 用于 update-games、分类页等排序
- 历史缺失值可一次性回填（默认按 **文件首次提交时间**）：

```bash
npx tsx scripts/backfill-release-date.mts
```

有些历史文件可能是 ISO 字符串（如 `2025-10-18T00:00:00.000Z`），可统一规范为 `YYYY-MM-DD`（推荐，方便 CMS 与 diff）：

```bash
npm run normalize:releaseDate          # dry-run
npm run normalize:releaseDate -- --write
```

可选：
- `--mode=updated`：按最近一次提交时间回填（更像“最近更新”）
- `--force`：覆盖已有 releaseDate

## 6) Trending（GA4）

页面组件读取：`src/data/trending.json`

### 6.1) 展示数量口径（总数含 featured）

- 首页 Trending：总数 15（含 featured）
- 详情页 Trending：总数 50（含 featured）
- 组件：
  - `src/components/IndexTrendingGames.astro`
  - `src/components/TrendingGames.astro`

生成脚本：
```bash
npm run generate:trending
```

必需环境变量：
- `GA4_PROPERTY_ID`
- `GA4_CLIENT_EMAIL`
- `GA4_PRIVATE_KEY`（支持 `\\n`）

常用可选：
- `TRENDING_WINDOW_DAYS=7`（线上默认 7 天）

两种口径：
- **PV 口径（默认）**：`screenPageViews` + `pagePath`
- **Play 点击口径（线上使用）**：设置 `GA4_EVENT_NAME=play_click`（脚本会改用 `eventCount` 并按 eventName 过滤）

### 6.2) Featured 优先级与兜底

- Featured 来源：优先读取内容 frontmatter（`featured: true` + `featuredRank`）
- 旧的 `featuredSlugs` 仅在“完全没有配置任何 featured”时启用作为兜底

### 6.3) 定时生成（GitHub Actions）

已内置工作流：`.github/workflows/update-trending.yml`

使用方法：
1. 在 GitHub 仓库 `Settings -> Secrets and variables -> Actions` 添加 3 个 Secrets：
   - `GA4_PROPERTY_ID`
   - `GA4_CLIENT_EMAIL`
   - `GA4_PRIVATE_KEY`
   - 备注：`GA4_PRIVATE_KEY` 可直接粘贴 PEM（多行）或使用 `\\n` 形式的换行，脚本都会处理。
2. 工作流会每天定时运行（也可手动触发），生成 `src/data/trending.json` 并 **自动 commit/push** 到 `main`，从而触发站点重新部署（如果你使用的是基于 main 的自动部署）。

## 7) 分享（Share）

- 已移除 AddToAny（不再加载第三方分享脚本）
- 改为自研组件 `src/components/ShareButtons.astro`：
  - 支持 Web Share API（可用则显示）
  - 支持复制链接
  - 支持主流平台分享链接（点击才跳转，不在页面加载时请求第三方）
