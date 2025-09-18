# 构建与验证 Runbook

本项目采用“构建守卫 + 预览式 DOM 校验 + 单元测试”的三道门禁，确保重构过程中 URL/DOM/SEO/文案零外观变化。

## 环境变量

- `PUBLIC_SITE_URL` 必填：用于生成 canonical、hreflang、OG URL。

## 本地快速验证

```bash
export PUBLIC_SITE_URL=https://www.playfiddlebops.com
export NODE_ENV=production

# 1) 构建 + 构建后守卫（12/12 应通过）
npm run build

# 2) 启动预览 + 预览式 DOM 校验（与基线 0 diff）
nohup npm run preview >/dev/null 2>&1 & sleep 2
npm run dom:validate

# 3) 测试（应 233/233）
npm test
```

## CI（GitHub Actions）

工作流：`.github/workflows/gh-pages.yml`

- 安装依赖 → 测试 → 构建（自动执行 postbuild 守卫）
- 启动 `astro preview` → 运行 `npm run dom:validate`
- PR 分支发布预览，`main` 分支发布生产站点

## 预期门禁

- 构建后守卫：Total=12，Passed=12，Failed=0，Warnings=0
- DOM 校验：Matches 全对，Mismatches=0，Missing=0，New=0，Skipped=1（法务页豁免）
- 测试：233/233 全绿

## 常见问题

- 预览端口占用：结束占用进程或改用 `nohup` 背景启动
- DOM 校验连接失败：确认预览已启动并监听 `http://localhost:4321`

