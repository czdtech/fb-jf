/**
 * Language Switcher Module
 * Implements language selection dropdown functionality
 * 
 * Requirements: 4.1
 */

export interface LanguageSwitcherConfig {
  selectSelector: string;
  currentLang?: string;
}

const defaultConfig: LanguageSwitcherConfig = {
  selectSelector: 'select',
  currentLang: undefined
};

/**
 * Handle language selection change event
 * Navigates to the URL specified in the selected option's data-url attribute
 */
const LANGUAGE_PREFIXES: Record<string, string> = {
  'en': '',
  'zh-CN': '/zh',
  'es': '/es',
  'fr': '/fr',
  'de': '/de',
  'ja': '/ja',
  'ko': '/ko'
};

const PATH_LANG_SEGMENTS = new Set(['zh', 'es', 'fr', 'de', 'ja', 'ko']);
// Slugs that should stay on the same route when switching languages
// Includes list pages, category pages (`/c/[slug]/`), and legal pages (privacy, terms).
const LIST_SLUGS = new Set([
  'games',
  'update-games',
  'fiddlebops-mod',
  'incredibox-mod',
  'sprunki-mod',
  'c',
  'privacy',
  'terms-of-service'
]);

function getLocalizedListPath(selectedLang: string | undefined, currentPath: string): string | null {
  if (!selectedLang) return null;
  const langPrefix = LANGUAGE_PREFIXES[selectedLang];
  if (langPrefix === undefined) return null;

  const hasTrailingSlash = currentPath.endsWith('/') && currentPath !== '/';
  const normalizedPath = hasTrailingSlash ? currentPath.slice(0, -1) : currentPath;
  const segments = normalizedPath.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  let baseIndex = 0;
  if (PATH_LANG_SEGMENTS.has(segments[0])) {
    baseIndex = 1;
  }

  const baseSlug = segments[baseIndex];
  if (!LIST_SLUGS.has(baseSlug)) return null;

  const pageSegments = segments.slice(baseIndex + 1);
  const prefix = langPrefix;
  const base = '/' + baseSlug;
  let newPath = prefix + base + (pageSegments.length ? '/' + pageSegments.join('/') : '');

  if (hasTrailingSlash && newPath !== '/' && !newPath.endsWith('/')) {
    newPath += '/';
  }
  if (!hasTrailingSlash && newPath.endsWith('/') && newPath !== '/') {
    newPath = newPath.slice(0, -1);
  }

  return newPath;
}

/**
 * Compute localized path for game detail pages.
 * Only triggers on pages that expose a data-game-slug marker (set by GameLayout),
 * so it won't affect other single-slug routes.
 */
function getLocalizedGamePath(selectedLang: string | undefined, currentPath: string): string | null {
  if (!selectedLang) return null;
  const langPrefix = LANGUAGE_PREFIXES[selectedLang];
  if (langPrefix === undefined) return null;

  // Detect if current page is a game detail page via DOM marker.
  // This makes the behaviour explicit and avoids guessing from the URL structure.
  const configEl = typeof document !== 'undefined'
    ? document.getElementById('game-config')
    : null;

  const slugFromConfig = configEl?.getAttribute('data-game-slug') || '';
  let gameSlug = slugFromConfig;

  // Fallback: if no explicit slug is provided, infer from the URL if it matches
  // `/slug/` or `/lang/slug/` patterns. This keeps behaviour robust even if the
  // marker is temporarily missing.
  if (!gameSlug) {
    const hasTrailingSlash = currentPath.endsWith('/') && currentPath !== '/';
    const normalizedPath = hasTrailingSlash ? currentPath.slice(0, -1) : currentPath;
    const segments = normalizedPath.split('/').filter(Boolean);

    if (segments.length === 1) {
      // `/slug/`
      gameSlug = segments[0];
    } else if (segments.length === 2 && PATH_LANG_SEGMENTS.has(segments[0])) {
      // `/lang/slug/`
      gameSlug = segments[1];
    } else {
      return null;
    }
  }

  if (!gameSlug) return null;

  const hasTrailingSlash = currentPath.endsWith('/') && currentPath !== '/';
  let newPath = `${langPrefix}/${gameSlug}/`;

  // Normalise trailing slash behaviour to match current path style
  if (!hasTrailingSlash && newPath.endsWith('/') && newPath !== '/') {
    newPath = newPath.slice(0, -1);
  }

  // Avoid unnecessary reloads if already on the target URL
  if (newPath === currentPath) {
    return null;
  }

  return newPath;
}

function handleLanguageChange(event: Event): void {
  const select = event.target as HTMLSelectElement;
  const selectedOption = select.options[select.selectedIndex];
  const selectedLang = selectedOption.getAttribute('data-lang') || undefined;

  const currentPath = window.location.pathname;
  const localizedPath = getLocalizedListPath(selectedLang, currentPath);

  if (localizedPath) {
    window.location.href = localizedPath;
    return;
  }

  const localizedGamePath = getLocalizedGamePath(selectedLang, currentPath);
  if (localizedGamePath) {
    window.location.href = localizedGamePath;
    return;
  }

  const url = selectedOption.getAttribute('data-url');
  
  if (url) {
    window.location.href = url;
  }
}

/**
 * Set the current language option as selected based on the HTML lang attribute
 */
function setCurrentLanguage(select: HTMLSelectElement, currentLang?: string): void {
  const htmlLang = currentLang || document.documentElement.lang;
  const options = Array.from(select.options);

  // Try to find an option that exactly matches the lang attribute
  const currentOption = options.find(option =>
    option.getAttribute('data-lang') === htmlLang
  );

  if (currentOption) {
    currentOption.selected = true;
    return;
  }

  // If no exact match, try to find default option (en or /)
  const defaultOption = options.find(option =>
    option.getAttribute('data-lang') === 'en'
  ) || options.find(option =>
    option.getAttribute('data-lang') === '/'
  );

  if (defaultOption) {
    defaultOption.selected = true;
  }
}

/**
 * Initialize the language switcher functionality
 * Sets up change event listener and selects current language
 */
export function initLanguageSwitcher(config: Partial<LanguageSwitcherConfig> = {}): void {
  const { selectSelector, currentLang } = { ...defaultConfig, ...config };

  const select = document.querySelector(selectSelector) as HTMLSelectElement | null;
  
  if (!select) {
    console.warn('Language switcher: Select element not found', { selectSelector });
    return;
  }

  select.addEventListener('change', handleLanguageChange);
  setCurrentLanguage(select, currentLang);
}

// NOTE: Auto-initialization removed to prevent duplicate listeners.
// Components should explicitly call initLanguageSwitcher() with their specific selectors.
// Using a generic 'select' selector would hijack unrelated dropdowns on the page.
