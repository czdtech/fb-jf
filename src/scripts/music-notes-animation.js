/**
 * 音符动画模块
 * 统一管理所有音符飞舞动画效果
 */
export class MusicNotesAnimation {
  constructor(options = {}) {
    this.notes = options.notes || ['♪', '♫', '♬', '♩', '♭', '♯', '𝄞'];
    this.colors = options.colors || ['#9333ea', '#a855f7', '#c084fc', '#ec4899', '#f472b6'];
    this.animationDuration = options.duration || 2000;
    this.noteCount = options.noteCount || 5;
    this.staggerDelay = options.staggerDelay || 200;
    
    // 确保样式已加载
    this.ensureStyles();
  }

  /**
   * 创建音符动画
   * @param {HTMLElement} triggerElement - 触发动画的元素
   * @param {Object} customOptions - 自定义选项
   */
  createAnimation(triggerElement, customOptions = {}) {
    if (!triggerElement) {
      console.warn('MusicNotesAnimation: 触发元素不存在');
      return;
    }

    const options = { ...this.getDefaultOptions(), ...customOptions };
    const rect = triggerElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // 创建多个音符
    for (let i = 0; i < options.noteCount; i++) {
      setTimeout(() => {
        this.createSingleNote(centerX, centerY, options);
      }, i * options.staggerDelay);
    }
  }

  /**
   * 创建单个音符元素
   * @param {number} centerX - 中心X坐标
   * @param {number} centerY - 中心Y坐标  
   * @param {Object} options - 动画选项
   */
  createSingleNote(centerX, centerY, options) {
    const note = document.createElement('div');
    const noteSymbol = this.notes[Math.floor(Math.random() * this.notes.length)];
    const color = this.colors[Math.floor(Math.random() * this.colors.length)];
    
    // 随机偏移
    const offsetX = (Math.random() - 0.5) * 60;
    const offsetY = (Math.random() - 0.5) * 40;
    
    note.className = 'music-note-animation';
    note.textContent = noteSymbol;
    note.style.cssText = `
      position: fixed;
      left: ${centerX + offsetX}px;
      top: ${centerY + offsetY}px;
      color: ${color};
      font-size: ${16 + Math.random() * 8}px;
      font-weight: bold;
      pointer-events: none;
      z-index: 10000;
      transform: translate(-50%, -50%);
      text-shadow: 0 0 10px ${color}40;
    `;
    
    document.body.appendChild(note);
    
    // 执行动画
    this.animateNote(note, options);
  }

  /**
   * 执行音符动画
   * @param {HTMLElement} note - 音符元素
   * @param {Object} options - 动画选项
   */
  animateNote(note, options) {
    const animation = note.animate([
      {
        opacity: 1,
        transform: `translate(-50%, -50%) rotate(${Math.random() * 30 - 15}deg) scale(1)`,
        filter: 'blur(0px)',
      },
      {
        opacity: 0.7,
        transform: `translate(-50%, -150%) rotate(${Math.random() * 60 - 30}deg) scale(1.2)`,
        filter: 'blur(0px)',
      },
      {
        opacity: 0,
        transform: `translate(-50%, -250%) rotate(${Math.random() * 90 - 45}deg) scale(0.8)`,
        filter: 'blur(2px)',
      }
    ], {
      duration: options.duration,
      easing: options.easing
    });
    
    // 动画完成后清理元素
    animation.onfinish = () => {
      if (document.body.contains(note)) {
        document.body.removeChild(note);
      }
    };

    // 错误处理
    animation.onerror = () => {
      console.warn('MusicNotesAnimation: 动画执行失败');
      if (document.body.contains(note)) {
        document.body.removeChild(note);
      }
    };
  }

  /**
   * 获取默认动画选项
   */
  getDefaultOptions() {
    return {
      noteCount: this.noteCount,
      staggerDelay: this.staggerDelay,
      duration: this.animationDuration,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    };
  }

  /**
   * 确保必要的CSS样式已加载
   */
  ensureStyles() {
    if (!document.querySelector('#music-notes-animation-styles')) {
      const style = document.createElement('style');
      style.id = 'music-notes-animation-styles';
      style.textContent = `
        .music-note-animation {
          user-select: none;
          will-change: transform, opacity;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .music-note-animation {
            animation: none !important;
            transition: none !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * 创建点击音符动画（用于页面交互）
   * @param {Event} event - 点击事件
   * @param {Object} customOptions - 自定义选项
   */
  createClickAnimation(event, customOptions = {}) {
    const options = {
      noteCount: 3,
      staggerDelay: 100,
      duration: 1500,
      ...customOptions
    };

    this.createAnimation({
      getBoundingClientRect: () => ({
        left: event.clientX,
        top: event.clientY,
        width: 0,
        height: 0
      })
    }, options);
  }

  /**
   * 销毁所有正在进行的动画
   */
  destroy() {
    const notes = document.querySelectorAll('.music-note-animation');
    notes.forEach(note => {
      if (document.body.contains(note)) {
        document.body.removeChild(note);
      }
    });
  }
}

// 创建默认实例
export const musicNotesAnimation = new MusicNotesAnimation();

// 向后兼容的全局函数
window.createMusicNotes = (element) => {
  musicNotesAnimation.createAnimation(element);
};
