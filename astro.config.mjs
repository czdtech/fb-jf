import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.playfiddlebops.com',
  
  integrations: [
    sitemap()
  ],
  
  build: {
    format: 'directory'  // 确保 URL 格式不变
  },
  
  // Image optimization configuration (built-in to Astro 5)
  image: {
    // Enable image optimization
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  },
  
  // i18n configuration
  // Requirements: 6.1, 6.2, 6.3
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh', 'ja', 'ko', 'de', 'fr', 'es'],
    routing: {
      prefixDefaultLocale: false  // Don't prefix default locale (en) in URLs
    }
  }
});