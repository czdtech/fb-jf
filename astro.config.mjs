// @ts-check
import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
  publicDir: 'public',
  server: {
    host: 'localhost', // 确保使用 localhost 而不是 0.0.0.0
    port: 4321,
  },
  vite: {
    // 移除 stagewise 相关配置
    // 开发服务器配置 - 支持 stagewise WebSocket 连接
    server: {
      // 支持 stagewise WebSocket 连接
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    },
    // 构建配置 - 确保开发工具不会被包含在生产构建中
    build: {
      rollupOptions: {
        external: process.env.NODE_ENV === 'production' ? [] : [],
      },
    },
    // 定义全局常量
    define: {
      __STAGEWISE_ENABLED__: JSON.stringify(
        process.env.NODE_ENV === 'development'
      ),
    },
  },
})
