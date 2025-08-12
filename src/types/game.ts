/**
 * 统一的游戏相关类型定义
 * 解决多处使用any类型的问题
 */

export interface Language {
  code: string;
  label: string;
}

export interface NavigationItem {
  path: string;
  label: string;
  isActive?: boolean;
}

export interface GameMeta {
  title?: string;
  description?: string;
  keywords?: string;
}

export interface GameSEO {
  title?: string;
  description?: string;
  keywords?: string;
}

export interface GameRating {
  score: number;
  maxScore: number;
  votes: number;
  stars: number;
}

export interface GameData {
  slug: string;
  title: string;
  description: string;
  category: string;
  rating: number;
  iframe: string;
  backgroundImage?: string;
  imageUrl: string;
  url: string;
  meta?: GameMeta;
  seo?: GameSEO;
  features?: string[];
  howToPlay?: string[];
}

export interface ExtractedData {
  navigation: {
    languages: Language[];
    items: NavigationItem[];
  };
  games: GameData[];
  homepage: {
    hero: {
      title: string;
      subtitle: string;
    };
    sections: any[];
  };
}

export interface Breadcrumb {
  home: string;
  current: string;
}

export interface HreflangLink {
  code: string;
  url: string;
  label: string;
}