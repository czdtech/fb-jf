/**
 * Audio Player Manager - 音频播放器管理类
 * 负责管理多个音频播放器的状态和交互
 */

import { AudioErrorHandler } from '../../scripts/audio-error-handler.js';

interface AudioElements {
  audio: HTMLAudioElement;
  button: HTMLElement;
  card: HTMLElement;
  progressBar: HTMLElement | null;
  currentTimeSpan: HTMLElement | null;
  durationSpan: HTMLElement | null;
  errorMessage: HTMLElement | null;
  errorDetails: HTMLElement | null;
  errorText: HTMLElement | null;
  retryBtn: HTMLElement | null;
  timeDisplay: HTMLElement | null;
  fallbackProgressBar: HTMLElement | null;
  statusElement: HTMLElement | null;
}

export class AudioPlayerManager {
  private static instance: AudioPlayerManager;
  private currentlyPlaying: string | null = null;
  private audioElements: Map<string, AudioElements> = new Map();
  private audioErrorHandler: AudioErrorHandler;

  constructor() {
    this.audioErrorHandler = new AudioErrorHandler({
      showUserNotifications: true,
      logErrors: true,
      retryAttempts: 2,
      retryDelay: 1000
    });
  }

  static getInstance(): AudioPlayerManager {
    if (!AudioPlayerManager.instance) {
      AudioPlayerManager.instance = new AudioPlayerManager();
    }
    return AudioPlayerManager.instance;
  }

  initialize() {
    const audioCards = document.querySelectorAll('.audio-player-card[data-audio-id]');
    audioCards.forEach((card) => {
      const audioId = (card as HTMLElement).dataset.audioId;
      if (audioId) {
        this.initializePlayer(audioId);
      }
    });
  }

  private initializePlayer(audioId: string) {
    const card = document.querySelector(`[data-audio-id="${audioId}"]`);
    if (!card) return;

    const audio = document.getElementById(audioId) as HTMLAudioElement;
    const button = card.querySelector('.audio-play-btn') as HTMLElement;
    const progressBar = card.querySelector('.audio-progress-bar') as HTMLElement;
    const currentTimeSpan = card.querySelector('.audio-current-time') as HTMLElement;
    const durationSpan = card.querySelector('.audio-duration') as HTMLElement;
    const errorMessage = card.querySelector('.audio-error-message') as HTMLElement;
    const fallbackProgressBar = card.querySelector('.fallback-progress-bar') as HTMLElement;
    const errorDetails = card.querySelector('.audio-error-details') as HTMLElement;
    const errorText = card.querySelector('.audio-error-text') as HTMLElement;
    const retryBtn = card.querySelector('.audio-retry-btn') as HTMLElement;
    const timeDisplay = card.querySelector('.audio-time-display') as HTMLElement;
    const statusElement = card.querySelector(`#audio-status-${audioId}`) as HTMLElement;

    if (!audio || !button) return;

    this.audioElements.set(audioId, {
      audio,
      button,
      card: card as HTMLElement,
      progressBar,
      currentTimeSpan,
      durationSpan,
      errorMessage,
      errorDetails,
      errorText,
      retryBtn,
      timeDisplay,
      fallbackProgressBar,
      statusElement
    });

    this.setupAudioEvents(audioId);
    this.setupButtonEvents(audioId);
    this.setupProgressEvents(audioId);
    this.setupRetryEvents(audioId);
  }

  private setupAudioEvents(audioId: string) {
    const elements = this.audioElements.get(audioId);
    if (!elements) return;

    const { audio, button } = elements;

    audio.addEventListener('loadstart', () => {
      button.classList.add('loading');
    });

    audio.addEventListener('canplaythrough', () => {
      button.classList.remove('loading');
      this.clearErrorState(audioId);
      this.updateDuration(audioId);
    });

    audio.addEventListener('timeupdate', () => {
      this.updateProgress(audioId);
    });

    audio.addEventListener('ended', () => {
      this.stopAudio(audioId);
    });

    audio.addEventListener('error', (e) => {
      const audioError = e.target as HTMLAudioElement;
      const error = audioError?.error || new Error('Audio loading failed');
      this.audioErrorHandler.handleLoadError(
        audio,
        audioId,
        error,
        { button, card, retryBtn: elements.retryBtn }
      );
      this.showErrorState(audioId, e);
    });

    audio.addEventListener('loadedmetadata', () => {
      this.updateDuration(audioId);
    });
  }

  private setupButtonEvents(audioId: string) {
    const elements = this.audioElements.get(audioId);
    if (!elements) return;

    const { button } = elements;

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleAudio(audioId);
    });
  }

  private setupProgressEvents(audioId: string) {
    const elements = this.audioElements.get(audioId);
    if (!elements) return;

    const { card, audio } = elements;
    
    const fallbackProgressBar = card.querySelector('.fallback-progress-bar') as HTMLElement;
    if (fallbackProgressBar) {
      fallbackProgressBar.addEventListener('click', (e) => {
        const rect = fallbackProgressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const percentage = clickX / width;
        
        if (audio.duration) {
          audio.currentTime = percentage * audio.duration;
        }
      });
    }
  }

  private setupRetryEvents(audioId: string) {
    const elements = this.audioElements.get(audioId);
    if (!elements?.retryBtn) return;

    elements.retryBtn.addEventListener('click', () => {
      this.retryAudio(audioId);
    });
  }

  async toggleAudio(audioId: string) {
    const elements = this.audioElements.get(audioId);
    if (!elements) return;

    const { audio, button, card, statusElement } = elements;

    if (this.currentlyPlaying && this.currentlyPlaying !== audioId) {
      this.stopAudio(this.currentlyPlaying);
    }

    if (audio.paused) {
      try {
        button.classList.add('loading');
        
        button.setAttribute('aria-label', `Pause ${audio.title || 'audio'}`);
        if (statusElement) {
          statusElement.textContent = 'Loading...';
        }
        
        await audio.play();
        
        button.classList.remove('loading');
        button.classList.add('playing');
        card.classList.add('playing');
        this.currentlyPlaying = audioId;
        
        if (statusElement) {
          statusElement.textContent = 'Playing';
        }
        
      } catch (error) {
        console.error('Error playing audio:', error);
        button.classList.remove('loading');
        button.setAttribute('aria-label', `Play ${audio.title || 'audio'}`);
        if (statusElement) {
          statusElement.textContent = 'Error loading audio';
        }
        
        // 使用音频错误处理器处理播放错误
        await this.audioErrorHandler.handlePlayError(
          audio,
          audioId,
          error as Error,
          { button, card, retryCount: 0 }
        );
      }
    } else {
      this.pauseAudio(audioId);
    }
  }

  private pauseAudio(audioId: string) {
    const elements = this.audioElements.get(audioId);
    if (!elements) return;

    const { audio, button, card, statusElement } = elements;

    audio.pause();
    button.classList.remove('playing');
    card.classList.remove('playing');
    button.setAttribute('aria-label', `Play ${audio.title || 'audio'}`);
    
    if (statusElement) {
      statusElement.textContent = 'Paused';
    }

    if (this.currentlyPlaying === audioId) {
      this.currentlyPlaying = null;
    }
  }

  private stopAudio(audioId: string) {
    const elements = this.audioElements.get(audioId);
    if (!elements) return;

    const { audio } = elements;
    
    this.pauseAudio(audioId);
    audio.currentTime = 0;
  }

  private updateProgress(audioId: string) {
    const elements = this.audioElements.get(audioId);
    if (!elements) return;

    const { audio, progressBar, currentTimeSpan, fallbackProgressBar } = elements;

    if (audio.duration) {
      const progress = (audio.currentTime / audio.duration) * 100;
      
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }
      
      if (fallbackProgressBar) {
        const progressFill = fallbackProgressBar.querySelector('.progress-fill') as HTMLElement;
        if (progressFill) {
          progressFill.style.width = `${progress}%`;
        }
      }
      
      if (currentTimeSpan) {
        currentTimeSpan.textContent = this.formatTime(audio.currentTime);
      }
    }
  }

  private updateDuration(audioId: string) {
    const elements = this.audioElements.get(audioId);
    if (!elements) return;

    const { audio, durationSpan } = elements;

    if (durationSpan && audio.duration) {
      durationSpan.textContent = this.formatTime(audio.duration);
    }
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private showErrorState(audioId: string, error: Event) {
    const elements = this.audioElements.get(audioId);
    if (!elements) return;

    const { button, card, errorMessage, errorDetails, errorText, statusElement } = elements;

    button.classList.remove('loading', 'playing');
    button.classList.add('error');
    card.classList.remove('playing');
    card.classList.add('error');

    if (errorMessage) {
      errorMessage.classList.remove('hidden');
    }

    if (errorDetails && errorText) {
      errorDetails.classList.remove('hidden');
      const audioError = error.target as HTMLAudioElement;
      const errorCode = audioError?.error?.code;
      const errorMsg = this.getErrorMessage(errorCode);
      errorText.textContent = errorMsg;
    }

    if (statusElement) {
      statusElement.textContent = 'Error';
    }

    button.setAttribute('aria-label', 'Audio failed to load');
  }

  private clearErrorState(audioId: string) {
    const elements = this.audioElements.get(audioId);
    if (!elements) return;

    const { button, card, errorMessage, errorDetails } = elements;

    button.classList.remove('error');
    card.classList.remove('error');

    if (errorMessage) {
      errorMessage.classList.add('hidden');
    }

    if (errorDetails) {
      errorDetails.classList.add('hidden');
    }
  }

  private async retryAudio(audioId: string) {
    const elements = this.audioElements.get(audioId);
    if (!elements) return;

    const { audio, button, card } = elements;

    this.clearErrorState(audioId);
    
    try {
      button.classList.add('loading');
      audio.load();
      
      // 等待音频加载完成后自动播放
      audio.addEventListener('canplaythrough', async () => {
        try {
          button.classList.remove('loading');
          await audio.play();
          button.classList.add('playing');
          card.classList.add('playing');
          this.currentlyPlaying = audioId;
        } catch (playError) {
          await this.audioErrorHandler.handlePlayError(
            audio,
            audioId,
            playError as Error,
            { button, card, retryCount: 1 }
          );
        }
      }, { once: true });
      
    } catch (loadError) {
      this.audioErrorHandler.handleLoadError(
        audio,
        audioId,
        loadError as Error,
        { button, card }
      );
    }
  }

  /**
   * 获取音频错误处理器实例
   */
  getAudioErrorHandler(): AudioErrorHandler {
    return this.audioErrorHandler;
  }

  private getErrorMessage(errorCode?: number): string {
    const errorMessages: Record<number, string> = {
      1: 'MEDIA_ERR_ABORTED: The fetching process was aborted by the user agent.',
      2: 'MEDIA_ERR_NETWORK: A network error occurred during loading.',
      3: 'MEDIA_ERR_DECODE: An error occurred while decoding the media resource.',
      4: 'MEDIA_ERR_SRC_NOT_SUPPORTED: The media resource is not supported.'
    };
    
    return errorCode ? errorMessages[errorCode] || 'Unknown error occurred.' : 'Audio loading failed.';
  }

  stopAll() {
    this.audioElements.forEach((_, audioId) => {
      this.stopAudio(audioId);
    });
  }

  getCurrentlyPlaying(): string | null {
    return this.currentlyPlaying;
  }
}