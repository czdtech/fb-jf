/**
 * Simple, dependency-free audio player bootstrap.
 * Works with markup produced by AudioPlayer.astro and AudioPlayerSimple.astro
 * by querying within each `.audio-player-card[data-audio-id]`.
 */

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60) || 0;
  const secs = Math.floor(seconds % 60) || 0;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

class SimpleAudioPlayer {
  /** @param {string} audioId */
  constructor(audioId) {
    const card = document.querySelector(`[data-audio-id="${audioId}"]`);
    if (!card) return;

    const audio = /** @type {HTMLAudioElement|null} */(document.getElementById(audioId));
    const button = /** @type {HTMLElement|null} */(card.querySelector('.audio-play-btn'));
    const progressBar = /** @type {HTMLElement|null} */(card.querySelector('.audio-progress-bar'));
    const currentTimeSpan = /** @type {HTMLElement|null} */(card.querySelector('.audio-current-time'));
    const durationSpan = /** @type {HTMLElement|null} */(card.querySelector('.audio-duration'));
    const errorMessage = /** @type {HTMLElement|null} */(card.querySelector('.audio-error-message'));
    const errorDetails = /** @type {HTMLElement|null} */(card.querySelector('.audio-error-details'));
    const errorText = /** @type {HTMLElement|null} */(card.querySelector('.audio-error-text'));
    const retryBtn = /** @type {HTMLElement|null} */(card.querySelector('.audio-retry-btn'));
    const statusElement = /** @type {HTMLElement|null} */(card.querySelector(`#audio-status-${audioId}`));
    const fallbackProgressBar = /** @type {HTMLElement|null} */(card.querySelector('.fallback-progress-bar'));

    if (!audio || !button) return;

    // duration
    audio.addEventListener('loadedmetadata', () => {
      if (durationSpan && Number.isFinite(audio.duration)) {
        durationSpan.textContent = formatTime(audio.duration);
      }
    });

    audio.addEventListener('loadstart', () => {
      button.classList.add('loading');
    });

    audio.addEventListener('canplaythrough', () => {
      button.classList.remove('loading');
      clearErrorState();
      if (durationSpan && Number.isFinite(audio.duration)) {
        durationSpan.textContent = formatTime(audio.duration);
      }
    });

    // progress
    audio.addEventListener('timeupdate', () => {
      const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      if (progressBar) progressBar.style.width = `${pct}%`;
      if (fallbackProgressBar) fallbackProgressBar.style.width = `${pct}%`;
      if (currentTimeSpan) currentTimeSpan.textContent = formatTime(audio.currentTime);
    });

    // play/pause
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (audio.paused) {
        // stop other players
        document.querySelectorAll('audio').forEach((a) => {
          if (a !== audio && !a.paused) {
            a.pause();
            const otherCard = a.closest('.audio-player-card');
            const otherButton = otherCard?.querySelector('.audio-play-btn');
            otherCard?.classList.remove('playing');
            otherButton?.classList.remove('playing');
          }
        });

        audio.play().catch((err) => {
          console.error('Audio play failed:', err);
          showErrorState(err?.message || 'Audio play failed');
        });

        card.classList.add('playing');
        button.classList.add('playing');
        button.setAttribute?.('aria-label', 'Pause');
        if (statusElement) statusElement.textContent = 'Playing';
      } else {
        audio.pause();
        card.classList.remove('playing');
        button.classList.remove('playing');
        button.setAttribute?.('aria-label', 'Play');
        if (statusElement) statusElement.textContent = 'Paused';
      }
    });

    audio.addEventListener('ended', () => {
      card.classList.remove('playing');
      button.classList.remove('playing');
      button.setAttribute?.('aria-label', 'Play');
      if (progressBar) progressBar.style.width = '0%';
      if (fallbackProgressBar) fallbackProgressBar.style.width = '0%';
      if (currentTimeSpan) currentTimeSpan.textContent = '0:00';
      if (statusElement) statusElement.textContent = 'Ended';
    });

    audio.addEventListener('error', (e) => {
      const a = /** @type {HTMLAudioElement} */(e.target);
      const msg = a?.error ? `MediaError code: ${a.error.code}` : 'Audio loading failed';
      button.classList.remove('loading');
      showErrorState(msg);
    });

    if (retryBtn) {
      retryBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearErrorState();
        audio.load();
        audio.play().catch((err) => {
          showErrorState(err?.message || 'Audio retry failed');
        });
      });
    }

    // Internal helpers bound to closure vars
    function clearErrorState() {
      card.classList.remove('error');
      errorMessage?.classList.add('hidden');
      errorDetails?.classList.add('hidden');
    }

    function showErrorState(message) {
      card.classList.add('error');
      card.classList.remove('playing');
      errorMessage?.classList.remove('hidden');
      errorDetails?.classList.remove('hidden');
      if (errorText) errorText.textContent = message;
    }
  }
}

// Boot all players in the document
function initAudioPlayers() {
  const cards = document.querySelectorAll('.audio-player-card[data-audio-id]');
  cards.forEach((card) => {
    const id = /** @type {HTMLElement} */(card).dataset.audioId;
    if (id) new SimpleAudioPlayer(id);
  });
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAudioPlayers, { once: true });
  } else {
    initAudioPlayers();
  }
}

export {}; // keep as module

