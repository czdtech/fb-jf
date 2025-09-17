# 部署指南（静态站点，适合个人）

通用要求
- 构建命令：`npm ci && npm run build`
- 产物目录：`dist`
- 生产环境变量：`PUBLIC_SITE_URL=https://yourdomain.com`

Cloudflare Pages
- 框架：选择 Astro（或手动设置）
- 构建命令：`npm run build`
- 产物目录：`dist`
- 生产分支：`main`
- 环境变量：设置 `PUBLIC_SITE_URL`

Netlify
- 新建站点 → 连接仓库
- 构建命令：`npm run build`
- 发布目录：`dist`
- 环境变量：`PUBLIC_SITE_URL`

Vercel
- 新建项目 → 选择仓库
- 框架：Astro（或默认自动识别）
- 构建命令：`npm run build`
- 输出目录：`dist`
- 环境变量：`PUBLIC_SITE_URL`

GitHub Pages（GH Actions）
- 构建：在 CI 中运行 `npm ci && npm run build`
- 发布：将 `dist` 发布到 `gh-pages` 分支（常用 action 如 `actions/upload-pages-artifact` + `actions/deploy-pages`）
- 自定义域：在仓库设置 Pages 中配置

本地/手动托管
- 运行 `npm run build` 后上传 `dist` 到任意静态托管（Nginx/Apache/对象存储）
- 本地预览：`node scripts/serve-dist.mjs dist 5000`

检查清单（部署前）
- `npm run content:sync`、`npm run i18n:validate`、`npm run lint`、`npm run build` 均通过
- 设置正确的 `PUBLIC_SITE_URL`，查看 hreflang/canonical 是否正确
- 抽测首页、法务页、至少一个非英文主页与一个游戏列表页