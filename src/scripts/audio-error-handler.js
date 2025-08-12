/**
 * 音频错误处理模块
 * 统一管理音频播放错误和用户反馈
 */
export class AudioErrorHandler {
  constructor(options = {}) {
    this.showUserNotifications = options.showUserNotifications !== false;
    this.logErrors = options.logErrors !== false;
    this.retryAttempts = options.retryAttempts || 2;
    this.retryDelay = options.retryDelay || 1000;

    // 错误统计
    this.errorStats = new Map();

    // 确保通知样式已加载
    if (this.showUserNotifications) {
      this.ensureNotificationStyles();
    }
  }

  /**
   * 处理音频加载错误
   * @param {HTMLAudioElement} audio - 音频元素
   * @param {string} audioId - 音频ID
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   */
  handleLoadError(audio, audioId, error, context = {}) {
    const errorInfo = {
      type: "LOAD_ERROR",
      audioId,
      error: error.message || "音频加载失败",
      timestamp: Date.now(),
      context,
    };

    this.recordError(errorInfo);

    if (this.logErrors) {
      console.error(`[AudioErrorHandler] 音频加载失败: ${audioId}`, {
        error: error.message,
        src: audio.src,
        networkState: audio.networkState,
        readyState: audio.readyState,
        context,
      });
    }

    if (this.showUserNotifications) {
      this.showErrorNotification("音频文件加载失败，请检查网络连接", "warning");
    }

    // 清理加载状态
    this.cleanupLoadingState(context);
  }

  /**
   * 处理音频播放错误
   * @param {HTMLAudioElement} audio - 音频元素
   * @param {string} audioId - 音频ID
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   */
  async handlePlayError(audio, audioId, error, context = {}) {
    const errorInfo = {
      type: "PLAY_ERROR",
      audioId,
      error: error.message || "音频播放失败",
      timestamp: Date.now(),
      context,
    };

    this.recordError(errorInfo);

    // 根据错误类型进行不同处理
    const errorMessage = this.getPlayErrorMessage(error);

    if (this.logErrors) {
      console.error(`[AudioErrorHandler] 音频播放失败: ${audioId}`, {
        error: error.message,
        name: error.name,
        src: audio.src,
        paused: audio.paused,
        context,
      });
    }

    // 尝试重新播放（某些情况下）
    if (
      this.shouldRetryPlay(error) &&
      context.retryCount < this.retryAttempts
    ) {
      return this.retryPlay(audio, audioId, context);
    }

    if (this.showUserNotifications) {
      this.showErrorNotification(errorMessage, "error");
    }

    // 清理播放状态
    this.cleanupPlayingState(context);
  }

  /**
   * 处理音频网络错误
   * @param {HTMLAudioElement} audio - 音频元素
   * @param {string} audioId - 音频ID
   * @param {Object} context - 上下文信息
   */
  handleNetworkError(audio, audioId, context = {}) {
    const errorInfo = {
      type: "NETWORK_ERROR",
      audioId,
      error: "网络连接错误",
      timestamp: Date.now(),
      context,
    };

    this.recordError(errorInfo);

    if (this.logErrors) {
      console.error(`[AudioErrorHandler] 网络错误: ${audioId}`, {
        src: audio.src,
        networkState: audio.networkState,
        context,
      });
    }

    if (this.showUserNotifications) {
      this.showErrorNotification("网络连接不稳定，请稍后重试", "warning");
    }

    this.cleanupLoadingState(context);
  }

  /**
   * 重试播放音频
   * @param {HTMLAudioElement} audio - 音频元素
   * @param {string} audioId - 音频ID
   * @param {Object} context - 上下文信息
   */
  async retryPlay(audio, audioId, context) {
    const retryCount = (context.retryCount || 0) + 1;

    if (this.logErrors && import.meta.env.DEV) {
      console.log(
        `[AudioErrorHandler] 重试播放 ${audioId} (第${retryCount}次)`
      );
    }

    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          await audio.play();
          resolve();
        } catch (error) {
          await this.handlePlayError(audio, audioId, error, {
            ...context,
            retryCount,
          });
          reject(error);
        }
      }, this.retryDelay);
    });
  }

  /**
   * 获取播放错误消息
   * @param {Error} error - 错误对象
   * @returns {string} 用户友好的错误消息
   */
  getPlayErrorMessage(error) {
    const errorName = error.name || "";
    const errorMessage = error.message || "";

    if (
      errorName === "NotAllowedError" ||
      errorMessage.includes("user activation")
    ) {
      return "请先点击页面任意位置以启用音频播放";
    }

    if (errorName === "NotSupportedError") {
      return "您的浏览器不支持此音频格式";
    }

    if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      return "音频加载失败，请检查网络连接";
    }

    return "音频播放失败，请稍后重试";
  }

  /**
   * 判断是否应该重试播放
   * @param {Error} error - 错误对象
   * @returns {boolean}
   */
  shouldRetryPlay(error) {
    const errorName = error.name || "";
    const errorMessage = error.message || "";

    // 不重试的错误类型
    if (
      errorName === "NotAllowedError" ||
      errorName === "NotSupportedError" ||
      errorMessage.includes("user activation")
    ) {
      return false;
    }

    return true;
  }

  /**
   * 记录错误统计
   * @param {Object} errorInfo - 错误信息
   */
  recordError(errorInfo) {
    const key = `${errorInfo.type}_${errorInfo.audioId}`;
    const current = this.errorStats.get(key) || { count: 0, lastError: null };

    this.errorStats.set(key, {
      count: current.count + 1,
      lastError: errorInfo,
      firstOccurrence: current.firstOccurrence || errorInfo.timestamp,
    });
  }

  /**
   * 显示错误通知
   * @param {string} message - 错误消息
   * @param {string} type - 通知类型 ('error', 'warning', 'info')
   */
  showErrorNotification(message, type = "error") {
    // 避免重复显示相同消息
    if (
      this.lastNotificationMessage === message &&
      Date.now() - this.lastNotificationTime < 3000
    ) {
      return;
    }

    this.lastNotificationMessage = message;
    this.lastNotificationTime = Date.now();

    const notification = document.createElement("div");
    notification.className = `audio-error-notification audio-error-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // 自动移除通知
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.classList.add("fade-out");
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }
    }, 4000);
  }

  /**
   * 清理加载状态
   * @param {Object} context - 上下文信息
   */
  cleanupLoadingState(context) {
    if (context.button) {
      context.button.classList.remove("loading");
    }
    if (context.card) {
      context.card.classList.remove("loading");
    }
  }

  /**
   * 清理播放状态
   * @param {Object} context - 上下文信息
   */
  cleanupPlayingState(context) {
    this.cleanupLoadingState(context);

    if (context.button) {
      context.button.classList.remove("playing");
    }
    if (context.card) {
      context.card.classList.remove("playing");
    }
  }

  /**
   * 确保通知样式已加载
   */
  ensureNotificationStyles() {
    if (!document.querySelector("#audio-error-notification-styles")) {
      const style = document.createElement("style");
      style.id = "audio-error-notification-styles";
      style.textContent = `
        .audio-error-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 16px;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-weight: 500;
          z-index: 10001;
          max-width: 300px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          animation: slideIn 0.3s ease-out;
        }
        
        .audio-error-error {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }
        
        .audio-error-warning {
          background: linear-gradient(135deg, #f59e0b, #d97706);
        }
        
        .audio-error-info {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
        }
        
        .audio-error-notification.fade-out {
          animation: slideOut 0.3s ease-in forwards;
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * 获取错误统计信息
   * @returns {Object} 错误统计
   */
  getErrorStats() {
    const stats = {};
    this.errorStats.forEach((value, key) => {
      stats[key] = value;
    });
    return stats;
  }

  /**
   * 清除错误统计
   */
  clearErrorStats() {
    this.errorStats.clear();
  }
}

// 创建默认实例
export const audioErrorHandler = new AudioErrorHandler();
