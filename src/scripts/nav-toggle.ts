/**
 * Nav Toggle Module
 * Implements mobile navigation toggle functionality
 * 
 * Requirements: 4.4
 */

import { mergeConfig } from './utils/config-merge';

export interface NavToggleConfig {
  toggleSelector: string;
  menuSelector: string;
}

const defaultConfig: NavToggleConfig = {
  toggleSelector: '.nav-toggle',
  menuSelector: '.nav-menu'
};

type Cleanup = () => void;

const active: {
  cleanup: Cleanup | null;
  toggle: HTMLButtonElement | null;
  menu: HTMLElement | null;
} = {
  cleanup: null,
  toggle: null,
  menu: null,
};

function cleanupActiveListeners(): void {
  if (!active.cleanup) return;
  active.cleanup();
  active.cleanup = null;
  active.toggle = null;
  active.menu = null;
}

/**
 * Initialize the navigation toggle functionality
 * Adds click event listener to toggle button to show/hide mobile menu
 */
export function initNavToggle(config: Partial<NavToggleConfig> = {}): void {
  const { toggleSelector, menuSelector } = mergeConfig(defaultConfig, config);

  const navToggle = document.querySelector(toggleSelector) as HTMLButtonElement | null;
  const navMenu = document.querySelector(menuSelector) as HTMLElement | null;

  if (!navToggle || !navMenu) {
    cleanupActiveListeners();
    console.warn('Nav toggle: Required elements not found', { toggleSelector, menuSelector });
    return;
  }

  // Idempotency: if called again for the same DOM nodes, keep a single listener set.
  if (active.cleanup && active.toggle === navToggle && active.menu === navMenu) return;

  // If re-initializing (e.g. Astro client-side navigation/HMR), remove old global listeners first.
  cleanupActiveListeners();
  active.toggle = navToggle;
  active.menu = navMenu;

  // Ensure toggle/menu have an explicit relationship for accessibility.
  if (!navMenu.id) navMenu.id = 'site-nav';
  navToggle.setAttribute('aria-controls', navMenu.id);

  function isMobileMode(): boolean {
    // Mirror CSS behavior: the toggle is only shown on mobile.
    return window.getComputedStyle(navToggle).display !== 'none';
  }

  function syncA11yState(): void {
    const mobile = isMobileMode();
    const open = navMenu.classList.contains('active');

    if (mobile) {
      navToggle.setAttribute('aria-expanded', String(open));
      navMenu.setAttribute('aria-hidden', String(!open));
      return;
    }

    // Desktop: nav is visible; don't hide it from assistive tech.
    navToggle.setAttribute('aria-expanded', 'false');
    navMenu.setAttribute('aria-hidden', 'false');
    navMenu.classList.remove('active');
    navToggle.classList.remove('is-active');
    document.body.classList.remove('nav-open');
  }

  function openMenu() {
    if (!isMobileMode()) return;
    navMenu.classList.add('active');
    navToggle.classList.add('is-active');
    document.body.classList.add('nav-open');
    syncA11yState();
  }

  function closeMenu() {
    navMenu.classList.remove('active');
    navToggle.classList.remove('is-active');
    document.body.classList.remove('nav-open');
    syncA11yState();
  }

  function toggleMenu() {
    if (navMenu.classList.contains('active')) closeMenu();
    else openMenu();
  }

  const onToggleClick = () => toggleMenu();
  navToggle.addEventListener('click', onToggleClick);

  // Close when user selects a nav link.
  const onMenuClick = (e: MouseEvent) => {
    const el = e.target as Element | null;
    if (el?.closest('a')) closeMenu();
  };
  navMenu.addEventListener('click', onMenuClick);

  // Close on Escape.
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeMenu();
  };
  document.addEventListener('keydown', onKeydown);

  // Keep ARIA and layout state synced with responsive breakpoint changes.
  const onResize = () => syncA11yState();
  window.addEventListener('resize', onResize);

  // Close when clicking outside the menu (only when open).
  const onDocumentClickCapture = (e: MouseEvent) => {
    if (!navMenu.classList.contains('active')) return;
    const target = e.target as Node | null;
    if (!target) return;
    if (navMenu.contains(target) || navToggle.contains(target)) return;
    closeMenu();
  };
  document.addEventListener('click', onDocumentClickCapture, { capture: true });

  active.cleanup = () => {
    closeMenu();
    navToggle.removeEventListener('click', onToggleClick);
    navMenu.removeEventListener('click', onMenuClick);
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('click', onDocumentClickCapture, { capture: true });
    window.removeEventListener('resize', onResize);
  };

  // Initialize ARIA state based on current responsive mode.
  syncA11yState();
}

// NOTE: Auto-initialization removed to prevent duplicate listeners.
// Components should explicitly call initNavToggle() with their specific selectors.
