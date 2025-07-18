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
      include: ['@stagewise/toolbar'],
    },
    // 开发服务器配置
    server: {
      // 支持 stagewise WebSocket 连接
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    },
    // 定义全局常量
    define: {
      __STAGEWISE_ENABLED__: JSON.stringify(
        process.env.NODE_ENV === 'development'
      ),
    },
  },
  // 构建配置
  build: {
    // 确保开发工具不会被包含在生产构建中
    rollupOptions: {
      external:
        process.env.NODE_ENV === 'production' ? ['@stagewise/toolbar'] : [],
    },
  },
  // 开发体验优化
  devOptions: {
    // 启用热重载时保持 stagewise 连接
    tailwindConfig: './tailwind.config.js',
  },
})
