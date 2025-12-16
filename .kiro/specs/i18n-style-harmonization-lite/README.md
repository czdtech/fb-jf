# i18n Style Harmonization (Lite, Full Coverage)

本规格用于在不改变结构和 SEO 的前提下，对 FiddleBops 站点中所有本地化
游戏内容（679 个英文 canonical 游戏 x 6 种语言）进行：

- 文案风格统一（语气、人称、常用句式）；
- 术语规范（类型词、系统词、常见 UI 文案的统一翻译）；
- 只做“轻量但全量”的统一与润色，不做大规模重写。

前置条件：

- 所有语言的翻译已经完成，覆盖率 679 / 679；
- npm run validate:i18n 和 npm test 当前均为通过状态。

本目录下的文件：

- requirements.md：硬性约束（结构、SEO、信息完整性等）；
- design.md：整体设计和执行策略；
- tasks.md：分阶段任务清单，可供 Kiro 逐项执行。
- prompts.md：Phase 2 审校/必要时重译的统一提示词模板。
