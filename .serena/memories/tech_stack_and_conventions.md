# 技术栈与代码规范

技术栈（package.json）
- 运行环境：Node.js（ESM 模块）
- 核心：Astro ^5、TypeScript ^5.9、React ^19、TailwindCSS ^3.4
- UI/交互：`@radix-ui/*`、shadcn/ui（见 `components.json`）
- 工具：ESLint（基于 `@eslint/js` recommended）、Prettier、tslib、tsx
- 测试：Jest（`ts-jest`，`testEnvironment: jsdom`）

TypeScript/路径约定
- `tsconfig.json` 继承 `astro/tsconfigs/strict`；启用 `esModuleInterop`、`skipLibCheck` 等。
- 路径别名：`@/*`、`@/components/*`、`@/lib/*`、`@/utils/*` 等映射到 `src/*`。

代码风格
- ESLint（`eslint.config.js`）：
  - `no-unused-vars` 警告（允许以下划线开头参数）
  - 允许 `console`
- Prettier：`.prettierrc.json` 默认配置（使用项目通用风格）
- EditorConfig：LF、UTF-8、2 空格缩进、保存时删除行尾空白、插入末行换行
- MarkdownLint：关闭 MD013（行长）与 MD033（内联 HTML）

内容与 i18n 约束
- 所有内容集合与字段在 `src/content/config.ts` 以 `zod` 严格定义；修改字段需同步更新内容文件。
- UI 文案位于 `src/content/i18nUI/*.json`，键名稳定；新增页面文案建议先在 schema 中建模。

通用约定
- 组件尽量无副作用；页面数据从内容集合与 `utils` 拉取。
- UI 交互用 TSX（React）封装，小范围挂载到 Astro 页面。