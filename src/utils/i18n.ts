import { getCollection, type CollectionEntry } from "astro:content";
import { SUPPORTED_LOCALES } from "@/i18n/utils";

/**
 * 获取本地化的游戏列表，优先使用指定语言版本
 * 更新：适配标准化slug格式（基于文件路径而非slug后缀）
 */
export async function getLocalizedGamesList(locale: string = "en") {
  try {
    const allGames = await getCollection("games");
    
    // 基于扁平化ID过滤当前语言的游戏
    let currentLocaleGames: typeof allGames;
    
    if (locale === "en") {
      // 英文游戏: ID不以任何语言代码开头
      currentLocaleGames = allGames.filter((game) => {
        const gameId = game.id.replace(/\.md$/, "");
        // 检查是否不以任何支持的语言代码开头
        return !SUPPORTED_LOCALES.some(lang => lang !== "en" && gameId.startsWith(`${lang}-`));
      });
    } else {
      // 其他语言游戏: ID以语言代码开头
      currentLocaleGames = allGames.filter((game) => {
        const gameId = game.id.replace(/\.md$/, "");
        return gameId.startsWith(`${locale}-`);
      });
    }

    // 如果当前语言没有游戏，fallback到英文
    if (currentLocaleGames.length === 0 && locale !== "en") {
      console.log(`⚠️ No games found for ${locale}, fallback to English`);
      return allGames.filter((game) => {
        const gameId = game.id.replace(/\.md$/, "");
        // 检查是否不以任何语言代码开头
        return !SUPPORTED_LOCALES.some(lang => lang !== "en" && gameId.startsWith(`${lang}-`));
      });
    }

    return currentLocaleGames;
  } catch (error) {
    console.error(`Failed to load localized games list for ${locale}:`, error);
    return [];
  }
}

/**
 * 获取指定语言的游戏内容，自动fallback到英文
 * 更新：适配新的语言前缀slug格式
 */
export async function getLocalizedGameContent(
  baseSlug: string, // 游戏的基础slug（不带语言前缀）
  locale: string
): Promise<CollectionEntry<"games"> | null> {
  try {
    const games = await getCollection("games");

    // 调试信息
    if (import.meta.env.DEV) {
      console.log(`[getLocalizedGameContent] Looking for baseSlug: ${baseSlug}, locale: ${locale}`);
    }

    // 生成目标语言的完整slug
    const targetSlug = generateLanguageSlug(baseSlug, locale);
    
    // 查找目标语言的内容 - 根据文件路径和完整slug匹配
    let localizedGame: CollectionEntry<"games"> | undefined;

    if (locale === "en") {
      // 英文游戏: ID不以任何语言代码开头，slug为基础slug
      localizedGame = games.find((game) => {
        const gameId = game.id.replace(/\.md$/, "");
        const isEnglishGame = !SUPPORTED_LOCALES.some(lang => lang !== "en" && gameId.startsWith(`${lang}-`));
        const matches = isEnglishGame && game.data.slug === targetSlug;
        if (import.meta.env.DEV && matches) {
          console.log(`[getLocalizedGameContent] Found English game: ${gameId}, slug: ${game.data.slug}`);
        }
        return matches;
      });
    } else {
      // 其他语言游戏: ID以语言代码开头，slug为语言前缀格式
      localizedGame = games.find((game) => {
        const gameId = game.id.replace(/\.md$/, "");
        const matches = gameId.startsWith(`${locale}-`) && game.data.slug === targetSlug;
        if (import.meta.env.DEV && matches) {
          console.log(`[getLocalizedGameContent] Found ${locale} game: ${gameId}, slug: ${game.data.slug}`);
        }
        return matches;
      });
    }

    if (localizedGame) {
      if (import.meta.env.DEV) {
        console.log(`[getLocalizedGameContent] Returning localized content for ${locale}: ${localizedGame.id}`);
      }
      return localizedGame;
    }

    // Fallback到英文内容
    if (locale !== "en") {
      const englishSlug = generateLanguageSlug(baseSlug, "en"); // 英文基础slug
      const englishGame = games.find((game) => {
        const gameId = game.id.replace(/\.md$/, "");
        const isEnglishGame = !SUPPORTED_LOCALES.some(lang => lang !== "en" && gameId.startsWith(`${lang}-`));
        const matches = isEnglishGame && game.data.slug === englishSlug;
        if (import.meta.env.DEV && matches) {
          console.log(`[getLocalizedGameContent] Fallback to English game: ${gameId}, slug: ${game.data.slug}`);
        }
        return matches;
      });
      if (englishGame && import.meta.env.DEV) {
        console.log(`[getLocalizedGameContent] Returning fallback English content: ${englishGame.id}`);
      }
      return englishGame || null;
    }

    if (import.meta.env.DEV) {
      console.log(`[getLocalizedGameContent] No content found for ${baseSlug} in ${locale}`);
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
 * 从完整slug中提取基础slug（去除语言前缀）
 * 新格式：{language}-{baseSlug} -> {baseSlug}
 */
export function extractBaseSlug(fullSlug: string): string {
  // 安全检查：确保fullSlug不为undefined或null
  if (!fullSlug || typeof fullSlug !== 'string') {
    console.warn('extractBaseSlug received invalid input:', fullSlug);
    return '';
  }
  
  // 匹配语言前缀：zh-, es-, fr-, de-, ja-, ko- 等
  const match = fullSlug.match(/^(zh|es|fr|de|ja|ko)-(.+)$/);
  return match ? match[2] : fullSlug; // 如果匹配到前缀则返回基础部分，否则返回原值（英文）
}

/**
 * 根据基础slug和语言生成完整的slug
 * 英文：返回基础slug，其他语言：{language}-{baseSlug}
 */
export function generateLanguageSlug(baseSlug: string, language: string): string {
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
 */
export async function generateEnglishGamePaths(): Promise<
  Array<{
    params: { slug: string };
    props: { game: CollectionEntry<"games">; locale: string };
  }>
> {
  // 🔧 优化：直接过滤英文游戏，现在基于扁平化ID
  const englishGames = await getCollection("games", (entry) => {
    const gameId = entry.id.replace(/\.md$/, "");
    // 英文游戏: ID不以任何语言代码开头
    return !SUPPORTED_LOCALES.some(lang => lang !== "en" && gameId.startsWith(`${lang}-`));
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
    // 英文游戏的slug就是基础slug（不带语言前缀）
    const baseSlug = game.data.slug || gameId;

    if (import.meta.env.DEV) {
      console.log(`[DEBUG] Processing English game: ${gameId}, baseSlug: ${baseSlug}`);
    }

    // 英文游戏: 基于扁平化ID过滤
    const isEnglishGame = !SUPPORTED_LOCALES.some(lang => lang !== "en" && gameId.startsWith(`${lang}-`));
    
    if (gameId && isEnglishGame) {
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
    getCollection("games", (entry) => {
      const gameId = entry.id.replace(/\.md$/, "");
      return gameId.startsWith(`${targetLocale}-`);
    }),
    getCollection("games", (entry) => {
      const gameId = entry.id.replace(/\.md$/, "");
      return !SUPPORTED_LOCALES.some(lang => lang !== "en" && gameId.startsWith(`${lang}-`));
    }),
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

  // 获取所有英文游戏的基础slug用于生成路径
  const englishSlugs = englishGames
    .map((game) => {
      // 英文游戏的slug就是基础slug
      return game.data.slug || game.id.replace(/\.md$/, "");
    })
    .filter(Boolean);

  for (const baseSlug of englishSlugs) {
    // 首先尝试找到本地化版本（查找语言前缀slug）
    const targetSlug = generateLanguageSlug(baseSlug, targetLocale);
    const localizedGame = localizedGames.find((game) => {
      return game.data.slug === targetSlug;
    });

    // 如果有本地化内容，使用本地化内容；否则fallback到英文
    let gameToUse = localizedGame;
    if (!gameToUse) {
      const englishGame = englishGames.find((game) => {
        return game.data.slug === baseSlug; // 英文游戏匹配基础slug
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
      if (import.meta.env.DEV) {
        console.log(
          `[DEBUG] Generated ${targetLocale} path: /${targetLocale}/${baseSlug}, using content from: ${gameToUse.id} (slug: ${gameToUse.data.slug})`
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
  
  if (import.meta.env.DEV) {
    console.log(`🔍 Total games loaded: ${allGames.length}`);
    console.log(`📁 Sample game IDs:`, allGames.slice(0, 5).map(g => g.id));
    console.log(`📁 All game IDs (first 20):`, allGames.slice(0, 20).map(g => g.id));
    
    // Check if any games have paths with slashes
    const gamesWithSlashes = allGames.filter(g => g.id.includes('/'));
    console.log(`📁 Games with slashes (first 10):`, gamesWithSlashes.slice(0, 10).map(g => g.id));
  }
  
  // 按语言分组游戏
  const gamesByLocale: Record<string, CollectionEntry<"games">[]> = {};
  const englishGames: CollectionEntry<"games">[] = [];

  for (const game of allGames) {
    const gameId = game.id.replace(/\.md$/, "");
    
    // 检查是否为非英文游戏 (以语言代码开头)
    const languageMatch = SUPPORTED_LOCALES.find(lang => lang !== "en" && gameId.startsWith(`${lang}-`));
    
    if (languageMatch) {
      // 多语言游戏：{locale}-{slug}
      if (!gamesByLocale[languageMatch]) {
        gamesByLocale[languageMatch] = [];
      }
      gamesByLocale[languageMatch].push(game);
      if (import.meta.env.DEV && languageMatch === "zh") {
        console.log(`🔍 Found Chinese game: ${gameId}, slug: ${game.data.slug}`);
      }
    } else {
      // 英文游戏：{slug}
      englishGames.push(game);
    }
  }

  if (import.meta.env.DEV) {
    console.log(`🔍 Games by locale:`, Object.keys(gamesByLocale).map(locale => `${locale}: ${gamesByLocale[locale].length}`));
  }

  // 生成英文路径（无前缀）
  for (const game of englishGames) {
    // 英文游戏的slug就是基础slug
    const baseSlug = game.data.slug || game.id.replace(/\.md$/, "");
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
      const baseSlug = englishGame.data.slug || englishGame.id.replace(/\.md$/, "");
      
      // 查找对应的本地化游戏（通过语言前缀slug匹配）
      const targetSlug = generateLanguageSlug(baseSlug, locale);
      const localizedGame = localeGames.find(game => {
        return game.data.slug === targetSlug;
      });

      // 使用本地化内容或fallback到英文
      const gameToUse = localizedGame || englishGame;
      
      if (import.meta.env.DEV && locale === "zh" && baseSlug === "ayocs-sprunkr") {
        console.log(`🔍 Chinese ayocs-sprunkr path: looking for slug '${targetSlug}', found ${localizedGame ? 'localized' : 'fallback'} content from ${gameToUse.id} (slug: ${gameToUse.data.slug})`);
        console.log(`🔍 Available Chinese games with ayocs:`, localeGames.filter(g => g.data.slug?.includes('ayocs')).map(g => ({id: g.id, slug: g.data.slug})));
      }
      
      paths.push({
        params: { slug: baseSlug }, // URL路径使用基础slug
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
