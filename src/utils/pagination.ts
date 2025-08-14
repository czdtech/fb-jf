import { PAGINATION_CONFIG, type PaginationResult, type GamePageItem } from '@/config/pagination';

/**
 * Validates and normalizes a page number parameter
 * @param pageParam - Raw page parameter from URL
 * @returns Valid page number (minimum 1)
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
 * Calculates pagination metadata and slices games for current page
 * @param games - Array of all games for the category
 * @param currentPage - Current page number (1-based)
 * @returns Pagination result with games slice and metadata
 */
export function calculatePagination(
  games: GamePageItem[], 
  currentPage: number
): PaginationResult & { games: GamePageItem[] } {
  // Validate inputs
  const validGames = games.filter(validateGameObject);
  const validPage = Math.max(PAGINATION_CONFIG.MIN_PAGE, currentPage);
  
  const totalItems = validGames.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGINATION_CONFIG.GAMES_PER_PAGE));
  
  // Ensure current page doesn't exceed total pages
  const safePage = Math.min(validPage, totalPages);
  
  const startIndex = (safePage - 1) * PAGINATION_CONFIG.GAMES_PER_PAGE;
  const endIndex = Math.min(startIndex + PAGINATION_CONFIG.GAMES_PER_PAGE, totalItems);
  
  const paginatedGames = validGames.slice(startIndex, endIndex);
  
  return {
    games: paginatedGames,
    currentPage: safePage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > PAGINATION_CONFIG.MIN_PAGE,
    isEmpty: totalItems === 0,
  };
}

/**
 * Filters games by category with error handling
 * @param games - Array of all games
 * @param category - Category to filter by
 * @returns Filtered games array
 */
export function filterGamesByCategory(
  games: any[], 
  category: string
): GamePageItem[] {
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
 * Generates pagination URLs for navigation
 * @param basePath - Base path for the category page (e.g., '/popular-games')
 * @param currentPage - Current page number
 * @param totalPages - Total number of pages
 * @returns Object with prev and next URLs
 */
export function generatePaginationUrls(
  basePath: string, 
  currentPage: number, 
  totalPages: number
): { prev?: string; next?: string } {
  const urls: { prev?: string; next?: string } = {};
  
  // Previous page URL
  if (currentPage > PAGINATION_CONFIG.MIN_PAGE) {
    if (currentPage === 2) {
      // Page 2 goes back to page 1 (no page number in URL)
      urls.prev = basePath;
    } else {
      urls.prev = `${basePath}?page=${currentPage - 1}`;
    }
  }
  
  // Next page URL
  if (currentPage < totalPages) {
    urls.next = `${basePath}?page=${currentPage + 1}`;
  }
  
  return urls;
}