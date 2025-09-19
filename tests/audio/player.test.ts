/**
 * Basic behavior tests for audio player module.
 * Verifies that importing the module wires event handlers and that
 * a dispatched `audioSeek` on the fallback bar updates currentTime.
 */

describe('audio player module', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="audio-player-card" data-audio-id="ap-1">
        <button class="audio-play-btn"></button>
        <div class="fallback-progress-bar" tabindex="0">
          <div class="progress-fill"></div>
        </div>
        <span class="audio-current-time"></span>
        <span class="audio-duration"></span>
      </div>
      <audio id="ap-1" preload="metadata" class="hidden"></audio>
    `;

    const audio = document.getElementById('ap-1');
    // jsdom: define duration as writable
    Object.defineProperty(audio, 'duration', { value: 100, writable: true });
    Object.defineProperty(audio, 'currentTime', { value: 0, writable: true });

    // stub play/pause to avoid media errors
    (audio as any).play = jest.fn().mockResolvedValue(void 0);
    (audio as any).pause = jest.fn();
  });

  test('handles audioSeek event on fallback progress', async () => {
    await import('@/scripts/audio/player.js');
    const bar = document.querySelector('.fallback-progress-bar');
    const audio = document.getElementById('ap-1') as any;
    bar?.dispatchEvent(new CustomEvent('audioSeek', { detail: { percentage: 0.5 } }));
    expect(audio.currentTime).toBe(50);
  });
});

