# Change: Add English normalizer for i18n hardpoints markers

## Why
英文是唯一事实源，但目前英文游戏页面的结构与标记不够稳定，导致跨语言对齐和自动化校验缺少可靠锚点（section markers、FAQ IDs）。

## What Changes
- 新增英文规范化脚本：为 `src/content/games/*.en.md` 补齐 `<!-- i18n:section:... -->` 与 `<!-- i18n:faq:id=... -->`
- 提供 dry-run 统计缺失率与冲突数量，并支持“保守模式”避免误插入
- 支持按批次处理（20–40 个游戏/批），便于 review

## Impact
- 仅修改英文游戏内容与新增脚本；对渲染无破坏性（注释不影响展示）

## Dependencies / Ordering
- 依赖 `add-i18n-hardpoints-toolchain`（FAQ ID 规则、抽取器/marker 约定）

