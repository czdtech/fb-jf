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
function handleLanguageChange(event: Event): void {
  const select = event.target as HTMLSelectElement;
  const selectedOption = select.options[select.selectedIndex];
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
