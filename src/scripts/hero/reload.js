export function reloadGame() {
  const iframe = document.getElementById('hero-game-iframe');
  const loadingState = document.querySelector('.game-loading-state');
  if (iframe && loadingState) {
    loadingState.style.opacity = '1';
    loadingState.style.pointerEvents = 'auto';
    // @ts-ignore
    iframe.src = iframe.src;
    setTimeout(() => {
      loadingState.style.opacity = '0';
      loadingState.style.pointerEvents = 'none';
    }, 1500);
  }
}

