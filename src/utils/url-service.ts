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
} from "./paths.js";

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
// 缓存机制
// ============================================================================

/**
 * URL生成缓存 - 提升批量操作性能
 */
const urlCache = new Map<string, GeneratedUrl>();
const cacheKeyPrefix = "url-cache-";
const maxCacheSize = 1000;

/**
 * 生成缓存键
 */
function generateCacheKey(
  gameData: GameUrlData,
  options: UrlGenerationOptions,
): string {
  return `${cacheKeyPrefix}${gameData.baseSlug}-${options.locale}-${options.forceLocalPath ? "1" : "0"}-${options.absolute ? "1" : "0"}`;
}

/**
 * 清理缓存（LRU策略）
 */
function cleanupCache(): void {
  if (urlCache.size > maxCacheSize) {
    const keysToDelete = Array.from(urlCache.keys()).slice(
      0,
      urlCache.size - maxCacheSize + 100,
    );
    keysToDelete.forEach((key) => urlCache.delete(key));
  }
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
 * 检查URL是否为绝对路径
 */
function isAbsolutePath(url: string): boolean {
  return url.startsWith("/");
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

    // 验证slug格式（基本字符检查）
    if (
      !/^[a-zA-Z0-9\-_]+$/.test(rawSlug.replace(/^(zh|es|fr|de|ja|ko)-/, ""))
    ) {
      errors.push({
        code: "INVALID_SLUG_FORMAT",
        message:
          "Slug contains invalid characters. Only alphanumeric, hyphens, and underscores allowed",
        field: "slug",
        value: rawSlug,
      });
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

    if (!rawUrl) {
      return { directUrl: undefined, errors };
    }

    if (typeof rawUrl !== "string") {
      errors.push({
        code: "INVALID_URL_TYPE",
        message: "URL must be a string",
        field: "url",
        value: typeof rawUrl,
      });
      return { directUrl: undefined, errors };
    }

    if (!isExternalUrl(rawUrl)) {
      errors.push({
        code: "INVALID_EXTERNAL_URL",
        message: "URL must be a valid external URL (http:// or https://)",
        field: "url",
        value: rawUrl,
      });
      return { directUrl: undefined, errors };
    }

    // 验证URL格式
    try {
      new URL(rawUrl);
    } catch {
      errors.push({
        code: "MALFORMED_URL",
        message: "URL is not properly formatted",
        field: "url",
        value: rawUrl,
      });
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
    // 1. 验证输入参数
    if (!gameData || typeof gameData !== "object") {
      console.error("⚠️ Invalid gameData provided to generateGameUrl");
      return {
        url: "/error/",
        isExternal: false,
        isLocalized: false,
        baseSlug: "error",
      };
    }

    if (!options || !options.locale || typeof options.locale !== "string") {
      console.error("⚠️ Invalid options provided to generateGameUrl");
      return {
        url: "/error/",
        isExternal: false,
        isLocalized: false,
        baseSlug: gameData.baseSlug || "error",
      };
    }

    // 2. 检查缓存
    const cacheKey = generateCacheKey(gameData, options);
    if (urlCache.has(cacheKey)) {
      return urlCache.get(cacheKey)!;
    }

    const {
      locale,
      forceLocalPath = false,
      absolute = false,
      siteUrl = "",
    } = options;
    let result: GeneratedUrl;

    try {
      // 3. 如果有直接URL且未强制使用本地路径，使用直接URL
      if (gameData.directUrl && !forceLocalPath) {
        result = {
          url: gameData.directUrl,
          isExternal: true,
          isLocalized: false,
          baseSlug: gameData.baseSlug,
        };
      } else {
        // 4. 生成本地化路径
        const localizedPath = getGameLocalizedPathInternal(
          gameData.baseSlug,
          locale,
        );

        // 5. 处理绝对路径
        let finalUrl = localizedPath;
        if (absolute && siteUrl) {
          const cleanSiteUrl = siteUrl.replace(/\/$/, "");
          finalUrl = `${cleanSiteUrl}${localizedPath}`;
        }

        result = {
          url: finalUrl,
          isExternal: false,
          isLocalized: locale !== "en",
          baseSlug: gameData.baseSlug,
        };
      }

      // 6. 缓存结果
      urlCache.set(cacheKey, result);
      cleanupCache();

      return result;
    } catch (error) {
      console.error("🛑 URL generation failed:", {
        gameData,
        options,
        error,
      });

      // 错误恢复: 返回基本本地URL
      const fallbackUrl = `/${gameData.baseSlug}/`;
      result = {
        url: fallbackUrl,
        isExternal: false,
        isLocalized: false,
        baseSlug: gameData.baseSlug,
      };

      return result;
    }
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
      console.error("⚠️ generateBatchUrls expects an array of games");
      return [];
    }

    const results: Array<{
      game: unknown;
      url: GeneratedUrl;
      error?: ValidationError;
    }> = [];
    const startTime = Date.now();

    for (let i = 0; i < games.length; i++) {
      const game = games[i];

      try {
        const url = this.generateFromGame(game, locale, options);
        results.push({ game, url });
      } catch (error) {
        // 错误隔离：单个失败不影响整个批处理
        const fallbackUrl: GeneratedUrl = {
          url: "/error/",
          isExternal: false,
          isLocalized: false,
          baseSlug: "batch-error",
        };

        results.push({
          game,
          url: fallbackUrl,
          error: {
            code: "BATCH_GENERATION_FAILED",
            message: "Failed to generate URL in batch operation",
            value: error,
          },
        });
      }
    }

    const endTime = Date.now();
    if (
      typeof process !== "undefined" &&
      process.env.NODE_ENV === "development" &&
      games.length > 100
    ) {
      console.log(
        `🚀 Batch URL generation: ${games.length} games in ${endTime - startTime}ms`,
      );
    }

    return results;
  }

  /**
   * 清理URL缓存 - 用于内存管理
   */
  static clearCache(): void {
    urlCache.clear();
    if (
      typeof process !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      console.log("🧹 URL cache cleared");
    }
  }

  /**
   * 获取缓存统计信息
   */
  static getCacheStats(): { size: number; maxSize: number } {
    return {
      size: urlCache.size,
      maxSize: maxCacheSize,
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
        new URL(normalizedData.directUrl);
        if (!isExternalUrl(normalizedData.directUrl)) {
          issues.push("directUrl is not a valid external URL");
          errors.push({
            code: "INVALID_EXTERNAL_URL",
            message: "directUrl must be an external HTTP(S) URL",
            field: "directUrl",
            value: normalizedData.directUrl,
          });
        }
      } catch {
        issues.push("directUrl is malformed");
        errors.push({
          code: "MALFORMED_URL",
          message: "directUrl is not a valid URL format",
          field: "directUrl",
          value: normalizedData.directUrl,
        });
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
