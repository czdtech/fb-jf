## Context
- 目标：为 `src/content/games/*` 建立“硬信息点对齐”的可自动化工具链与规范。
- 约束：英文作为唯一事实源；各语言标题文本可不同；允许在 Markdown 中加入 HTML 注释标记（不影响渲染）。

## Goals / Non-Goals
- Goals:
  - 可稳定抽取并对比：iframeSrc、Controls 键位集合、数值 token（multiset）、FAQ ID 序列、hard-sync frontmatter 字段。
  - 先 report-only，后续再接入门禁。
- Non-Goals:
  - 本 change 不做 CI 门禁，不批量改内容。

## Key Decisions
- 解析基于 Markdown AST（而不是正则扫原文），降低方言差异与误报风险。
- Controls 只从 `<!-- i18n:section:controls -->` section 内的 `inlineCode` 抽取 key tokens。
- 数值 token 只在指定 section 内抽取，并采用 multiset（tokenCounts）对齐以保留重复次数；忽略有序列表序号等结构性数字。
- FAQ 对齐使用稳定的 `faq:id` 注释序列；英文缺失时才生成，已有 ID 不重算。

## Migration / Rollout
1. 先提供工具链与契约（本 change）
2. 后续通过英文规范化 change 给英文补齐 markers + FAQ IDs
3. 再通过对齐脚本与人工分批修复各语言内容
4. 最后接入 CI 门禁，并引入 baseline 渐进收紧

