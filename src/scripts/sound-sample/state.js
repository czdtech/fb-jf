export function setPlaying(card, button, playing) {
  if (!card || !button) return;
  if (playing) {
    button.classList.add('playing');
    card.classList.add('playing');
  } else {
    button.classList.remove('playing');
    card.classList.remove('playing');
  }
}

export function setLoading(card, button, loading) {
  if (!card || !button) return;
  if (loading) {
    button.classList.add('loading');
    card.classList.add('loading');
  } else {
    button.classList.remove('loading');
    card.classList.remove('loading');
  }
}

