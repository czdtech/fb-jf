/**
 * Keyboard navigation for fallback progress bars in AudioPlayerProgress.astro.
 * Adds Arrow/Home/End handlers and dispatches a custom `audioSeek` event.
 * Note: Players may choose to listen to this event to perform seeking.
 */

function initFallbackProgressKeys() {
  const bars = document.querySelectorAll('.fallback-progress-bar[tabindex="0"]');
  bars.forEach((bar) => {
    bar.addEventListener('keydown', (e) => {
      const event = /** @type {KeyboardEvent} */(e);
      const target = /** @type {HTMLElement} */(event.target);
      if (!target) return;

      const currentValue = parseFloat(target.getAttribute('aria-valuenow') || '0');
      let newValue = currentValue;

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          newValue = Math.max(0, currentValue - 5);
          event.preventDefault();
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          newValue = Math.min(100, currentValue + 5);
          event.preventDefault();
          break;
        case 'Home':
          newValue = 0;
          event.preventDefault();
          break;
        case 'End':
          newValue = 100;
          event.preventDefault();
          break;
      }

      if (newValue !== currentValue) {
        target.setAttribute('aria-valuenow', String(newValue));
        const progressFill = target.querySelector('.progress-fill');
        if (progressFill) progressFill.style.width = `${newValue}%`;
        const seekEvent = new CustomEvent('audioSeek', {
          detail: { percentage: newValue / 100 },
        });
        target.dispatchEvent(seekEvent);
      }
    });
  });
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFallbackProgressKeys, { once: true });
  } else {
    initFallbackProgressKeys();
  }
}

export {};

