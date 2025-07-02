// @ts-check
import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 4321,
  },
  vite: {
    // 确保 stagewise 模块可以正确解析
    optimizeDeps: {
      include: ['@stagewise/toolbar']
    }
  }
})
