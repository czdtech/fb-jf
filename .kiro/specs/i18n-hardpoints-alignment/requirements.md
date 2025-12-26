# Requirements Document

## Introduction

本功能旨在建立一套完整的多语言内容"硬信息点"对齐机制，确保游戏页面中的关键技术信息（iframeSrc、Controls 键位、数值、FAQ 集合与顺序）在所有语言版本中保持严格一致。英文作为唯一事实源（Single Source of Truth），其他语言必须与英文对齐。

## Glossary

- **Hardpoint（硬信息点）**: 必须跨语言严格一致的技术性内容，包括 iframeSrc、Controls 键位集合、玩法数值、FAQ ID 序列
- **i18n_Marker（语义标记）**: HTML 注释形式的标记，用于定位内容结构而非依赖标题文本，格式如 `<!-- i18n:section:controls -->`
- **FAQ_ID**: FAQ 问题的唯一标识符，格式为 `faq:<slug>:<kebab-prefix>-<hash8>`，写在 `<!-- i18n:faq:id=... -->` 注释中
- **Baseline（基线）**: 已知问题的临时豁免清单，用于存量过渡期间避免 CI 全部失败
- **Extractor（抽取器）**: 解析 Markdown AST 并按语义标记抽取硬信息点的脚本
- **Diff_Report（差分报告）**: 对比英文与其他语言硬信息点差异的可读清单
- **Contract（契约）**: 定义游戏页面结构、section 顺序、必填/可选字段的规范文档

## Requirements

### Requirement 1: 内容契约定义

**User Story:** As a 内容编辑, I want 有一份明确的内容结构契约, so that 我知道每个游戏页面应该包含哪些 section 以及它们的格式要求。

#### Acceptance Criteria

1. THE Contract_Document SHALL define the section order for game pages (Introduction, Gameplay/How-to-Play, Controls, FAQ)
2. THE Contract_Document SHALL specify which sections are required and which are optional
3. THE Contract_Document SHALL define the allowed structure for each section (paragraph, list, table)
4. WHEN a section is defined, THE Contract_Document SHALL specify the i18n marker format as `<!-- i18n:section:<section-name> -->`

### Requirement 2: FAQ ID 标记系统

**User Story:** As a 开发者, I want FAQ 问题有稳定的唯一标识符, so that 我可以跨语言追踪和对齐 FAQ 内容。

#### Acceptance Criteria

1. THE FAQ_ID_System SHALL use the format `<!-- i18n:faq:id=faq:<slug>:<kebab-prefix>-<hash8> -->` placed on a separate line before each FAQ question
2. WHEN an English FAQ lacks an ID annotation, THE ID_Generator SHALL generate one using normalized question text (lowercase, trim, collapse whitespace, remove punctuation) hashed with SHA1 (first 8 characters) plus a readable kebab-case prefix
3. WHEN an English FAQ already has an ID annotation, THE ID_Generator SHALL NOT recalculate the ID even if the question text changes
4. THE FAQ_ID_System SHALL require all non-English languages to use the exact same FAQ ID set and order as English
5. WHEN generating IDs, THE ID_Generator SHALL detect hash collisions and extend to 12 characters if collision occurs

### Requirement 3: Frontmatter 字段分类

**User Story:** As a 内容管理员, I want frontmatter 字段有明确的跨语言一致性规则, so that 我知道哪些字段必须与英文完全一致。

#### Acceptance Criteria

1. THE Frontmatter_Classifier SHALL categorize fields into three types: hard-sync (must match English exactly), localizable (can be translated), and configurable (recommended consistent but flexible)
2. THE hard-sync category SHALL include: iframeSrc, thumbnail, urlstr/slug, score, releaseDate, and any URL/path fields
3. THE localizable category SHALL include: title, description, and content excerpts
4. THE configurable category SHALL include: tags and keywords
5. WHEN validating frontmatter, THE Validator SHALL report any hard-sync field that differs from English as an error

### Requirement 4: 硬信息点抽取器

**User Story:** As a 开发者, I want 一个脚本能从 Markdown 文件中抽取硬信息点, so that 我可以自动化对比和校验。

#### Acceptance Criteria

1. THE Extractor SHALL parse Markdown AST using a locked parser version (unified/remark ecosystem)
2. THE Extractor SHALL extract iframeSrc from frontmatter
3. THE Extractor SHALL extract Controls key tokens (formatted as inline code like `W`, `A`, `S`, `D`) only from sections marked with `<!-- i18n:section:controls -->`
4. THE Extractor SHALL extract numeric tokens (numbers, percentages, timings) only from sections marked with `<!-- i18n:section:how-to-play -->` or `<!-- i18n:section:rules -->` or `<!-- i18n:section:tips -->`
5. THE Extractor SHALL extract FAQ ID sequences from `<!-- i18n:faq:id=... -->` annotations
6. THE Extractor SHALL output results in both human-readable and JSON formats

### Requirement 5: 差分报告生成

**User Story:** As a 内容审核员, I want 一份清晰的差分报告, so that 我可以快速定位哪些语言版本的硬信息点与英文不一致。

#### Acceptance Criteria

1. WHEN comparing files, THE Diff_Reporter SHALL compare each non-English file against its English counterpart by slug
2. THE Diff_Reporter SHALL report differences in: iframeSrc, Controls key set, numeric tokens, FAQ ID sequence, and hard-sync frontmatter fields
3. THE Diff_Reporter SHALL output a human-readable report grouped by slug and language
4. THE Diff_Reporter SHALL also output a JSON report for batch processing
5. WHEN no differences are found for a slug, THE Diff_Reporter SHALL mark it as "aligned"

### Requirement 6: 英文内容规范化

**User Story:** As a 内容编辑, I want 英文内容作为事实源被规范化, so that 其他语言有一个稳定的对齐目标。

#### Acceptance Criteria

1. THE English_Normalizer SHALL add missing section markers (`<!-- i18n:section:... -->`) to all English game files
2. THE English_Normalizer SHALL add missing FAQ ID annotations to all English FAQ questions
3. WHEN adding markers, THE English_Normalizer SHALL run in dry-run mode first to report statistics before making changes
4. IF the missing marker rate exceeds a configurable threshold, THE English_Normalizer SHALL fall back to a conservative mode (only insert where position is unambiguous)
5. THE English_Normalizer SHALL process files in batches of 20-40 games per commit for reviewability

### Requirement 7: 多语言硬信息点对齐

**User Story:** As a 翻译人员, I want 明确的硬信息点对齐规则, so that 我知道哪些内容必须与英文完全一致。

#### Acceptance Criteria

1. WHEN aligning iframeSrc, THE Aligner SHALL copy the exact value from English (character-by-character match required)
2. WHEN aligning Controls, THE Aligner SHALL ensure the key token set matches English exactly (localized descriptions are allowed, but key tokens like `W`, `A`, `S`, `D` must be identical)
3. WHEN aligning numeric values, THE Aligner SHALL ensure number tokens match English exactly (unit names and word order may differ)
4. WHEN aligning FAQ, THE Aligner SHALL ensure the same FAQ ID set and order as English; missing FAQs must be added with proper translations
5. THE Aligner SHALL NOT modify any content during the "polish phase" (after hardpoints are aligned) except for wording improvements

### Requirement 8: Baseline 机制

**User Story:** As a CI 管理员, I want 一个 baseline 机制, so that 存量问题不会阻塞所有 CI 构建，同时新问题仍然被捕获。

#### Acceptance Criteria

1. THE Baseline_System SHALL store known issues in `.kiro/specs/i18n-hardpoints-alignment/hardpoints-baseline.json`
2. EACH baseline entry SHALL contain: slug, locale, kind (iframeSrc/controlsKeys/faqOrder/numbers/frontmatter), fingerprint (hash of diff details), and note (reason for acceptance)
3. WHEN running CI validation, THE Validator SHALL fail only for issues NOT in the baseline
4. THE Baseline_System SHALL provide a `--update-baseline` flag to explicitly add new issues (requires committing the baseline file)
5. THE Baseline_System SHALL provide a `--report-only` flag that outputs the report without failing CI

### Requirement 9: CI 门禁集成

**User Story:** As a 开发者, I want 硬信息点校验集成到 CI, so that 不一致的内容无法合并到主分支。

#### Acceptance Criteria

1. THE CI_Gate SHALL be integrated into `npm run validate:i18n` command
2. WHEN in baseline mode, THE CI_Gate SHALL allow issues listed in baseline and fail only on new issues
3. WHEN in strict mode (after baseline is cleared), THE CI_Gate SHALL fail on any hardpoint mismatch
4. THE CI_Gate SHALL output clear error messages indicating which file, field, and expected vs actual values
5. WHEN a language's hardpoint diff report reaches zero, THE CI_Gate SHALL automatically enable strict mode for that language

### Requirement 10: 工具链测试

**User Story:** As a 开发者, I want 工具链有充分的测试覆盖, so that 脚本升级不会破坏门禁功能。

#### Acceptance Criteria

1. THE Test_Suite SHALL include fixtures covering: different heading levels, list indentation variations, FAQ reordering, numeric false-positive cases, and frontmatter variants
2. THE Test_Suite SHALL use Node.js built-in test runner for minimal dependencies
3. WHEN the Extractor is modified, THE Test_Suite SHALL verify output against expected fixtures
4. WHEN the Diff_Reporter is modified, THE Test_Suite SHALL verify report format and content accuracy
