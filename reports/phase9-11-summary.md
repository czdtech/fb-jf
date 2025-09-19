# Phase 9–11 Summary (homepage)

## Scope & Outcomes
- Phase 9 Stabilization
  - DOM baseline allow: treat Social Share container count differences as MATCH in preview vs dist
  - Tests: add `tests/site-url.test.ts` for `getSiteUrl()`
  - Tests: add `tests/audio/player.test.ts` covering `audioSeek` handling
- Phase 10 Internal Split (no DOM changes)
  - Hero utilities split into submodules: `src/scripts/hero/{index,fullscreen,reload,toast,observers}.js`
  - `src/scripts/hero-utils.js` now re-exports `initHero` from new index (imports unchanged in components)
  - Audio player handles fallback progress keyboard seek
  - Game filters sync with URL: `?q=&cat=&sort=`
  - Sound sample: extract `progress-ring.js` & `state.js` helpers
- Phase 11 Schema/Tests Tightening
  - Translations schema already enumerated; no change needed
  - Hreflang/sitemap tests present and green

## Gates
```
PUBLIC_SITE_URL=https://www.playfiddlebops.com NODE_ENV=production npm run build   # Guard 12/12 PASS
nohup npm run preview & sleep 2 && npm run dom:validate                           # 0 fail, mismatches 0
PUBLIC_SITE_URL=https://www.playfiddlebops.com npm test                           # 237/237 PASS
```

## Invariants
- URL/DOM/SEO/Text outputs unchanged
- Only internal scripts moved/split; components continue using `is:inline import`

## Commits (homepage)
- 02a426f feat(validate-dom)… hero split … audio seek … filters URL … sound-sample helpers … tests
- 88e4da2 merge(phase8): clean-sweep into homepage (no external changes)
- 15274cf docs(reports): add phase8b merge & validation summary (homepage branch)

## Tags
- phase9-post, phase10-post, phase11-post

