/**
 * Fullscreen Module
 * Implements fullscreen toggle functionality for game containers
 * 
 * Requirements: 4.3
 */

export interface FullscreenConfig {
  buttonId: string;
  containerSelector: string;
  expandIconClass?: string;
  compressIconClass?: string;
}

const defaultConfig: FullscreenConfig = {
  buttonId: 'fullscreen-btn',
  containerSelector: '.game-iframe-sprunki',
  expandIconClass: 'fa-expand',
  compressIconClass: 'fa-compress'
};

/**
 * Initialize the fullscreen toggle functionality
 * Sets up click event on fullscreen button and handles fullscreen state changes
 */
export function initFullscreen(config: Partial<FullscreenConfig> = {}): void {
  const { buttonId, containerSelector, expandIconClass, compressIconClass } = {
    ...defaultConfig,
    ...config
  };

  const fullscreenBtn = document.getElementById(buttonId);
  const gameContainer = document.querySelector(containerSelector) as HTMLElement | null;

  if (!fullscreenBtn || !gameContainer) {
    console.warn('Fullscreen: Required elements not found', {
      buttonId,
      containerSelector
    });
    return;
  }

  const fullscreenIcon = fullscreenBtn.querySelector('i');

  // Handle fullscreen button click
  fullscreenBtn.addEventListener('click', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      gameContainer.requestFullscreen();
    }
  });

  // Handle fullscreen state changes to update icon
  document.addEventListener('fullscreenchange', () => {
    if (fullscreenIcon && expandIconClass && compressIconClass) {
      if (document.fullscreenElement) {
        fullscreenIcon.classList.remove(expandIconClass);
        fullscreenIcon.classList.add(compressIconClass);
      } else {
        fullscreenIcon.classList.remove(compressIconClass);
        fullscreenIcon.classList.add(expandIconClass);
      }
    }
  });
}

/**
 * Show the fullscreen button (typically called after iframe loads)
 */
export function showFullscreenButton(buttonId: string = 'fullscreen-btn'): void {
  const fullscreenBtn = document.getElementById(buttonId);
  if (fullscreenBtn) {
    fullscreenBtn.style.display = 'block';
  }
}

/**
 * Check if fullscreen is currently active
 */
export function isFullscreen(): boolean {
  return !!document.fullscreenElement;
}

/**
 * Toggle fullscreen state for a given element
 */
export async function toggleFullscreen(element: HTMLElement): Promise<void> {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else {
    await element.requestFullscreen();
  }
}
