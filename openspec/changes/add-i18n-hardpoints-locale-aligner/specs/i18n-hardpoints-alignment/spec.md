## ADDED Requirements

### Requirement: Locale hardpoints alignment
For each slug and locale under `src/content/games/`, localized hardpoints SHALL match the canonical English hardpoints with strict rules.

#### Scenario: iframeSrc matches character-by-character
- **GIVEN** English defines `iframeSrc`
- **WHEN** validating a locale
- **THEN** `iframeSrc` must match the English value exactly

#### Scenario: Controls key token set matches
- **GIVEN** the English controls section defines key tokens via inlineCode
- **WHEN** validating a locale
- **THEN** the locale’s key token set equals the English key token set (localized descriptions are allowed)

#### Scenario: Missing controls in English is treated as empty
- **GIVEN** English has no `<!-- i18n:section:controls -->` marker
- **WHEN** validating a locale
- **THEN** the locale MUST NOT introduce any controls key tokens

#### Scenario: FAQ ID sequence matches including order
- **GIVEN** English defines a sequence of FAQ IDs
- **WHEN** validating a locale
- **THEN** the locale uses the exact same FAQ ID sequence and order

#### Scenario: Missing FAQ in English is treated as empty
- **GIVEN** English has no `<!-- i18n:section:faq -->` marker
- **WHEN** validating a locale
- **THEN** the locale MUST NOT introduce any FAQ IDs

#### Scenario: Numbers token multiset matches
- **GIVEN** English defines numeric tokens within allowed sections
- **WHEN** validating a locale
- **THEN** the locale numeric token multiset matches English (counts included)
