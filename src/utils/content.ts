/**
 * 统一的内容过滤工具
 * 用于处理多语言游戏的筛选和分页逻辑
 * 完整的游戏ID验证和数据一致性保障
 */

import { getCollection, type CollectionEntry } from 'astro:content';
import { PAGINATION_CONFIG } from '@/config/pagination';

// 支持的语言代码
export const SUPPORTED_LANGUAGES = ['zh', 'es', 'fr', 'de', 'ja', 'ko'] as const;
type LanguageCode = typeof SUPPORTED_LANGUAGES[number];

/**
 * 验证游戏ID格式是否符合规范
 * 英文游戏: {game-name}
 * 多语言游戏: {lang}-{game-name}
 */
export function validateGameIdFormat(gameId: string): {
  isValid: boolean;
  language: string;
  baseName: string;
  error?: string;
} {
  const cleanId = gameId.replace(/\.md$/, '');
  
  // 检查多语言格式
  const langMatch = cleanId.match(/^([a-z]{2})-(.+)$/);
  if (langMatch) {
    const [, lang, baseName] = langMatch;
    if (!SUPPORTED_LANGUAGES.includes(lang as LanguageCode)) {
      return {
        isValid: false,
        language: lang,
        baseName,
        error: `Unsupported language code: ${lang}`
      };
    }
    return {
      isValid: true,
      language: lang,
      baseName
    };
  }
  
  // 英文游戏格式验证
  if (!/^[a-z0-9-]+$/.test(cleanId)) {
    return {
      isValid: false,
      language: 'en',
      baseName: cleanId,
      error: 'Invalid game ID format. Only lowercase letters, numbers and hyphens allowed.'
    };
  }
  
  return {
    isValid: true,
    language: 'en',
    baseName: cleanId
  };
}

/**
 * 筛选英文游戏 - 游戏ID格式为 `{game-name}`
 * 多语言游戏ID格式为 `{lang}-{game-name}`
 * 包含格式验证和错误处理
 */
export function filterEnglishGames(games: CollectionEntry<'games'>[]): CollectionEntry<'games'>[] {
  return games.filter((game) => {
    const validation = validateGameIdFormat(game.id);
    
    if (!validation.isValid) {
      console.warn(`Invalid game ID format: ${game.id} - ${validation.error}`);
      return false;
    }
    
    return validation.language === 'en';
  });
}

/**
 * 筛选指定语言的游戏
 */
export function filterGamesByLanguage(
  games: CollectionEntry<'games'>[],
  language: string
): CollectionEntry<'games'>[] {
  if (language === 'en') {
    return filterEnglishGames(games);
  }
  
  return games.filter((game) => {
    const gameId = game.id.replace(/\.md$/, '');
    return gameId.startsWith(`${language}-`);
  });
}

/**
 * 筛选指定分类的游戏
 */
export function filterGamesByCategory(
  games: CollectionEntry<'games'>[],
  category: string
): CollectionEntry<'games'>[] {
  return games.filter((game) => game.data.category === category);
}

/**
 * 获取英文游戏并按分类筛选
 * 统一的入口函数，避免重复筛选逻辑
 */
export async function getEnglishGamesByCategory(category?: string): Promise<CollectionEntry<'games'>[]> {
  const allGames = await getCollection('games');
  const englishGames = filterEnglishGames(allGames);
  
  if (category) {
    return filterGamesByCategory(englishGames, category);
  }
  
  return englishGames;
}

/**
 * 统一的分页计算工具
 * 使用全局配置，确保所有页面一致性
 */
export function calculatePagination(
  totalItems: number, 
  currentPage: number = 1,
  pageSize: number = PAGINATION_CONFIG.GAMES_PER_PAGE
) {
  // 输入验证
  const safeCurrentPage = Math.max(1, Math.floor(currentPage));
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const safeTotalItems = Math.max(0, Math.floor(totalItems));
  
  const totalPages = Math.max(1, Math.ceil(safeTotalItems / safePageSize));
  const validCurrentPage = Math.min(safeCurrentPage, totalPages);
  
  const startIndex = (validCurrentPage - 1) * safePageSize;
  const endIndex = Math.min(startIndex + safePageSize, safeTotalItems);
  
  return {
    currentPage: validCurrentPage,
    totalPages,
    totalItems: safeTotalItems,
    startIndex,
    endIndex,
    hasNextPage: validCurrentPage < totalPages,
    hasPrevPage: validCurrentPage > 1,
    isEmpty: safeTotalItems === 0,
    isValidPage: safeCurrentPage <= totalPages
  };
}

/**
 * 获取分页后的游戏数据
 * 统一入口，确保数据一致性
 */
export function getPaginatedGames<T>(
  games: T[],
  currentPage: number = 1,
  pageSize: number = PAGINATION_CONFIG.GAMES_PER_PAGE
) {
  const pagination = calculatePagination(games.length, currentPage, pageSize);
  const paginatedGames = games.slice(pagination.startIndex, pagination.endIndex);
  
  return {
    games: paginatedGames,
    ...pagination
  };
}

/**
 * 验证游戏数据完整性
 */
export function validateGameData(game: any): boolean {
  return Boolean(
    game &&
    game.data &&
    typeof game.data.slug === 'string' &&
    typeof game.data.title === 'string' &&
    typeof game.data.image === 'string'
  );
}

/**
 * 获取英文分类游戏的完整工具 - 包含验证和分页
 */
export async function getEnglishGamesPaginated(
  category?: string,
  currentPage: number = 1
) {
  try {
    const allGames = await getEnglishGamesByCategory(category);
    const validGames = allGames.filter(validateGameData);
    
    return getPaginatedGames(validGames, currentPage);
  } catch (error) {
    console.error('Error fetching paginated English games:', error);
    return {
      games: [],
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      startIndex: 0,
      endIndex: 0,
      hasNextPage: false,
      hasPrevPage: false,
      isEmpty: true,
      isValidPage: false
    };
  }
}