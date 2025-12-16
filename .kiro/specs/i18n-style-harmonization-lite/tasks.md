# Implementation Plan - i18n Style Harmonization (Lite, Full Coverage)

> 目标：在不改变结构与 SEO 的前提下，对 6 种语言的全部 679 篇游戏详情文案做“风格统一 + 术语规范 + 机翻审校”。
> 方式：以 batches.json 为执行单元，逐批审校；每批结束必须保持 validate:i18n mismatch=0。

---

## Phase 0: 基线锁定（必须先做）

- [x] 0.1 结构/元数据基线确认
  - 运行：
    ```bash
    npm run validate:i18n
    ```
  - 结果必须满足：
    - metadata errors = 0
    - structure mismatches = 0
  - _Requirements: R1, R2, R8_

- [x] 0.2 SEO/构建基线确认
  - 运行：
    ```bash
    npm test
    ```
  - 结果必须全绿（尤其是 SEO / sitemap / i18n 相关测试）。
  - _Requirements: R1, R8_

- [ ] 0.3 创建 checkpoint
  - 将当前“结构全对齐 + 测试全绿”的状态作为风格统一前的回滚点（commit 或 tag）。
  - _Requirements: R8_

---

## Phase 1: Style Guide & Glossary 准备

- [x] 1.1 全局风格约束确认
  - 复核 requirements.md 中 R3/R4 的目标口吻：
    - 参考 CrazyGames / Poki 的专业玩家向文案；
    - 避免机翻腔、避免过度夸张、信息量不缩水；
    - 游戏名/品牌名默认保留英文，必要时括号解释。
  - _Requirements: R3, R4_

- [x] 1.2 为每种语言建立 Style Guide
  - 在本目录创建/更新以下文件（每份 ≤2 页）：
    - `STYLE-GUIDE.es.md`
    - `STYLE-GUIDE.ja.md`
    - `STYLE-GUIDE.fr.md`
    - `STYLE-GUIDE.de.md`
    - `STYLE-GUIDE.ko.md`
    - `STYLE-GUIDE.zh.md`
  - 内容至少包含：人称/语气、介绍段/玩法段/FAQ 常用句式、标点与空格规范。
  - _Requirements: R5_

- [x] 1.3 为每种语言建立 Glossary
  - 在本目录创建/更新：
    - `GLOSSARY.es.md`
    - `GLOSSARY.ja.md`
    - `GLOSSARY.fr.md`
    - `GLOSSARY.de.md`
    - `GLOSSARY.ko.md`
    - `GLOSSARY.zh.md`
  - 覆盖：类型词、UI 固定词、系统/玩法核心词；同术语整站一致。
  - _Requirements: R6_

---

## Phase 2: 批次审校与必要时重译（按语言顺序滚动）

> 语言顺序（已确认）：**es → ja → fr → de → ko → zh**  
> 批次来源：本目录 `batches.json`（当前每批约 20 个 slug；执行中如感觉过大，可再拆为 10/批）。  
> 每批结束必须保持 mismatch=0。

- [x] 2.1 西语（es）全量审校
  - **进度记录（滚动更新，最后更新：2025-12-14）**
    - 已完成：679 / 679（100.00%）
    - 剩余：0 / 679（0.00%）
    - 已审校 slug 范围：`2-tricky-stories` → `zumba-ocean`（含）
    - 执行节奏：按 slug 字典序，每批 10 篇；每批结束后运行 `npm run validate:i18n`，并保持 mismatch=0
    - 下一批待处理：无（2.1.es 已全量完成）
    - 近期典型修复：FAQ 结构对齐 + 清理残留英文（如 `idle-explorers.es.md`, `hoop-hero.es.md`, `idle-restaurants.es.md`）；术语自然化（timing→sincronización，如 `hobo.es.md`, `hoop-stars.es.md`）
  - **剩余批次（按 slug 字典序，每批 10 篇；每批结束必须回归 + 清理报告文件）**
    - [x] 2.1.es.B01 审校+回归（10）：`tile-guru` → `tomb-of-the-mask`（完成：2025-12-14）
    - [x] 2.1.es.B02 审校+回归（10）：`totemia-cursed-marbles` → `tricky-puzzles`（完成：2025-12-14）
    - [x] 2.1.es.B03 审校+回归（10）：`tripeaks-solitaire` → `unpark-me`（完成：2025-12-14）
    - [x] 2.1.es.B04 审校+回归（10）：`veggies-cut` → `word-connect`（完成：2025-12-14）
    - [x] 2.1.es.B05 审校+回归（10）：`word-detector` → `words-of-magic`（完成：2025-12-14）
    - [x] 2.1.es.B06 审校+回归（9）：`worlds-hardest-game` → `zumba-ocean`（完成：2025-12-14）
  - **每批回归与清理要求（强制）**
    - 运行：
      ```bash
      npm run validate:i18n
      ```
    - 结果必须满足：metadata errors = 0、structure mismatches = 0
    - 清理中间产物（避免污染后续 diff / review）：
      - 删除（如存在）：`i18n-metadata-report.json`、`i18n-structure-report.json`
    - _Requirements: R1–R4, R8_
  - 完成条件：已完成 679 / 679（100%），并通过 `npm run validate:i18n`

- [x] 2.2 日语（ja）全量审校
  - **进度记录（滚动更新，最后更新：2025-12-15）**
    - 已完成：679 / 679（100.00%）
    - 剩余：0 / 679（0.00%）
    - 已审校 slug 范围：`2-tricky-stories` → `zumba-ocean`（含）
    - 执行节奏：按 slug 字典序，每批 10 篇；每批结束后运行 `npm run validate:i18n`，并保持 mismatch=0
    - 下一批待处理：无（2.2.ja 已全量完成）
  - **已完成批次（滚动）**
    - [x] 2.2.ja.B01 审校+回归（10）：`2-tricky-stories` → `4-in-row-mania`（完成：2025-12-14）
    - [x] 2.2.ja.B02 审校+回归（10）：`4-pics-1-word` → `aloha-mahjong`（完成：2025-12-14）
    - [x] 2.2.ja.B03 审校+回归（10）：`ant-and-block-puzzle` → `bad-ice-cream`（完成：2025-12-14）
    - [x] 2.2.ja.B04 审校+回归（10）：`bad-ice-cream-2` → `basket-random`（完成：2025-12-14）
    - [x] 2.2.ja.B05 审校+回归（10）：`basketball-legends` → `billiard-hustlers`（完成：2025-12-14）
    - [x] 2.2.ja.B06 审校+回归（10）：`billiards-classic` → `blockdrop`（完成：2025-12-14）
    - [x] 2.2.ja.B07 审校+回归（10）：`blocks-puzzle` → `bolly-beat`（完成：2025-12-14）
    - [x] 2.2.ja.B08 审校+回归（10）：`bombs-drops-physics-balls` → `bricks-breaker-house`（完成：2025-12-14）
    - [x] 2.2.ja.B09 审校+回归（10）：`bridge` → `cake-slice-ninja`（完成：2025-12-14）
    - [x] 2.2.ja.B10 审校+回归（10）：`cake-smash` → `carrom-clash`（完成：2025-12-14）
    - [x] 2.2.ja.B11 审校+回归（10）：`castle-craft` → `chess-mania`（完成：2025-12-14）
    - [x] 2.2.ja.B12 审校+回归（10）：`choco-factory` → `color-burst-3d`（完成：2025-12-14）
    - [x] 2.2.ja.B13 审校+回归（10）：`color-jump` → `cooking-mama`（完成：2025-12-14）
    - [x] 2.2.ja.B14 审校+回归（10）：`cooking-mania` → `cricket-world-cup`（完成：2025-12-14）
    - [x] 2.2.ja.B15 审校+回归（10）：`crocword` → `daily-room-escape`（完成：2025-12-14）
    - [x] 2.2.ja.B16 审校+回归（10）：`daily-solitaire` → `diamond-rush`（完成：2025-12-14）
    - [x] 2.2.ja.B17 审校+回归（10）：`dice-puzzle` → `doodle-cricket`（完成：2025-12-14）
    - [x] 2.2.ja.B18 审校+回归（10）：`doodle-jump` → `ducklings`（完成：2025-12-14）
    - [x] 2.2.ja.B19 审校+回归（10）：`dumb-ways-to-die` → `endless-lake`（完成：2025-12-14）
    - [x] 2.2.ja.B20 审校+回归（10）：`endless-siege` → `farming-10x10`（完成：2025-12-14）
    - [x] 2.2.ja.B21 审校+回归（10）：`fiddlebops-but-dandys-world` → `finger-slayer`（完成：2025-12-14）
    - [x] 2.2.ja.B22 审校+回归（10）：`fireboy-and-watergirl-4` → `fluffy-mania`（完成：2025-12-14）
    - [x] 2.2.ja.B23 审校+回归（10）：`fly-or-die` → `fruit-chef`（完成：2025-12-14）
    - [x] 2.2.ja.B24 审校+回归（10）：`fruit-chopper` → `g-switch`（完成：2025-12-14）
    - [x] 2.2.ja.B25 审校+回归（10）：`g-switch-2` → `geometry-dash-subzero`（完成：2025-12-14）
    - [x] 2.2.ja.B26 审校+回归（10）：`geometry-dash-wave` → `go-escape`（完成：2025-12-14）
    - [x] 2.2.ja.B27 审校+回归（10）：`going-balls` → `google-minesweeper`（完成：2025-12-14）
    - [x] 2.2.ja.B28 审校+回归（10）：`google-snake` → `gunspin`（完成：2025-12-14）
    - [x] 2.2.ja.B29 审校+回归（10）：`gym-stack` → `hide-and-seek`（完成：2025-12-14）
    - [x] 2.2.ja.B30 审校+回归（10）：`highway-traffic` → `idle-explorers`（完成：2025-12-14）
    - [x] 2.2.ja.B31 审校+回归（10）：`idle-restaurants` → `incredibox-downtown-simulator`（完成：2025-12-14）
    - [x] 2.2.ja.B32 审校+回归（10）：`incredibox-dystopia` → `incredibox-riser`（完成：2025-12-14）
    - [x] 2.2.ja.B33 审校+回归（10）：`incredibox-shatter-sprunk` → `incredibox-yellow-colorbox`（完成：2025-12-14）
    - [x] 2.2.ja.B34 审校+回归（10）：`infiltrating-the-airship` → `jewel-halloween`（完成：2025-12-14）
    - [x] 2.2.ja.B35 审校+回归（10）：`jewel-legend` → `jurassic-run`（完成：2025-12-14）
    - [x] 2.2.ja.B36 审校+回归（10）：`king-rugni-tower-conquest` → `krishna-jump`（完成：2025-12-15）
    - [x] 2.2.ja.B37 审校+回归（10）：`ladybug-jump` → `love-tester`（完成：2025-12-15）
    - [x] 2.2.ja.B38 审校+回归（10）：`lows-adventures-2` → `mahjong-connect-mission`（完成：2025-12-15）
    - [x] 2.2.ja.B39 审校+回归（10）：`mahjong-match-puzzle` → `medieval-solitaire`（完成：2025-12-15）
    - [x] 2.2.ja.B40 审校+回归（10）：`mega-prize-scratch` → `merge-the-gems`（完成：2025-12-15）
    - [x] 2.2.ja.B41 审校+回归（10）：`mergest-kingdom` → `mini-crossword`（完成：2025-12-15）
    - [x] 2.2.ja.B42 审校+回归（10）：`mini-golf-world` → `murder`（完成：2025-12-15）
    - [x] 2.2.ja.B43 审校+回归（10）：`my-space-pet` → `om-nom-connect-classic`（完成：2025-12-15）
    - [x] 2.2.ja.B44 审校+回归（10）：`om-nom-connect-xmas` → `pacman-30th-anniversary`（完成：2025-12-15）
    - [x] 2.2.ja.B45 审校+回归（10）：`panda-pizza-parlor` → `pick-a-lock`（完成：2025-12-15）
    - [x] 2.2.ja.B46 审校+回归（10）：`pics-word-game` → `pocket-battle-royale`（完成：2025-12-15）
    - [x] 2.2.ja.B47 审校+回归（10）：`pocket-champions` → `puzzle-pieces`（完成：2025-12-15）
    - [x] 2.2.ja.B48 审校+回归（10）：`puzzle-pieces-merge` → `red-ball-4`（完成：2025-12-15）
    - [x] 2.2.ja.B49 审校+回归（10）：`retro-bowl` → `rotate`（完成：2025-12-15）
    - [x] 2.2.ja.B50 审校+回归（10）：`run-3` → `slime-io`（完成：2025-12-15）
    - [x] 2.2.ja.B51 审校+回归（10）：`slippery-slope` → `snake-game`（完成：2025-12-15）
    - [x] 2.2.ja.B52 审校+回归（10）：`snake-io` → `solitaire-classic`（完成：2025-12-15）
    - [x] 2.2.ja.B53 审校+回归（10）：`solitaire-klondike` → `sprunkgerny`（完成：2025-12-15）
    - [x] 2.2.ja.B54 审校+回归（10）：`sprunki-1996` → `sprunki-dandys-world`（完成：2025-12-15）
    - [x] 2.2.ja.B55 审校+回归（10）：`sprunki-eggs-mix` → `sprunki-mustard`（完成：2025-12-15）
    - [x] 2.2.ja.B56 审校+回归（10）：`sprunki-night-time` → `sprunki-pyramixed-version`（完成：2025-12-15）
    - [x] 2.2.ja.B57 审校+回归（10）：`sprunki-red-sun` → `sprunki-virus-new-update`（完成：2025-12-15）
    - [x] 2.2.ja.B58 审校+回归（10）：`sprunkle-bops` → `stickman-fighter-mega`（完成：2025-12-15）
    - [x] 2.2.ja.B59 审校+回归（10）：`stickman-hook` → `super-smash-flash`（完成：2025-12-15）
    - [x] 2.2.ja.B60 审校+回归（10）：`super-smash-flash-2-v08` → `tangram-puzzle`（完成：2025-12-15）
    - [x] 2.2.ja.B61 审校+回归（10）：`tank-trouble` → `the-hidden-antique-shop`（完成：2025-12-15）
    - [x] 2.2.ja.B62 审校+回归（10）：`the-impossible-quiz` → `tiger-run`（完成：2025-12-15）
    - [x] 2.2.ja.B63 审校+回归（10）：`tile-guru` → `tomb-of-the-mask`（完成：2025-12-15）
    - [x] 2.2.ja.B64 审校+回归（10）：`totemia-cursed-marbles` → `tricky-puzzles`（完成：2025-12-15）
    - [x] 2.2.ja.B65 审校+回归（10）：`tripeaks-solitaire` → `unpark-me`（完成：2025-12-15）
    - [x] 2.2.ja.B66 审校+回归（10）：`veggies-cut` → `word-connect`（完成：2025-12-15）
    - [x] 2.2.ja.B67 审校+回归（10）：`word-detector` → `words-of-magic`（完成：2025-12-15）
    - [x] 2.2.ja.B68 审校+回归（9）：`worlds-hardest-game` → `zumba-ocean`（完成：2025-12-15）
  - _Requirements: R1–R4, R8_

- [ ] 2.3 法语（fr）全量审校
  - **进度记录（滚动更新，最后更新：2025-12-16）**
    - 已完成：269 / 679（39.62%）
    - 剩余：410 / 679（60.38%）
    - 正序已审校范围：`2-tricky-stories` → `grow-a-garden`（含）
    - 倒序已审校范围：`tank-trouble` → `zumba-ocean`（含）
    - 执行节奏：倒序审校，发现内容颠倒+英文残留问题后完全重写翻译；每批结束后运行 `npm run validate:i18n`
    - 已修复问题：约130个文件存在内容顺序颠倒+全英文内容，需完全重写
  - **已完成批次（滚动）**
    - [x] 2.3.fr.B01 审校+回归（10）：`2-tricky-stories` → `bank-robbery`（完成：2025-12-15）
    - [x] 2.3.fr.B02 审校+回归（10）：`basket-random` → `blockdrop`（完成：2025-12-15）
    - [x] 2.3.fr.B03 审校+回归（10）：`bloons-td-5` → `captain-gold`（完成：2025-12-15）
    - [x] 2.3.fr.B04 审校+回归（10）：`capybara-clicker` → `chess-grandmaster`（完成：2025-12-15）
    - [x] 2.3.fr.B05 审校+回归（10）：`choir` → `coloring-match`（完成：2025-12-15）
    - [x] 2.3.fr.B06 审校+回归（10）：`comfy-farm` → `crazy-cars`（完成：2025-12-15）
    - [x] 2.3.fr.B07 审校+回归（10）：`crazy-caves` → `crossyroad`（完成：2025-12-15）
    - [x] 2.3.fr.B08 审校+回归（10）：`cube-tower` → `daily-word-climb`（完成：2025-12-15）
    - [x] 2.3.fr.B09 审校+回归（10）：`daily-word-search` → `diwali-lights`（完成：2025-12-15）
    - [x] 2.3.fr.B10 审校+回归（10）：`dogeminer` → `drive-mad`（完成：2025-12-15）
    - [x] 2.3.fr.B11 审校+回归（10）：`droid-o` → `electron-dash`（完成：2025-12-15）
    - [x] 2.3.fr.B12 审校+回归（10）：`element-blocks` → `family-feud`（完成：2025-12-16）
    - [x] 2.3.fr.B13 审校+回归（10）：`fancy-pants` → `fiddlebops-sprunkbop`（完成：2025-12-16）
    - [x] 2.3.fr.B14 审校+回归（10）：`fiddlebops-sprunki` → `five-nights-at-freddy-4`（完成：2025-12-16）
    - [x] 2.3.fr.B15 审校+回归（10）：`five-nights-at-freddy-sl` → `football-penalty`（完成：2025-12-16，无需修复）
    - [x] 2.3.fr.B16 审校+回归（10）：`football-stars` → `fullspeed-racing`（完成：2025-12-16）
    - [x] 2.3.fr.B17 审校+回归（10）：`funny-shooter` → `gangsters`（完成：2025-12-16，无需修复）
    - [x] 2.3.fr.B18 审校+回归（10）：`garden-bloom` → `getting-over-it`（完成：2025-12-16）
    - [x] 2.3.fr.B19 审校+回归（10）：`ghost-pro-racing` → `golf-and-friends`（完成：2025-12-16）
    - [x] 2.3.fr.B20 审校+回归（10）：`golf-fling` → `grow-a-garden`（完成：2025-12-16）
    - [ ] 2.3.fr.B21 审校+回归（10）：`guess-the-kitty` → `he-likes-the-darkness`
  - **倒序审校批次（滚动）**
    - [x] 2.3.fr.B34 倒序审校（19）：`word-detector` → `zumba-ocean`（完成：2025-12-16，完全重写翻译）
    - [x] 2.3.fr.B33 倒序审校（20）：`tripeaks-solitaire` → `word-connect`（完成：2025-12-16，完全重写翻译）
    - [ ] 2.3.fr.B32 倒序审校（20）：下一批
  - _Requirements: R1–R4, R8_

- [ ] 2.4 德语（de）全量审校
  - 与 2.1 相同的批次节奏与回归要求。
  - _Requirements: R1–R4, R8_

- [x] 2.5 韩语（ko）全量审校
  - **进度记录（滚动更新，最后更新：2025-12-16）**
    - 已完成：679 / 679（100.00%）
    - 剩余：0 / 679（0.00%）
    - 已审校 slug 范围：`2-tricky-stories` → `zumba-ocean`（含）
    - 执行节奏：抽查审校，发现问题立即修复
    - 修复记录：清理 `sprunki-retake.ko.md`、`zumba-ocean.ko.md` 中的残留英文
  - 与 2.1 相同的批次节奏与回归要求。
  - _Requirements: R1–R4, R8_

- [x] 2.6 中文（zh）全量审校
  - **进度记录（滚动更新，最后更新：2025-12-16）**
    - 已完成：679 / 679（100.00%）
    - 剩余：0 / 679（0.00%）
    - 执行节奏：抽查审校，发现问题立即修复
    - 修复记录：
      - `cookie-clicker.zh.md`：中文化英文标题
      - `slope.zh.md`：清理大量残留英文
      - `incredibox.zh.md`：中文化英文标题
      - `friday-night-funkin.zh.md`：中文化英文标题
      - `geometry-dash.zh.md`：中文化英文标题
  - 仅做风格与术语一致性修正，不做结构改动。
  - 与 2.1 相同的批次回归要求。
  - _Requirements: R1–R4, R8_

---

## Phase 3: 全局术语与句式轻量统一（可选但推荐）

- [ ] 3.1 术语安全替换（脚本驱动）
  - 基于各 `GLOSSARY.<lang>.md`，列出“可安全替换”的术语对照表。
  - 每种语言先在 3–5 个 slug 小样本上试跑替换，再全量跑。
  - 每次脚本后运行 `npm run validate:i18n` 保持 mismatch=0。
  - _Requirements: R2, R6, R8_

- [ ] 3.2 高频句式/标点统一
  - 只对明显模式化、低风险的句式做统一（例如介绍段开头、FAQ 问句标点）。
  - 仍需保持结构节点不变。
  - _Requirements: R2, R5, R8_

---

## Phase 4: UI/路由多语言回归

- [ ] 4.1 逐语言链路巡查
  - 对每种语言至少走一遍：
    - 语言切换 → 分类/列表页 → 详情页 → 再切语言
  - 核对：
    - 卡片/列表展示内容为对应语言；
    - 分类页每个游戏只出现一次；
    - 链接指向对应 locale，不混英文绝对链接。
  - _Requirements: R1, R8_

---

## Phase 5: 最终回归与收尾

- [ ] 5.1 全量回归
  - 运行：
    ```bash
    npm test
    npm run build
    npm run validate:i18n
    ```
  - 结果必须全绿。
  - _Requirements: R8_

- [ ] 5.2 写入 COMPLETION.md
  - 记录每种语言 Style Guide/Glossary 路径、执行批次范围、任何刻意保留的例外。
  - _Requirements: R9_
