/**
 * Critical initialization module
 * Handles essential setup including dev environment mocks
 */

export function initCritical() {
  // Development environment setup
  if (!import.meta.env.PROD) {
    // Mock gtag for development to prevent console errors
    console.log("🔧 开发模式：分析和广告代码已禁用");

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];

    // Mock gtag function for development
    window.gtag = function () {
      console.log("📊 [DEV] gtag 调用:", arguments);
    };
  }

  // Additional critical initialization can go here
  // This includes any shared initialization logic that was previously inline
}
