import { toggleFullscreen } from './fullscreen.js';
import { reloadGame } from './reload.js';
import { showToast } from './toast.js';
import { initObservers } from './observers.js';

function scrollToGame() {
  const iframe = document.getElementById('hero-game-iframe');
  if (iframe) {
    iframe.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    iframe.closest('.preview-container')?.classList.add('focused');
    setTimeout(() => {
      iframe.closest('.preview-container')?.classList.remove('focused');
    }, 2000);
  }
}

export function initHero() {
  // expose globals for onclick compatibility
  window.scrollToGame = scrollToGame;
  window.shareGame = function shareGame() {
    const titleEl = document.querySelector('.game-title-apple');
    const shareData = {
      title: document.title,
      text: `Experience ${titleEl?.textContent || ''} - An incredible music creation game`,
      url: window.location.href,
    };
    if (navigator.share && navigator.canShare?.(shareData)) {
      navigator.share(shareData);
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        showToast('Link copied to clipboard');
      });
    }
  };
  window.toggleFullscreen = toggleFullscreen;
  window.reloadGame = reloadGame;
  window.showToast = showToast;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initObservers);
  } else {
    initObservers();
  }
}

