# FiddleBops UI/UX 改进报告

按优先级排序的 UI/UX 问题及修复建议。

---

## ✅ 本地校验结果（基于 `npm run dev` / `http://localhost:4321/`）

校验环境：
- **日期**：2026-01-07
- **视口**：375×812（移动端）、1280×800（桌面端）
- **方法**：浏览器自动化复现（点击/滚动/读取 computed style）

结论摘要：
- **#1 移动端导航菜单透明**：**已修复（本地不复现）**
- **#2 移动端首页网格过密**：**仍存在（375px 下 `.game-grid` 为 3 列）**
- **#3 响应式断点不一致**：**仍存在（首页 3 列 vs 分类页 2 列）**
- **#4 详情页内容层级**：**仍存在（Trending 在 About 之前）**
- **#5 页脚年份**：**实现已正确（动态年份）；文档描述过时**
- **#6 控制说明突出**：**部分存在（有 Controls 段落，但无专用“卡片”样式/结构）**

## 🔴 高优先级（Critical）

### 1. 移动端导航菜单透明问题

**问题描述**：汉堡菜单展开后，导航链接叠加在页面内容之上，没有背景色，导致文字完全无法阅读。

**本地校验结论**：**不复现（已修复）**

- **证据**：375px 打开菜单时，`.nav-menu.active` 的 computed 背景为 `rgba(10, 10, 10, 0.95)`，并且 `opacity=1`、`visibility=visible`。
- **实现落点**：
  - `public/main.css`：移动端（`@media (max-width: 768px)`）下 `header .nav-menu` 使用 `background: var(--color-nav-overlay)`，并通过 `.nav-menu.active` 切换可见性。
  - `public/styles/variables.css`：`--color-nav-overlay` 定义遮罩背景色。
  - `src/components/Header.astro` + `src/scripts/nav-toggle.ts`：汉堡按钮切换 `.nav-menu.active`。

**修复建议（仅当未来改坏时参考）**：
```css
.nav-menu.active {
  background: linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%);
  /* 或者使用 backdrop-filter: blur(10px); 配合半透明背景 */
}
```

---

### 2. 移动端首页网格过密

**问题描述**：在 375px 视口下，首页"Popular Games"仍使用 3 列网格，卡片过小难以点击。

**本地校验结论**：**复现（需修）**

- **证据**：首页 375px 下 `.game-grid` 的 computed `gridTemplateColumns = repeat(auto-fit, minmax(140px, 1fr))`，实际布局为 **3 列**。
- **实现落点**：
  - `public/main.css`：`.game-grid` 定义为 `repeat(auto-fit, minmax(var(--grid-min-card), 1fr))`，并在 `@media (max-width: 768px)` 下使用 `--grid-min-card-sm`。
  - `public/styles/variables.css`：`--grid-min-card-sm: 140px`（这是 375px 下“挤出 3 列”的直接原因）。

**修复建议（推荐）**：新增更小的移动端断点（例如 480px），强制 1–2 列（而不是靠 min-width 试探）。
```css
@media (max-width: 480px) {
  .game-grid {
    grid-template-columns: repeat(2, 1fr);
    /* 或 repeat(1, 1fr) 单列 */
  }
}
```

**验收标准**：
- 375px 下 `.game-grid` **不超过 2 列**
- 仍保持卡片可点击且不出现横向滚动

---

## 🟡 中优先级（Major）

### 3. 响应式断点不一致

**问题描述**：不同页面的网格列数在相同视口下不一致：
- 首页：3 列（过多）
- 游戏详情页 Trending Games：2 列
- 分类页：5 列（桌面端）

**本地校验结论**：**成立（需统一）**

- **证据**：
  - 首页 375px：`.game-grid` **3 列**
  - 分类页（如 `/c/puzzle/`）375px：`.game-grid` **2 列**
  - 分类页 1280px：`.game-grid` **4 列**

**修复建议**：统一断点规则

| 视口宽度 | 列数 |
|---------|------|
| < 480px | 1-2 列 |
| 480-768px | 2-3 列 |
| 768-1024px | 3-4 列 |
| > 1024px | 4-5 列 |

---

### 4. 游戏详情页内容层级问题

**问题描述**："About" 描述被放在 "Trending Games" 下方，用户需要滚动过其他无关内容才能看到游戏介绍。

**本地校验结论**：**复现（需修）**

- **证据**：详情页中 `Trending Games` 区块出现在 `About <game>` 之前（用户必须先滚过 Trending 才能看到介绍）。
- **实现落点**：`src/layouts/GameLayout.astro` 当前结构为：
  - `<TrendingGames ... />`
  - `<section class="about" ...> ... </section>`

**修复建议**：
将页面布局调整为：
1. 游戏 iframe
2. **About 描述**（紧跟游戏下方）
3. How to Play 控制说明（单独卡片）
4. Trending Games

---

## 🟢 低优先级（Minor）

### 5. 页脚版权年份错误

**位置**：所有页面页脚

**问题描述**：年份显示错误（历史问题）。

**本地校验结论**：**实现已正确；文档描述过时**

- **证据**：本地页脚显示 `© 2026 ...`，且 `new Date().getFullYear()` 为 2026（与当前年份一致）。
- **实现落点**：`src/components/Footer.astro` 默认 `year = new Date().getFullYear()`。

**修复建议（仅当未来被改坏时参考）**：动态生成年份（应在组件/模板层做，而不是 DOM 注入脚本）
```javascript
const year = new Date().getFullYear();
document.querySelector('.copyright').textContent = `© ${year} FiddleBops.`;
```

---

### 6. 控制说明缺乏视觉突出

**问题描述**：游戏控制说明（如鼠标操作）混在文字段落中，用户难以快速定位。

**本地校验结论**：**部分成立**

- **证据**：详情页内容里有 `Controls Guide` 段落，但目前没有专用 `.controls-card` 容器/样式（整体仍像正文的一部分）。

**修复建议**：创建专用控制说明卡片（结构或样式至少满足其一）
```html
<div class="controls-card">
  <h3>🎮 How to Play</h3>
  <ul>
    <li><kbd>Click</kbd> - 选择角色</li>
    <li><kbd>Drag</kbd> - 放置到舞台</li>
  </ul>
</div>
```

**实现落点建议（两条路二选一，别两边都糊）**：
- **内容结构化**：在游戏内容源（`src/content/games/*`）里为 controls/how-to-play 生成可识别容器（如 `.controls-card`），再用 CSS 统一样式。
- **纯样式增强**：在 `public/main.css` / `public/styles/components.css` 里对详情页的 controls 区块做明确视觉分组（标题、边框、背景、间距、`kbd` 样式）。

---

## 📊 审计数据

| 页面 | 问题数 | 严重程度 |
|------|--------|----------|
| 首页（桌面端） | 0 | ✅ |
| 首页（移动端） | 3 | 🔴🟡 |
| 游戏详情页 | 2 | 🟡🟢 |
| 分类页 | 0 | ✅ |
