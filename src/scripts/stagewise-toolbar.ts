// {{ AURA-X: Add - Stagewise Toolbar 初始化模块（仅开发环境通过 BaseLayout 注入）。Confirmed via 用户指令。 }}

declare global {
  interface Window {
    __stagewiseInitialized?: boolean;
  }
}

// 仅在浏览器端执行
if (typeof window !== 'undefined') {
  const boot = async () => {
    try {
      // 顶层依赖由 Vite 解析（避免在内联脚本中无法解析裸模块）
      const { initToolbar } = await import('@stagewise/toolbar');
      if (!window.__stagewiseInitialized && typeof initToolbar === 'function') {
        window.__stagewiseInitialized = true;
        const stagewiseConfig = { plugins: [] };
        initToolbar(stagewiseConfig);
        console.log('[Stagewise] Toolbar initialized (DEV via module)');
      }
    } catch (error) {
      console.warn('[Stagewise] Failed to initialize toolbar (module)', error);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => boot(), { once: true });
  } else {
    void boot();
  }
}
