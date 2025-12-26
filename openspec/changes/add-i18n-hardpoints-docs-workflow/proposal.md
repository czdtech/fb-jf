# Change: Document i18n hardpoints workflow and authoring rules

## Why
仅靠脚本门禁无法保证“人”的编辑过程不踩坑；需要把契约、硬信息点规则、FAQ/Controls 编辑规范、以及新增游戏流程沉淀成可执行的文档与 checklist。

## What Changes
- 更新 README 与 i18n 文档，解释硬信息点对齐机制与常见错误
- 提供新增游戏的 checklist（从英文事实源开始，生成/复用 FAQ IDs，翻译后对齐硬信息点）
- 提供编辑清单：改英文哪些字段会触发全语言联动（iframeSrc/Controls/FAQ/数值/frontmatter hard-sync）

## Impact
- 仅文档与规范性内容；不影响运行时

## Dependencies / Ordering
- 建议在工具链与门禁落地后合入，确保文档与实际行为一致

