import rawTrending from '../data/trending.json';

export type TrendingItem = {
  slug: string;
  score: number;
};

type RawTrending = {
  items?: unknown;
};

function normalizeSlug(raw: string): string {
  // Accept either "foo-bar" or "/foo-bar/".
  return raw.trim().replace(/^\/+/, '').replace(/\/+$/, '');
}

function toScore(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Load trending items from `src/data/trending.json`.
 *
 * - Returned list is normalized, de-duplicated, and sorted:
 *   score desc, then slug asc.
 * - If the file is missing/empty/invalid, returns [].
 */
export function loadTrendingItems(): TrendingItem[] {
  const data = rawTrending as unknown as RawTrending;
  const rawItems = Array.isArray(data?.items) ? data.items : [];

  const seen = new Set<string>();
  const items: TrendingItem[] = [];

  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') continue;
    const record = raw as Record<string, unknown>;

    if (typeof record.slug !== 'string') continue;
    const slug = normalizeSlug(record.slug);
    if (!slug) continue;
    if (seen.has(slug)) continue;

    const score = toScore(record.score);
    if (score == null) continue;

    seen.add(slug);
    items.push({ slug, score });
  }

  items.sort((a, b) => (b.score - a.score) || a.slug.localeCompare(b.slug));
  return items;
}


