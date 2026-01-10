/**
 * Fullscreen Module
 * Implements fullscreen toggle functionality for game containers
 * 
 * Requirements: 4.3
 */

import { mergeConfig } from './utils/config-merge';

// SVG paths for expand/compress icons
const EXPAND_SVG = '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>';
const COMPRESS_SVG = '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 14h6v6m10-10h-6V4m0 6 7-7M3 21l7-7"/>';

export interface FullscreenConfig {
  buttonId: string;
  containerSelector: string;
}

const defaultConfig: FullscreenConfig = {
  buttonId: 'fullscreen-btn',
  containerSelector: '.game-iframe-sprunki',
};

/**
 * Initialize the fullscreen toggle functionality
 * Sets up click event on fullscreen button and handles fullscreen state changes
 */
export function initFullscreen(config: Partial<FullscreenConfig> = {}): void {
  const { buttonId, containerSelector } = mergeConfig(defaultConfig, config);

  const fullscreenBtn = document.getElementById(buttonId);
  const gameContainer = document.querySelector(containerSelector) as HTMLElement | null;

  if (!fullscreenBtn || !gameContainer) {
    console.warn('Fullscreen: Required elements not found', {
      buttonId,
      containerSelector
    });
    return;
  }

  const svgIcon = fullscreenBtn.querySelector('svg');

  function updateIcon(isFullscreen: boolean) {
    if (svgIcon) {
      svgIcon.innerHTML = isFullscreen ? COMPRESS_SVG : EXPAND_SVG;
    }
    fullscreenBtn.dataset.expanded = String(isFullscreen);
  }

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
    updateIcon(!!document.fullscreenElement);
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
