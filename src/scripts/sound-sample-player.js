// FiddleBops Sound Sample Player
// 高级音频播放器脚本

console.log('FiddleBops Audio Player script loaded');

class FiddleBopsAudioManager {
  constructor() {
    this.currentlyPlaying = null;
    this.audioElements = new Map();
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

    // 音频加载事件
    audio.addEventListener('loadstart', () => {
      button.classList.add('loading');
      card.classList.add('loading');
    });

    audio.addEventListener('canplaythrough', () => {
      button.classList.remove('loading');
      card.classList.remove('loading');
      this.updateDuration(audioId);
    });

    // 播放进度更新
    audio.addEventListener('timeupdate', () => {
      this.updateProgress(audioId);
    });

    // 播放结束
    audio.addEventListener('ended', () => {
      this.stopAudio(audioId);
    });

    // 错误处理
    audio.addEventListener('error', (e) => {
      button.classList.remove('loading');
      card.classList.remove('loading');
      console.error(`音频加载失败: ${audioId}`, e);
    });
  }

  setupButtonEvents(audioId) {
    const elements = this.audioElements.get(audioId);
    const { button } = elements;

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Play button clicked:', audioId);
      this.toggleAudio(audioId);
    });
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
        
        // 添加音符点击动画
        this.createMusicNotes(button);
        
      } catch (error) {
        console.error('播放失败:', error);
        button.classList.remove('loading');
        card.classList.remove('loading');
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

  createMusicNotes(button) {
    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const notes = ['♪', '♫', '♬', '♩', '♭', '♯', '𝄞'];
    const colors = ['#9333ea', '#a855f7', '#c084fc', '#ec4899', '#f472b6'];
    
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const note = document.createElement('div');
        const randomNote = notes[Math.floor(Math.random() * notes.length)];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        note.textContent = randomNote;
        note.style.cssText = `
          position: fixed;
          left: ${centerX + (Math.random() - 0.5) * 40}px;
          top: ${centerY + (Math.random() - 0.5) * 40}px;
          color: ${randomColor};
          font-size: ${Math.random() * 8 + 16}px;
          font-weight: bold;
          pointer-events: none;
          z-index: 9999;
          user-select: none;
          transform: translate(-50%, -50%) rotate(${Math.random() * 30 - 15}deg);
        `;
        
        document.body.appendChild(note);
        
        // 动画
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
          duration: 2000,
          easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });
        
        animation.onfinish = () => {
          if (document.body.contains(note)) {
            document.body.removeChild(note);
          }
        };
      }, i * 200);
    }
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