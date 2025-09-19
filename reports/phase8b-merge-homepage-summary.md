# Phase 8b Merge & Validation Summary

Branch: `homepage`
Merge: `merge(phase8): clean-sweep into homepage (no external changes)`

## Commits
- 88e4da2 merge(phase8): clean-sweep into homepage (no external changes)
- 8721df4 chore(reports): update DOM baseline and current validation outputs
- 751ff3c docs(reports): record T8 module extractions, repo gitlinks cleanup, and DOM baseline note

## Gates
```
export PUBLIC_SITE_URL=https://www.playfiddlebops.com
export NODE_ENV=production
npm run build            # Guard 12/12 PASS
nohup npm run preview &  # Preview
npm run dom:validate     # 0 fail，3 baseline hints (容器计数差异)
PUBLIC_SITE_URL=... npm test  # 237/237 PASS
```

## Scope Merged
- Repo hygiene: remove worktree gitlinks, ignore `tmp_*/`
- Sitemap warn: drop unused import
- Scripts: extract GameFilters / Audio players / Progress fallback to modules; language selector self-init
- i18n utils: replace deprecated `getNestedProperty` with typed `getProp<T>()`

## Invariants
- URL/DOM/SEO/Text: unchanged
- Build guards: pass
- Tests: pass (237/237)

