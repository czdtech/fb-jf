import { getCollection, type CollectionEntry } from "astro:content";
import { SUPPORTED_LOCALES } from "@/i18n/utils";

/**
 * 获取本地化的游戏列表，优先使用指定语言版本
 * 更新：适配新的slug唯一性模式 (game-name-{locale})
 */
export async function getLocalizedGamesList(locale: string = "en") {
  try {
    const allGames = await getCollection("games");
    
    // 过滤出当前语言的游戏，基于新的slug命名模式
    const currentLocaleGames = allGames.filter((game) => {
      // 新的slug格式: game-name-{locale}
      return game.data.slug.endsWith(`-${locale}`);
    });

    // 如果当前语言没有游戏，fallback到英文
    if (currentLocaleGames.length === 0 && locale !== "en") {
      console.log(`⚠️ No games found for ${locale}, fallback to English`);
      return allGames.filter((game) => game.data.slug.endsWith("-en"));
    }

    return currentLocaleGames;
  } catch (error) {
    console.error(`Failed to load localized games list for ${locale}:`, error);
    return [];
  }
}

/**
 * 获取指定语言的游戏内容，自动fallback到英文
 * 更新：适配新的slug唯一性模式
 */
export async function getLocalizedGameContent(
  baseSlug: string, // 游戏的基础slug（不带语言后缀）
  locale: string
): Promise<CollectionEntry<"games"> | null> {
  try {
    const games = await getCollection("games");

    // 构建目标语言的完整slug
    const targetSlug = `${baseSlug}-${locale}`;
    
    // 查找目标语言的内容
    const localizedGame = games.find((game) => game.data.slug === targetSlug);

    if (localizedGame) {
      return localizedGame;
    }

    // Fallback到英文内容
    if (locale !== "en") {
      const englishSlug = `${baseSlug}-en`;
      const englishGame = games.find((game) => game.data.slug === englishSlug);
      return englishGame || null;
    }

    return null;
  } catch (error) {
    console.error(
      `Failed to load game content for ${baseSlug} in ${locale}:`,
      error
    );
    return null;
  }
}

/**
 * 获取游戏的本地化路径
 * 更新：适配新的slug模式，URL仍使用基础slug（不带语言后缀）
 */
export function getGameLocalizedPath(baseSlug: string, locale: string): string {
  return locale === "en" ? `/${baseSlug}/` : `/${locale}/${baseSlug}/`;
}

/**
 * 从完整slug中提取基础slug（去除语言后缀）
 */
export function extractBaseSlug(fullSlug: string): string {
  // 匹配 -en, -de, -es, -fr, -ja, -ko, -zh 等语言后缀
  const match = fullSlug.match(/^(.+)-(en|de|es|fr|ja|ko|zh)$/);
  return match ? match[1] : fullSlug;
}

/**
 * 获取支持的语言列表
 */
export const supportedLocales = SUPPORTED_LOCALES as unknown as string[];

/**
 * 检查语言是否支持
 */
export function isLocaleSupported(locale: string): boolean {
  return supportedLocales.includes(locale);
}

/**
 * 从路径中提取语言代码
 */
export function extractLocaleFromPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && supportedLocales.includes(segments[0])) {
    return segments[0];
  }
  return "en";
}

/**
 * 为英文游戏生成静态路径
 */
export async function generateEnglishGamePaths(): Promise<
  Array<{
    params: { slug: string };
    props: { game: CollectionEntry<"games">; locale: string };
  }>
> {
  // 🔧 优化：直接过滤英文游戏，现在在根目录
  const englishGames = await getCollection("games", (entry) => {
    return !entry.id.includes("/"); // 英文游戏在根目录，ID中不包含'/'
  });

  const paths: Array<{
    params: { slug: string };
    props: { game: CollectionEntry<"games">; locale: string };
  }> = [];

  if (import.meta.env.DEV)
    console.log(`[DEBUG] English games found: ${englishGames.length}`);

  // 处理英文游戏
  for (const game of englishGames) {
    const gameId = game.id.replace(/\.md$/, "");
    // 从slug中提取基础名称（去除语言后缀）
    const baseSlug = extractBaseSlug(game.data.slug || gameId);

    if (import.meta.env.DEV) {
      console.log(`[DEBUG] Processing English game: ${gameId}, baseSlug: ${baseSlug}`);
    }

    // 英文游戏现在直接在根目录
    if (gameId && !gameId.includes("/")) {
      paths.push({
        params: { slug: baseSlug },
        props: {
          game: game,
          locale: "en",
        },
      });
      if (import.meta.env.DEV) {
        console.log(
          `[DEBUG] Generated English path: /${baseSlug}, gameSlug=${game.data.slug}`
        );
      }
    }
  }

  if (import.meta.env.DEV)
    console.log(`[DEBUG] Total English paths generated: ${paths.length}`);
  return paths;
}

/**
 * 为指定语言的游戏生成静态路径
 */
export async function generateLocalizedGamePaths(targetLocale: string): Promise<
  Array<{
    params: { slug: string };
    props: { game: CollectionEntry<"games">; locale: string };
  }>
> {
  // 🔧 优化：分别获取目标语言和英文游戏，避免加载全部文件
  const [localizedGames, englishGames] = await Promise.all([
    getCollection("games", (entry) => entry.id.startsWith(`${targetLocale}/`)),
    getCollection("games", (entry) => !entry.id.includes("/")), // 英文游戏在根目录
  ]);

  const paths: Array<{
    params: { slug: string };
    props: { game: CollectionEntry<"games">; locale: string };
  }> = [];

  if (import.meta.env.DEV) {
    console.log(
      `[DEBUG] ${targetLocale} games found: ${localizedGames.length}`
    );
    console.log(`[DEBUG] English games for fallback: ${englishGames.length}`);
  }

  // 获取所有英文游戏的slug用于生成路径
  const englishSlugs = englishGames
    .map((game) => {
      const gameId = game.id.replace(/\.md$/, "");
      return gameId; // 英文游戏的ID就是slug
    })
    .filter(Boolean);

  for (const slug of englishSlugs) {
    // 首先尝试找到本地化版本
    const localizedGame = localizedGames.find((game) => {
      const gameId = game.id.replace(/\.md$/, "");
      return gameId === `${targetLocale}/${slug}`;
    });

    // 如果有本地化内容，使用本地化内容；否则fallback到英文
    let gameToUse = localizedGame;
    if (!gameToUse) {
      const englishGame = englishGames.find((game) => {
        const gameId = game.id.replace(/\.md$/, "");
        return gameId === slug; // 英文游戏直接匹配slug
      });
      gameToUse = englishGame;
    }

    if (gameToUse) {
      paths.push({
        params: { slug },
        props: {
          game: gameToUse,
          locale: targetLocale,
        },
      });
      if (import.meta.env.DEV) {
        console.log(
          `[DEBUG] Generated ${targetLocale} path: /${targetLocale}/${slug}, using content from: ${gameToUse.id}`
        );
      }
    }
  }

  if (import.meta.env.DEV)
    console.log(
      `[DEBUG] Total ${targetLocale} paths generated: ${paths.length}`
    );
  return paths;
}

/**
 * 兼容测试命名：多语言静态路径生成（当前等价于英文路径生成）
 * 注意：实际多语言静态路径由各语言目录页面分别生成
 */
export async function generateMultiLanguageStaticPaths(): Promise<
  Array<{
    params: { slug: string };
    props: { game: CollectionEntry<"games">; locale: string };
  }>
> {
  return generateEnglishGamePaths();
}

/**
 * 生成所有受支持语言的静态路径（用于统一的单文件路由）
 * - 英文：无前缀
 * - 其它语言：带 /{locale}/ 前缀
 * 修复：避免重复生成，每个游戏只生成一次对应语言版本
 */
export async function generateAllLocalesGamePaths(): Promise<
  Array<{
    params: { slug: string };
    props: { game: CollectionEntry<"games">; locale: string };
  }>
> {
  const paths: Array<{
    params: { slug: string };
    props: { game: CollectionEntry<"games">; locale: string };
  }> = [];

  // 获取所有游戏文件
  const allGames = await getCollection("games");
  
  // 按语言分组游戏
  const gamesByLocale: Record<string, CollectionEntry<"games">[]> = {};
  const englishGames: CollectionEntry<"games">[] = [];

  for (const game of allGames) {
    const gameId = game.id.replace(/\.md$/, "");
    
    if (gameId.includes("/")) {
      // 多语言游戏：{locale}/{slug}
      const [locale, slug] = gameId.split("/");
      if (!gamesByLocale[locale]) {
        gamesByLocale[locale] = [];
      }
      gamesByLocale[locale].push(game);
    } else {
      // 英文游戏：{slug}
      englishGames.push(game);
    }
  }

  // 生成英文路径（无前缀）
  for (const game of englishGames) {
    const gameId = game.id.replace(/\.md$/, "");
    // 从slug中提取基础名称（去除语言后缀）
    const baseSlug = extractBaseSlug(game.data.slug || gameId);
    paths.push({
      params: { slug: baseSlug },
      props: { game, locale: "en" }
    });
  }

  // 为每种非英文语言生成路径
  for (const locale of SUPPORTED_LOCALES) {
    if (locale === "en") continue;

    const localeGames = gamesByLocale[locale] || [];
    
    // 为每个英文游戏生成对应语言路径
    for (const englishGame of englishGames) {
      const englishGameId = englishGame.id.replace(/\.md$/, "");
      const baseSlug = extractBaseSlug(englishGame.data.slug || englishGameId);
      
      // 查找对应的本地化游戏
      const localizedGame = localeGames.find(game => {
        const localizedBaseSlug = extractBaseSlug(game.data.slug || game.id.replace(/\.md$/, ""));
        return localizedBaseSlug === baseSlug;
      });

      // 使用本地化内容或fallback到英文
      const gameToUse = localizedGame || englishGame;
      
      paths.push({
        params: { slug: baseSlug },
        props: { game: gameToUse, locale }
      });
    }
  }

  if (import.meta.env.DEV) {
    console.log(`🔍 Generated ${paths.length} total game paths`);
    console.log(`📊 English games: ${englishGames.length}`);
    for (const locale of SUPPORTED_LOCALES) {
      if (locale !== "en") {
        const count = gamesByLocale[locale]?.length || 0;
        console.log(`📊 ${locale} games: ${count}`);
      }
    }
  }

  return paths;
}
