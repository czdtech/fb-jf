import { setPlaying, setLoading } from '@/scripts/sound-sample/state.js';

export function wirePlayButton(button, card, audio, onPlayStart) {
  if (!button || !card || !audio) return;

  const click = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (audio.paused) {
      try {
        setLoading(card, button, true);
        await audio.play();
        setLoading(card, button, false);
        setPlaying(card, button, true);
        onPlayStart?.(button);
      } catch {
        setLoading(card, button, false);
        setPlaying(card, button, false);
      }
    } else {
      audio.pause();
      setPlaying(card, button, false);
    }
  };

  button.addEventListener('click', click);
  return () => button.removeEventListener('click', click);
}

