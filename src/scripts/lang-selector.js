/**
 * Native language selector initialization.
 * Attaches change and keyboard handlers to select.language-selector-native.
 */
export function initLangSelector() {
  const run = () => {
    const selectors = document.querySelectorAll('.language-selector-native');
    selectors.forEach((selector) => {
      if (!(selector instanceof HTMLSelectElement)) return;

      selector.addEventListener('change', (e) => {
        const target = e.target;
        if (!(target instanceof HTMLSelectElement)) return;
        const selectedPath = target.value;
        if (!selectedPath) return;
        target.disabled = true;
        target.style.opacity = '0.7';
        try {
          window.location.href = selectedPath;
        } catch (error) {
          console.error('Navigation error:', error);
          target.disabled = false;
          target.style.opacity = '1';
        }
      });

      selector.addEventListener('keydown', (e) => {
        const ke = e;
        if (ke && ke.key === 'Enter') {
          ke.preventDefault();
          selector.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
}

