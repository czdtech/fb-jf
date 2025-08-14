/**
 * 游戏配置文件 - 集中管理首页游戏数量
 * Homepage Game Configuration - Centralized game counts management
 */

export interface GameCounts {
  popular: number;
  new: number;
  trending: number;
}

/**
 * 首页游戏数量配置
 * 根据需求：popular=4, new=4, trending=8
 */
export const HOMEPAGE_GAME_COUNTS: GameCounts = {
  popular: 4,   // 热门游戏显示数量
  new: 4,       // 最新游戏显示数量  
  trending: 8,  // 趋势游戏显示数量
} as const;

/**
 * 获取指定类型的游戏数量
 * @param category 游戏类别
 * @returns 该类别应显示的游戏数量
 */
export function getGameCount(category: keyof GameCounts): number {
  return HOMEPAGE_GAME_COUNTS[category];
}

/**
 * 验证游戏数量配置
 * @returns 配置是否有效
 */
export function validateGameConfig(): boolean {
  const counts = Object.values(HOMEPAGE_GAME_COUNTS);
  return counts.every(count => count > 0 && Number.isInteger(count));
}