/**
 * Analytics initialization module
 * Handles Google Analytics setup for production environment
 */

export function initAnalytics() {
  // Initialize dataLayer if not already present
  window.dataLayer = window.dataLayer || [];

  // Define gtag function
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  // Set initial timestamp
  window.gtag("js", new Date());

  // Configure Google Analytics
  window.gtag("config", "G-9JME3P55QJ");
}
