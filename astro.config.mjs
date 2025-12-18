import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.playfiddlebops.com',

  integrations: [
    sitemap({
      filter: (page) => {
        try {
          const pathname = new URL(page).pathname;
          return !pathname.startsWith('/admin') && !pathname.endsWith('/search/');
        } catch {
          return !page.includes('/admin') && !page.includes('/search/');
        }
      },
    }),
  ],

  build: {
    // 保持原站的目录型 URL（/slug/）
    format: 'directory',
  },

  // Image optimization configuration (built-in to Astro 5)
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },

  /**
   * ⚠️ 内建 i18n 暂时关闭
   *
   * 我们已经通过显式的多语言路由结构来实现国际化：
   * - src/pages/[gameSlug].astro        -> /<slug>/
   * - src/pages/zh/[gameSlug].astro     -> /zh/<slug>/
   * - src/pages/de/[gameSlug].astro     -> /de/<slug>/ 等
   *
   * 再同时开启 Astro 内建 i18n（locales + routing）时，
   * Astro 会为每个 locale 生成额外的虚拟入口（如 /de），
   * 并尝试从 dist/pages/de.astro.mjs 之类的模块加载页面，
   * 与我们手动维护的 src/pages/de/* 结构发生冲突，
   * 从而在构建管线中出现
   *   “Cannot find module dist/pages/de.astro.mjs”
   * 这类错误。
   *
   * 目前所有：
   * - 语言前缀
   * - <html lang> / hreflang
   * - 语言切换行为
   * 都由我们自己的布局组件和脚本负责，
   * 不依赖 Astro 的内建 i18n。
   *
   * 如果未来需要重新启用 Astro i18n，
   * 需要专门为其设计统一的路由模式，
   * 避免与现有的 /zh /ja /de ... 目录结构重复。
   */
});
