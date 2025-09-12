/**
 * 内容加载工具 - 支持新旧结构双读
 * Phase 1: 兼容层实现，保持零对外差异
 */

import { getCollection, type CollectionEntry } from "astro:content";

export type GameEntry = CollectionEntry<"games">;

export interface GameFrontmatter {
  title: string;
  description: string;
  meta?: {
    title?: string;
    description?: string;
    keywords?: string;
  };
  [key: string]: any;
}

export interface LoadedGameEntry {
  frontmatter: GameFrontmatter;
  entry: GameEntry;
  locale: string;
  baseSlug: string;
}

/**
 * 加载游戏条目，支持新旧结构双读
 * 优先使用 translations[locale]，否则回退到本地化文件
 */
export async function loadGameEntry(
  slug: string,
  locale: string,
): Promise<LoadedGameEntry | null> {
  try {
    const games = await getCollection("games");

    // 提取基础 slug（去除语言前缀）
    const baseSlug = slug.replace(/^(en|zh|es|fr|de|ja|ko)[-\/]/, "");

    // 查找英文主文件
    const englishGame = games.find(
      (g) =>
        g.id === `${baseSlug}.md` || g.id === baseSlug || g.slug === baseSlug,
    );

    if (!englishGame) {
      console.warn(`Game not found: ${baseSlug}`);
      return null;
    }

    // 如果是英文，直接返回
    if (locale === "en") {
      return {
        frontmatter: extractFrontmatter(englishGame, "en"),
        entry: englishGame,
        locale: "en",
        baseSlug,
      };
    }

    // 非英文：优先查找本地化文件
    const localizedGame = games.find(
      (g) =>
        g.id === `${locale}/${baseSlug}.md` ||
        g.id === `${locale}-${baseSlug}.md` ||
        g.id === `${locale}-${baseSlug}` ||
        g.slug === `${locale}/${baseSlug}` ||
        g.slug === `${locale}-${baseSlug}`,
    );

    if (localizedGame) {
      // 如果有本地化文件，检查是否有新结构的 translations
      const frontmatter = extractFrontmatter(
        localizedGame,
        locale,
        englishGame,
      );
      return {
        frontmatter,
        entry: localizedGame,
        locale,
        baseSlug,
      };
    }

    // 没有本地化文件，使用英文主文件的 translations
    const frontmatter = extractFrontmatter(englishGame, locale);
    return {
      frontmatter,
      entry: englishGame,
      locale,
      baseSlug,
    };
  } catch (error) {
    console.error(`Failed to load game entry: ${slug} (${locale})`, error);
    return null;
  }
}

/**
 * 提取 frontmatter，支持新旧结构
 */
function extractFrontmatter(
  game: GameEntry,
  locale: string,
  englishGame?: GameEntry,
): GameFrontmatter {
  const data = game.data as any;

  // 优先级 1: 新结构 - translations[locale]
  if (data.translations && data.translations[locale]) {
    return {
      ...data,
      ...data.translations[locale],
      // 保留原有字段作为回退
      title: data.translations[locale].title || data.title,
      description: data.translations[locale].description || data.description,
      meta: data.translations[locale].meta || data.meta,
    };
  }

  // 优先级 2: 如果提供了英文游戏，检查其 translations
  if (englishGame) {
    const englishData = englishGame.data as any;
    if (englishData.translations && englishData.translations[locale]) {
      return {
        ...data,
        ...englishData.translations[locale],
        title: englishData.translations[locale].title || data.title,
        description:
          englishData.translations[locale].description || data.description,
        meta: englishData.translations[locale].meta || data.meta,
      };
    }
  }

  // 优先级 3: 使用当前文件的 frontmatter
  return {
    title: data.title,
    description: data.description,
    meta: data.meta,
    ...data,
  };
}

/**
 * 批量加载多个游戏
 */
export async function loadGameEntries(
  locale: string,
  limit?: number,
): Promise<LoadedGameEntry[]> {
  const games = await getCollection("games");
  const results: LoadedGameEntry[] = [];
  const processedSlugs = new Set<string>();

  for (const game of games) {
    // 提取基础 slug
    const baseSlug = game.slug.replace(/^(en|zh|es|fr|de|ja|ko)[-\/]/, "");

    // 跳过已处理的
    if (processedSlugs.has(baseSlug)) {
      continue;
    }

    // 只处理英文主文件或当前语言的文件
    const isEnglishMain = !game.slug.match(/^(zh|es|fr|de|ja|ko)[-\/]/);
    const isCurrentLocale =
      game.slug.startsWith(`${locale}-`) || game.slug.startsWith(`${locale}/`);

    if (isEnglishMain || (locale !== "en" && isCurrentLocale)) {
      const entry = await loadGameEntry(baseSlug, locale);
      if (entry) {
        results.push(entry);
        processedSlugs.add(baseSlug);
      }
    }

    if (limit && results.length >= limit) {
      break;
    }
  }

  return results;
}

/**
 * 检查游戏是否有特定语言的内容
 */
export async function hasLocalizedContent(
  baseSlug: string,
  locale: string,
): Promise<boolean> {
  if (locale === "en") return true;

  const games = await getCollection("games");

  // 检查本地化文件
  const hasLocalFile = games.some(
    (g) =>
      g.id === `${locale}/${baseSlug}.md` ||
      g.id === `${locale}-${baseSlug}.md` ||
      g.slug === `${locale}/${baseSlug}` ||
      g.slug === `${locale}-${baseSlug}`,
  );

  if (hasLocalFile) return true;

  // 检查英文主文件的 translations
  const englishGame = games.find(
    (g) =>
      g.id === `${baseSlug}.md` || g.id === baseSlug || g.slug === baseSlug,
  );

  if (englishGame) {
    const data = englishGame.data as any;
    return !!(data.translations && data.translations[locale]);
  }

  return false;
}
