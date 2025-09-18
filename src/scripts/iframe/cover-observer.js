/**
 * Initialize cover overlay and lazy-load behavior for an iframe with a play button.
 */
export function initIframeCover(iframeId, iframeSrc) {
  let iframeLoaded = false;
  const iframe = document.getElementById(iframeId);
  const playButton = document.getElementById('playButton');
  const container = iframe?.parentElement;

  try {
    if (iframeSrc && 'IntersectionObserver' in window && container) {
      const observedOnce = { done: false };
      const io = new IntersectionObserver((entries) => {
        if (observedOnce.done) return;
        if (entries.some((en) => en.isIntersecting)) {
          observedOnce.done = true;
          io.disconnect();
          const origin = new URL(iframeSrc).origin;
          const link1 = document.createElement('link');
          link1.rel = 'preconnect';
          link1.href = origin;
          document.head.appendChild(link1);
          const link2 = document.createElement('link');
          link2.rel = 'dns-prefetch';
          link2.href = origin;
          document.head.appendChild(link2);
        }
      }, { rootMargin: '200px' });
      io.observe(container);
    }
  } catch (_e) {
    // ignore non-critical failures
  }

  function loadIframe() {
    if (iframeLoaded) return;
    const gameCover = document.getElementById('gameCover');
    if (gameCover) {
      gameCover.style.opacity = '0';
      gameCover.style.pointerEvents = 'none';
      setTimeout(() => {
        gameCover.style.display = 'none';
      }, 300);
    }
    if (iframe) {
      // @ts-ignore
      iframe.src = iframeSrc;
      // @ts-ignore
      iframe.onload = function () {
        // @ts-ignore
        iframe.style.opacity = '1';
        // @ts-ignore
        iframe.style.pointerEvents = 'auto';
      };
      iframeLoaded = true;
      iframe.focus?.();
    }
  }

  playButton?.addEventListener('click', loadIframe);
}

