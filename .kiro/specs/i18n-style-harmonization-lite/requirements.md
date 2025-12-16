# Requirements - i18n Style Harmonization (Lite, Full Coverage)

## R1. 不破坏结构与 SEO

- 不修改任何 URL / slug / urlstr / iframeSrc / thumbnail / tags / score /
  releaseDate / locale 字段值。
- 不调整 src/pages 与 src/layouts 中的路由与 SEO 逻辑。

## R2. Markdown 结构只读

- 不增删标题节点，保留与英文 canonical 完全一致的标题层级与顺序。
- 不增删列表项、FAQ 问答条数，只允许在原有节点中修改文案内容。
- 不修改代码块、引用块的结构；如需修改，只能改块内文案，不改块本身。

## R3. 信息完整性

- 不允许“缩写翻译”：不得删除整段介绍、玩法说明、FAQ 条目等内容。
- 可以重写句式、调整语气，但必须保留原文的信息量与要点。

## R4. 翻译风格目标（全局）

- 整体风格参考大型 H5 游戏站（如 CrazyGames / Poki）：
  - 清晰说明玩法与特色；
  - 略带营销感，但不过度夸张；
  - 保持可读性和专业度。
- 品牌名、游戏名默认保留英文（Wordle, UNO, Sprunki 等），
  需要时可在文中用括号补充本地语言解释。

## R5. 每种语言必须有 Style Guide

- 为每种语言创建一份不超过 2 页的 STYLE-GUIDE.<lang>.md，内容包括：
  - 人称/语气（例如 zh: 用“你”，es: 约定使用 tú 或 usted 等）；
  - 介绍段、玩法段、FAQ 的常用句式模板；
  - 标点规范（中西文空格、引号、问号前空格等）。

## R6. 每种语言必须有术语表

- 为每种语言创建 GLOSSARY.<lang>.md：
  - 常见类型词：puzzle, platformer, idle, roguelike, shooter, runner 等；
  - UI 固定词：Play, Start, Pause, Level, Stage, Wave, Combo 等；
  - 系统词：leaderboard, daily challenge, achievements, power-up 等。
- 同一术语在整站内的翻译必须统一（允许在 Glossary 中记录少数有意保留的例外）。

## R7. 范围（全量覆盖）

- 本任务覆盖全部 6 种语言下的 679 篇游戏详情页：
  - src/content/games/*.zh.md
  - src/content/games/*.ja.md
  - src/content/games/*.es.md
  - src/content/games/*.fr.md
  - src/content/games/*.de.md
  - src/content/games/*.ko.md
- 不再区分 Top N 与长尾；统一使用“按 slug 排序 + 批次滚动”的模式，
  最终实现 679 x 6 全量覆盖。

## R8. 回归校验

- 每个阶段（或每若干批次）必须运行 npm run validate:i18n：
  - 确保 metadata 合法；
  - 确保结构 mismatch 维持在 0。
- 在关键里程碑（例如某语言完成、所有语言完成）需要运行 npm test：
  - 特别关注 tests/i18n/* 和 tests/components/SEOPreservation.test.ts。

## R9. 变更记录

- 完成后在本目录新增 COMPLETION.md，记录：
  - 每种语言 Style Guide / Glossary 文件路径；
  - 实际完成的语言与覆盖范围；
  - 如有特意保留的风格例外，也要在此说明原因。

