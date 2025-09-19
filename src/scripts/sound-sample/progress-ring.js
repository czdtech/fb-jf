export function updateProgressRing(progressRingEl, percentage) {
  if (!progressRingEl) return;
  const circumference = 175.929; // 2πr, r=28
  const offset = circumference - (percentage / 100) * circumference;
  progressRingEl.style.strokeDashoffset = offset;
}

