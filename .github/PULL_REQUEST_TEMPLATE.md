## 变更说明

- [ ] 不改变外部行为（URL/DOM/SEO/文案）
- [ ] 内部重构/优化/清理

## 门禁结果（请粘贴关键输出）

```text
PUBLIC_SITE_URL=https://www.playfiddlebops.com

# Build + Postbuild Guard
npm run build
# 期望：Total=12 | Passed=12 | Failed=0 | Warnings=0

# Preview + DOM Validation
nohup npm run preview >/dev/null 2>&1 & sleep 2
npm run dom:validate
# 期望：0 diff，与基线一致；Legal 页 1 项豁免

# Tests
npm test
# 期望：233/233 通过
```

## 影响面

- [ ] 仅 JS/TS 内部逻辑
- [ ] .astro 模板（需强调：不改变 DOM 结构/类名）
- [ ] 配置/CI/脚本
- [ ] 文档

## 回滚策略

- 在异常情况下，使用 `phase*-post` 标签作为回滚锚点（见 docs/ROLLBACK.md）。

