/**
 * Game main area controls used by GameMainSection.astro
 * Exposes global functions for existing onclick attributes,
 * but only installs if not already present.
 */
export function installGameMainGlobals() {
  if (!('toggleFullscreen' in window)) {
    // @ts-ignore
    window.toggleFullscreen = function toggleFullscreen() {
      const iframe = document.getElementById('main-game-iframe');
      const wrapper = iframe?.closest('.game-iframe-wrapper');
      if (!wrapper) return;
      if (!document.fullscreenElement) {
        wrapper.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    };
  }

  if (!('reloadGame' in window)) {
    // @ts-ignore
    window.reloadGame = function reloadGame() {
      const iframe = document.getElementById('main-game-iframe');
      if (iframe && 'src' in iframe) {
        // @ts-ignore
        iframe.src = iframe.src;
      }
    };
  }
}

