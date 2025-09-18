# 部署现状（已上线：GitHub Pages）

平台与状态
- 托管：GitHub Pages（已上线）
- 仓库：czdtech/fb-jf
- 自定义域：www.playfiddlebops.com（`public/CNAME` 已加入）

工作流与分支策略
- 工作流：`.github/workflows/gh-pages.yml`
  - push 到 `main`：部署到生产（Enforce HTTPS 就绪后将使用 HTTPS）
  - pull_request 目标 `main`：创建 PR 预览部署，不影响生产站点
  - workflow_dispatch：仅当在 `main` 分支手动触发时部署生产；在其他分支触发将被跳过，避免误发布
- 构建变量：`PUBLIC_SITE_URL=https://www.playfiddlebops.com`

注意
- 预览部署的域名由 GitHub Pages 自动分配（与生产域不同），用于审阅分支改动
- 若修改域名：同步更新 `public/CNAME` 与工作流中的 `PUBLIC_SITE_URL` 值
- 若暂不想使用 Actions，可在 Settings → Pages 暂时切回 "Deploy from a branch"，合并工作流到 `main` 后再切回 Actions