# Change: Add CI gate for i18n hardpoints alignment

## Why
工具链与对齐流程需要在 CI 中形成门禁，才能防止未来新增/修改游戏内容时再次引入硬信息点偏差；同时需要 baseline 机制避免存量问题导致“一上来全红”。

## What Changes
- 新增 CI 校验脚本：支持 strict / baseline / report-only 三种模式，并提供 `--update-baseline`
- 接入 npm scripts（并最终挂到 `npm run validate:i18n`）
- 配置 CI workflow：PR report-only，main 严格/按语言渐进收紧

## Impact
- 改动集中在 `scripts/` 与 CI 配置；可能影响 PR 通过条件（但 baseline 模式可过渡）

## Dependencies / Ordering
- 依赖 `add-i18n-hardpoints-toolchain`（抽取器/报告/基线结构）
- 建议在英文规范化与主要语言对齐完成后，再逐步开启 strict

