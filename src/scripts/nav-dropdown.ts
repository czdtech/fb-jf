/**
 * Navigation Dropdown Module
 * Handles dropdown menu functionality in the header navigation
 * 
 * Uses a global sentinel to prevent duplicate document-level listeners
 * across HMR/re-initialization/client-side navigation.
 * 
 * Requirements: 4.5
 */

declare global {
  interface Window {
    __fb_navDropdownBound?: boolean;
    __fb_navDropdownCleanup?: () => void;
  }
}

interface DropdownParts {
  toggle: HTMLButtonElement | null;
  menu: HTMLElement | null;
}

let openDropdown: HTMLElement | null = null;

function getParts(dropdown: HTMLElement): DropdownParts {
  const toggle = dropdown.querySelector('.nav-dropdown-toggle') as HTMLButtonElement | null;
  const menu = dropdown.querySelector('.nav-dropdown-menu') as HTMLElement | null;
  return { toggle, menu };
}

function setOpen(dropdown: HTMLElement, open: boolean): void {
  const { toggle, menu } = getParts(dropdown);
  if (!toggle || !menu) return;
  
  dropdown.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-hidden', String(!open));
  menu.toggleAttribute('inert', !open);
  
  if (open) {
    openDropdown = dropdown;
  } else if (openDropdown === dropdown) {
    openDropdown = null;
  }
}

function closeAll(dropdowns: HTMLElement[]): void {
  dropdowns.forEach((d) => setOpen(d, false));
}

/**
 * Initialize navigation dropdown functionality
 * Safe to call multiple times - uses global sentinel to prevent duplicate listeners
 */
export function initNavDropdown(): void {
  const dropdowns = Array.from(document.querySelectorAll('.nav-dropdown')) as HTMLElement[];
  if (dropdowns.length === 0) return;

  // Initialize each dropdown element
  dropdowns.forEach((dropdown, index) => {
    const { toggle, menu } = getParts(dropdown);
    if (!toggle || !menu) return;

    // Skip if already initialized (per-element guard)
    if (dropdown.dataset.dropdownInitialized === 'true') return;
    dropdown.dataset.dropdownInitialized = 'true';

    // Set up ARIA relationships
    if (!menu.id) menu.id = `nav-dropdown-${index}`;
    toggle.setAttribute('aria-controls', menu.id);

    // Initialize state
    const isOpen = dropdown.classList.contains('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    menu.setAttribute('aria-hidden', String(!isOpen));
    menu.toggleAttribute('inert', !isOpen);

    // Toggle click handler
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      const willOpen = !dropdown.classList.contains('is-open');
      closeAll(dropdowns);
      if (willOpen) {
        setOpen(dropdown, true);
      }
    });

    // Escape key on toggle
    toggle.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAll(dropdowns);
    });

    // Close when selecting a link
    menu.addEventListener('click', (e) => {
      const target = e.target as Element | null;
      if (target?.closest('a')) closeAll(dropdowns);
    });
  });

  // Global listeners - only bind once using window sentinel
  if (window.__fb_navDropdownBound) return;
  window.__fb_navDropdownBound = true;

  const onDocumentClick = (e: MouseEvent) => {
    if (!openDropdown) return;
    const target = e.target as Node | null;
    if (!target) return;
    if (openDropdown.contains(target)) return;
    closeAll(dropdowns);
  };

  const onDocumentKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeAll(dropdowns);
  };

  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onDocumentKeydown);

  // Store cleanup function for potential future use
  window.__fb_navDropdownCleanup = () => {
    document.removeEventListener('click', onDocumentClick);
    document.removeEventListener('keydown', onDocumentKeydown);
    window.__fb_navDropdownBound = false;
    window.__fb_navDropdownCleanup = undefined;
  };
}

/**
 * Clean up dropdown listeners (useful for testing or SPA teardown)
 */
export function cleanupNavDropdown(): void {
  if (window.__fb_navDropdownCleanup) {
    window.__fb_navDropdownCleanup();
  }
}
