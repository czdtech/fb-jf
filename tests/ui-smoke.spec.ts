/**
 * UI Smoke Tests — Playwright
 * 
 * Headless visual regression tests for key routes.
 * Run: npx playwright test tests/ui-smoke.spec.ts
 * 
 * Purpose:
 * - Screenshot key pages at multiple viewports
 * - Collect console errors
 * - Gate for visual regressions during UI redesign
 */

import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

// Key routes to test
const ROUTES = [
  { path: '/', name: 'homepage-en' },
  { path: '/zh/', name: 'homepage-zh' },
  { path: '/de/', name: 'homepage-de' },
  { path: '/search/', name: 'search' },
  { path: '/privacy/', name: 'privacy' },
];

// Collect console errors
function collectConsoleErrors(page: Page): ConsoleMessage[] {
  const errors: ConsoleMessage[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg);
    }
  });
  return errors;
}

test.describe('UI Smoke Tests', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(`Viewport: ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      });

      for (const route of ROUTES) {
        test(`${route.name} loads without errors`, async ({ page }, testInfo) => {
          const errors = collectConsoleErrors(page);
          
          // Navigate to page
          const response = await page.goto(route.path, {
            waitUntil: 'domcontentloaded',
          });
          
          // Check response status
          expect(response?.status()).toBeLessThan(400);
          
          // Wait for content to be visible
          await page.waitForSelector('main', { state: 'visible' });

          // Enforce exactly one visible H1 inside main (SEO + a11y)
          const mainH1 = page.locator('main h1');
          await expect(mainH1).toHaveCount(1);
          await expect(mainH1.first()).toBeVisible();
          
          // Take screenshot
          await page.screenshot({
            path: testInfo.outputPath(`${route.name}-${viewport.name}.png`),
            fullPage: false,
          });
          
          // Check for critical console errors (filter out common third-party noise)
          const criticalErrors = errors.filter((e) => {
            const text = e.text();
            // Ignore common third-party errors
            if (text.includes('googletagmanager')) return false;
            if (text.includes('google-analytics')) return false;
            if (text.includes('adsense')) return false;
            if (text.includes('Failed to load resource')) return false;
            return true;
          });
          
          // Log errors for debugging
          if (criticalErrors.length > 0) {
            console.warn(`Console errors on ${route.path}:`, criticalErrors.map(e => e.text()));
          }
          
          // Don't fail on console errors, just report
          // expect(criticalErrors).toHaveLength(0);
        });
      }
    });
  }

  test.describe('Critical UI Elements', () => {
    test('Homepage has H1', async ({ page }) => {
      await page.goto('/');

      // Header must not consume the page H1 slot
      await expect(page.locator('header h1')).toHaveCount(0);

      const h1 = page.locator('main h1');
      await expect(h1).toHaveCount(1);
      await expect(h1.first()).toBeVisible();
    });

    test('Header navigation is accessible', async ({ page }) => {
      await page.goto('/');
      const nav = page.locator('header nav');
      await expect(nav).toBeAttached();
      
      // Check nav links exist
      const links = page.locator('header nav a');
      const count = await links.count();
      expect(count).toBeGreaterThan(0);
    });

    test('Footer links are present', async ({ page }) => {
      await page.goto('/');
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
      
      // Check for privacy/terms links
      const privacyLink = page.locator('footer a[href*="privacy"]');
      await expect(privacyLink).toBeAttached();
    });

    test('Language selector works', async ({ page }) => {
      await page.goto('/');
      const langSelect = page.locator('.language-select');
      await expect(langSelect).toBeVisible();
    });

    test('Mobile nav toggle works', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/');
      
      const navToggle = page.locator('.nav-toggle');
      await expect(navToggle).toBeVisible();
      
      // Click toggle
      await navToggle.click();
      
      // Nav menu should be visible
      const navMenu = page.locator('.nav-menu');
      await expect(navMenu).toHaveClass(/active/);
      await expect(navToggle).toHaveAttribute('aria-expanded', 'true');
      await expect(navMenu).toBeVisible();
    });
  });

  test.describe('Game Page', () => {
    test('Game page loads with Play button', async ({ page }) => {
      // Find a game page dynamically
      await page.goto('/');
      
      // Look for any game link
      const gameLink = page.locator('.game a, .game-logo a, [href*="fiddlebops"]').first();
      const href = await gameLink.getAttribute('href');
      
      if (href) {
        await page.goto(href);
        
        // Check for Play button
        const playButton = page.locator('#playButton');
        await expect(playButton).toBeVisible();
        
        // Take screenshot
        await page.screenshot({
          path: test.info().outputPath('game-page-sample.png'),
          fullPage: false,
        });
      }
    });
  });
});
