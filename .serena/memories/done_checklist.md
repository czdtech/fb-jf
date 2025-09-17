# 提交前检查清单（建议）

基础质量
- `npm run lint` 与 `npm run lint:fix`（无新增错误）
- `npm run format`（格式一致）

内容与国际化
- `npm run content:types && npm run content:validate`（内容模型与数据一致）
- `npm run i18n:validate`（各语言键完整且无明显占位遗漏）

功能与页面
- `npm run build` 成功、无严重告警
- `npm run preview` 自查关键页面：`/`、`/games/...`、`/privacy`、`/terms-of-service` 以及至少一种非英文路径（如 `/zh`）
- hreflang 与 canonical 是否按 `PUBLIC_SITE_URL` 正确生成

测试（如改动 utils/ 路由或 i18n）
- `npx jest` 或 `npx jest src/utils/__tests__/*.test.ts` 通过

可选（大改动或样式变动）
- 运行视觉对比：`npm run visual:all` 并审阅 `reports/visual-diff` 输出