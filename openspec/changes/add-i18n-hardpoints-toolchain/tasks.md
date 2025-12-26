## 1. Implementation
- [x] 1.0 限定扫描范围与文件映射（仅 `src/content/games/`；`<slug>.en.md` ↔ `<slug>.<locale>.md`）
- [x] 1.1 创建 `docs/i18n/games-content-contract-v1.md`（section 顺序、必填/可选、允许的 Markdown 子集、标记规范、frontmatter 分类）
- [x] 1.2 实现 `scripts/lib/faq-id-generator.mts`（normalize、kebab prefix、hash、collision 处理、parse）
- [x] 1.3 实现 `scripts/extract-i18n-hardpoints.mts`（gray-matter + Markdown AST；controls 取 inlineCode；numbers 取 text nodes；multiset tokenCounts；FAQ id 序列）
- [x] 1.4 实现 `scripts/report-i18n-hardpoints-diff.mts`（按 slug/locale 对比英文事实源，输出 report）
- [x] 1.5 实现 `scripts/lib/hardpoints-baseline.mts`（load/save/isKnown/addEntry）与 baseline 文件结构
- [x] 1.6 添加 fixtures：`tests/fixtures/i18n-hardpoints/`（valid/edge-cases/mismatched/baseline）
- [x] 1.7 添加单元测试：FAQ ID、文本归一化、baseline CRUD
- [x] 1.8 添加组件测试：Extractor、DiffReporter（含典型差异场景）
