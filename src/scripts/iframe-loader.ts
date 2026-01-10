/**
 * Iframe Loader Module
 * Implements game iframe lazy loading functionality
 * 
 * Requirements: 4.2
 */

import { mergeConfig } from './utils/config-merge';

export interface IframeLoaderConfig {
  iframeId: string;
  playButtonId: string;
  containerSelector: string;
  iframeSrc: string;
}

const defaultConfig: IframeLoaderConfig = {
  iframeId: 'fiddlebops-iframe',
  playButtonId: 'playButton',
  containerSelector: '.game-iframe-sprunki',
  iframeSrc: '',
};

/**
 * Initialize the iframe loader functionality
 * Sets up click event on play button to load the game iframe
 */
export function initIframeLoader(config: IframeLoaderConfig): void {
  const { iframeId, playButtonId, containerSelector, iframeSrc } = mergeConfig(defaultConfig, config);

  if (!iframeSrc) {
    console.warn('Iframe loader: iframeSrc is required');
    return;
  }

  const iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
  const playButton = document.getElementById(playButtonId);
  const gameContainer = document.querySelector(containerSelector) as HTMLElement | null;

  if (!iframe || !playButton || !gameContainer) {
    console.warn('Iframe loader: Required elements not found', {
      iframeId,
      playButtonId,
      containerSelector
    });
    return;
  }

  function loadIframe(): void {
    if (iframe && playButton && gameContainer) {
      iframe.src = iframeSrc;
      playButton.style.display = 'none';
      iframe.focus();
      gameContainer.classList.add('is-playing');
      gameContainer.style.backgroundImage = 'none';
    }
  }

  playButton.addEventListener('click', (e) => {
    e.preventDefault();
    loadIframe();
  });
}

/**
 * Create an iframe loader with the given iframe URL
 * Returns a function that can be called on DOMContentLoaded
 */
export function createIframeLoader(iframeSrc: string, customConfig?: Partial<IframeLoaderConfig>): () => void {
  return () => {
    initIframeLoader(mergeConfig(defaultConfig, { ...customConfig, iframeSrc }));
  };
}
