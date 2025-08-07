// FiddleBops Sound Sample Player
// 高级音频播放器脚本 - 模块化版本

import { musicNotesAnimation } from '@/scripts/music-notes-animation.js';
import { audioErrorHandler } from '@/scripts/audio-error-handler.js';

console.log('FiddleBops Audio Player script loaded');

class FiddleBopsAudioManager {
  constructor() {
    this.currentlyPlaying = null;
    this.audioElements = new Map();
    this.musicNotesAnimation = musicNotesAnimation;
    this.errorHandler = audioErrorHandler;
    this.init();
  }

  init() {
    console.log('Initializing FiddleBops Audio Manager...');
    // 延迟初始化以确保DOM完全加载
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupAudio());
    } else {
      this.setupAudio();
    }
  }

  setupAudio() {
    console.log('Setting up FiddleBops audio manager...');
    
    // 找到所有音频卡片
    const cards = document.querySelectorAll('.sound-sample-card');
    console.log(`Found ${cards.length} sound sample cards`);
    
    cards.forEach((card, index) => {
      const audioId = card.dataset.sampleId;
      const audioElement = document.getElementById(audioId);
      const playBtn = card.querySelector('.play-btn');
      
      console.log(`Card ${index}: audioId=${audioId}, audio=${!!audioElement}, button=${!!playBtn}`);
      
      if (audioElement && playBtn) {
        this.audioElements.set(audioId, {
          card,
          audio: audioElement,
          button: playBtn,
          progressRing: card.querySelector('.progress-circle-fill')
        });
        
        this.setupAudioEvents(audioId);
        this.setupButtonEvents(audioId);
      }
    });
  }

  setupAudioEvents(audioId) {
    const elements = this.audioElements.get(audioId);
    const { audio, card, button } = elements;

    // 创建事件处理函数并存储引用以便后续清理
    const eventHandlers = {
      loadstart: () => {
        button.classList.add('loading');
        card.classList.add('loading');
      },
      canplaythrough: () => {
        button.classList.remove('loading');
        card.classList.remove('loading');
        this.updateDuration(audioId);
      },
      timeupdate: () => {
        this.updateProgress(audioId);
      },
      ended: () => {
        this.stopAudio(audioId);
      },
      error: (e) => {
        this.errorHandler.handleLoadError(audio, audioId, e, { button, card });
      },
      stalled: () => {
        this.errorHandler.handleNetworkError(audio, audioId, { button, card });
      },
      suspend: () => {
        console.log(`[FiddleBopsAudio] 网络暂停: ${audioId}`);
      }
    };

    // 添加事件监听器
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      audio.addEventListener(event, handler);
    });

    // 存储事件处理函数引用以便清理
    elements.eventHandlers = eventHandlers;
  }

  setupButtonEvents(audioId) {
    const elements = this.audioElements.get(audioId);
    const { button } = elements;

    // 创建按钮事件处理函数并存储引用
    const buttonClickHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Play button clicked:', audioId);
      this.toggleAudio(audioId);
    };

    button.addEventListener('click', buttonClickHandler);

    // 存储按钮事件处理函数引用以便清理
    elements.buttonClickHandler = buttonClickHandler;
  }

  async toggleAudio(audioId) {
    const elements = this.audioElements.get(audioId);
    if (!elements) return;

    const { audio, card, button } = elements;

    // 如果当前有其他音频在播放，先停止
    if (this.currentlyPlaying && this.currentlyPlaying !== audioId) {
      this.stopAudio(this.currentlyPlaying);
    }

    if (audio.paused) {
      try {
        button.classList.add('loading');
        card.classList.add('loading');

        await audio.play();

        button.classList.remove('loading');
        card.classList.remove('loading');
        button.classList.add('playing');
        card.classList.add('playing');

        this.currentlyPlaying = audioId;

        // 使用模块化的音符动画
        this.musicNotesAnimation.createAnimation(button);

      } catch (error) {
        // 使用统一的错误处理
        await this.errorHandler.handlePlayError(audio, audioId, error, {
          button,
          card,
          retryCount: 0
        });
      }
    } else {
      this.pauseAudio(audioId);
    }
  }

  pauseAudio(audioId) {
    const elements = this.audioElements.get(audioId);
    if (!elements) return;

    const { audio, card, button } = elements;
    
    audio.pause();
    button.classList.remove('playing');
    card.classList.remove('playing');
    this.currentlyPlaying = null;
  }

  stopAudio(audioId) {
    const elements = this.audioElements.get(audioId);
    if (!elements) return;

    const { audio, card, button } = elements;
    
    audio.pause();
    audio.currentTime = 0;
    button.classList.remove('playing');
    card.classList.remove('playing');
    
    if (this.currentlyPlaying === audioId) {
      this.currentlyPlaying = null;
    }
    
    this.updateProgress(audioId);
  }

  updateProgress(audioId) {
    const elements = this.audioElements.get(audioId);
    if (!elements) return;

    const { audio, card, progressRing } = elements;
    
    if (audio.duration) {
      const progress = (audio.currentTime / audio.duration) * 100;
      const circumference = 175.929; // 2 * π * r (r = 28)
      const offset = circumference - (progress / 100) * circumference;
      
      if (progressRing) {
        progressRing.style.strokeDashoffset = offset;
      }
      
      // 更新时间显示
      const currentTimeSpan = card.querySelector('.current-time');
      const durationSpan = card.querySelector('.duration');
      
      if (currentTimeSpan) {
        currentTimeSpan.textContent = this.formatTime(audio.currentTime);
      }
      if (durationSpan) {
        durationSpan.textContent = this.formatTime(audio.duration);
      }
    }
  }

  updateDuration(audioId) {
    const elements = this.audioElements.get(audioId);
    if (!elements) return;

    const { audio, card } = elements;
    
    if (audio.duration) {
      const durationSpan = card.querySelector('.duration');
      if (durationSpan) {
        durationSpan.textContent = this.formatTime(audio.duration);
      }
    }
  }

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // 移除旧的音符动画方法，现在使用模块化的音符动画
  // createMusicNotes 方法已被 musicNotesAnimation.createAnimation 替代

  /**
   * 获取错误统计信息（调试用）
   */
  getErrorStats() {
    return this.errorHandler.getErrorStats();
  }

  /**
   * 清除错误统计
   */
  clearErrorStats() {
    this.errorHandler.clearErrorStats();
  }

  /**
   * 销毁音频管理器
   */
  destroy() {
    // 停止所有音频
    if (this.currentlyPlaying) {
      this.stopAudio(this.currentlyPlaying);
    }

    // 清理事件监听器 - 使用存储的函数引用
    this.audioElements.forEach((elements, audioId) => {
      const { audio, button, eventHandlers, buttonClickHandler } = elements;

      // 清理音频事件监听器
      if (eventHandlers) {
        Object.entries(eventHandlers).forEach(([event, handler]) => {
          audio.removeEventListener(event, handler);
        });
      }

      // 清理按钮事件监听器
      if (buttonClickHandler) {
        button.removeEventListener('click', buttonClickHandler);
      }
    });

    // 清理音符动画
    this.musicNotesAnimation.destroy();

    // 清理全局键盘事件监听器
    this.removeGlobalEventListeners();

    this.audioElements.clear();
    this.currentlyPlaying = null;
  }

  /**
   * 移除全局事件监听器
   */
  removeGlobalEventListeners() {
    // 注意：这里需要在初始化时存储键盘事件处理函数的引用
    // 当前的实现在文件底部，可能需要重构以便正确清理
    console.log('[FiddleBopsAudio] 全局事件监听器清理 - 需要重构键盘事件处理');
  }
}

// 初始化音频管理器
const fiddleBopsAudio = new FiddleBopsAudioManager();

// 全局暂停功能
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && fiddleBopsAudio.currentlyPlaying) {
    e.preventDefault();
    fiddleBopsAudio.pauseAudio(fiddleBopsAudio.currentlyPlaying);
  }
});

// 暴露到全局供调试使用
window.fiddleBopsAudio = fiddleBopsAudio;