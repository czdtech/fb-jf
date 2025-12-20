export function getVoteCountFromScore(score: unknown): number {
  if (typeof score !== 'string') return 0;
  const text = score.trim();
  if (!text) return 0;

  // Prefer the common "(#### votes)" pattern, but tolerate minor variants.
  const match =
    text.match(/\(\s*([\d,]+)\s+votes?\s*\)/i) ||
    text.match(/\b([\d,]+)\s+votes?\b/i);
  if (!match) return 0;

  const n = Number(String(match[1]).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

