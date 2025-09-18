# Solo 开发工作流（推荐）

分支与提交
- 主分支：`main`（默认直接在 main 上开发或用简易特性分支）
- 可选分支：`feat/<slug>`、`fix/<slug>`，完成后合并回 `main`
- 提交规范（简化版 Conventional Commits）：
  - 类型：`feat`/`fix`/`chore`/`docs`/`refactor`/`test`/`perf`/`style`/`build`/`ci`/`revert`
  - 示例：`feat(i18n): add ja footer keys`

日常流程
1) 同步代码：`git pull`
2) 启动开发：`npm run dev`（默认 http://localhost:4321）
3) 开发/改内容：
   - 内容：`src/content/games/<lang>/*.md`
   - UI 文案：`src/content/i18nUI/<lang>.json`
4) 快速自检：
   - `npm run content:sync`（类型生成 + 内容校验）
   - `npm run i18n:validate`（多语言键完整性）
   - `npm run lint` 或 `npm run lint:fix`
   - 变更 utils/ 路由/分页/SEO 时：`npx jest src/utils/__tests__/*.test.ts`
   - 构建验收：`npm run build`
5) 提交与合并：小步提交，必要时用分支；合并回 `main`

发布与版本
- 用标签标记版本：`git tag -a vX.Y.Z -m "release notes" && git push --tags`
- 也可用日期版本：`2025.09.17`
- 部署前在生产环境设置 `PUBLIC_SITE_URL=https://yourdomain.com`

可选工具（视觉回归）
- 视觉对比：`npm run visual:all`（输出到 `reports/visual-diff`）
- 精选路由对比：`npm run visual:select -- --routes=/,/zh,/games`

小贴士
- 内容/文案改动优先跑 `content:*` 与 `i18n:*` 脚本；逻辑改动再跑 Jest
- 一次只改一个主题，便于回退与定位问题