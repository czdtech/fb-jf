/**
 * Hero section interaction utilities
 * - Exposes functions on window to keep onclick handlers working
 * - Initializes observers and loading interactions on DOMContentLoaded
 */

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

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'apple-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
    toast.style.opacity = '1';
  });
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(-100%)';
    toast.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 2500);
}

function shareGame() {
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
}

function toggleFullscreen() {
  const container = document.querySelector('.game-content-area');
  if (!container) return;
  if (!document.fullscreenElement) {
    container.requestFullscreen().catch(err => {
      if (import.meta.env?.DEV) console.log('Fullscreen error:', err);
    });
  } else {
    document.exitFullscreen();
  }
}

function reloadGame() {
  const iframe = document.getElementById('hero-game-iframe');
  const loadingState = document.querySelector('.game-loading-state');
  if (iframe && loadingState) {
    loadingState.style.opacity = '1';
    loadingState.style.pointerEvents = 'auto';
    iframe.src = iframe.src; // reload
    setTimeout(() => {
      loadingState.style.opacity = '0';
      loadingState.style.pointerEvents = 'none';
    }, 1500);
  }
}

function initDomInteractions() {
  const iframe = document.getElementById('hero-game-iframe');
  const loadingState = document.querySelector('.game-loading-state');
  if (iframe && loadingState) {
    iframe.addEventListener('load', () => {
      setTimeout(() => {
        loadingState.style.opacity = '0';
        loadingState.style.pointerEvents = 'none';
      }, 800);
    });
    setTimeout(() => {
      if (loadingState && loadingState.style.opacity !== '0') {
        loadingState.style.opacity = '0';
        loadingState.style.pointerEvents = 'none';
      }
    }, 5000);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('animate-in');
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.hero-info-panel, .hero-preview-panel').forEach((el) => {
    observer.observe(el);
  });
}

export function initHero() {
  // expose globals for onclick compatibility
  window.scrollToGame = scrollToGame;
  window.shareGame = shareGame;
  window.toggleFullscreen = toggleFullscreen;
  window.reloadGame = reloadGame;
  window.showToast = showToast;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDomInteractions);
  } else {
    initDomInteractions();
  }
}

