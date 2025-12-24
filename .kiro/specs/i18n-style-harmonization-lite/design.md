# Design - i18n Style Harmonization (Lite, Full Coverage)

## 1. 背景

- 已有 679 个英文 canonical 游戏 markdown 文件，以及 6 种语言的本地化
  变体，总计 4753 篇内容文件。
- 通过 full-i18n-content / i18n-structure-alignment 等任务：
  - 所有语言覆盖率为 679 / 679；
  - 结构对齐脚本已验证 0 mismatch；
  - npm run validate:i18n 和 npm test 均已通过。
- 目前问题主要在于：不同语言、不同批次的文案风格不完全统一，
  但“翻译是否存在”已经不是问题。

## 2. 目标

- 不改变结构和 SEO 的前提下，对 6 种语言的全部 679 篇游戏详情文案：
  - 统一人称和语气；
  - 统一介绍段 / 玩法段 / FAQ 的常用句式；
  - 统一核心游戏术语的翻译；
  - 保持原有信息量和结构不变。

## 3. 总体策略

1. 为每种语言补齐 Style Guide 和 Glossary：
   - 明确“应该怎么写”和“术语应该怎么翻”；
   - zh/ja 参考已有 translation-quality-upgrade 文档；
   - es/fr/de/ko 补充同等粒度的说明。
2. 用脚本做可批量自动化的统一：
   - 术语规范：严格依照 Glossary 做词级替换；
   - 高频开头句式统一：只对明显模式化的句式做批处理；
   - FAQ 问句/答句的标点和语气统一。
3. 按 slug 排序，将 679 个游戏切成若干批次（例如每批约 20 个）：
   - 在 batches.json 中记录每个批次包含的 slug；
   - 后续所有“人工审校”都以批次为单位滚动执行。
4. 每完成一个小批次：
   - 必须运行 npm run validate:i18n；
   - 关键节点运行 npm test，保证 SEO 和结构不回退。

## 4. 批次规划与执行顺序

- 批次规划：
  - 从 src/content/games/*.md 中提取 canonical slug 列表；
  - 按字母排序后切分为若干批次（例如 30-40 个批次，每批 15-25 个 slug）。
- 建议的执行顺序：
  1. **es → ja → fr → de → ko → zh**（按 batches.json 逐批滚动）；
  2. 每批以“审校为主、必要时重译”为策略；
  3. 每批结束运行 validate:i18n，确保 mismatch 始终为 0；
  4. 所有语言完成后再做一次全量回归测试。

## 5. 脚本与自动化

- 可以复用现有脚本目录中的工具：
  - debug-i18n-structure.mts 等结构对齐辅助脚本；
  - 未来可以新增 harmonize-terms.<lang>.mjs 等专用脚本。
- 原则：
  - 术语替换必须由 Glossary 驱动，而不是 ad-hoc 文本搜索；
  - 每次脚本执行前后，先在小范围样本上验证，再批量跑；
  - 每次批量操作后，必须运行 npm run validate:i18n。

## 6. 交付物

- 每种语言：
  - STYLE-GUIDE.<lang>.md
  - GLOSSARY.<lang>.md（中文 zh 维护在 `docs/i18n/GLOSSARY.zh.md`）
- 本 spec：
  - batches.json（可选，用于记录批次划分）；
  - COMPLETION.md（记录执行范围与状态）。
