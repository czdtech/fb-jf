# Implementation Tasks

## Phase 1: 基础设施与工具链

### Task 1.0: 明确扫描范围与文件映射
- [ ] 将扫描范围限定为 `src/content/games/`
- [ ] 定义文件命名与映射：`src/content/games/<slug>.en.md` ↔ `src/content/games/<slug>.<locale>.md`
- [ ] 将 orphan localized（非英文存在但缺少对应英文事实源）定义为 error
- [ ] 将 missing localized（英文存在但缺少对应语言）定义为 warn，并在报告中标记

**Acceptance Criteria:**
- Requirement 0: AC1-5

### Task 1.1: 创建内容契约文档
- [ ] 创建 `docs/i18n/games-content-contract-v1.md`
- [ ] 定义 section 顺序和必填/可选规则
- [ ] 定义 i18n 标记格式规范
- [ ] 定义 frontmatter 字段分类 (hardSync/localizable/configurable)
- [ ] 定义 Markdown 子集规则

**Acceptance Criteria:**
- Requirement 1: AC1-4
- Requirement 3: AC1-4

### Task 1.2: 实现 FAQ ID 生成器
- [ ] 创建 `scripts/lib/faq-id-generator.mts`
- [ ] 实现 `normalizeQuestionText()` 函数
- [ ] 实现 `generateKebabPrefix()` 函数
- [ ] 实现 `generateHash()` 函数 (SHA1 前 8 位)
- [ ] 实现 `generateId()` 主函数
- [ ] 实现 `parseId()` 从注释解析 ID
- [ ] 实现 `resolveCollision()` 碰撞检测 (扩展到 12 位)

**Acceptance Criteria:**
- Requirement 2: AC1-5

### Task 1.3: 实现硬信息点抽取器
- [ ] 创建 `scripts/extract-i18n-hardpoints.mts`
- [ ] 集成 gray-matter 解析 frontmatter
- [ ] 集成 unified/remark-parse 解析 Markdown AST
- [ ] 实现 section 标记识别 (`<!-- i18n:section:... -->`)
- [ ] 实现 Controls 键位抽取（遍历 AST inlineCode 节点，不用正则扫原始 Markdown）
- [ ] 实现数值 token 抽取（仅在指定 section 内；忽略列表序号；按 multiset 统计 tokenCounts）
- [ ] 实现 FAQ ID 序列抽取
- [ ] 输出 JSON 和人类可读格式

**Acceptance Criteria:**
- Requirement 4: AC1-9

### Task 1.4: 实现差分报告生成器
- [ ] 创建 `scripts/report-i18n-hardpoints-diff.mts`
- [ ] 实现英文与其他语言的对比逻辑
- [ ] 实现 fingerprint 生成 (用于 baseline)
- [ ] 生成按 slug/locale 分组的人类可读报告
- [ ] 生成 JSON 格式报告
- [ ] 实现 summary 统计

**Acceptance Criteria:**
- Requirement 5: AC1-5

### Task 1.5: 实现 Baseline 管理器
- [ ] 创建 `scripts/lib/hardpoints-baseline.mts`
- [ ] 实现 `load()` 加载 baseline JSON
- [ ] 实现 `save()` 保存 baseline JSON
- [ ] 实现 `isKnown()` 检查问题是否在 baseline 中
- [ ] 实现 `addEntry()` 添加新条目
- [ ] 创建初始 baseline 文件结构

**Acceptance Criteria:**
- Requirement 8: AC1-5

### Task 1.6: 添加测试 fixtures
- [ ] 创建 `tests/fixtures/i18n-hardpoints/` 目录结构
- [ ] 创建 valid/ 下的标准测试文件
- [ ] 创建 edge-cases/ 下的边界情况文件
- [ ] 创建 mismatched/ 下的差异测试文件
- [ ] 创建 baseline/ 下的 baseline 测试文件

**Acceptance Criteria:**
- Requirement 10: AC1

### Task 1.7: 编写单元测试
- [ ] FAQ ID 生成器测试
- [ ] 文本归一化函数测试
- [ ] 正则表达式匹配测试
- [ ] Baseline 管理器 CRUD 测试

**Acceptance Criteria:**
- Requirement 10: AC2-4

### Task 1.8: 编写组件测试
- [ ] Extractor 各种 Markdown 结构测试
- [ ] DiffReporter 各种差异场景测试
- [ ] Property-based testing (fast-check)

**Acceptance Criteria:**
- Requirement 10: AC3-4

## Phase 2: 英文内容规范化

### Task 2.1: 实现英文规范化脚本
- [ ] 创建 `scripts/normalize-english-markers.mts`
- [ ] 实现 dry-run 模式统计缺失标记
- [ ] 实现 section 标记自动插入
- [ ] 实现 FAQ ID 自动生成和插入
- [ ] 实现保守模式 (仅在位置明确时插入)
- [ ] 实现批量处理 (20-40 个游戏/批)

**Acceptance Criteria:**
- Requirement 6: AC1-5

### Task 2.2: 运行 dry-run 统计
- [ ] 执行 `npm run normalize:english -- --dry-run`
- [ ] 分析缺失率，决定自动/手工比例
- [ ] 记录需要手工处理的文件清单

**Acceptance Criteria:**
- Requirement 6: AC3-4

### Task 2.3: 批量规范化英文文件
- [ ] Batch 1: 游戏 1-40
- [ ] Batch 2: 游戏 41-80
- [ ] ... (根据总数继续)
- [ ] 每批提交后 review

**Acceptance Criteria:**
- Requirement 6: AC5

## Phase 3: 多语言对齐

### Task 3.1: 实现对齐辅助脚本
- [ ] 创建 `scripts/align-i18n-hardpoints.mts`
- [ ] 实现 iframeSrc 自动对齐
- [ ] 实现 Controls 键位集合对齐提示
- [ ] 实现 FAQ ID 序列对齐提示
- [ ] 实现数值 token 对齐提示

**Acceptance Criteria:**
- Requirement 7: AC1-4

### Task 3.2: 按语言分批对齐
- [ ] zh (中文): 分批对齐
- [ ] ja (日文): 分批对齐
- [ ] es (西班牙文): 分批对齐
- [ ] fr (法文): 分批对齐
- [ ] de (德文): 分批对齐
- [ ] ko (韩文): 分批对齐

**Acceptance Criteria:**
- Requirement 7: AC1-5

## Phase 4: CI 门禁集成

### Task 4.1: 实现 CI 门禁验证脚本
- [ ] 创建 `scripts/validate-i18n-hardpoints.mts`
- [ ] 实现 `--report-only` 模式
- [ ] 实现 `--update-baseline` 模式
- [ ] 实现 strict 模式 (默认)
- [ ] 实现 baseline 模式
- [ ] 输出清晰的错误信息

**Acceptance Criteria:**
- Requirement 9: AC1-5

### Task 4.2: 集成到 npm scripts
- [ ] 添加 `npm run extract:i18n-hardpoints`
- [ ] 添加 `npm run report:i18n-hardpoints`
- [ ] 添加 `npm run validate:i18n-hardpoints`
- [ ] 添加 `npm run normalize:english`
- [ ] 更新 `npm run validate:i18n` 包含硬信息点校验

**Acceptance Criteria:**
- Requirement 9: AC1

### Task 4.3: 配置 CI workflow
- [ ] PR 时运行 report-only 模式
- [ ] main 分支运行 strict 模式
- [ ] 添加 baseline 文件到 git 追踪

**Acceptance Criteria:**
- Requirement 9: AC2-3

### Task 4.4: 逐步收紧门禁
- [ ] 初始: baseline 模式，允许存量问题
- [ ] 当某语言 baseline 清零后，切换到 strict
- [ ] 最终: 全部语言 strict 模式

**Acceptance Criteria:**
- Requirement 9: AC5

## Phase 5: 文档与工作流沉淀

### Task 5.1: 更新开发文档
- [ ] 更新 README.md 添加 i18n 硬信息点说明
- [ ] 创建 `docs/i18n/hardpoints-workflow.md` 工作流指南
- [ ] 创建新增游戏的 checklist

### Task 5.2: 创建编辑清单
- [ ] 列出改英文时会触发全语言联动的字段
- [ ] 创建 FAQ 编辑指南
- [ ] 创建 Controls 编辑指南

## Dependencies

```
Task 1.0 ─────────────────────────────────────────────────────────┐
                                                                   │
Task 1.1 ─────────────────────────────────────────────────────────┐
                                                                   │
Task 1.2 ──┬──────────────────────────────────────────────────────┤
           │                                                       │
Task 1.3 ──┼── Task 1.4 ── Task 1.5 ── Task 4.1 ── Task 4.2 ─────┤
           │                                                       │
Task 1.6 ──┴── Task 1.7 ── Task 1.8                               │
                                                                   │
Task 2.1 ── Task 2.2 ── Task 2.3 ─────────────────────────────────┤
                                                                   │
Task 3.1 ── Task 3.2 ─────────────────────────────────────────────┤
                                                                   │
Task 4.3 ── Task 4.4 ─────────────────────────────────────────────┤
                                                                   │
Task 5.1 ── Task 5.2 ──────────────────────────────────────────────┘
```

## Estimated Effort

| Phase | Tasks | Estimated Iterations |
|-------|-------|---------------------|
| Phase 1 | 1.1-1.8 | 2-3 iterations |
| Phase 2 | 2.1-2.3 | 1-2 iterations + N batches |
| Phase 3 | 3.1-3.2 | 1 iteration + N batches × 6 languages |
| Phase 4 | 4.1-4.4 | 1-2 iterations |
| Phase 5 | 5.1-5.2 | 1 iteration |
