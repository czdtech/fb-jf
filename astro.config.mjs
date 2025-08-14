// @ts-check
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  // 站点基础配置 - 影响绝对链接生成和sitemap自动化
  site: "https://www.playfiddlebops.com",
  output: "static",
  publicDir: "public",
  server: {
    host: "localhost", // 确保使用 localhost 而不是 0.0.0.0
    port: 4321,
  },
  // Astro官方i18n配置 - 确保URL结构保持不变
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh", "es", "fr", "de", "ja", "ko"],
    routing: {
      prefixDefaultLocale: false, // 英文保持根路径
    },
    // 暂时禁用自动fallback，让我们的代码处理内容fallback
    // fallback: {
    //   zh: "en",
    //   es: "en", 
    //   fr: "en",
    //   de: "en",
    //   ja: "en",
    //   ko: "en",
    // },
  },
  integrations: [
    tailwind({ applyBaseStyles: false }), // Disable base styles to use shadcn/ui styles
    react(),
  ],
  vite: {},
});
