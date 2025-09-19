export function bindWaveform(card, audio) {
  const bars = card?.querySelectorAll('.audio-waveform .bar');
  if (!bars || bars.length === 0 || !audio) return () => {};

  const update = () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    const active = Math.round((pct / 100) * bars.length);
    bars.forEach((bar, i) => {
      bar.style.opacity = i < active ? '1' : '0.3';
    });
  };

  audio.addEventListener('timeupdate', update);
  return () => audio.removeEventListener('timeupdate', update);
}

