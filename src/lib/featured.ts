import type { GameEntry } from './canonical-games';

function getSlug(entry: GameEntry): string {
  return String(entry.data.urlstr || entry.slug).replace(/^\/+/, '').replace(/\/+$/, '');
}

export const FEATURED_FALLBACK_SLUGS = ['steal-a-brainrot', '99-nights-in-the-forest', 'grow-a-garden'] as const;

function isEntry(e: GameEntry | undefined): e is GameEntry {
  return Boolean(e);
}

/**
 * Select featured (pinned) games for Trending sections.
 *
 * Rules:
 * - Primary source: content frontmatter (`featured: true` + `featuredRank: 1..3`).
 * - Sort: featuredRank asc, then slug asc.
 * - Limit: up to 3.
 * - Fallback: if there is no featured configured at all, use FEATURED_FALLBACK_SLUGS.
 */
export function getFeaturedGames(canonicalGames: GameEntry[]): GameEntry[] {
  const fromContent = [...canonicalGames]
    .filter((g) => g.data.featured === true)
    .sort((a, b) => {
      const rankA = typeof a.data.featuredRank === 'number' ? a.data.featuredRank : 999;
      const rankB = typeof b.data.featuredRank === 'number' ? b.data.featuredRank : 999;
      const byRank = rankA - rankB;
      if (byRank !== 0) return byRank;
      return getSlug(a).localeCompare(getSlug(b));
    })
    .slice(0, 3);

  if (fromContent.length > 0) return fromContent;

  return FEATURED_FALLBACK_SLUGS.map((slug) => canonicalGames.find((g) => getSlug(g) === slug)).filter(isEntry);
}

export function getFeaturedSlugSet(featuredGames: GameEntry[]): Set<string> {
  return new Set<string>(featuredGames.map(getSlug));
}

