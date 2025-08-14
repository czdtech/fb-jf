/**
 * Centralized pagination configuration for all game category pages
 */
export const PAGINATION_CONFIG = {
  /** Number of games to display per page */
  GAMES_PER_PAGE: 12,
  
  /** Minimum page number (always 1) */
  MIN_PAGE: 1,
  
  /** Default page when no page parameter is provided */
  DEFAULT_PAGE: 1,
} as const;

/**
 * Game category types supported by the application
 */
export const GAME_CATEGORIES = {
  POPULAR: 'popular',
  TRENDING: 'trending', 
  NEW: 'new',
  ALL: 'all',
} as const;

export type GameCategory = typeof GAME_CATEGORIES[keyof typeof GAME_CATEGORIES];

/**
 * Pagination result interface for type safety
 */
export interface PaginationResult {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isEmpty: boolean;
}

/**
 * Game page item interface for consistent typing across all category pages
 */
export interface GamePageItem {
  slug: string;
  data: {
    slug: string;
    title: string;
    description?: string;
    image: string;
    category: string;
    iframe?: string;
  };
}