export function initObservers() {
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
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('animate-in');
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.hero-info-panel, .hero-preview-panel').forEach((el) => {
    observer.observe(el);
  });
}

