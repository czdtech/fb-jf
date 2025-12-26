# Design Document

## Overview

本设计实现一套多语言内容"硬信息点"对齐系统，确保游戏页面中的关键技术信息（iframeSrc、Controls 键位、数值、FAQ 集合与顺序）在所有语言版本中与英文保持严格一致。

系统采用"先契约→报告→再门禁"的渐进式策略：
1. 定义内容契约和语义标记规范
2. 开发抽取器和差分报告工具
3. 规范化英文内容（添加标记）
4. 对齐其他语言的硬信息点
5. 集成 CI 门禁

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Content Contract (v1)                        │
│  docs/i18n/games-content-contract-v1.md                         │
│  - Section 顺序定义                                              │
│  - i18n 标记格式规范                                             │
│  - Frontmatter 字段分类                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Extractor Pipeline                          │
│  scripts/extract-i18n-hardpoints.mts                            │
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐     │
│  │ Markdown │──▶│  AST     │──▶│ Section  │──▶│ Hardpoint│     │
│  │  File    │   │ Parser   │   │ Extractor│   │  Output  │     │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘     │
│                  (gray-matter)  (by i18n      (JSON +           │
│                                  markers)      readable)        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Diff Reporter                               │
│  scripts/report-i18n-hardpoints-diff.mts                        │
│                                                                  │
│  English (canonical) ◄──────────────────────► Other Locales     │
│       │                                              │           │
│       └──────────────── Compare ─────────────────────┘           │
│                           │                                      │
│                           ▼                                      │
│              ┌─────────────────────────┐                        │
│              │  Diff Report (JSON +    │                        │
│              │  human-readable)        │                        │
│              └─────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CI Gate                                     │
│  scripts/validate-i18n-hardpoints.mts                           │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Baseline   │    │   Diff       │    │   Exit       │      │
│  │   Loader     │───▶│   Checker    │───▶│   Code       │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                  │
│  Modes: --report-only | --update-baseline | strict (default)    │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Content Contract Document

**文件位置**: `docs/i18n/games-content-contract-v1.md`

**职责**: 定义游戏页面的规范结构

```typescript
interface ContentContract {
  version: string;
  sections: SectionDefinition[];
  frontmatterClassification: FrontmatterClassification;
  markdownSubset: MarkdownSubsetRules;
}

interface SectionDefinition {
  name: string;                    // e.g., "introduction", "controls", "faq"
  marker: string;                  // e.g., "<!-- i18n:section:controls -->"
  required: boolean;
  allowedStructures: ('paragraph' | 'list' | 'table')[];
  order: number;                   // 在页面中的顺序
}

interface FrontmatterClassification {
  hardSync: string[];              // 必须与英文完全一致
  localizable: string[];           // 可以翻译
  configurable: string[];          // 建议一致但可配置
}
```

### 2. FAQ ID Generator

**文件位置**: `scripts/lib/faq-id-generator.mts`

**职责**: 生成和管理 FAQ 唯一标识符

```typescript
interface FaqIdGenerator {
  /**
   * 为 FAQ 问题生成 ID
   * @param slug - 游戏的 urlstr
   * @param questionText - 英文问题文本
   * @returns 格式: faq:<slug>:<kebab-prefix>-<hash8>
   */
  generateId(slug: string, questionText: string): string;
  
  /**
   * 从注释中解析 FAQ ID
   * @param comment - HTML 注释内容
   * @returns FAQ ID 或 null
   */
  parseId(comment: string): string | null;
  
  /**
   * 检测 ID 碰撞
   * @param existingIds - 已存在的 ID 集合
   * @param newId - 新生成的 ID
   * @returns 如果碰撞则返回扩展后的 ID (12位)
   */
  resolveCollision(existingIds: Set<string>, newId: string): string;
}

// ID 生成规则
function normalizeQuestionText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')           // collapse whitespace
    .replace(/[^\w\s]/g, '');       // remove punctuation
}

function generateKebabPrefix(text: string): string {
  const words = normalizeQuestionText(text).split(' ').slice(0, 5);
  return words.join('-').substring(0, 30);
}

function generateHash(text: string, length: number = 8): string {
  const crypto = require('crypto');
  return crypto
    .createHash('sha1')
    .update(normalizeQuestionText(text))
    .digest('hex')
    .substring(0, length);
}
```

### 3. Hardpoint Extractor

**文件位置**: `scripts/extract-i18n-hardpoints.mts`

**职责**: 从 Markdown 文件中抽取硬信息点

```typescript
interface HardpointExtractor {
  extract(filePath: string): Promise<ExtractedHardpoints>;
}

interface ExtractedHardpoints {
  slug: string;
  locale: string;
  frontmatter: {
    iframeSrc: string;
    thumbnail: string;
    urlstr: string;
    score: string;
    releaseDate: string;
  };
  controls: {
    keyTokens: string[];           // e.g., ['W', 'A', 'S', 'D', 'Space']
    sectionFound: boolean;
  };
  numbers: {
    tokens: string[];              // e.g., ['100', '50%', '3s']
    sections: string[];            // 来源 section 列表
  };
  faq: {
    ids: string[];                 // FAQ ID 序列
    count: number;
  };
}

// 抽取 Controls 键位的正则
const CONTROL_KEY_PATTERN = /`([A-Z]|[0-9]|Space|Enter|Shift|Ctrl|Alt|Arrow\w+|Mouse\d?|Click|Drag)`/g;

// 抽取数值的正则 (仅在指定 section 内)
const NUMBER_PATTERN = /\b(\d+(?:\.\d+)?(?:%|s|ms|x|px|hp|mp|pts?)?)\b/gi;
```

### 4. Diff Reporter

**文件位置**: `scripts/report-i18n-hardpoints-diff.mts`

**职责**: 对比英文与其他语言的硬信息点差异

```typescript
interface DiffReporter {
  compare(englishFile: string, localizedFile: string): HardpointDiff;
  generateReport(diffs: HardpointDiff[]): DiffReport;
}

interface HardpointDiff {
  slug: string;
  locale: string;
  differences: DiffItem[];
  isAligned: boolean;
}

interface DiffItem {
  kind: 'iframeSrc' | 'controlsKeys' | 'faqOrder' | 'numbers' | 'frontmatter';
  field?: string;                  // for frontmatter diffs
  expected: string | string[];
  actual: string | string[];
  fingerprint: string;             // hash of diff details for baseline
}

interface DiffReport {
  timestamp: string;
  summary: {
    totalSlugs: number;
    alignedCount: number;
    mismatchCount: number;
    byLocale: Record<string, { aligned: number; mismatched: number }>;
    byKind: Record<string, number>;
  };
  mismatches: HardpointDiff[];
}
```

### 5. Baseline Manager

**文件位置**: `scripts/lib/hardpoints-baseline.mts`

**职责**: 管理已知问题的临时豁免

```typescript
interface BaselineManager {
  load(): Promise<BaselineEntry[]>;
  save(entries: BaselineEntry[]): Promise<void>;
  isKnown(diff: DiffItem, slug: string, locale: string): boolean;
  addEntry(diff: DiffItem, slug: string, locale: string, note: string): void;
}

interface BaselineEntry {
  slug: string;
  locale: string;
  kind: 'iframeSrc' | 'controlsKeys' | 'faqOrder' | 'numbers' | 'frontmatter';
  fingerprint: string;             // hash of diff details
  note: string;                    // 为什么暂时接受
  addedAt: string;                 // ISO timestamp
}

// Baseline 文件位置
const BASELINE_PATH = '.kiro/specs/i18n-hardpoints-alignment/hardpoints-baseline.json';
```

### 6. English Normalizer

**文件位置**: `scripts/normalize-english-markers.mts`

**职责**: 为英文文件添加语义标记和 FAQ ID

```typescript
interface EnglishNormalizer {
  /**
   * 分析英文文件，统计缺失的标记
   */
  analyze(dryRun: true): Promise<NormalizationStats>;
  
  /**
   * 执行规范化，添加缺失的标记
   */
  normalize(dryRun: false): Promise<NormalizationResult>;
}

interface NormalizationStats {
  totalFiles: number;
  missingSectionMarkers: number;
  missingFaqIds: number;
  duplicateFaqTitles: number;
  structureAnomalies: number;
}

interface NormalizationResult {
  modifiedFiles: string[];
  addedSectionMarkers: number;
  addedFaqIds: number;
  skippedAmbiguous: string[];      // 无法确定位置的文件
}
```

### 7. CI Gate Validator

**文件位置**: `scripts/validate-i18n-hardpoints.mts`

**职责**: CI 门禁验证

```typescript
interface CIGateValidator {
  validate(options: ValidateOptions): Promise<ValidationResult>;
}

interface ValidateOptions {
  mode: 'strict' | 'baseline' | 'report-only';
  updateBaseline?: boolean;
  locales?: string[];              // 可选：只验证特定语言
}

interface ValidationResult {
  success: boolean;
  newIssues: HardpointDiff[];      // 不在 baseline 中的新问题
  baselinedIssues: HardpointDiff[]; // 在 baseline 中的已知问题
  report: DiffReport;
}
```

## Data Models

### Game File Structure (with markers)

```markdown
---
locale: en
title: "Chess"
description: "..."
iframeSrc: "https://..."
thumbnail: /new-images/thumbnails/chess.jpg
urlstr: "chess"
score: "4.0/5  (1497 votes)"
tags: ["strategy", "puzzle", "classic"]
releaseDate: 2025-08-16
---

<!-- i18n:section:introduction -->
### Game Introduction

Chess is a two-player strategy board game...

<!-- i18n:section:how-to-play -->
### Gameplay Strategy

#### Opening Principles
1. **Control the Center:** ...

<!-- i18n:section:controls -->
### Controls Guide

- **Move a Piece:** Use `Mouse` to click and drag
- **Keyboard:** Press `Space` to confirm

<!-- i18n:section:faq -->
### Frequently Asked Questions (FAQ)

<!-- i18n:faq:id=faq:chess:what-is-checkmate-7f3a2c1d -->
**1. What is the difference between Checkmate and Stalemate?**
> ...

<!-- i18n:faq:id=faq:chess:castling-rules-a1b2c3d4 -->
**2. What are the rules for Castling?**
> ...
```

### Hardpoints Baseline JSON

```json
{
  "version": "1.0",
  "updatedAt": "2025-12-26T10:00:00Z",
  "entries": [
    {
      "slug": "chess",
      "locale": "zh",
      "kind": "faqOrder",
      "fingerprint": "abc123def456",
      "note": "中文版 FAQ 顺序历史遗留，计划在 batch-3 修复",
      "addedAt": "2025-12-26T10:00:00Z"
    }
  ]
}
```

### Diff Report JSON

```json
{
  "timestamp": "2025-12-26T10:00:00Z",
  "summary": {
    "totalSlugs": 679,
    "alignedCount": 650,
    "mismatchCount": 29,
    "byLocale": {
      "zh": { "aligned": 670, "mismatched": 9 },
      "ja": { "aligned": 665, "mismatched": 14 }
    },
    "byKind": {
      "iframeSrc": 2,
      "controlsKeys": 5,
      "faqOrder": 15,
      "numbers": 7
    }
  },
  "mismatches": [...]
}
```

## Correctness Properties

基于 Requirements 中的 Acceptance Criteria，系统必须满足以下正确性属性：

### P1: FAQ ID 稳定性
- **属性**: 对于任意英文 FAQ，一旦分配了 ID，即使问题文本修改，ID 也不会改变
- **验证**: 修改英文 FAQ 文本后重新运行 ID 生成器，ID 应保持不变
- **来源**: Requirement 2, AC3

### P2: FAQ ID 唯一性
- **属性**: 同一 slug 下的所有 FAQ ID 必须唯一
- **验证**: 对任意游戏文件，`faq.ids` 数组中不存在重复元素
- **来源**: Requirement 2, AC5

### P3: 跨语言 FAQ 序列一致性
- **属性**: 对于任意 slug，所有语言的 FAQ ID 序列必须与英文完全一致
- **验证**: `∀ locale ∈ {zh, ja, es, fr, de, ko}: faq.ids[locale] === faq.ids[en]`
- **来源**: Requirement 2, AC4

### P4: 硬同步字段一致性
- **属性**: 所有 hard-sync 类型的 frontmatter 字段必须与英文逐字符一致
- **验证**: `∀ field ∈ hardSync, ∀ locale: frontmatter[locale][field] === frontmatter[en][field]`
- **来源**: Requirement 3, AC2

### P5: Controls 键位集合一致性
- **属性**: 所有语言的 Controls 键位 token 集合必须与英文一致（顺序可不同）
- **验证**: `∀ locale: Set(controls.keyTokens[locale]) === Set(controls.keyTokens[en])`
- **来源**: Requirement 7, AC2

### P6: 数值 Token 一致性
- **属性**: 在指定 section 内，所有语言的数值 token 集合必须与英文一致
- **验证**: `∀ locale: Set(numbers.tokens[locale]) === Set(numbers.tokens[en])`
- **来源**: Requirement 7, AC3

### P7: Baseline 隔离性
- **属性**: Baseline 中的问题不会导致 CI 失败，但新问题会
- **验证**: `CI.fail ⟺ (diff ∉ baseline)`
- **来源**: Requirement 8, AC3

### P8: 抽取器幂等性
- **属性**: 对同一文件多次运行抽取器，结果完全一致
- **验证**: `extract(file) === extract(file)` (多次调用)
- **来源**: Requirement 4

## Error Handling

### 文件级错误

| 错误类型 | 触发条件 | 处理策略 | 用户提示 |
|---------|---------|---------|---------|
| FileNotFound | 英文文件存在但对应语言文件缺失 | 记录为 missing，不阻塞其他文件 | `[WARN] Missing: {slug}.{locale}.md` |
| ParseError | Markdown/frontmatter 解析失败 | 跳过该文件，记录错误 | `[ERROR] Parse failed: {file}: {reason}` |
| InvalidMarker | i18n 标记格式不正确 | 记录为 warning，继续处理 | `[WARN] Invalid marker at {file}:{line}` |
| DuplicateFaqId | 同一文件中存在重复 FAQ ID | 报告冲突，使用第一个 | `[ERROR] Duplicate FAQ ID: {id} in {file}` |

### 抽取器错误

| 错误类型 | 触发条件 | 处理策略 | 用户提示 |
|---------|---------|---------|---------|
| MissingSectionMarker | 指定 section 缺少 i18n 标记 | 返回空数组，标记 `sectionFound: false` | `[WARN] Section marker missing: {section} in {file}` |
| AmbiguousSection | 同一标记出现多次 | 使用第一个，记录 warning | `[WARN] Duplicate section marker: {marker} in {file}` |
| MalformedFrontmatter | frontmatter 字段类型不符 | 使用原始字符串值 | `[WARN] Unexpected type for {field} in {file}` |

### CI 门禁错误

| 错误类型 | 触发条件 | 处理策略 | 退出码 |
|---------|---------|---------|--------|
| NewMismatch | 发现不在 baseline 中的差异 | 输出详细报告，失败 | 1 |
| BaselineCorrupt | baseline JSON 格式错误 | 视为空 baseline，严格模式 | 2 |
| ConfigError | 命令行参数无效 | 显示帮助信息 | 3 |

### 错误恢复策略

```typescript
// 错误处理示例
async function extractWithRecovery(filePath: string): Promise<ExtractedHardpoints | null> {
  try {
    return await extractor.extract(filePath);
  } catch (error) {
    if (error instanceof ParseError) {
      logger.warn(`Skipping ${filePath}: ${error.message}`);
      return null;  // 跳过该文件，继续处理其他文件
    }
    throw error;  // 未知错误向上抛出
  }
}

// CI 门禁的优雅降级
async function validateWithFallback(options: ValidateOptions): Promise<ValidationResult> {
  if (options.mode === 'report-only') {
    // 只输出报告，不失败
    const report = await generateReport();
    return { success: true, report };
  }
  
  try {
    const baseline = await baselineManager.load();
    // 正常验证流程
  } catch (error) {
    if (error instanceof BaselineCorruptError) {
      logger.warn('Baseline corrupted, falling back to strict mode');
      // 降级为严格模式
    }
  }
}
```

## Testing Strategy

### 测试层次

```
┌─────────────────────────────────────────────────────────────────┐
│                     E2E Tests (Integration)                      │
│  - 完整工作流：英文规范化 → 差分报告 → CI 门禁                    │
│  - 使用真实游戏文件子集                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                     Component Tests                              │
│  - Extractor: 各种 Markdown 结构                                 │
│  - DiffReporter: 各种差异场景                                    │
│  - BaselineManager: CRUD 操作                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                     Unit Tests                                   │
│  - FAQ ID 生成算法                                               │
│  - 文本归一化函数                                                │
│  - 正则表达式匹配                                                │
└─────────────────────────────────────────────────────────────────┘
```

### Fixtures 设计

**位置**: `tests/fixtures/i18n-hardpoints/`

```
fixtures/
├── valid/
│   ├── simple-game.en.md          # 标准结构
│   ├── simple-game.zh.md          # 对齐的中文版
│   ├── complex-faq.en.md          # 多 FAQ 场景
│   └── nested-lists.en.md         # 嵌套列表结构
├── edge-cases/
│   ├── missing-markers.en.md      # 缺少 section 标记
│   ├── duplicate-faq-id.en.md     # 重复 FAQ ID
│   ├── deep-heading.en.md         # h4/h5 层级
│   └── numbers-outside-section.en.md  # section 外的数字
├── mismatched/
│   ├── different-iframe.zh.md     # iframeSrc 不一致
│   ├── missing-faq.zh.md          # 缺少 FAQ
│   ├── reordered-faq.zh.md        # FAQ 顺序不同
│   └── extra-controls.zh.md       # 多余的键位
└── baseline/
    ├── sample-baseline.json       # 测试用 baseline
    └── corrupted-baseline.json    # 格式错误的 baseline
```

### 测试用例矩阵

| 组件 | 测试场景 | 预期结果 |
|-----|---------|---------|
| FaqIdGenerator | 正常问题文本 | 生成 `faq:slug:kebab-hash8` 格式 ID |
| FaqIdGenerator | 特殊字符问题 | 正确归一化后生成 ID |
| FaqIdGenerator | Hash 碰撞 | 自动扩展到 12 位 |
| Extractor | 标准文件 | 正确抽取所有硬信息点 |
| Extractor | 缺少 section 标记 | `sectionFound: false`，空数组 |
| Extractor | 嵌套列表 | 正确识别 inline code 键位 |
| Extractor | section 外数字 | 不抽取（避免误伤） |
| DiffReporter | 完全对齐 | `isAligned: true` |
| DiffReporter | iframeSrc 不同 | 报告 kind=iframeSrc 差异 |
| DiffReporter | FAQ 顺序不同 | 报告 kind=faqOrder 差异 |
| DiffReporter | 缺少 FAQ | 报告缺失的 FAQ ID |
| BaselineManager | 加载有效 baseline | 正确解析所有条目 |
| BaselineManager | 加载损坏 baseline | 抛出 BaselineCorruptError |
| BaselineManager | 检查已知问题 | 返回 true |
| BaselineManager | 检查新问题 | 返回 false |
| CIGate | strict 模式 + 有差异 | 退出码 1 |
| CIGate | baseline 模式 + 已知问题 | 退出码 0 |
| CIGate | report-only 模式 | 始终退出码 0 |

### Property-Based Testing (使用 fast-check)

```typescript
import fc from 'fast-check';

// P1: FAQ ID 稳定性
test('FAQ ID should be stable after text modification', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 5 }),  // 原始问题
      fc.string({ minLength: 1 }),  // 修改内容
      (original, modification) => {
        const id1 = generateFaqId('test-slug', original);
        // 模拟已存在 ID 的情况
        const id2 = getExistingOrGenerate('test-slug', original + modification, id1);
        return id2 === id1;  // ID 应保持不变
      }
    )
  );
});

// P2: FAQ ID 唯一性
test('FAQ IDs should be unique within a slug', () => {
  fc.assert(
    fc.property(
      fc.array(fc.string({ minLength: 5 }), { minLength: 2, maxLength: 20 }),
      (questions) => {
        const ids = questions.map(q => generateFaqId('test-slug', q));
        const uniqueIds = new Set(ids);
        return uniqueIds.size === ids.length;
      }
    )
  );
});

// P8: 抽取器幂等性
test('Extractor should be idempotent', () => {
  fc.assert(
    fc.property(
      fc.constantFrom(...testFixtures),
      async (fixture) => {
        const result1 = await extractor.extract(fixture);
        const result2 = await extractor.extract(fixture);
        return JSON.stringify(result1) === JSON.stringify(result2);
      }
    )
  );
});
```

### CI 集成

```yaml
# .github/workflows/test.yml (相关部分)
- name: Run i18n hardpoints tests
  run: |
    npm run test:i18n-hardpoints
    
- name: Validate i18n hardpoints (report-only on PR)
  if: github.event_name == 'pull_request'
  run: npm run validate:i18n-hardpoints -- --report-only
  
- name: Validate i18n hardpoints (strict on main)
  if: github.ref == 'refs/heads/main'
  run: npm run validate:i18n-hardpoints
```

## Dependencies

### 运行时依赖

| 包名 | 用途 | 版本锁定 |
|-----|------|---------|
| gray-matter | frontmatter 解析 | 已有，锁定当前版本 |
| unified + remark-parse | Markdown AST 解析 | 需新增，锁定版本 |
| glob | 文件匹配 | 已有 |

### 开发依赖

| 包名 | 用途 | 版本锁定 |
|-----|------|---------|
| vitest | 测试框架 | 已有 |
| fast-check | Property-based testing | 已有 |

## Migration Path

### Phase 1: 工具链开发 (不影响现有内容)
1. 实现 Extractor、DiffReporter、BaselineManager
2. 添加测试 fixtures 和测试用例
3. 输出: `npm run report:i18n-hardpoints` (只报告，不门禁)

### Phase 2: 英文规范化 (批量修改英文文件)
1. 运行 dry-run 统计缺失标记
2. 分批添加 section 标记和 FAQ ID
3. 每批 20-40 个游戏，可 review

### Phase 3: 多语言对齐 (批量修改其他语言)
1. 按语言分批对齐硬信息点
2. 使用 baseline 管理存量问题
3. 逐步清零 baseline

### Phase 4: 门禁上线
1. 先 baseline 模式：只对新问题失败
2. 当某语言 baseline 清零后，切换到 strict 模式
3. 最终全部语言 strict 模式
