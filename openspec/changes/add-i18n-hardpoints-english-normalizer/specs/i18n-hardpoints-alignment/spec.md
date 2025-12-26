## ADDED Requirements

### Requirement: English marker normalization
The system SHALL provide a normalizer for English game pages to add missing section markers and FAQ ID annotations.

#### Scenario: Dry-run does not modify files
- **WHEN** the normalizer runs with `--dry-run`
- **THEN** it outputs statistics and does not change any file contents

#### Scenario: Conservative mode skips ambiguous insertions
- **WHEN** the normalizer cannot unambiguously locate an insertion point
- **THEN** it skips that insertion and reports the file as needing manual review

#### Scenario: Batch processing is reviewable
- **WHEN** applying normalization changes
- **THEN** the workflow supports batching 20–40 games per commit for reviewability

