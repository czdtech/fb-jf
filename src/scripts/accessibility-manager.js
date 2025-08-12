/**
 * 可访问性管理器
 * 统一管理网站的可访问性功能
 */
export class AccessibilityManager {
  constructor(options = {}) {
    this.options = {
      enableKeyboardNavigation: options.enableKeyboardNavigation !== false,
      enableFocusManagement: options.enableFocusManagement !== false,
      enableScreenReader: options.enableScreenReader !== false,
      enableHighContrast: options.enableHighContrast !== false,
      ...options,
    };

    this.focusableElements = [];
    this.trapFocusElements = new Set();
    this.lastFocusedElement = null;

    this.initialize();
  }

  initialize() {
    if (this.options.enableKeyboardNavigation) {
      this.setupKeyboardNavigation();
    }

    if (this.options.enableFocusManagement) {
      this.setupFocusManagement();
    }

    if (this.options.enableScreenReader) {
      this.setupScreenReaderSupport();
    }

    if (this.options.enableHighContrast) {
      this.setupHighContrastSupport();
    }

    this.setupAriaLabels();
    this.enhanceFormAccessibility();
  }

  /**
   * 设置键盘导航
   */
  setupKeyboardNavigation() {
    document.addEventListener("keydown", (e) => {
      this.handleKeyboardNavigation(e);
    });

    // 为所有交互元素添加焦点指示器
    const focusableSelectors = [
      "a[href]",
      "button",
      "input",
      "select",
      "textarea",
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]',
      '[role="link"]',
      "audio[controls]",
      "video[controls]",
    ];

    const focusableElements = document.querySelectorAll(
      focusableSelectors.join(",")
    );
    focusableElements.forEach((element) => {
      this.enhanceElementAccessibility(element);
    });
  }

  /**
   * 处理键盘导航事件
   */
  handleKeyboardNavigation(e) {
    const { key, target, ctrlKey, shiftKey } = e;

    // Tab 键导航
    if (key === "Tab") {
      this.handleTabNavigation(e);
      return;
    }

    // 箭头键导航（用于组件内导航）
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
      this.handleArrowNavigation(e);
      return;
    }

    // Enter 和 Space 键激活
    if ((key === "Enter" || key === " ") && target.matches('[role="button"]')) {
      e.preventDefault();
      target.click();
      return;
    }

    // Escape 键处理
    if (key === "Escape") {
      this.handleEscape(e);
      return;
    }

    // 快捷键处理
    if (ctrlKey && key === "/") {
      e.preventDefault();
      this.showKeyboardShortcuts();
      return;
    }
  }

  /**
   * 处理 Tab 键导航
   */
  handleTabNavigation(e) {
    const focusableElements = this.getFocusableElements();
    const currentIndex = focusableElements.indexOf(document.activeElement);

    if (currentIndex === -1) return;

    let nextIndex;
    if (e.shiftKey) {
      nextIndex =
        currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
    } else {
      nextIndex =
        currentIndex === focusableElements.length - 1 ? 0 : currentIndex + 1;
    }

    // 检查是否在焦点陷阱中
    const trapContainer = document.activeElement.closest(
      '[data-focus-trap="true"]'
    );
    if (trapContainer) {
      const trapFocusable = this.getFocusableElements(trapContainer);
      const trapIndex = trapFocusable.indexOf(document.activeElement);

      if (e.shiftKey && trapIndex === 0) {
        e.preventDefault();
        trapFocusable[trapFocusable.length - 1].focus();
      } else if (!e.shiftKey && trapIndex === trapFocusable.length - 1) {
        e.preventDefault();
        trapFocusable[0].focus();
      }
    }
  }

  /**
   * 处理箭头键导航
   */
  handleArrowNavigation(e) {
    const { key, target } = e;
    const container = target.closest(
      '[role="tablist"], [role="menu"], [role="radiogroup"], .audio-player-card'
    );

    if (!container) return;

    const navigableElements = container.querySelectorAll(
      '[role="tab"], [role="menuitem"], [role="radio"], .audio-play-btn'
    );
    const currentIndex = Array.from(navigableElements).indexOf(target);

    if (currentIndex === -1) return;

    let nextIndex = currentIndex;

    switch (key) {
      case "ArrowUp":
      case "ArrowLeft":
        e.preventDefault();
        nextIndex =
          currentIndex === 0 ? navigableElements.length - 1 : currentIndex - 1;
        break;
      case "ArrowDown":
      case "ArrowRight":
        e.preventDefault();
        nextIndex =
          currentIndex === navigableElements.length - 1 ? 0 : currentIndex + 1;
        break;
    }

    navigableElements[nextIndex].focus();
  }

  /**
   * 处理 Escape 键
   */
  handleEscape(e) {
    // 关闭模态框、菜单等
    const modals = document.querySelectorAll(
      '[role="dialog"], [data-state="open"]'
    );
    const openMenus = document.querySelectorAll(
      '.mobile-sheet-content[data-state="open"]'
    );

    modals.forEach((modal) => {
      if (modal.contains(e.target)) {
        const closeButton = modal.querySelector(
          '[aria-label*="Close"], [aria-label*="关闭"]'
        );
        if (closeButton) {
          closeButton.click();
        }
      }
    });

    openMenus.forEach((menu) => {
      if (menu.contains(e.target)) {
        const closeButton = document.querySelector("#mobileCloseButton");
        if (closeButton) {
          closeButton.click();
        }
      }
    });

    // 返回上一个焦点元素
    if (this.lastFocusedElement && document.contains(this.lastFocusedElement)) {
      this.lastFocusedElement.focus();
    }
  }

  /**
   * 设置焦点管理
   */
  setupFocusManagement() {
    // 保存焦点历史
    document.addEventListener("focusin", (e) => {
      this.lastFocusedElement = e.target;
    });

    // 页面加载时设置初始焦点
    document.addEventListener("DOMContentLoaded", () => {
      this.setInitialFocus();
    });

    // 监听模态框打开
    this.observeModalChanges();
  }

  /**
   * 设置初始焦点
   */
  setInitialFocus() {
    const mainContent = document.querySelector("#main-content, main");
    const firstHeading = document.querySelector("h1, h2");
    const firstFocusable = this.getFocusableElements()[0];

    // 优先级：主内容 > 首个标题 > 首个可焦点元素
    const initialFocus = mainContent || firstHeading || firstFocusable;

    if (initialFocus) {
      if (initialFocus.tagName === "H1" || initialFocus.tagName === "H2") {
        initialFocus.tabIndex = -1;
      }
      setTimeout(() => {
        initialFocus.focus();
      }, 100);
    }
  }

  /**
   * 观察模态框状态变化
   */
  observeModalChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "data-state") {
          const element = mutation.target;
          const state = element.getAttribute("data-state");

          if (state === "open") {
            this.handleModalOpen(element);
          } else if (state === "closed") {
            this.handleModalClose(element);
          }
        }
      });
    });

    const modals = document.querySelectorAll(
      '[role="dialog"], .mobile-sheet-content'
    );
    modals.forEach((modal) => {
      observer.observe(modal, {
        attributes: true,
        attributeFilter: ["data-state"],
      });
    });
  }

  /**
   * 处理模态框打开
   */
  handleModalOpen(modal) {
    this.trapFocus(modal);

    // 设置焦点到第一个可焦点元素或关闭按钮
    setTimeout(() => {
      const firstFocusable = this.getFocusableElements(modal)[0];
      const closeButton = modal.querySelector(
        '[aria-label*="Close"], [aria-label*="关闭"]'
      );

      (firstFocusable || closeButton)?.focus();
    }, 100);

    // 添加 aria-hidden 到其他内容
    this.setAriaHiddenForBackground(modal, true);
  }

  /**
   * 处理模态框关闭
   */
  handleModalClose(modal) {
    this.releaseFocus(modal);
    this.setAriaHiddenForBackground(modal, false);

    // 恢复上一个焦点
    if (this.lastFocusedElement && document.contains(this.lastFocusedElement)) {
      this.lastFocusedElement.focus();
    }
  }

  /**
   * 陷阱焦点
   */
  trapFocus(container) {
    container.setAttribute("data-focus-trap", "true");
    this.trapFocusElements.add(container);
  }

  /**
   * 释放焦点陷阱
   */
  releaseFocus(container) {
    container.removeAttribute("data-focus-trap");
    this.trapFocusElements.delete(container);
  }

  /**
   * 设置背景内容的 aria-hidden
   */
  setAriaHiddenForBackground(modal, hidden) {
    const allElements = document.body.children;
    Array.from(allElements).forEach((element) => {
      if (!modal.contains(element) && element !== modal) {
        if (hidden) {
          element.setAttribute("aria-hidden", "true");
        } else {
          element.removeAttribute("aria-hidden");
        }
      }
    });
  }

  /**
   * 获取可焦点元素
   */
  getFocusableElements(container = document) {
    const focusableSelectors = [
      'a[href]:not([disabled]):not([aria-hidden="true"])',
      'button:not([disabled]):not([aria-hidden="true"])',
      'input:not([disabled]):not([aria-hidden="true"])',
      'select:not([disabled]):not([aria-hidden="true"])',
      'textarea:not([disabled]):not([aria-hidden="true"])',
      '[tabindex]:not([tabindex="-1"]):not([disabled]):not([aria-hidden="true"])',
      '[role="button"]:not([disabled]):not([aria-hidden="true"])',
      '[role="link"]:not([disabled]):not([aria-hidden="true"])',
      'audio[controls]:not([disabled]):not([aria-hidden="true"])',
      'video[controls]:not([disabled]):not([aria-hidden="true"])',
    ];

    return Array.from(
      container.querySelectorAll(focusableSelectors.join(","))
    ).filter((element) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        window.getComputedStyle(element).visibility !== "hidden"
      );
    });
  }

  /**
   * 增强元素可访问性
   */
  enhanceElementAccessibility(element) {
    // 添加焦点指示器
    if (!element.classList.contains("focus-enhanced")) {
      element.classList.add("focus-enhanced");

      // 为没有 aria-label 的按钮添加
      if (
        element.tagName === "BUTTON" &&
        !element.getAttribute("aria-label") &&
        !element.textContent.trim()
      ) {
        element.setAttribute("aria-label", "按钮");
      }
    }
  }

  /**
   * 设置屏幕阅读器支持
   */
  setupScreenReaderSupport() {
    // 创建屏幕阅读器公告区域
    this.createAnnouncementRegion();

    // 增强导航链接
    this.enhanceNavigationLinks();

    // 增强表单标签
    this.enhanceFormLabels();

    // 添加页面结构信息
    this.addStructuralInfo();
  }

  /**
   * 创建屏幕阅读器公告区域
   */
  createAnnouncementRegion() {
    if (document.getElementById("screen-reader-announcements")) return;

    const announcer = document.createElement("div");
    announcer.id = "screen-reader-announcements";
    announcer.setAttribute("aria-live", "polite");
    announcer.setAttribute("aria-atomic", "true");
    announcer.className = "sr-only";
    announcer.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;

    document.body.appendChild(announcer);
  }

  /**
   * 公告信息给屏幕阅读器
   */
  announce(message, priority = "polite") {
    const announcer = document.getElementById("screen-reader-announcements");
    if (!announcer) return;

    announcer.setAttribute("aria-live", priority);
    announcer.textContent = message;

    // 清空消息以便下次公告
    setTimeout(() => {
      announcer.textContent = "";
    }, 1000);
  }

  /**
   * 增强导航链接
   */
  enhanceNavigationLinks() {
    const navLinks = document.querySelectorAll("nav a, .navigation a");
    navLinks.forEach((link) => {
      if (!link.getAttribute("aria-label") && link.textContent.trim()) {
        const text = link.textContent.trim();
        if (text.length < 3) {
          link.setAttribute("aria-label", `导航到${text}页面`);
        }
      }
    });
  }

  /**
   * 增强表单标签
   */
  enhanceFormLabels() {
    const inputs = document.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      if (!input.labels || input.labels.length === 0) {
        const placeholder = input.getAttribute("placeholder");
        if (placeholder && !input.getAttribute("aria-label")) {
          input.setAttribute("aria-label", placeholder);
        }
      }
    });
  }

  /**
   * 添加页面结构信息
   */
  addStructuralInfo() {
    // 为导航添加 landmark
    const navs = document.querySelectorAll("nav:not([role])");
    navs.forEach((nav) => nav.setAttribute("role", "navigation"));

    // 为主要内容添加 landmark
    const main = document.querySelector("main, #main-content, .main-content");
    if (main && !main.getAttribute("role")) {
      main.setAttribute("role", "main");
    }

    // 为页脚添加 landmark
    const footer = document.querySelector("footer");
    if (footer && !footer.getAttribute("role")) {
      footer.setAttribute("role", "contentinfo");
    }
  }

  /**
   * 设置高对比度支持
   */
  setupHighContrastSupport() {
    // 检测系统高对比度偏好
    const preferHighContrast = window.matchMedia(
      "(prefers-contrast: high)"
    ).matches;

    if (preferHighContrast) {
      document.body.classList.add("high-contrast");
    }

    // 监听高对比度偏好变化
    window
      .matchMedia("(prefers-contrast: high)")
      .addEventListener("change", (e) => {
        if (e.matches) {
          document.body.classList.add("high-contrast");
          this.announce("高对比度模式已启用");
        } else {
          document.body.classList.remove("high-contrast");
          this.announce("高对比度模式已禁用");
        }
      });
  }

  /**
   * 设置 ARIA 标签
   */
  setupAriaLabels() {
    // 为没有标签的图标按钮添加 aria-label
    const iconButtons = document.querySelectorAll(
      "button:not([aria-label]):not([aria-labelledby])"
    );
    iconButtons.forEach((button) => {
      const icon = button.querySelector("svg, i, .icon");
      if (icon && !button.textContent.trim()) {
        // 尝试从父元素或相关元素获取上下文
        const context = this.getButtonContext(button);
        button.setAttribute("aria-label", context || "按钮");
      }
    });

    // 为装饰性图片添加 alt=""
    const decorativeImages = document.querySelectorAll("img:not([alt])");
    decorativeImages.forEach((img) => {
      if (img.closest(".decoration, .bg-image, .pattern")) {
        img.setAttribute("alt", "");
        img.setAttribute("role", "presentation");
      }
    });
  }

  /**
   * 获取按钮上下文信息
   */
  getButtonContext(button) {
    // 检查按钮类名
    const className = button.className;
    if (className.includes("play")) return "播放";
    if (className.includes("pause")) return "暂停";
    if (className.includes("menu")) return "菜单";
    if (className.includes("close")) return "关闭";
    if (className.includes("search")) return "搜索";
    if (className.includes("share")) return "分享";

    // 检查父元素上下文
    const parent = button.closest(".audio-player, .navigation, .modal");
    if (parent) {
      if (parent.classList.contains("audio-player")) return "音频控制";
      if (parent.classList.contains("navigation")) return "导航";
      if (parent.classList.contains("modal")) return "模态框控制";
    }

    return null;
  }

  /**
   * 增强表单可访问性
   */
  enhanceFormAccessibility() {
    const forms = document.querySelectorAll("form");
    forms.forEach((form) => {
      // 添加表单标题
      if (
        !form.getAttribute("aria-labelledby") &&
        !form.getAttribute("aria-label")
      ) {
        const heading = form.querySelector("h1, h2, h3, h4, h5, h6");
        if (heading) {
          if (!heading.id) {
            heading.id = `form-heading-${Date.now()}`;
          }
          form.setAttribute("aria-labelledby", heading.id);
        }
      }

      // 增强输入字段
      const inputs = form.querySelectorAll("input, select, textarea");
      inputs.forEach((input) => {
        this.enhanceInputAccessibility(input);
      });
    });
  }

  /**
   * 增强输入字段可访问性
   */
  enhanceInputAccessibility(input) {
    // 添加 required 字段的视觉指示器
    if (input.required && !input.getAttribute("aria-required")) {
      input.setAttribute("aria-required", "true");

      // 为 label 添加必填指示器
      const label =
        input.labels?.[0] || document.querySelector(`label[for="${input.id}"]`);
      if (label && !label.querySelector(".required-indicator")) {
        const indicator = document.createElement("span");
        indicator.className = "required-indicator";
        indicator.textContent = " *";
        indicator.setAttribute("aria-label", "必填字段");
        label.appendChild(indicator);
      }
    }

    // 添加错误信息关联
    const errorElement = document.querySelector(
      `#${input.id}-error, .error[data-for="${input.id}"]`
    );
    if (errorElement && !input.getAttribute("aria-describedby")) {
      if (!errorElement.id) {
        errorElement.id = `${input.id}-error-${Date.now()}`;
      }
      input.setAttribute("aria-describedby", errorElement.id);
    }
  }

  /**
   * 显示键盘快捷键帮助
   */
  showKeyboardShortcuts() {
    this.announce(
      "键盘快捷键：Tab键导航，箭头键在组件内导航，回车键或空格键激活，Esc键关闭"
    );
  }

  /**
   * 检查可访问性问题
   */
  checkAccessibility() {
    const issues = [];

    // 检查图片 alt 属性
    const images = document.querySelectorAll("img:not([alt])");
    if (images.length > 0) {
      issues.push(`${images.length}个图片缺少alt属性`);
    }

    // 检查标题层级
    const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    let lastLevel = 0;
    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.charAt(1));
      if (level > lastLevel + 1) {
        issues.push(`标题层级跳跃：从h${lastLevel}跳到h${level}`);
      }
      lastLevel = level;
    });

    // 检查表单标签
    const unlabeledInputs = document.querySelectorAll(
      'input:not([type="hidden"]):not([aria-label]):not([aria-labelledby])'
    );
    const unlabeledInputsWithoutLabels = Array.from(unlabeledInputs).filter(
      (input) => !input.labels || input.labels.length === 0
    );
    if (unlabeledInputsWithoutLabels.length > 0) {
      issues.push(`${unlabeledInputsWithoutLabels.length}个表单字段缺少标签`);
    }

    // 检查焦点指示器
    const focusableWithoutIndicator = document.querySelectorAll(
      "button:not(.focus-enhanced), a:not(.focus-enhanced)"
    );
    if (focusableWithoutIndicator.length > 0) {
      issues.push(
        `${focusableWithoutIndicator.length}个可焦点元素可能缺少焦点指示器`
      );
    }

    if (import.meta.env.DEV) {
      if (issues.length === 0) {
        console.log("✅ 可访问性检查通过");
      } else {
        console.log("⚠️ 发现可访问性问题：", issues);
      }
    }

    return issues;
  }
}

// 自动初始化可访问性管理器
if (typeof window !== "undefined") {
  window.accessibilityManager = new AccessibilityManager();

  // 在开发环境中提供可访问性检查
  if (import.meta.env.DEV) {
    window.checkAccessibility = () =>
      window.accessibilityManager.checkAccessibility();
  }
}
