# FiddleBops (fb-jf)

[![Deploy to GitHub Pages](https://github.com/czdtech/fb-jf/actions/workflows/gh-pages.yml/badge.svg?branch=main)](https://github.com/czdtech/fb-jf/actions/workflows/gh-pages.yml)

- Live: https://www.playfiddlebops.com/
- Tech: Astro + TypeScript + React + Tailwind

## Quick Start
- `npm ci`
- `npm run dev` → http://localhost:4321
- `npm run build` → `dist/`
- `npm run preview`

## Content & i18n
- `npm run content:sync` → generate types + validate content
- `npm run i18n:validate` → validate UI translations

## CI/CD
- GitHub Pages via Actions; PRs get preview, `main` deploys production.
- See `docs/CI-CD.md` and `docs/DEPLOY-FAQ.md`.

## Docs
- Full docs index: `docs/README.md`
- Archived historical docs: `docs/_archive/`

## License
- Private repo. All rights reserved.
