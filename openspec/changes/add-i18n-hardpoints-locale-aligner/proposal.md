# Change: Add locale aligner for i18n hardpoints

## Why
在英文事实源稳定后，需要一套可复用的对齐流程与辅助工具，才能把各语言版本的硬信息点严格同步到英文，并降低人工漏改风险。

## What Changes
- 新增对齐辅助脚本：生成“应对齐内容”的提示与差分摘要（iframeSrc、Controls keys、FAQ ID 序列、数值 token）
- 建立按语言/按批次修复的工作方式，保证可 review、可回溯

## Impact
- 主要新增脚本与批量内容修复提交（后续批次执行）

## Dependencies / Ordering
- 依赖 `add-i18n-hardpoints-toolchain`
- 强依赖 `add-i18n-hardpoints-english-normalizer`（需要英文有稳定 markers + FAQ IDs）

