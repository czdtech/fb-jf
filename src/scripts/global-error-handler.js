/**
 * 全局错误处理器
 * 统一处理前端应用中的各种错误
 */
export class GlobalErrorHandler {
  constructor(options = {}) {
    this.enableLogging = options.enableLogging !== false;
    this.enableNotifications = options.enableNotifications !== false;
    this.enableReporting = options.enableReporting === true;
    this.reportingEndpoint = options.reportingEndpoint || null;

    // 错误统计
    this.errorCounts = new Map();
    this.errorHistory = [];
    this.maxHistorySize = options.maxHistorySize || 100;

    this.initialize();
  }

  initialize() {
    // 捕获 JavaScript 错误
    window.addEventListener("error", (event) => {
      this.handleJavaScriptError(event);
    });

    // 捕获 Promise 拒绝错误
    window.addEventListener("unhandledrejection", (event) => {
      this.handlePromiseRejection(event);
    });

    // 捕获网络错误
    this.interceptNetworkErrors();

    // 创建错误通知样式
    if (this.enableNotifications) {
      this.createNotificationStyles();
    }
  }

  /**
   * 处理 JavaScript 运行时错误
   */
  handleJavaScriptError(event) {
    const error = {
      type: "JAVASCRIPT_ERROR",
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.stack || event.error,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.logError(error);
    this.recordError(error);

    // 为特定错误显示用户友好的消息
    if (this.shouldShowUserNotification(error)) {
      this.showUserNotification(this.getUserFriendlyMessage(error));
    }
  }

  /**
   * 处理 Promise 拒绝错误
   */
  handlePromiseRejection(event) {
    const error = {
      type: "PROMISE_REJECTION",
      reason: event.reason?.message || event.reason,
      stack: event.reason?.stack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.logError(error);
    this.recordError(error);

    // 防止未捕获的 promise rejection 显示在控制台
    event.preventDefault();

    if (this.shouldShowUserNotification(error)) {
      this.showUserNotification("操作失败，请重试");
    }
  }

  /**
   * 拦截网络错误
   */
  interceptNetworkErrors() {
    // 拦截 fetch 错误
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);

        // 记录非 2xx 响应
        if (!response.ok) {
          this.handleNetworkError({
            type: "NETWORK_ERROR",
            status: response.status,
            statusText: response.statusText,
            url: args[0],
            timestamp: Date.now(),
          });
        }

        return response;
      } catch (error) {
        this.handleNetworkError({
          type: "NETWORK_ERROR",
          message: error.message,
          url: args[0],
          timestamp: Date.now(),
        });
        throw error;
      }
    };
  }

  /**
   * 处理网络错误
   */
  handleNetworkError(error) {
    this.logError(error);
    this.recordError(error);

    // 网络错误通常需要用户重试
    if (error.status >= 500) {
      this.showUserNotification("服务器暂时不可用，请稍后重试", "error");
    } else if (error.status === 404) {
      this.showUserNotification("请求的资源不存在", "warning");
    } else if (error.status >= 400) {
      this.showUserNotification("请求失败，请检查网络连接", "warning");
    }
  }

  /**
   * 手动报告错误
   */
  reportError(error, context = {}) {
    const errorReport = {
      type: "MANUAL_ERROR",
      message: error.message || error,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.logError(errorReport);
    this.recordError(errorReport);

    return errorReport;
  }

  /**
   * 记录错误统计
   */
  recordError(error) {
    // 更新错误计数
    const key = `${error.type}:${error.message || error.reason}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);

    // 添加到历史记录
    this.errorHistory.push(error);

    // 限制历史记录大小
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    // 发送错误报告
    if (this.enableReporting && this.reportingEndpoint) {
      this.sendErrorReport(error);
    }
  }

  /**
   * 日志记录
   */
  logError(error) {
    if (!this.enableLogging) return;

    console.group(`🚨 Error: ${error.type}`);
    console.error("Message:", error.message || error.reason);
    console.error("Details:", error);
    console.groupEnd();
  }

  /**
   * 判断是否显示用户通知
   */
  shouldShowUserNotification(error) {
    if (!this.enableNotifications) return false;

    // 避免重复显示相同错误
    const key = `${error.type}:${error.message || error.reason}`;
    const count = this.errorCounts.get(key) || 0;

    return count <= 2; // 只显示前两次
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserFriendlyMessage(error) {
    if (error.message?.includes("NetworkError")) {
      return "网络连接不稳定，请检查网络设置";
    }

    if (error.message?.includes("Script error")) {
      return "页面加载出现问题，请刷新页面重试";
    }

    if (error.filename?.includes("audio") || error.message?.includes("audio")) {
      return "音频播放遇到问题，请稍后重试";
    }

    return "页面功能异常，如果问题持续存在请联系技术支持";
  }

  /**
   * 显示用户通知
   */
  showUserNotification(message, type = "error") {
    const notification = document.createElement("div");
    notification.className = `error-notification error-notification--${type}`;
    notification.innerHTML = `
      <div class="error-notification__content">
        <span class="error-notification__icon">
          ${type === "error" ? "⚠️" : type === "warning" ? "⚠️" : "ℹ️"}
        </span>
        <span class="error-notification__message">${message}</span>
        <button class="error-notification__close" aria-label="关闭">×</button>
      </div>
    `;

    // 添加关闭功能
    notification.querySelector(".error-notification__close").onclick = () => {
      notification.remove();
    };

    // 添加到页面
    document.body.appendChild(notification);

    // 自动关闭
    setTimeout(
      () => {
        if (notification.parentNode) {
          notification.remove();
        }
      },
      type === "error" ? 8000 : 5000
    );
  }

  /**
   * 创建通知样式
   */
  createNotificationStyles() {
    if (document.getElementById("error-notification-styles")) return;

    const styles = document.createElement("style");
    styles.id = "error-notification-styles";
    styles.textContent = `
      .error-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 400px;
        background: hsl(var(--background, 0 0% 100%));
        border: 1px solid hsl(var(--border, 0 0% 89.8%));
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
      }
      
      .error-notification--error {
        border-left: 4px solid #ef4444;
      }
      
      .error-notification--warning {
        border-left: 4px solid #f59e0b;
      }
      
      .error-notification--info {
        border-left: 4px solid #3b82f6;
      }
      
      .error-notification__content {
        display: flex;
        align-items: flex-start;
        padding: 12px 16px;
        gap: 8px;
      }
      
      .error-notification__icon {
        flex-shrink: 0;
        margin-top: 2px;
      }
      
      .error-notification__message {
        flex: 1;
        font-size: 14px;
        line-height: 1.4;
        color: hsl(var(--foreground, 0 0% 3.9%));
      }
      
      .error-notification__close {
        flex-shrink: 0;
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s;
        padding: 0;
        margin: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .error-notification__close:hover {
        opacity: 1;
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
      
      @media (max-width: 480px) {
        .error-notification {
          left: 10px;
          right: 10px;
          max-width: none;
          top: 10px;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * 发送错误报告
   */
  async sendErrorReport(error) {
    if (!this.reportingEndpoint) return;

    try {
      await fetch(this.reportingEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...error,
          environment: "production",
          session: this.getSessionId(),
        }),
      });
    } catch (reportError) {
      if (import.meta.env.DEV) {
        console.warn("Failed to send error report:", reportError);
      }
    }
  }

  /**
   * 获取会话ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem("error-session-id");
    if (!sessionId) {
      sessionId =
        "session-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem("error-session-id", sessionId);
    }
    return sessionId;
  }

  /**
   * 获取错误统计
   */
  getErrorStats() {
    return {
      counts: Object.fromEntries(this.errorCounts),
      history: this.errorHistory.slice(-10), // 最近 10 个错误
      total: this.errorHistory.length,
    };
  }

  /**
   * 清理错误历史
   */
  clearErrorHistory() {
    this.errorHistory = [];
    this.errorCounts.clear();
  }
}

// 自动初始化全局错误处理器
if (typeof window !== "undefined") {
  window.globalErrorHandler = new GlobalErrorHandler({
    enableLogging: true,
    enableNotifications: true,
    enableReporting: false, // 在需要时启用
  });
}
