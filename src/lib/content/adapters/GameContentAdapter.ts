import { getCollection, type CollectionEntry } from 'astro:content';
import type { SupportedLocale } from '@/i18n/utils';
import type { IContentAdapter, ValidationResult } from '../ContentManager';

// 游戏内容适配器
export class GameContentAdapter implements IContentAdapter<CollectionEntry<'games'>[]> {
  readonly name = 'GameContentAdapter';
  readonly supportedTypes = ['games'];

  async load(locale: SupportedLocale, type: string): Promise<CollectionEntry<'games'>[]> {
    try {
      const allGames = await getCollection('games');
      
      // 根据locale过滤游戏
      const localizedGames = allGames.filter(game => {
        if (locale === 'en') {
          // 英文游戏在根目录，ID中不包含'/'
          return !game.id.includes('/');
        } else {
          // 其他语言游戏在对应的语言目录下
          return game.id.startsWith(`${locale}/`);
        }
      });

      return localizedGames;
    } catch (error) {
      throw new Error(`Failed to load games for ${locale}: ${error}`);
    }
  }

  validate(games: CollectionEntry<'games'>[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      missingKeys: [],
      warnings: [],
      suggestions: []
    };

    if (!Array.isArray(games)) {
      result.isValid = false;
      result.missingKeys.push('games[]');
      return result;
    }

    // 验证每个游戏的必需字段
    const requiredFields = ['title', 'description', 'image', 'iframe'];
    
    games.forEach((game, index) => {
      const gameData = game.data;
      
      for (const field of requiredFields) {
        if (!gameData[field]) {
          result.warnings.push(`Game[${index}] (${game.id}) missing field: ${field}`);
        }
      }

      // 验证元数据
      if (!gameData.meta) {
        result.warnings.push(`Game[${index}] (${game.id}) missing meta field`);
      } else {
        if (!gameData.meta.title || !gameData.meta.description) {
          result.warnings.push(`Game[${index}] (${game.id}) incomplete meta data`);
        }
      }

      // 检查slug格式
      if (gameData.slug && !this.isValidSlug(gameData.slug)) {
        result.warnings.push(`Game[${index}] (${game.id}) invalid slug format: ${gameData.slug}`);
      }
    });

    return result;
  }

  normalize(games: CollectionEntry<'games'>[]): CollectionEntry<'games'>[] {
    return games.map(game => ({
      ...game,
      data: {
        ...game.data,
        // 标准化字符串字段
        title: game.data.title?.trim(),
        description: game.data.description?.trim(),
        // 确保iframe URL格式正确
        iframe: this.normalizeUrl(game.data.iframe),
        // 确保图片URL格式正确
        image: this.normalizeUrl(game.data.image),
        // 标准化meta数据
        meta: game.data.meta ? {
          ...game.data.meta,
          title: game.data.meta.title?.trim(),
          description: game.data.meta.description?.trim()
        } : undefined
      }
    }));
  }

  private normalizeUrl(url?: string): string {
    if (!url) return '';
    
    const trimmed = url.trim();
    
    // 如果是相对路径，确保以/开头
    if (trimmed.startsWith('./') || (!trimmed.startsWith('http') && !trimmed.startsWith('/'))) {
      return `/${trimmed.replace(/^\.\//, '')}`;
    }
    
    return trimmed;
  }

  private isValidSlug(slug: string): boolean {
    // 检查slug是否符合预期格式
    const slugPattern = /^[a-z0-9-]+(-[a-z]{2})?$/;
    return slugPattern.test(slug);
  }

  // 辅助方法：根据基础slug和locale获取游戏
  async getGameByBaseSlug(baseSlug: string, locale: SupportedLocale): Promise<CollectionEntry<'games'> | null> {
    try {
      const games = await this.load(locale, 'games');
      
      // 查找匹配的游戏
      return games.find(game => {
        const gameSlug = game.data.slug || game.id.replace(/\.md$/, '');
        const gameBaseSlug = gameSlug.replace(/-[a-z]{2}$/, '');
        return gameBaseSlug === baseSlug;
      }) || null;
    } catch (error) {
      console.warn(`Failed to get game ${baseSlug} for ${locale}:`, error);
      return null;
    }
  }
}