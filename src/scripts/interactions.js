/**
 * FiddleBops 交互系统
 * 音乐主题的动效和微交互
 */

import { audioErrorHandler } from '@/scripts/audio-error-handler.js';

class FiddleBopsInteractions {
  constructor() {
    this.soundEnabled = false; // 默认关闭音效
    this.errorHandler = audioErrorHandler;
    this.init();
  }

  init() {
    this.setupScrollAnimations();
    this.setupSoundSamples();
    this.setupGameCards();
    this.setupNavigation();
    this.setupPageTransitions();
    this.setupMusicVisualization();
    this.setupLazyLoading();
  }

  /**
   * 滚动动画系统
   */
  setupScrollAnimations() {
    // 创建 Intersection Observer
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate');
          // 为音乐元素添加律动效果
          if (entry.target.classList.contains('music-element')) {
            this.addRhythmAnimation(entry.target);
          }
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    // 观察所有需要动画的元素
    document.querySelectorAll('.scroll-animate').forEach(el => {
      observer.observe(el);
    });
  }

  /**
   * 为元素添加音乐律动动画（仅在用户交互时触发）
   */
  addRhythmAnimation(element) {
    // 只在鼠标悬停时播放动画，而不是持续动画
    element.addEventListener('mouseenter', () => {
      const rhythmPattern = [
        { duration: 150, scale: 1.02 },
        { duration: 100, scale: 1 },
        { duration: 150, scale: 1.02 },
        { duration: 300, scale: 1 }
      ];

      let currentStep = 0;
      let animationCount = 0;
      const maxAnimations = 2; // 限制动画次数

      const animate = () => {
        if (animationCount >= maxAnimations) return;

        const step = rhythmPattern[currentStep];
        element.style.transform = `scale(${step.scale})`;
        element.style.transition = `transform ${step.duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;

        currentStep = (currentStep + 1) % rhythmPattern.length;

        if (currentStep === 0) {
          animationCount++;
        }

        if (animationCount < maxAnimations) {
          setTimeout(animate, step.duration);
        }
      };

      animate();
    });

    // 鼠标离开时重置
    element.addEventListener('mouseleave', () => {
      element.style.transform = 'scale(1)';
    });
  }

  /**
   * 音频样本交互
   */
  setupSoundSamples() {
    document.querySelectorAll('.sound-sample').forEach(sample => {
      const audio = sample.querySelector('audio');
      const playButton = sample.querySelector('.sound-sample-play');

      if (audio && playButton) {
        // 播放/暂停切换
        playButton.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleAudio(audio, sample);
        });

        // 音频结束时重置状态
        audio.addEventListener('ended', () => {
          this.resetAudioState(sample);
        });

        // 悬停时的可视化效果
        sample.addEventListener('mouseenter', () => {
          this.startVisualPulse(sample);
        });

        sample.addEventListener('mouseleave', () => {
          this.stopVisualPulse(sample);
        });
      }
    });
  }

  /**
   * 音频播放控制 - 增强错误处理
   */
  async toggleAudio(audio, container) {
    if (audio.paused) {
      // 先暂停其他正在播放的音频
      this.pauseAllAudio();

      try {
        await audio.play();
        container.classList.add('playing');
        this.startAudioVisualization(container);
      } catch (error) {
        // 使用统一的错误处理模块
        const audioId = audio.id || 'unknown';
        await this.errorHandler.handlePlayError(audio, audioId, error, {
          container,
          retryCount: 0
        });
        this.resetAudioState(container);
      }
    } else {
      audio.pause();
      this.resetAudioState(container);
    }
  }

  /**
   * 暂停所有音频
   */
  pauseAllAudio() {
    document.querySelectorAll('.sound-sample audio').forEach(audio => {
      if (!audio.paused) {
        audio.pause();
        const container = audio.closest('.sound-sample');
        this.resetAudioState(container);
      }
    });
  }

  /**
   * 重置音频状态
   */
  resetAudioState(container) {
    container.classList.remove('playing');
    this.stopAudioVisualization(container);
  }

  /**
   * 音频可视化效果
   */
  startAudioVisualization(container) {
    const waves = this.createWaveAnimation();
    container.appendChild(waves);

    // 添加律动效果
    container.style.animationName = 'pulse';
    container.style.animationDuration = '1s';
    container.style.animationIterationCount = 'infinite';
    container.style.animationTimingFunction = 'ease-in-out';
  }

  stopAudioVisualization(container) {
    const waves = container.querySelector('.wave-animation');
    if (waves) waves.remove();

    container.style.animation = '';
  }

  /**
   * 创建波浪动画
   */
  createWaveAnimation() {
    const waves = document.createElement('div');
    waves.className = 'wave-animation';
    waves.innerHTML = `
      <div class="wave wave-1"></div>
      <div class="wave wave-2"></div>
      <div class="wave wave-3"></div>
    `;

    // 添加CSS样式
    if (!document.querySelector('#wave-styles')) {
      const style = document.createElement('style');
      style.id = 'wave-styles';
      style.textContent = `
        .wave-animation {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        .wave {
          position: absolute;
          border: 2px solid rgba(168, 85, 247, 0.6);
          border-radius: 50%;
          animation: wave-expand 2s infinite;
        }

        .wave-1 { animation-delay: 0s; }
        .wave-2 { animation-delay: 0.7s; }
        .wave-3 { animation-delay: 1.4s; }

        @keyframes wave-expand {
          0% {
            width: 20px;
            height: 20px;
            opacity: 1;
          }
          100% {
            width: 100px;
            height: 100px;
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    return waves;
  }

  /**
   * 视觉脉冲效果
   */
  startVisualPulse(element) {
    element.style.transition = 'transform 150ms ease-out';
    element.style.transform = 'scale(1.02)';
  }

  stopVisualPulse(element) {
    element.style.transform = 'scale(1)';
  }

  /**
   * 游戏卡片交互
   */
  setupGameCards() {
    document.querySelectorAll('.game-card').forEach(card => {
      // 鼠标跟随效果
      card.addEventListener('mousemove', (e) => {
        this.applyMouseTrackingEffect(card, e);
      });

      card.addEventListener('mouseleave', () => {
        this.resetCardTransform(card);
      });

      // 点击音效（如果需要）
      card.addEventListener('click', () => {
        this.playClickSound();
        this.addClickAnimation(card);
      });
    });
  }

  /**
   * 鼠标跟随效果
   */
  applyMouseTrackingEffect(card, event) {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = (y - centerY) / centerY * -10;
    const rotateY = (x - centerX) / centerX * 10;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`;
  }

  /**
   * 重置卡片变换
   */
  resetCardTransform(card) {
    card.style.transform = '';
  }

  /**
   * 点击动画
   */
  addClickAnimation(element) {
    element.style.transform = 'scale(0.98)';
    setTimeout(() => {
      element.style.transform = '';
    }, 150);
  }

  /**
   * 导航交互 - 已清理移动端菜单逻辑
   */
  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
      link.addEventListener('mouseenter', () => {
        this.animateNavLink(link);
      });
    });

    // 移动端导航切换逻辑已移除 - Navigation.astro已改用shadcn/ui组件
  }

  /**
   * 导航链接动画
   */
  animateNavLink(link) {
    // 添加波纹效果
    const ripple = document.createElement('span');
    ripple.className = 'nav-ripple';
    link.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  }


  /**
   * 页面过渡效果 - 已禁用
   */
  setupPageTransitions() {
    // 页面转场动画已被移除，保持原生页面跳转行为
  }

  /**
   * 页面加载动画 - 已禁用
   */
  playPageLoadAnimation() {
    // 页面加载动画已被移除，使用浏览器默认行为
  }

  /**
   * 页面退出动画 - 已禁用
   */
  playPageExitAnimation(callback) {
    // 页面退出动画已被移除，直接执行回调
    if (callback) callback();
  }

  /**
   * 音乐可视化背景 - 全页面浮动音符
   */
  setupMusicVisualization() {
    // 将浮动音符效果应用到整个页面
    this.createFloatingNotes(document.body);
  }

  /**
   * 创建浮动音符（只在用户交互时触发）
   */
  createFloatingNotes(container) {
    const notes = ['♪', '♫', '♬', '♩', '♮'];

    // 移除自动间隔，改为点击时触发
    container.addEventListener('click', () => {
      // 创建3-5个音符的爆发效果
      const noteCount = Math.floor(Math.random() * 3) + 3;

      for (let i = 0; i < noteCount; i++) {
        setTimeout(() => {
          const note = document.createElement('div');
          note.textContent = notes[Math.floor(Math.random() * notes.length)];
          note.style.cssText = `
            position: fixed;
            font-size: ${Math.random() * 20 + 20}px;
            color: rgba(168, 85, 247, ${Math.random() * 0.3 + 0.1});
            left: ${Math.random() * 100}vw;
            top: 100vh;
            pointer-events: none;
            z-index: 9998;
            animation: floatUp ${Math.random() * 3 + 4}s linear forwards;
        `;

          document.body.appendChild(note);

          // 移除音符
          setTimeout(() => {
            note.remove();
          }, 7000);
        }, i * 100); // 每个音符间隔100ms出现
      }
    });

    // 添加浮动动画CSS
    if (!document.querySelector('#float-notes-styles')) {
      const style = document.createElement('style');
      style.id = 'float-notes-styles';
      style.textContent = `
        @keyframes floatUp {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * 播放点击音效（可选）- 增强错误处理
   */
  async playClickSound() {
    // 这里可以添加音效播放逻辑
    // 为了不干扰用户体验，默认关闭
    if (this.soundEnabled) {
      const audio = new Audio('/click-sound.mp3');
      audio.volume = 0.1;

      try {
        await audio.play();
      } catch (error) {
        // 使用统一的错误处理，但不显示用户通知（音效失败不影响用户体验）
        this.errorHandler.handlePlayError(audio, 'click-sound', error, {
          showUserNotifications: false,
          retryCount: 0
        });
      }
    }
  }

  /**
   * 启用/禁用音效
   */
  toggleSound(enabled) {
    this.soundEnabled = enabled;
  }

  /**
   * 懒加载 iframe 视频
   */
  setupLazyLoading() {
    const lazyIframes = document.querySelectorAll('iframe[data-src]');

    if ('IntersectionObserver' in window) {
      const lazyIframeObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const iframe = entry.target;
            iframe.src = iframe.dataset.src;
            iframe.removeAttribute('data-src');
            lazyIframeObserver.unobserve(iframe);
          }
        });
      });

      lazyIframes.forEach((iframe) => {
        lazyIframeObserver.observe(iframe);
      });
    } else {
      // 降级处理：直接加载所有视频
      lazyIframes.forEach((iframe) => {
        iframe.src = iframe.dataset.src;
      });
    }
  }
}

// 初始化交互系统
document.addEventListener('DOMContentLoaded', () => {
  window.fiddleBopsInteractions = new FiddleBopsInteractions();
});

// 添加额外的CSS动画样式
const additionalStyles = `
  .nav-ripple {
    position: absolute;
    background: radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%);
    width: 100px;
    height: 100px;
    border-radius: 50%;
    transform: scale(0);
    animation: ripple 600ms ease-out;
    pointer-events: none;
    left: 50%;
    top: 50%;
    margin-left: -50px;
    margin-top: -50px;
  }

  @keyframes ripple {
    to {
      transform: scale(2);
      opacity: 0;
    }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideUp {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(-10px);
    }
  }

  .sound-sample.playing {
    box-shadow: 0 0 30px rgba(168, 85, 247, 0.5);
  }

  .sound-sample.playing .sound-sample-image::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, transparent 30%, rgba(168, 85, 247, 0.1) 50%, transparent 70%);
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

// 添加样式到页面
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
