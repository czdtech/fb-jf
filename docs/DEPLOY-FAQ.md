# 部署常见问题 FAQ（GitHub Pages）

- 适用范围：本仓库（czdtech/fb-jf）使用 GitHub Actions 部署到 GitHub Pages，自定义域 `www.playfiddlebops.com`。

**1) Pages 显示 Enforce HTTPS 不可用？**
- 新绑定域名后，GitHub 需要为 `www.playfiddlebops.com` 签发证书（通常 5–30 分钟，最长 24 小时）。
- 若使用 Cloudflare 且 `www` 记录为橙云（Proxied），GitHub 无法签发证书。
  - 解决：将 `www` 的 CNAME 切到灰云（DNS only），待证书签发并能启用 Enforce HTTPS 后再酌情调整。
- 确认仓库 Settings → Pages 中已保存自定义域，并确保仓库里存在 `public/CNAME`。

**2) 自定义域已生效，但子页面 404？**
- 若使用自定义域（当前就是），无需配置 Astro `base`。
- 若改为“项目页”部署（无自定义域），需要：
  - 在 `astro.config.mjs` 设置 `base: '/<repo>'`；
  - 构建时 `PUBLIC_SITE_URL=https://<username>.github.io/<repo>`；
  - 重新构建并发布。

**3) 页面 canonical/hreflang 指向错误域名？**
- 本项目 canonical/hreflang 来源于 `PUBLIC_SITE_URL`（构建时注入）。
- 解决：在 CI 与本地都设置 `PUBLIC_SITE_URL=https://www.playfiddlebops.com` 再构建；
  - 我们已在 `.github/workflows/gh-pages.yml` 中设置。

**4) Actions 没有触发或没部署？**
- 生产部署只在 push 到 `main` 或对 `main` 手动触发；
- PR 会生成预览，不会发布到生产；
- 并发控制会取消旧的在途构建；可在 Actions 页面重新运行。

**5) CNAME 被覆盖或丢失？**
- 我们采用 Actions + `upload-pages-artifact`，只要 `public/CNAME` 在仓库中，发布产物就会包含。
- 确保不要用“Deploy from a branch”同时覆盖产物。

**6) 混合内容/不安全资源警告？**
- 将站内资源与外链统一为 HTTPS；
- 我们已在 `BaseLayout` 中用 `PUBLIC_SITE_URL` 生成默认资源 URL。

**7) 预览链接的 canonical 与生产一致，正常吗？**
- 正常。为避免 SEO 重复，PR 预览保留 canonical 指向生产域，仅用于审阅变更。

**8) DNS 生效时间？**
- 大多几分钟，最长 24 小时，取决于 DNS TTL 与缓存。

**9) 顶级域（apex）如何跳转到 www？**
- 建议在 DNS 侧设置从 `playfiddlebops.com` 到 `www.playfiddlebops.com` 的 301 跳转或使用“页面规则”。
- GitHub Pages 推荐使用 `www` 作为 CNAME 目标。

**10) 本地如何对齐线上构建？**
- 运行：`PUBLIC_SITE_URL=https://www.playfiddlebops.com npm run build`。
- 测试：`PUBLIC_SITE_URL=https://www.playfiddlebops.com npx jest`。
