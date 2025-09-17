# 建议命令速查（npm scripts）

初始化/安装
- `npm ci`：按 `package-lock.json` 安装依赖

开发/构建/预览
- `npm run dev`：启动本地开发（默认 http://localhost:4321 ）
- `npm run build`：产出静态站点到 `dist/`
- `npm run preview`：预览 `dist/`
- `node scripts/serve-dist.mjs dist 5000`：简易本地静态服务器（可改端口）

内容与类型
- `npm run content:types`：根据 `src/content/config.ts` 生成类型
- `npm run content:validate`：校验内容一致性
- `npm run content:coverage`：输出内容覆盖率
- `npm run content:sync`：生成类型后再校验

国际化
- `npm run i18n:validate`：校验多语言 UI 文案
- `npm run i18n:generate`：为缺失键生成占位文案
- `npm run i18n:check`：等同 `i18n:validate`

质量与风格
- `npm run lint`：ESLint 全量扫描
- `npm run lint:fix`：自动修复
- `npm run format`：Prettier 全量格式化

可视化对比（选用）
- `npm run visual:worktrees`：准备基线/对比工作树
- `npm run visual:build`：构建对比产物
- `npm run visual:diff`：生成视觉差异报告到 `reports/visual-diff`
- `npm run visual:select`：对特定路由集合进行对比
- `npm run visual:all`：串联执行全部可视化步骤

测试（Jest）
- 本项目未在 `package.json` 定义 `test` 脚本；可使用：
  - `npx jest` 或 `npx jest src/utils/__tests__/i18n.test.ts`
  - 相关配置见 `jest.config.js`（`ts-jest`）

环境变量
- `PUBLIC_SITE_URL=https://example.com npm run build`：可覆盖站点 URL 以生成正确 hreflang/canonical