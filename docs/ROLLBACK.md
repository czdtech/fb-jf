# 回滚指南

为保障重构的可回退性，项目在各阶段创建锚点标签（如：`phase3-pre/post`，`phase4-pre/post`）。合并前后出现异常时，可按以下流程回滚。

## 快速回滚（基于标签）

```bash
# 查看标签
git tag --list 'phase*-post'

# 切换到稳定锚点（示例：phase4-post）
git checkout phase4-post

# 或者将 main 重置到某个锚点（需确认）
git switch main
git reset --hard phase4-post
git push --force-with-lease origin main
```

## PR 级回滚

在 GitHub 上使用“Revert”按钮创建回滚 PR，并重复 Runbook 的三道门禁验证。

## 验证清单（回滚后仍需全量验证）

- 构建 + 守卫：`npm run build`（12/12）
- 预览 + DOM 校验：`npm run preview && npm run dom:validate`
- 测试：`npm test`（233/233）

