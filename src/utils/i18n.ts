import { getCollection, type CollectionEntry } from "astro:content";
import { SUPPORTED_LOCALES } from "@/i18n/utils";

/**
 * 获取本地化的游戏列表，优先使用指定语言版本
 */
export async function getLocalizedGamesList(locale: string = "en") {
  try {
    const allGames = await getCollection("games");
    const gameMap = new Map<string, CollectionEntry<"games">>();

    // 首先收集所有游戏的slug（基于英文版本，现在在根目录）
    const englishGames = allGames.filter((game) => {
      const gameId = game.id.replace(/\.md$/, "");
      // 英文游戏现在在根目录，ID中不包含'/'
      return !gameId.includes("/");
    });

    // 为每个游戏slug寻找最佳语言版本
    for (const englishGame of englishGames) {
      const gameId = englishGame.id.replace(/\.md$/, "");
      const slug = gameId; // 英文游戏的ID就是slug，不再有路径前缀

      // 优先查找目标语言版本
      const localizedGame = allGames.find((game) => {
        const targetGameId = game.id.replace(/\.md$/, "");
        if (locale === "en") {
          // 英文版本直接匹配slug
          return targetGameId === slug;
        } else {
          // 其他语言版本在子目录中
          return targetGameId === `${locale}/${slug}`;
        }
      });

      // 使用本地化版本或fallback到英文版本
      gameMap.set(slug, localizedGame || englishGame);
    }

    return Array.from(gameMap.values());
  } catch (error) {
    console.error(`Failed to load localized games list for ${locale}:`, error);
    return [];
  }
}

/**
 * 获取指定语言的游戏内容，自动fallback到英文
 */
export async function getLocalizedGameContent(
  slug: string,
  locale: string
): Promise<CollectionEntry<"games"> | null> {
  try {
    // 尝试加载指定语言的内容
    const games = await getCollection("games");

    // 查找目标语言的内容
    const localizedGame = games.find((game) => {
      const gameId = game.id.replace(/\.md$/, "");
      if (locale === "en") {
        // 英文内容直接匹配slug
        return gameId === slug;
      } else {
        // 其他语言内容在子目录中
        return gameId === `${locale}/${slug}`;
      }
    });

    if (localizedGame) {
      return localizedGame;
    }

    // Fallback到英文内容
    if (locale !== "en") {
      const englishGame = games.find((game) => {
        const gameId = game.id.replace(/\.md$/, "");
        return gameId === slug; // 英文内容直接匹配slug
      });
      return englishGame || null;
    }

    return null;
  } catch (error) {
    console.error(
      `Failed to load game content for ${slug} in ${locale}:`,
      error
    );
    return null;
  }
}

/**
 * 获取游戏的本地化路径
 */
export function getGameLocalizedPath(slug: string, locale: string): string {
  return locale === "en" ? `/${slug}/` : `/${locale}/${slug}/`;
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
    const slug = gameId; // 英文游戏的ID就是slug

    if (import.meta.env.DEV) {
      console.log(`[DEBUG] Processing English game: ${gameId}`);
    }

    // 英文游戏现在直接在根目录
    if (gameId && !gameId.includes("/")) {
      paths.push({
        params: { slug },
        props: {
          game: game,
          locale: "en",
        },
      });
      if (import.meta.env.DEV) {
        console.log(
          `[DEBUG] Generated English path: /${slug}, gameSlug=${game.slug}`
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
  // 英文路径（无前缀）
  const enPaths = await generateEnglishGamePaths();
  paths.push(...enPaths);

  // 其它语言路径
  for (const locale of SUPPORTED_LOCALES) {
    if (locale === "en") continue;
    const localePaths = await generateLocalizedGamePaths(locale);
    paths.push(...localePaths);
  }

  return paths;
}
