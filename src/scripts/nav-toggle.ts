/**
 * Nav Toggle Module
 * Implements mobile navigation toggle functionality
 * 
 * Requirements: 4.4
 */

export interface NavToggleConfig {
  toggleSelector: string;
  menuSelector: string;
}

const defaultConfig: NavToggleConfig = {
  toggleSelector: '.nav-toggle',
  menuSelector: '.nav-menu'
};

/**
 * Initialize the navigation toggle functionality
 * Adds click event listener to toggle button to show/hide mobile menu
 */
export function initNavToggle(config: Partial<NavToggleConfig> = {}): void {
  const { toggleSelector, menuSelector } = { ...defaultConfig, ...config };

  const navToggle = document.querySelector(toggleSelector);
  const navMenu = document.querySelector(menuSelector);

  if (!navToggle || !navMenu) {
    console.warn('Nav toggle: Required elements not found', { toggleSelector, menuSelector });
    return;
  }

  navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
  });
}

// NOTE: Auto-initialization removed to prevent duplicate listeners.
// Components should explicitly call initNavToggle() with their specific selectors.
