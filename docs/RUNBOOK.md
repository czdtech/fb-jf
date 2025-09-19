# Build & Validation Runbook

## Environment
- `PUBLIC_SITE_URL` must be set for canonical/hreflang/OG URL generation.

## Build + Guards
```
PUBLIC_SITE_URL=https://www.playfiddlebops.com NODE_ENV=production npm run build
```
This runs Astro build and postbuild DOM/SEO guard (12/12 must pass).

## Preview + DOM Validation
```
nohup npm run preview >/dev/null 2>&1 & sleep 2
npm run dom:validate
```
Validation compares preview DOM to baseline and ensures invariants.

## Tests
```
PUBLIC_SITE_URL=https://www.playfiddlebops.com npm test
```
All suites must pass.

## Lint & Format
```
npm run lint   # non-blocking in CI, but recommended to fix warnings
npm run format # Prettier format
```

## Rollback
- Prefer tags: `phase9-post`, `phase10-post`, `phase11-post`
```
git checkout phase11-post
```

