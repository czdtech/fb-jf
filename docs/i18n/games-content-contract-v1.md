# Games Content Contract v1（硬信息点对齐）

> 目的：让 `src/content/games/*` 的多语言页面像“结构化数据”一样可对齐、可批量维护、可机器校验。
>
> 核心原则：
> - 英文 `*.en.md` 是唯一事实源（Single Source of Truth）。
> - 各语言标题文本可以不同，但结构语义由 **i18n 注释标记**决定。
> - 硬信息点（iframeSrc / 键位 / 数值 / FAQ 集合与顺序 / hard-sync frontmatter）必须严格一致。

## 1. 范围与文件映射（Scope）

- 仅作用于：`src/content/games/`
- 文件命名与映射：
  - 英文事实源：`src/content/games/<slug>.en.md`
  - 其它语言：`src/content/games/<slug>.<locale>.md`
  - 其中 `<slug>` 应与 frontmatter `urlstr` **完全一致**（不含首尾 `/`）。

支持的 locale（当前）：`en | zh | ja | es | fr | de | ko`

## 2. 语义标记（i18n markers）

### 2.1 Section markers

使用 HTML 注释作为“段落锚点”，不影响页面渲染：

```md
<!-- i18n:section:controls -->
### Controls Guide
...
```

**规范：**
- 标记必须单独占一行。
- 标记应紧贴其对应 section 的 heading（建议放在 heading 上方）。
- 校验/抽取以 marker 为准，不依赖 heading 文案。

#### 标准 section 名称（v1）

| section | 建议顺序 | 是否必需 | 用途 |
|---|---:|---:|---|
| `introduction` | 1 | ✅ | 游戏介绍/背景 |
| `how-to-play` | 2 | ✅（推荐） | 玩法步骤/规则说明（**数值抽取范围**） |
| `rules` | 3 | ⛳️ 可选 | 更严格的规则说明（**数值抽取范围**） |
| `tips` | 4 | ⛳️ 可选 | 策略/技巧（**数值抽取范围**） |
| `controls` | 5 | ✅ | 操作方式（**键位抽取范围**） |
| `faq` | 6 | ✅ | FAQ（**FAQ ID 序列抽取范围**） |

> 说明：`how-to-play` / `rules` / `tips` 至少应有一个存在，用于承载“玩法硬信息点”；若该游戏确实无明确规则/数值，也可以留空但仍建议保留 `how-to-play`。

### 2.2 FAQ ID markers

在每条 FAQ 的“问题”前写入稳定 ID（单独一行）：

```md
<!-- i18n:faq:id=faq:<slug>:<kebab-prefix>-<hash8> -->
**1. How do I win?**
...
```

**规则：**
- FAQ ID 只在英文缺失时生成；一旦存在，不因问题文本修改而变化。
- 其它语言必须使用与英文完全一致的 FAQ ID **集合与顺序**（顺序也属于硬信息点）。

## 3. Controls（键位）写法要求

### 3.1 键位必须用 inline code

Controls 中涉及的键位/动作 token 必须使用行内代码（反引号）：

```md
- Move: `W` `A` `S` `D`
- Jump: `Space`
```

### 3.2 推荐的 key token 命名

为降低多语言差异与误报，建议使用如下规范（可逐步迁移）：

- 字母键：`W` `A` `S` `D`（单字母大写）
- 功能键：`Space` `Enter` `Shift` `Ctrl` `Alt` `Esc` `Tab` `Backspace`
- 方向键：`ArrowUp` `ArrowDown` `ArrowLeft` `ArrowRight`（如历史内容使用 `↑` `↓` `←` `→` 也可，但建议统一为 `Arrow*`）
- 鼠标动作：`Click` `LeftClick` `RightClick` `Drag`

> 校验时以 token 集合为准：各语言 token 集合必须与英文一致（描述文本可本地化）。

## 4. 数值（Numbers）对齐规则

### 4.1 抽取范围

仅从以下 section 内抽取数值 token：
- `<!-- i18n:section:how-to-play -->`
- `<!-- i18n:section:rules -->`
- `<!-- i18n:section:tips -->`

### 4.2 抽取来源

仅从 Markdown AST 的 **文本节点**抽取，避免把结构性序号（如有序列表 `1.` `2.`）误当成游戏数值。

### 4.3 比较方式

数值 token 采用 **multiset**（包含重复次数）对齐：
- 语言版本不得缺失/新增/重复改变任何数值 token
- 单位/语序可本地化，但 token 本身（如 `10s` `50%` `3`）必须一致

## 5. frontmatter 字段分类（跨语言一致性）

### 5.1 hard-sync（必须与英文逐字符一致）

以下字段属于 hard-sync（缺失/额外也视为错误）：
- `urlstr`
- `iframeSrc`
- `thumbnail`
- `releaseDate`
- `score`
- 以及任何“明显属于 URL/路径”的字段（例如 `*Url` / `*URL` / `*Src` / `*Path`）

> 注意：当前存量中，部分语言可能缺少 `releaseDate`/`developer` 等字段；目标状态是逐步补齐并与英文一致。

### 5.2 localizable（允许翻译）

- `title`
- `description`
- `excerpt`（若存在）

### 5.3 configurable（建议一致但可按需调整）

- `tags` / `keywords`（建议保持同一语义集合，必要时可本地化扩展）

## 6. 最小示例（推荐模板）

```md
---
locale: en
urlstr: "example-game"
title: "Example Game"
description: "..."
iframeSrc: "https://example.com/"
thumbnail: /new-images/thumbnails/example-game.png
score: "4.9/5  (1234 votes)"
releaseDate: 2025-01-01
tags: ["casual"]
---

<!-- i18n:section:introduction -->
### Game Introduction
...

<!-- i18n:section:how-to-play -->
### How to Play
Win in 3 rounds within 60s.

<!-- i18n:section:controls -->
### Controls Guide
- Move: `W` `A` `S` `D`
- Action: `Space`

<!-- i18n:section:faq -->
### Frequently Asked Questions (FAQ)
<!-- i18n:faq:id=faq:example-game:how-do-i-win-7f3a2c1d -->
**1. How do I win?**
...
```

