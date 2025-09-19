export function toggleFullscreen() {
  const container = document.querySelector('.game-content-area');
  if (!container) return;
  if (!document.fullscreenElement) {
    container.requestFullscreen?.().catch?.(() => {});
  } else {
    document.exitFullscreen?.();
  }
}

