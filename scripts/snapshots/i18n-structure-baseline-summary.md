# I18n Structure Alignment - Baseline Report

**Generated:** 2025-12-07 01:26:37
**Snapshot File:** `i18n-structure-baseline-20251207-012637.json`

## Summary Statistics

- **Canonical Games:** 679
- **Checked Localized Pairs:** 4,074 (679 games × 6 languages)
- **Total Structure Mismatches:** 1,775

## Mismatch Distribution by Locale

| Locale | Mismatches | Percentage of Total |
|--------|------------|---------------------|
| ja     | 447        | 25.2%               |
| zh     | 428        | 24.1%               |
| es     | 225        | 12.7%               |
| fr     | 225        | 12.7%               |
| de     | 225        | 12.7%               |
| ko     | 225        | 12.7%               |

## Key Observations

1. **Japanese (ja)** and **Chinese (zh)** have the highest number of mismatches, accounting for nearly 50% of all issues
2. The other four languages (es, fr, de, ko) have identical mismatch counts (225 each), suggesting they may share similar translation patterns or were processed together
3. Average mismatches per language: ~296

## Common Mismatch Types

Based on the report, mismatches typically fall into two categories:

1. **Missing headings** - `type=heading, level=3` (or other levels)
2. **Missing list items** - `type=list-item`

## Next Steps

According to the implementation plan:

1. ✅ Phase 1.1: Generate baseline report
2. ✅ Phase 1.2: Archive baseline snapshot
3. 🔄 Phase 2: Create batch planning tools to split fixes into manageable chunks
4. 🔄 Phase 3: Fix zh structure mismatches (428 items)
5. 🔄 Phase 4: Fix ja structure mismatches (447 items)
6. 🔄 Phase 5: Fix remaining languages (es, fr, de, ko - 900 items total)

## Validation Commands

To regenerate this report:
```bash
npm run validate:i18n
```

To check specific batch progress (once batch tools are created):
```bash
npm run validate:batch -- --batch structure-batches/<locale>-batch-<n>.json
```
