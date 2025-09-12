/**
 * 内容迁移脚本 - 合并多语言 frontmatter 到英文主文件
 * Phase 1: 仅合并 frontmatter，保留语言子目录
 *
 * 使用方法:
 * - Dry-run: tsx scripts/migrate-content.ts
 * - 执行: tsx scripts/migrate-content.ts --execute
 */

import glob from "fast-glob";
import { readFile, writeFile, cp } from "fs/promises";
import path from "node:path";
import matter from "gray-matter";

const LOCALES = ["en", "zh", "es", "fr", "de", "ja", "ko"] as const;
type Locale = (typeof LOCALES)[number];

interface MigrationStats {
  totalGames: number;
  processedGames: number;
  updatedGames: number;
  skippedGames: number;
  errors: Array<{ file: string; error: string }>;
  missingTranslations: Array<{ game: string; locales: string[] }>;
}

async function exists(file: string): Promise<boolean> {
  try {
    await readFile(file);
    return true;
  } catch {
    return false;
  }
}

async function backupContent(): Promise<void> {
  console.log("📦 Creating backup...");
  await cp("src/content", "src/content.backup", {
    recursive: true,
    force: true,
  });
  console.log("✅ Backup created at src/content.backup");
}

async function migrateGames(execute: boolean): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalGames: 0,
    processedGames: 0,
    updatedGames: 0,
    skippedGames: 0,
    errors: [],
    missingTranslations: [],
  };

  // 获取所有英文主文件（基础游戏）
  const baseFiles = await glob("src/content/games/*.md");
  stats.totalGames = baseFiles.length;

  console.log(`\n🎮 Found ${baseFiles.length} base game files`);

  for (const gamePath of baseFiles) {
    const slug = path.basename(gamePath, ".md");
    console.log(`\n📝 Processing: ${slug}`);

    try {
      // 读取英文主文件
      const baseRaw = await readFile(gamePath, "utf-8");
      const { data: baseData, content: baseContent } = matter(baseRaw);

      // 初始化 translations 对象
      const translations: Record<string, any> = baseData.translations || {};
      let hasNewTranslations = false;
      const missingLocales: string[] = [];

      // 收集各语言的 frontmatter
      for (const locale of LOCALES) {
        if (locale === "en") {
          // 英文使用主文件自身的数据
          if (!translations.en) {
            translations.en = {
              title: baseData.title,
              description: baseData.description,
              meta: baseData.meta,
            };
          }
          continue;
        }

        // 查找本地化文件
        const localePaths = [
          `src/content/games/${locale}/${slug}.md`,
          `src/content/games/${locale}-${slug}.md`,
        ];

        let localeData = null;
        for (const localePath of localePaths) {
          if (await exists(localePath)) {
            const localeRaw = await readFile(localePath, "utf-8");
            const { data } = matter(localeRaw);
            localeData = data;
            console.log(`  ✓ Found ${locale} translation`);
            break;
          }
        }

        if (localeData) {
          // 只有当 translations[locale] 不存在时才添加
          if (!translations[locale]) {
            translations[locale] = {
              title: localeData.title || baseData.title,
              description: localeData.description || baseData.description,
              meta: localeData.meta || baseData.meta,
            };
            hasNewTranslations = true;
          }
        } else {
          missingLocales.push(locale);
        }
      }

      // 记录缺失的翻译
      if (missingLocales.length > 0) {
        stats.missingTranslations.push({ game: slug, locales: missingLocales });
        console.log(`  ⚠️  Missing: ${missingLocales.join(", ")}`);
      }

      // 如果有新的翻译需要添加
      if (hasNewTranslations || !baseData.translations) {
        const updatedData = {
          ...baseData,
          translations,
        };

        if (execute) {
          // 写回文件
          const updatedContent = matter.stringify(
            baseContent || "",
            updatedData,
          );
          await writeFile(gamePath, updatedContent);
          console.log(`  ✅ Updated with translations`);
          stats.updatedGames++;
        } else {
          console.log(
            `  🔍 Would update with ${Object.keys(translations).length} language translations`,
          );
          stats.updatedGames++;
        }
      } else {
        console.log(`  ⏭️  Already has translations, skipping`);
        stats.skippedGames++;
      }

      stats.processedGames++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Error: ${errorMsg}`);
      stats.errors.push({ file: gamePath, error: errorMsg });
    }
  }

  return stats;
}

async function printReport(
  stats: MigrationStats,
  execute: boolean,
): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log(execute ? "📊 MIGRATION REPORT" : "📊 DRY-RUN REPORT");
  console.log("=".repeat(60));

  console.log(`
Total games:        ${stats.totalGames}
Processed:          ${stats.processedGames}
${execute ? "Updated" : "Would update"}:          ${stats.updatedGames}
Skipped:            ${stats.skippedGames}
Errors:             ${stats.errors.length}
`);

  if (stats.missingTranslations.length > 0) {
    console.log("⚠️  Games with missing translations:");
    for (const { game, locales } of stats.missingTranslations) {
      console.log(`   - ${game}: missing ${locales.join(", ")}`);
    }
  }

  if (stats.errors.length > 0) {
    console.log("\n❌ Errors encountered:");
    for (const { file, error } of stats.errors) {
      console.log(`   - ${file}: ${error}`);
    }
  }

  if (!execute) {
    console.log("\n💡 This was a dry-run. To execute the migration, run:");
    console.log("   tsx scripts/migrate-content.ts --execute");
  } else {
    console.log("\n✅ Migration completed successfully!");
    console.log(
      "⚠️  Note: Language subdirectories are preserved for body content.",
    );
    console.log("   They can be removed after Phase 2/3 verification.");
  }
}

async function main() {
  const execute = process.argv.includes("--execute");

  console.log("🚀 Content Migration Script - Phase 1");
  console.log("=====================================");
  console.log(`Mode: ${execute ? "EXECUTE" : "DRY-RUN"}`);

  if (execute) {
    // Create backup before making changes
    await backupContent();
  }

  // Run migration
  const stats = await migrateGames(execute);

  // Print report
  await printReport(stats, execute);
}

// Run the script
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
