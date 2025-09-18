import { getCollection, type CollectionEntry } from "astro:content";
import { SUPPORTED_LOCALES } from "@/i18n/utils";

/**
 * 获取本地化的游戏列表，优先使用指定语言版本
 * 修复：基于统一的slug格式 {locale}/{game-name} 来识别语言
 */
export async function getLocalizedGamesList(locale: string = "en") {
  try {
    const allGames = await getCollection("games");

    // 基于文件路径过滤当前语言的游戏
    let currentLocaleGames: typeof allGames;

    if (locale === "en") {
      // 英文游戏: 文件在根目录，不包含'/'，排除测试文件，排除带语言前缀的文件
      currentLocaleGames = allGames.filter((game) => {
        const gameId = game.id.replace(/\.md$/, "");
        const isRootGame = !gameId.includes("/");
        const isNotTestGame = !gameId.includes("test-game");

        // 排除带语言前缀的文件 (zh-, ja-, ko-, de-, es-, fr- 等)
        const languagePrefixes = ["zh-", "ja-", "ko-", "de-", "es-", "fr-"];
        const hasLanguagePrefix = languagePrefixes.some((prefix) =>
          gameId.startsWith(prefix),
        );

        return isRootGame && isNotTestGame && !hasLanguagePrefix;
      });

      // Debug: 显示前5个游戏ID结构
      console.log(`🔍 Sample game IDs (first 5):`);
      allGames.slice(0, 5).forEach((game) => {
        const gameId = game.id.replace(/\.md$/, "");
        console.log(
          `  - ${game.id} => ${gameId} (includes '/'? ${gameId.includes("/")})`,
        );
      });

      // Debug: 显示过滤后的前5个英文游戏
      console.log(`🎮 Filtered English games (first 5):`);
      currentLocaleGames.slice(0, 5).forEach((game) => {
        console.log(`  - ${game.id}`);
      });
    } else {
      // 其他语言游戏: Astro将zh/file.md处理为zh-file的ID格式
      currentLocaleGames = allGames.filter((game) => {
        const gameId = game.id.replace(/\.md$/, "");
        // Astro content collection将 zh/file.md 转换为 zh-file 的ID
        return gameId.startsWith(`${locale}-`);
      });
    }

    console.log(
      `🔍 Found ${currentLocaleGames.length} games for locale: ${locale}`,
    );
    console.log(`📊 Total games in collection: ${allGames.length}`);

    // 仅在真正没有找到游戏时才fallback，并输出调试信息
    if (currentLocaleGames.length === 0 && locale !== "en") {
      console.log(`⚠️ No games found for ${locale}, fallback to English`);
      const englishGames = allGames.filter((game) => {
        const gameId = game.id.replace(/\.md$/, "");
        return !gameId.includes("/");
      });
      console.log(`📊 Using ${englishGames.length} English games as fallback`);

      // P1-5: 即使是fallback，也应用translations覆盖
      return englishGames.map((game) => {
        const translations = game.data.translations || {};
        const localizedData = translations[locale];

        // 创建轻量级派生对象，优先使用translations[locale]
        return {
          ...game,
          data: {
            ...game.data,
            title: localizedData?.title || game.data.title,
            description: localizedData?.description || game.data.description,
          },
        };
      });
    }

    // P1-5: 应用translations覆盖到返回数据
    return currentLocaleGames.map((game) => {
      const translations = game.data.translations || {};
      const localizedData = translations[locale];

      // 创建轻量级派生对象，优先使用translations[locale]
      return {
        ...game,
        data: {
          ...game.data,
          title: localizedData?.title || game.data.title,
          description: localizedData?.description || game.data.description,
        },
      };
    });
  } catch (error) {
    console.error(`Failed to load localized games list for ${locale}:`, error);
    return [];
  }
}

/**
 * 获取指定语言的游戏内容，自动fallback到英文
 * 修复：基于统一的slug格式 {locale}/{game-name} 来匹配游戏
 */
export async function getLocalizedGameContent(
  baseSlug: string, // 游戏的基础slug（不带语言前缀）
  locale: string,
): Promise<CollectionEntry<"games"> | null> {
  try {
    const games = await getCollection("games");

    console.log(
      `🔍 Looking for game with baseSlug: ${baseSlug}, locale: ${locale}`,
    );

    let localizedGame: CollectionEntry<"games"> | undefined;

    if (locale === "en") {
      // 英文游戏：在根目录，直接使用baseSlug
      localizedGame = games.find((game) => {
        const gameId = game.id.replace(/\.md$/, "");
        return gameId === baseSlug;
      });
    } else {
      // 其他语言游戏：在语言子目录中，使用 {locale}/{baseSlug} 格式
      const expectedPath = `${locale}/${baseSlug}`;
      localizedGame = games.find((game) => {
        const gameId = game.id.replace(/\.md$/, "");
        const gameSlug = game.data.slug;

        // 匹配文件路径或slug
        return gameId === expectedPath || gameSlug === `${locale}-${baseSlug}`;
      });
    }

    if (localizedGame) {
      console.log(`✅ Found localized game for ${locale}: ${localizedGame.id}`);
      console.log(`📝 Game title: "${localizedGame.data.title}"`);
      console.log(
        `📝 Game description: "${localizedGame.data.description?.substring(0, 100)}..."`,
      );
      return localizedGame;
    }

    // Fallback到英文内容
    if (locale !== "en") {
      console.log(
        `⚠️ No ${locale} version found, falling back to English for: ${baseSlug}`,
      );
      const englishGame = games.find((game) => {
        const gameId = game.id.replace(/\.md$/, "");
        return gameId === baseSlug;
      });
      if (englishGame) {
        console.log(`✅ Found English fallback: ${englishGame.id}`);
      }
      return englishGame || null;
    }

    console.log(
      `❌ No game found for baseSlug: ${baseSlug}, locale: ${locale}`,
    );
    return null;
  } catch (error) {
    console.error(
      `Failed to load game content for ${baseSlug} in ${locale}:`,
      error,
    );
    return null;
  }
}

/**
 * 根据基础slug和语言生成完整的slug
 * 英文：返回基础slug，其他语言：{language}-{baseSlug}
 */
export function generateLanguageSlug(
  baseSlug: string,
  language: string,
): string {
  return language === "en" ? baseSlug : `${language}-${baseSlug}`;
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
 * 修复：基于文件路径而非slug前缀来过滤游戏
 */
export async function generateEnglishGamePaths(): Promise<
  Array<{
    params: { slug: string };
    props: { game: CollectionEntry<"games">; locale: string };
  }>
> {
  // 过滤英文游戏：文件在根目录，不包含'/'
  const englishGames = await getCollection("games", (entry) => {
    const gameId = entry.id.replace(/\.md$/, "");
    return !gameId.includes("/");
  });

  const paths: Array<{
    params: { slug: string };
    props: { game: CollectionEntry<"games">; locale: string };
  }> = [];

  // 处理英文游戏
  for (const game of englishGames) {
    // 英文游戏的slug就是基础slug（不带语言前缀）
    const baseSlug = game.data.slug || game.id.replace(/\.md$/, "");

    if (baseSlug) {
      paths.push({
        params: { slug: baseSlug },
        props: {
          game: game,
          locale: "en",
        },
      });
    }
  }

  console.log(`📊 Generated ${paths.length} English game paths`);
  return paths;
}

/**
 * 为指定语言的游戏生成静态路径
 * 修复：基于文件路径而非slug前缀来过滤游戏
 */
export async function generateLocalizedGamePaths(targetLocale: string): Promise<
  Array<{
    params: { slug: string };
    props: { game: CollectionEntry<"games">; locale: string };
  }>
> {
  // 分别获取目标语言和英文游戏，基于文件路径过滤
  const [localizedGames, englishGames] = await Promise.all([
    getCollection("games", (entry) => {
      const gameId = entry.id.replace(/\.md$/, "");
      return gameId.startsWith(`${targetLocale}/`); // 文件在语言子文件夹中
    }),
    getCollection("games", (entry) => {
      const gameId = entry.id.replace(/\.md$/, "");
      return !gameId.includes("/"); // 英文游戏在根目录
    }),
  ]);

  const paths: Array<{
    params: { slug: string };
    props: { game: CollectionEntry<"games">; locale: string };
  }> = [];

  console.log(
    `📊 Found ${localizedGames.length} ${targetLocale} games and ${englishGames.length} English games`,
  );

  // 获取所有英文游戏的基础slug用于生成路径
  const englishSlugs = englishGames
    .map((game) => {
      // 英文游戏的slug就是基础slug
      return game.data.slug || game.id.replace(/\.md$/, "");
    })
    .filter(Boolean);

  for (const baseSlug of englishSlugs) {
    // 首先尝试找到本地化版本（查找文件路径）
    const targetGameId = `${targetLocale}/${baseSlug}`;
    const localizedGame = localizedGames.find((game) => {
      const gameId = game.id.replace(/\.md$/, "");
      return gameId === targetGameId;
    });

    // 如果有本地化内容，使用本地化内容；否则fallback到英文
    let gameToUse = localizedGame;
    if (!gameToUse) {
      const englishGame = englishGames.find((game) => {
        const slug = game.data.slug || game.id.replace(/\.md$/, "");
        return slug === baseSlug; // 英文游戏匹配基础slug
      });
      gameToUse = englishGame;
    }

    if (gameToUse) {
      paths.push({
        params: { slug: baseSlug }, // URL路径仍使用基础slug
        props: {
          game: gameToUse,
          locale: targetLocale,
        },
      });
    }
  }

  console.log(`📊 Generated ${paths.length} paths for ${targetLocale}`);
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
 * 修复：适配基于文件夹的语言结构
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

  // 按语言分组游戏 - 基于文件路径而非ID前缀
  const gamesByLocale: Record<string, CollectionEntry<"games">[]> = {};
  const englishGames: CollectionEntry<"games">[] = [];

  for (const game of allGames) {
    const gameId = game.id.replace(/\.md$/, "");

    // 检查文件路径是否在语言子文件夹中
    const pathParts = gameId.split("/");
    if (pathParts.length === 2) {
      // 文件在语言子文件夹中：{locale}/{filename}
      const locale = pathParts[0];
      if (SUPPORTED_LOCALES.includes(locale) && locale !== "en") {
        if (!gamesByLocale[locale]) {
          gamesByLocale[locale] = [];
        }
        gamesByLocale[locale].push(game);
      }
    } else {
      // 文件在根目录：英文游戏
      englishGames.push(game);
    }
  }

  // 生成英文路径（无前缀）
  for (const game of englishGames) {
    const baseSlug = game.data.slug || game.id.replace(/\.md$/, "");
    paths.push({
      params: { slug: baseSlug },
      props: { game, locale: "en" },
    });
  }

  // 为每种非英文语言生成路径
  for (const locale of SUPPORTED_LOCALES) {
    if (locale === "en") continue;

    const localeGames = gamesByLocale[locale] || [];

    // 为每个英文游戏生成对应语言路径
    for (const englishGame of englishGames) {
      const baseSlug =
        englishGame.data.slug || englishGame.id.replace(/\.md$/, "");

      // 查找对应的本地化游戏（通过基础文件名匹配）
      const englishFileName = englishGame.id.replace(/\.md$/, "");
      const localizedGame = localeGames.find((game) => {
        const localeFileName = game.id.replace(/\.md$/, "").split("/")[1]; // 获取文件名部分
        return localeFileName === englishFileName;
      });

      // 使用本地化内容或fallback到英文
      const gameToUse = localizedGame || englishGame;

      paths.push({
        params: { slug: baseSlug }, // 始终使用基础slug，不使用本地化的slug
        props: { game: gameToUse, locale },
      });
    }
  }

  return paths;
}

// Re-export for compatibility with tests
export { getGameLocalizedPath } from "./url-service";
