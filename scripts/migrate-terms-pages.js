#!/usr/bin/env node

// 批量迁移 terms 页到 LegalPage 组件的脚本

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const languages = ["es", "fr", "de", "ja", "ko"]; // zh 已手动处理

async function migrateTermsPage(locale) {
  const filePath = path.join(
    __dirname,
    "..",
    "src",
    "pages",
    locale,
    "terms-of-service.astro",
  );

  const content = `---
import BaseLayout from '@/layouts/BaseLayout.astro'
import Navigation from '@/components/Navigation.astro'
import Footer from '@/components/Footer.astro'
import LegalPage from '@/components/legal/LegalPage.astro'
import extractedData from '@/data/extracted-data.json'
import { getEntry } from 'astro:content'
import { generateHreflangLinks } from '@/utils/hreflang'

const { navigation } = extractedData

// 获取当前语言
const locale = '${locale}'

// 从内容集合加载法务内容
const legalContent = await getEntry('legal', locale)
const termsData = legalContent?.data.terms

if (!termsData) {
  throw new Error(\`Terms content not found for locale: \${locale}\`)
}

// 使用统一的 hreflang 生成工具
const hreflangLinks = generateHreflangLinks(
  navigation.languages.map((lang: any) => ({ code: lang.code, label: lang.label })),
  '/terms-of-service',
  'https://www.playfiddlebops.com'
)

// Meta data for terms page
const meta = {
  title: termsData.meta.title,
  description: termsData.meta.description,
  canonical: \`https://www.playfiddlebops.com/\${locale}/terms-of-service/\`,
  ogImage: "https://www.playfiddlebops.com/tw.jpg",
  robots: "noindex, nofollow"
}
---

<BaseLayout
  meta={meta}
  lang={locale}
  hreflang={hreflangLinks}
>
  <Navigation
    navigation={navigation.main}
    languages={navigation.languages}
    currentLang={locale}
    currentPath={\`/\${locale}/terms-of-service/\`}
  />

  <LegalPage
    locale={locale}
    kind="terms"
    currentPath={\`/\${locale}/terms-of-service/\`}
  />

  <Footer
    locale={locale}
  />
</BaseLayout>
`;

  await fs.writeFile(filePath, content, "utf-8");
  console.log(`✅ Migrated ${locale} terms page`);
}

async function main() {
  for (const locale of languages) {
    await migrateTermsPage(locale);
  }
  console.log("✨ All terms pages migrated successfully!");
}

main().catch(console.error);
