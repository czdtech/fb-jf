# Change: Add i18n hardpoints toolchain for games

## Why
目前 `src/content/games/*` 的多语言内容缺少“可自动校验”的硬信息点对齐机制，导致英文事实源与各语言版本在 iframeSrc、Controls 键位、数值、FAQ 集合与顺序等关键技术信息上可能产生偏差，且难以及时发现。

## What Changes
- 定义游戏页面的内容契约（Contract v1）与语义标记规范（`<!-- i18n:section:... -->` / `<!-- i18n:faq:id=... -->`）
- 实现 FAQ ID 生成与解析（稳定且可跨语言对齐）
- 实现硬信息点抽取器（基于 Markdown AST）与差分报告（JSON + 可读文本）
- 提供 baseline 机制的基础设施（用于后续 CI 门禁的“存量过渡”）
- 增加 fixtures 与测试，确保脚本可维护、可升级

## Impact
- 新增/修改文件主要集中在：`scripts/`、`docs/i18n/`、`tests/fixtures/`
- 该 change 的目标是“先报告、可复现、可审计”，不引入 CI 失败门禁（门禁在后续 change 中上）

## Non-Goals
- 不在本 change 中批量改写任何游戏内容（仅提供工具链与规范）
- 不在本 change 中接入 `npm run validate:i18n`（后续 change 处理）

## Dependencies / Ordering
- 后续 change（英文规范化、多语言对齐、CI 门禁、文档工作流）依赖本 change 的工具与契约

