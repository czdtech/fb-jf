# CI/CD Guide (GitHub Pages)

- Platform: GitHub Pages via GitHub Actions
- Repo: `czdtech/fb-jf`
- Custom domain: `www.playfiddlebops.com` (also in `public/CNAME`)

**Branch Rules**
- Production deploy: push to `main` (or manual run on `main`).
- PR previews: any `pull_request` targeting `main` gets a preview URL; production is not affected.
- Others: manual runs on non-`main` branches will not deploy to production.

**Workflow File**
- Location: `.github/workflows/gh-pages.yml`
- Steps: checkout → setup-node → `npm ci` → tests → build → upload artifact → deploy
- Concurrency: single "pages" group, cancels older in-progress runs.

**Tests With PUBLIC_SITE_URL**
- CI runs `npx jest --ci` with `PUBLIC_SITE_URL=https://www.playfiddlebops.com`.
- PRs: tests are non-blocking (continue-on-error) to allow preview; `main`: tests must pass.
- Local examples:
  - `PUBLIC_SITE_URL=http://localhost:4321 npx jest`
  - `PUBLIC_SITE_URL=https://www.playfiddlebops.com npx jest`

**Build/Deploy**
- Build: `npm run build` with `PUBLIC_SITE_URL=https://www.playfiddlebops.com` (controls canonical/hreflang, not the preview domain).
- Artifact: `./dist` uploaded and deployed by `deploy-pages`.

**Custom Domain & HTTPS**
- File: `public/CNAME` contains `www.playfiddlebops.com`.
- Settings → Pages: set Custom domain to `www.playfiddlebops.com`.
- Enforce HTTPS: appears after GitHub issues a certificate (usually minutes; up to 24h). If using Cloudflare, set the `www` CNAME as "DNS only" (gray cloud) until the cert is issued.

**Where To Change**
- Production URL: edit `PUBLIC_SITE_URL` in `.github/workflows/gh-pages.yml`.
- Domain file: `public/CNAME`.
- Default fallbacks: `astro.config.mjs` reads `process.env.PUBLIC_SITE_URL`.

**Notes**
- PR previews intentionally keep canonical pointing to production domain to avoid SEO duplication.
- If you change the domain, update both the workflow `PUBLIC_SITE_URL` and `public/CNAME`.
