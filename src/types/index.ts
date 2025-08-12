// 游戏相关类型
export interface Game {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  keywords?: string;
  image: string;
  iframe: string;
  rating?: GameRating;
  // 放宽分类类型，兼容更多页面（如 featured / Music 等）
  category: string;
  meta: SEOMeta;
  content?: GameContent;
}

export interface GameRating {
  score: number;
  maxScore: number;
  votes: number;
}

export interface SEOMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  keywords?: string;
}

export interface GameContent {
  breadcrumb: string;
  mainHeading: string;
  sections: ContentSection[];
}

export interface ContentSection {
  type: 'paragraph' | 'heading' | 'list' | 'image' | 'video';
  level?: number;
  content: string;
  listType?: 'ordered' | 'unordered';
  items?: string[];
}

// 导航相关类型
export interface NavigationItem {
  label: string;
  url: string;
  children?: NavigationItem[];
}

export interface Language {
  code: string;
  url: string;
  label: string;
}

// 音频样本类型
export interface SoundSample {
  title: string;
  image: string;
  audio: string;
  category: string;
}

// 首页数据类型
export interface HomepageData {
  meta: SEOMeta;
  hero: {
    title: string;
    description: string;
    mainGame: {
      iframe: string;
      backgroundImage: string;
    };
  };
  soundSamples: SoundSample[];
}

// 游戏分类
export interface GameSection {
  title: string;
  games: Game[];
  moreLink?: string;
}

// 面包屑导航
export interface BreadcrumbItem {
  label: string;
  url?: string;
}

// 社交分享
export interface SocialShareConfig {
  platforms: string[];
  addToAnyConfig: {
    mobile: { bottom: string; right: string };
    desktop: { left: string; top: string };
  };
}

// 分析配置
export interface AnalyticsConfig {
  gtag: string;
  adsense: string;
}

// 组件Props类型
export interface GameCardProps {
  game: Game;
  variant?: 'grid' | 'list' | 'featured';
}

export interface GameGridProps {
  games: Game[];
  title: string;
  variant?: 'default' | 'compact';
  moreLink?: string;
}

export interface SEOHeadProps {
  meta: SEOMeta;
  structuredData?: Record<string, any>;
  hreflang?: Language[];
}

export interface HeaderProps {
  navigation: NavigationItem[];
  languages: Language[];
  currentLang?: string;
  currentPath?: string;
}

export interface GameIframeProps {
  game: Game;
  autoLoad?: boolean;
}

export interface ContentRendererProps {
  content: ContentSection[];
}
