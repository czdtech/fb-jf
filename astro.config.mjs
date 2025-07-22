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
  },
})
