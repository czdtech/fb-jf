# 游戏内容编辑指南（hardpoints 联动）

> 适用范围：仅 `src/content/games/*`。  
> 一致性口径：只要求同一 `urlstr/slug` 的跨语言版本一致（英文为唯一事实源）。

## 1) 哪些修改会触发“全语言联动”

只要你在英文 `*.en.md` 改动了以下任一项，就应该认为其它语言需要同步（至少跑一次对齐器）：

### 1.1 hard-sync frontmatter（逐字符一致）

hard-sync 规则见：`docs/i18n/games-content-contract-v1.md`。典型包括：
- `urlstr`
- `iframeSrc`
- `thumbnail`
- `releaseDate`
- `score`
- 以及任何明显属于 URL/路径的字段（`*Url` / `*URL` / `*Src` / `*Path` 等）

### 1.2 iframeSrc

- `iframeSrc` 属于硬信息点，必须与英文逐字符一致（所有语言）。

### 1.3 Controls 键位 token（集合对齐）

- 仅抽取 `<!-- i18n:section:controls -->` 内的 inline code（反引号）作为 key token。
- **要求**：所有语言的 key token **集合**与英文一致（顺序不强制一致）。
- 英文缺少 Controls section 时，视为空：其它语言不得引入 key tokens。

### 1.4 玩法数值 token（multiset 对齐）

- 仅在 `how-to-play / rules / tips` 这几个 section 内抽取数值 token（数字/百分比/时间等）。
- **要求**：所有语言的 tokenCounts 与英文一致（包含重复次数）。

### 1.5 FAQ（ID 集合 + 顺序对齐）

- FAQ 的硬信息点是 **FAQ ID 序列**：集合与顺序都必须与英文一致。
- 英文缺少 FAQ section 时，视为空：其它语言不得新增 FAQ。

## 2) FAQ 编辑指南

### 2.1 英文（事实源）怎么改

- 允许改 Q/A 文案，但**不要**删除/重写已有的 `<!-- i18n:faq:id=... -->`
- 新增一条 FAQ：
  - 推荐：新增后立刻为该问题添加一个新的 `i18n:faq:id`（并按最终顺序放好）
  - 注意：FAQ 的**顺序**也属于硬信息点，后续所有语言必须跟随
- 删除一条 FAQ：
  - 会导致所有语言都需要删除对应条目（并保持其余顺序一致）

### 2.2 其它语言怎么改

- **不允许**改动/重排 FAQ ID（ID 行要原样保留）
- 只翻译问题/答案内容即可
- 如果某语言需要“本地化补充”FAQ：先在英文补齐（英文是事实源），再同步到其它语言

## 3) Controls 编辑指南

### 3.1 写法要求（强制）

- 键位必须使用 inline code，例如：
  - `W` `A` `S` `D` `Space` `Shift`
- token 的“内容”要稳定，尽量复用现有英文写法（减少误报与手工对齐成本）

### 3.2 常见坑

- 把 `Spacebar` 写成 `Space Bar`（token 不同，会被当成差异）
- 在其它语言里补充了新的按键 token，但英文没有（会导致 hardpoints mismatch）

## 4) 数值编辑指南

- 尽量保持数字 token 本身不变（例如 `10s`、`50%`、`3x`）。
- 不要把关键数字“意译成文字”（例如把 `10s` 写成 “十秒”），除非英文也这么写（否则会造成 token 不一致）。
- 注意：为了降低噪音，抽取器会忽略一部分容易误报的情况（如纯单个数字 `3`、无单位小数等）。这不代表可以随意改动关键数值，只是门禁不强制这些噪音点。

## 5) 一键自检/修复（推荐命令）

- 只检查 hardpoints：`npm run validate:i18n-hardpoints`
- 生成 hardpoints 差分报告：`npm run report:i18n-hardpoints`
- 对齐单个 slug（英文改动后必做）：  
  `npx tsx scripts/align-i18n-hardpoints.mts --slug <slug> --locale zh,ja,es,fr,de,ko --apply`

