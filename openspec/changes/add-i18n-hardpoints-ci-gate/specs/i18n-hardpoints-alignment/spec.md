## ADDED Requirements

### Requirement: CI validation supports modes and baseline
The system SHALL provide a CI validator for i18n hardpoints with modes `strict`, `baseline`, and `report-only`, and SHALL support an explicit baseline update flow.

#### Scenario: Report-only never fails CI
- **WHEN** the validator runs in `--report-only` mode
- **THEN** it exits successfully and outputs a diff report

#### Scenario: Baseline mode fails only on new issues
- **GIVEN** a baseline contains fingerprints for known issues
- **WHEN** the validator runs in baseline mode
- **THEN** it fails only for mismatches not present in baseline

#### Scenario: Strict mode fails on any mismatch
- **WHEN** the validator runs in strict mode
- **THEN** any hardpoint mismatch causes failure with clear expected vs actual output

### Requirement: Progressive tightening per locale
The system SHALL treat a locale as strict once its baseline entries reach zero.

#### Scenario: Locale becomes strict after baseline cleared
- **GIVEN** baseline has zero entries for locale `fr`
- **WHEN** running validation
- **THEN** `fr` behaves as strict (no mismatches allowed)

