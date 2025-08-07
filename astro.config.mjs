// @ts-check
import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'
import react from '@astrojs/react'

// https://astro.build/config
export default defineConfig({
  publicDir: 'public',
  server: {
    host: 'localhost', // 确保使用 localhost 而不是 0.0.0.0
    port: 4321,
  },
  integrations: [
    tailwind({ applyBaseStyles: false }), // Disable base styles to use shadcn/ui styles
    react()
  ],
  vite: {
  },
})
