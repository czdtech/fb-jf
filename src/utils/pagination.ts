import { PAGINATION_CONFIG, type PaginationResult, type GamePageItem } from '@/config/pagination';
import { calculatePagination } from '@/utils/content';

/**
 * 验证并规范化页码参数
 * 使用统一的分页配置
 */
export function validatePageNumber(pageParam: string | null | undefined): number {
  if (!pageParam) return PAGINATION_CONFIG.DEFAULT_PAGE;
  
  const pageNum = parseInt(pageParam, 10);
  return isNaN(pageNum) || pageNum < PAGINATION_CONFIG.MIN_PAGE 
    ? PAGINATION_CONFIG.DEFAULT_PAGE 
    : pageNum;
}

/**
 * Validates game object structure for safety
 * @param game - Game object to validate
 * @returns true if game has required properties
 */
export function validateGameObject(game: any): game is GamePageItem {
  return game && 
         game.data && 
         typeof game.data.slug === 'string' && 
         typeof game.data.title === 'string' &&
         typeof game.data.image === 'string';
}

/**
 * 计算分页元数据并切片游戏数据（已弃用 - 使用 content.ts 中的统一工具）
 * @deprecated 请使用 @/utils/content 中的 getPaginatedGames
 */
export function calculatePaginationLegacy(
  games: GamePageItem[], 
  currentPage: number
): PaginationResult & { games: GamePageItem[] } {
  console.warn('使用了已弃用的 pagination.calculatePagination，请迁移到 content.getPaginatedGames');
  
  // 重定向到统一工具
  const { calculatePagination: unifiedCalc } = require('@/utils/content');
  const result = unifiedCalc(games.length, currentPage);
  
  const validGames = games.filter(validateGameObject);
  const paginatedGames = validGames.slice(result.startIndex, result.endIndex);
  
  return {
    games: paginatedGames,
    ...result
  };
}

/**
 * 按分类筛选游戏（已弃用 - 使用 content.ts 中的统一工具）
 * @deprecated 请使用 @/utils/content 中的 filterGamesByCategory
 */
export function filterGamesByCategory(
  games: any[], 
  category: string
): GamePageItem[] {
  console.warn('使用了已弃用的 pagination.filterGamesByCategory，请迁移到 content.filterGamesByCategory');
  
  if (!Array.isArray(games)) {
    console.warn('filterGamesByCategory: games is not an array');
    return [];
  }
  
  return games.filter((game: any) => {
    if (!validateGameObject(game)) {
      console.warn('Invalid game object found:', game);
      return false;
    }
    return game.data.category === category;
  });
}

/**
 * Generates pagination URLs for navigation using directory-style format
 * @param basePath - Base path for the category page (e.g., '/popular-games')
 * @param currentPage - Current page number
 * @param totalPages - Total number of pages
 * @param currentLocale - Current locale for i18n support
 * @returns Object with prev and next URLs in directory format
 */
export function generatePaginationUrls(
  basePath: string, 
  currentPage: number, 
  totalPages: number,
  currentLocale?: string
): { prev?: string; next?: string } {
  const urls: { prev?: string; next?: string } = {};
  
  // Helper to build localized path
  const buildLocalizedPath = (path: string) => {
    if (currentLocale && currentLocale !== 'en') {
      return `/${currentLocale}${path}`;
    }
    return path;
  };
  
  // Previous page URL
  if (currentPage > PAGINATION_CONFIG.MIN_PAGE) {
    if (currentPage === 2) {
      // Page 2 goes back to page 1 (no page number in URL)
      urls.prev = buildLocalizedPath(basePath + '/');
    } else {
      urls.prev = buildLocalizedPath(`${basePath}/${currentPage - 1}/`);
    }
  }
  
  // Next page URL
  if (currentPage < totalPages) {
    urls.next = buildLocalizedPath(`${basePath}/${currentPage + 1}/`);
  }
  
  return urls;
}

/**
 * Builds a page URL using directory-style format
 * @param basePath - Base path (e.g., '/games', '/popular-games')
 * @param page - Page number (1-based)
 * @param currentLocale - Current locale for i18n support
 * @returns Formatted URL
 */
export function buildPageUrl(
  basePath: string, 
  page: number, 
  currentLocale?: string
): string {
  // Helper to build localized path
  const buildLocalizedPath = (path: string) => {
    if (currentLocale && currentLocale !== 'en') {
      return `/${currentLocale}${path}`;
    }
    return path;
  };
  
  if (page === 1) {
    return buildLocalizedPath(basePath + '/');
  }
  return buildLocalizedPath(`${basePath}/${page}/`);
}

/**
 * Generates SEO pagination metadata for HTML head section
 * @param basePath - Base path for the category page
 * @param currentPage - Current page number
 * @param totalPages - Total number of pages
 * @param currentLocale - Current locale for i18n support
 * @returns Object with canonical, prev, next URLs for SEO
 */
export function generateSEOPagination(
  basePath: string,
  currentPage: number,
  totalPages: number,
  currentLocale?: string
): { canonical: string; prev?: string; next?: string } {
  const urls = generatePaginationUrls(basePath, currentPage, totalPages, currentLocale);
  
  return {
    canonical: buildPageUrl(basePath, currentPage, currentLocale),
    prev: urls.prev,
    next: urls.next
  };
}