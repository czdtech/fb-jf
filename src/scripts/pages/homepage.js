/**
 * Homepage initialization script
 * Handles lazy loading of sound samples section
 */

export function initHomepage() {
  const scheduleLoad = () => {
    const section = document.querySelector(".sound-samples-section");
    if (!section) return;

    const loadModules = async () => {
      try {
        const [notesMod] = await Promise.all([
          import("/src/scripts/music-notes-animation.js"),
          // 音频管理器脚本具有副作用：初始化卡片事件，无需导出
          import("/src/scripts/sound-sample-player.js"),
        ]);
        const { musicNotesAnimation } = notesMod;

        // 仅在声音示例区块内绑定点击动画，避免全局监听
        let last = 0;
        section.addEventListener("click", (e) => {
          const now = Date.now();
          if (now - last < 200) return;
          last = now;
          musicNotesAnimation?.createClickAnimation?.(e, {
            noteCount: Math.floor(Math.random() * 3) + 1,
            staggerDelay: 100,
          });
        });
      } catch (error) {
        console.log("⚠️ 延迟加载失败，但页面仍可正常使用:", error);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          loadModules();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(section);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleLoad);
  } else {
    scheduleLoad();
  }
}
