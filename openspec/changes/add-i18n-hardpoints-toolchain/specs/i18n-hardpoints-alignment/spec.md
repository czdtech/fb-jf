## ADDED Requirements

### Requirement: Limit scan scope to game content
The system SHALL scan only `src/content/games/` for hardpoints extraction, diff reporting, and validation.

#### Scenario: Non-game content ignored
- **WHEN** the repository contains other markdown content outside `src/content/games/`
- **THEN** the system processes none of those files

### Requirement: Canonical English mapping
For each game slug, the canonical English file SHALL be `src/content/games/<slug>.en.md`, and each localized file SHALL map to `src/content/games/<slug>.<locale>.md`.

#### Scenario: Orphan localized file is rejected
- **WHEN** `src/content/games/<slug>.<locale>.md` exists but `src/content/games/<slug>.en.md` is missing
- **THEN** the validator reports an actionable error for that orphan localized file

### Requirement: Content contract and markers
The system SHALL define a Contract v1 documenting section order, required/optional sections, allowed Markdown subset, and marker formats (e.g., `<!-- i18n:section:<name> -->`).

#### Scenario: Section markers are canonical anchors
- **WHEN** a game page uses localized headings with different wording across locales
- **THEN** section detection relies on markers instead of heading text

### Requirement: Stable FAQ IDs
The system SHALL support stable FAQ IDs via HTML comment annotations placed on a separate line before each FAQ question.

#### Scenario: ID stability after text edits
- **GIVEN** an English FAQ already has `<!-- i18n:faq:id=... -->`
- **WHEN** the English question text changes
- **THEN** the ID remains unchanged

### Requirement: Hardpoints extraction via Markdown AST
The system SHALL parse frontmatter and Markdown AST to extract hardpoints for each game page.

#### Scenario: Controls keys extracted from inlineCode only
- **GIVEN** a controls section marked with `<!-- i18n:section:controls -->`
- **WHEN** the extractor runs
- **THEN** key tokens are collected from inlineCode nodes only

#### Scenario: Missing markers yield empty hardpoints
- **GIVEN** a game page has no i18n section markers
- **WHEN** the extractor runs
- **THEN** controls keys, numbers tokens, and FAQ IDs are all empty (no false positives)

### Requirement: Numbers extracted within allowed sections and compared as multiset
The system SHALL extract numeric tokens only from allowed sections (e.g., how-to-play/rules/tips markers) and SHALL preserve token multiplicity for alignment.

#### Scenario: Ordered list ordinals are ignored
- **GIVEN** a numbered list `1.` `2.` inside an allowed section
- **WHEN** the extractor runs
- **THEN** list ordinals are not included as numeric tokens

### Requirement: Diff report output
The system SHALL compare each non-English file against its English counterpart by slug and produce both JSON and human-readable diff reports.

#### Scenario: Aligned slugs are reported as aligned
- **WHEN** a localized file matches all hardpoints of its English counterpart
- **THEN** the diff report marks that slug/locale as aligned

### Requirement: Tooling has fixtures and tests
The system SHALL include fixtures and automated tests covering common structures and edge cases to prevent regressions.

#### Scenario: Fixture coverage exists for key edge cases
- **WHEN** running the test suite for the extractor/diff tooling
- **THEN** fixtures cover missing markers, duplicate FAQ IDs, FAQ reorder, and numeric false-positive cases
