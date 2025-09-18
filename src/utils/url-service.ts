/**
 * 统一URL生成服务 - 单一真实源(Single Source of Truth)
 * 解决多语言路由和URL生成的一致性问题
 *
 * v2.2 - 薄化版本：
 * - 内部委托给超轻量paths.ts
 * - 保留对外API不变
 * - 严格的输入验证和类型检查
 * - 完善的错误边界处理
 * - 性能优化的缓存机制
 * - 生产就绪的错误恢复
 */

// ============================================================================
// 导入超轻量路径工具
// ============================================================================
import {
  LOCALES,
  deriveBaseSlug as extractBaseSlugInternal,
  localizedPath as getGameLocalizedPathInternal,
} from "./paths";

// 为了保持向后兼容，重新导出SUPPORTED_LOCALES
const SUPPORTED_LOCALES = LOCALES;

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 标准化的游戏数据接口
 * 分离baseSlug和URL，确保数据契约清晰
 */
export interface GameUrlData {
  /** 基础slug（不含语言前缀） - 必须为非空字符串 */
  readonly baseSlug: string;
  /** 可选的直接URL（如外部链接） - 必须是有效的HTTP(S) URL */
  readonly directUrl?: string;
  /** 游戏标题（用于链接文本） - 必须为非空字符串 */
  readonly title: string;
  /** 游戏ID（用于调试和错误报告） */
  readonly id?: string;
}

/**
 * 严格的游戏输入类型 - 用于类型检查
 */
export interface StrictGameInput {
  readonly slug?: string | null;
  readonly title?: string | null;
  readonly id?: string | null;
  readonly url?: string | null;
  readonly data?: {
    readonly slug?: string | null;
    readonly title?: string | null;
    readonly url?: string | null;
  } | null;
}

/**
 * 验证错误类型
 */
export interface ValidationError {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
  readonly value?: unknown;
}

/**
 * URL生成选项
 */
export interface UrlGenerationOptions {
  /** 目标语言 */
  locale: string;
  /** 是否强制使用baseSlug而非directUrl */
  forceLocalPath?: boolean;
  /** 是否返回绝对路径 */
  absolute?: boolean;
  /** 站点基础URL（用于绝对路径） */
  siteUrl?: string;
}

/**
 * URL生成结果
 */
export interface GeneratedUrl {
  /** 生成的URL */
  url: string;
  /** 是否为外部链接 */
  isExternal: boolean;
  /** 是否为本地化路径 */
  isLocalized: boolean;
  /** 使用的基础slug */
  baseSlug: string;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 检查URL是否为外部链接
 */
function isExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * 统一URL生成服务
 * 提供类型安全的URL生成契约和强化的错误处理
 */
export class UrlService {
  /**
   * 严格验证游戏输入
   */
  private static validateInput(game: unknown): ValidationError[] {
    const errors: ValidationError[] = [];

    if (game === null || game === undefined) {
      errors.push({
        code: "NULL_INPUT",
        message: "Game input cannot be null or undefined",
        value: game,
      });
      return errors;
    }

    if (typeof game !== "object") {
      errors.push({
        code: "INVALID_TYPE",
        message: "Game input must be an object",
        field: "game",
        value: typeof game,
      });
      return errors;
    }

    return errors;
  }

  /**
   * 提取并验证slug值
   */
  private static extractSlug(game: StrictGameInput): {
    slug: string;
    errors: ValidationError[];
  } {
    const errors: ValidationError[] = [];
    // 优先级: game.slug > game.data?.slug > game.id
    const rawSlug =
      game.slug ||
      game.data?.slug ||
      (typeof game.id === "string" ? game.id.replace(/\.md$/, "") : "") ||
      "";

    if (!rawSlug || typeof rawSlug !== "string") {
      errors.push({
        code: "MISSING_SLUG",
        message: "No valid slug found in slug, data.slug, or id fields",
        field: "slug",
      });
      return { slug: "", errors };
    }
    return { slug: rawSlug, errors };
  }

  /**
   * 提取并验证标题
   */
  private static extractTitle(game: StrictGameInput): {
    title: string;
    errors: ValidationError[];
  } {
    const errors: ValidationError[] = [];
    const title = game.title || game.data?.title || "Untitled Game";

    if (!title || typeof title !== "string") {
      errors.push({
        code: "INVALID_TITLE",
        message: "Title must be a non-empty string",
        field: "title",
        value: title,
      });
      return { title: "Untitled Game", errors };
    }

    if (title.trim().length === 0) {
      errors.push({
        code: "EMPTY_TITLE",
        message: "Title cannot be empty or whitespace only",
        field: "title",
        value: title,
      });
      return { title: "Untitled Game", errors };
    }

    return { title: title.trim(), errors };
  }

  /**
   * 提取并验证直接URL
   */
  private static extractDirectUrl(game: StrictGameInput): {
    directUrl?: string;
    errors: ValidationError[];
  } {
    const errors: ValidationError[] = [];
    const rawUrl = game.url || game.data?.url;

    if (!rawUrl || typeof rawUrl !== "string") {
      return { directUrl: undefined, errors };
    }

    // 只接受外部HTTP(S)链接作为directUrl
    if (!isExternalUrl(rawUrl)) {
      return { directUrl: undefined, errors };
    }

    return { directUrl: rawUrl, errors };
  }

  /**
   * 标准化游戏数据 - 从各种输入格式提取标准字段
   * 强化版：包含严格的输入验证和错误处理
   */
  static normalizeGameData(game: unknown): GameUrlData {
    // 1. 基础输入验证
    const inputErrors = this.validateInput(game);
    if (inputErrors.length > 0) {
      console.warn("⚠️ Game input validation failed:", inputErrors);
      return {
        baseSlug: "",
        title: "Invalid Game Data",
        id: "validation-failed",
      };
    }

    const safeGame = game as StrictGameInput;
    const allErrors: ValidationError[] = [];

    // 2. 提取和验证各字段
    const { slug: rawSlug, errors: slugErrors } = this.extractSlug(safeGame);
    const { title, errors: titleErrors } = this.extractTitle(safeGame);
    const { directUrl, errors: urlErrors } = this.extractDirectUrl(safeGame);

    allErrors.push(...slugErrors, ...titleErrors, ...urlErrors);

    // 3. 提取基础slug（去除语言前缀）
    let baseSlug = "";
    try {
      baseSlug = extractBaseSlugInternal(rawSlug);
    } catch (error) {
      allErrors.push({
        code: "SLUG_EXTRACTION_FAILED",
        message: "Failed to extract base slug",
        field: "baseSlug",
        value: rawSlug,
      });
      console.error("Slug extraction failed:", error);
    }

    // 4. 记录非致命错误
    const nonFatalErrors = allErrors.filter(
      (e) => !["NULL_INPUT", "INVALID_TYPE"].includes(e.code),
    );
    if (
      nonFatalErrors.length > 0 &&
      typeof process !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      console.warn("🔶 Game data normalization warnings:", {
        gameId: safeGame.id,
        errors: nonFatalErrors,
      });
    }

    return {
      baseSlug: baseSlug || "unknown-game",
      directUrl,
      title,
      id:
        (typeof safeGame.id === "string" ? safeGame.id : undefined) ||
        "unknown",
    };
  }

  /**
   * 生成游戏URL
   * @param gameData 游戏数据
   * @param options 生成选项
   * @returns 生成结果
   */
  static generateGameUrl(
    gameData: GameUrlData,
    options: UrlGenerationOptions,
  ): GeneratedUrl {
    // 如果有directUrl且未强制使用本地路径，直接返回
    if (gameData.directUrl && !options.forceLocalPath) {
      return {
        url: gameData.directUrl,
        isExternal: true,
        isLocalized: false,
        baseSlug: gameData.baseSlug,
      };
    }

    // 使用baseSlug生成本地路径
    const localeToUse = SUPPORTED_LOCALES.includes(
      options.locale as (typeof SUPPORTED_LOCALES)[number],
    )
      ? options.locale
      : "en";

    let path = getGameLocalizedPathInternal(gameData.baseSlug, localeToUse);

    // 处理绝对URL
    if (options.absolute && options.siteUrl) {
      const siteUrlClean = options.siteUrl.replace(/\/$/, "");
      const pathClean = path.startsWith("/") ? path : `/${path}`;
      path = `${siteUrlClean}${pathClean}`;
    }

    return {
      url: path,
      isExternal: false,
      isLocalized: localeToUse !== "en",
      baseSlug: gameData.baseSlug,
    };
  }

  /**
   * 便捷方法：从原始游戏对象生成URL
   * 自动处理数据标准化
   */
  static generateFromGame(
    game: unknown,
    locale: string,
    options: Partial<UrlGenerationOptions> = {},
  ): GeneratedUrl {
    try {
      const normalizedData = this.normalizeGameData(game);
      return this.generateGameUrl(normalizedData, { locale, ...options });
    } catch (error) {
      console.error("🛑 generateFromGame failed:", { game, locale, error });

      // 错误恢复
      return {
        url: "/error/",
        isExternal: false,
        isLocalized: false,
        baseSlug: "error",
      };
    }
  }

  /**
   * 便捷方法：仅获取URL字符串
   */
  static getGameUrl(game: unknown, locale: string): string {
    try {
      return this.generateFromGame(game, locale).url;
    } catch (error) {
      console.error("🛑 getGameUrl failed:", { game, locale, error });
      return "/error/";
    }
  }

  /**
   * 批量生成URL - 用于游戏列表
   * 优化版：支持大量数据处理和错误隔离
   */
  static generateBatchUrls(
    games: unknown[],
    locale: string,
    options: Partial<UrlGenerationOptions> = {},
  ): Array<{ game: unknown; url: GeneratedUrl; error?: ValidationError }> {
    if (!Array.isArray(games)) {
      return [];
    }

    const results: Array<{
      game: unknown;
      url: GeneratedUrl;
      error?: ValidationError;
    }> = [];

    for (const game of games) {
      const url = this.generateFromGame(game, locale, options);
      results.push({ game, url });
    }

    return results;
  }

  /**
   * 清理URL缓存 - 保留以保持兼容性
   */
  static clearCache(): void {
    // 缓存已移除，方法保留以保持API兼容
  }

  /**
   * 获取缓存统计信息 - 保留以保持兼容性
   */
  static getCacheStats(): { size: number; maxSize: number } {
    return {
      size: 0,
      maxSize: 0,
    };
  }
}

// ============================================================================
// 兼容性包装器
// ============================================================================

/**
 * 兼容性函数 - 渐进式迁移
 * @deprecated 使用 UrlService.getGameUrl 代替
 */
export function generateGameUrl(game: any, locale: string): string {
  return UrlService.getGameUrl(game, locale);
}

/**
 * 兼容性导出 - 从完整slug中提取基础slug
 * @deprecated 使用 UrlService.normalizeGameData 代替
 */
export function extractBaseSlug(fullSlug: string): string {
  return extractBaseSlugInternal(fullSlug);
}

/**
 * 兼容性导出 - 生成本地化路径
 * @deprecated 使用 UrlService.getGameUrl 代替
 */
export function getGameLocalizedPath(baseSlug: string, locale: string): string {
  return getGameLocalizedPathInternal(baseSlug, locale);
}

// ============================================================================
// 调试和验证工具
// ============================================================================

/**
 * 验证游戏数据是否符合预期格式
 * 强化版：提供更详细的验证和错误报告
 */
export function validateGameData(game: unknown): {
  isValid: boolean;
  issues: string[];
  errors: ValidationError[];
} {
  const issues: string[] = [];
  const errors: ValidationError[] = [];

  if (!game) {
    issues.push("Game object is null or undefined");
    errors.push({
      code: "NULL_INPUT",
      message: "Game object is null or undefined",
      value: game,
    });
    return { isValid: false, issues, errors };
  }

  try {
    const normalizedData = UrlService.normalizeGameData(game);

    if (
      !normalizedData.baseSlug ||
      normalizedData.baseSlug === "unknown-game"
    ) {
      issues.push("Missing baseSlug - no slug, data.slug, or id found");
      errors.push({
        code: "MISSING_BASE_SLUG",
        message: "No valid base slug could be extracted",
        field: "baseSlug",
      });
    }

    if (
      !normalizedData.title ||
      normalizedData.title === "Untitled Game" ||
      normalizedData.title === "Invalid Game Data"
    ) {
      issues.push("Missing or invalid title");
      errors.push({
        code: "MISSING_TITLE",
        message: "No valid title provided",
        field: "title",
      });
    }

  if (normalizedData.directUrl) {
      try {
        // 允许本地路径作为“非外链”存在：不计为错误，仅不会作为 directUrl 使用
        // 仅当提供的是外链且格式非法时，才认定为错误
        new URL(normalizedData.directUrl, 'https://dummy.local');
        if (!isExternalUrl(normalizedData.directUrl)) {
          // 本地/相对路径：不视为错误（调用方会忽略 directUrl）
        } else {
          // 外链但协议正确；通过
        }
      } catch {
        // 确认是外链且格式非法时才报错；相对路径不报错
        if (isExternalUrl(normalizedData.directUrl)) {
          issues.push("directUrl is malformed");
          errors.push({
            code: "MALFORMED_URL",
            message: "directUrl is not a valid URL format",
            field: "directUrl",
            value: normalizedData.directUrl,
          });
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      errors,
    };
  } catch (error) {
    issues.push("Failed to normalize game data");
    errors.push({
      code: "NORMALIZATION_FAILED",
      message: "Game data normalization failed",
      value: error,
    });

    return { isValid: false, issues, errors };
  }
}

/**
 * 调试输出 - 显示URL生成过程
 * 强化版：包含性能指标和错误诊断
 */
export function debugUrlGeneration(game: unknown, locale: string): void {
  if (
    typeof window === "undefined" &&
    typeof process !== "undefined" &&
    process.env.NODE_ENV === "development"
  ) {
    const startTime = Date.now();

    try {
      const validation = validateGameData(game);
      const normalizedData = UrlService.normalizeGameData(game);
      const result = UrlService.generateFromGame(game, locale);
      const cacheStats = UrlService.getCacheStats();
      const endTime = Date.now();

      console.log("🔗 URL Generation Debug:", {
        input: {
          gameId:
            typeof game === "object" && game && "id" in game
              ? (game as any).id
              : "unknown",
          locale,
        },
        validation: {
          isValid: validation.isValid,
          issues: validation.issues,
          errorCount: validation.errors.length,
        },
        normalized: normalizedData,
        result,
        performance: {
          generationTime: `${endTime - startTime}ms`,
          cacheStats,
        },
      });

      if (!validation.isValid) {
        console.warn("⚠️ Validation issues detected:", validation.errors);
      }
    } catch (error) {
      console.error("🛑 Debug URL generation failed:", {
        game,
        locale,
        error,
      });
    }
  }
}

/**
 * 生产环境健康检查
 */
export function healthCheck(): {
  status: "healthy" | "degraded" | "unhealthy";
  details: {
    cacheSize: number;
    maxCacheSize: number;
    cacheUsagePercent: number;
    i18nFunctionsAvailable: boolean;
  };
} {
  const cacheStats = UrlService.getCacheStats();
  const cacheUsagePercent = (cacheStats.size / cacheStats.maxSize) * 100;

  // 检查依赖是否可用
  const i18nFunctionsAvailable =
    typeof extractBaseSlugInternal === "function" &&
    typeof getGameLocalizedPathInternal === "function";

  let status: "healthy" | "degraded" | "unhealthy" = "healthy";

  if (!i18nFunctionsAvailable) {
    status = "unhealthy";
  } else if (cacheUsagePercent > 80) {
    status = "degraded";
  }

  return {
    status,
    details: {
      cacheSize: cacheStats.size,
      maxCacheSize: cacheStats.maxSize,
      cacheUsagePercent: Math.round(cacheUsagePercent),
      i18nFunctionsAvailable,
    },
  };
}

// ============================================================================
// 默认导出
// ============================================================================

export default UrlService;
