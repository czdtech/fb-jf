import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '../i18n/utils';
import { getLocalizedPath } from '../i18n/utils';

export type GameEntry = CollectionEntry<'games'>;

export interface GameCardData {
  slug: string;
  href: string;
  thumbnail: string;
  title: string;
}

function getCanonicalSlug(entry: GameEntry): string {
  return String(entry.data.urlstr || entry.slug).replace(/^\/+/, '').replace(/\/+$/, '');
}

function getCardTitle(entry: GameEntry): string {
  // Default behavior: keep the English name for game titles on cards.
  // If the title contains an SEO suffix (e.g. "X - Play Online"), strip it.
  const title = entry.data.title || 'Untitled';
  return title.split(' - ')[0] || title;
}

function getReleaseDateMs(entry: GameEntry): number {
  return entry.data.releaseDate ? entry.data.releaseDate.getTime() : 0;
}

/**
 * Canonical games are the single source of truth for lists/trending/categories.
 * - Only `locale === 'en'` entries are considered canonical.
 * - Sorted deterministically (releaseDate desc, then slug asc).
 */
export async function getCanonicalGames(): Promise<GameEntry[]> {
  const all = await getCollection('games');
  const canonical = all.filter((entry) => entry.data.locale === 'en');

  canonical.sort((a, b) => {
    const byDate = getReleaseDateMs(b) - getReleaseDateMs(a);
    if (byDate !== 0) return byDate;
    return getCanonicalSlug(a).localeCompare(getCanonicalSlug(b));
  });

  return canonical;
}

/**
 * Map a canonical game entry to the minimum shape needed for card rendering.
 */
export function toGameCardData(entry: GameEntry, locale: Locale): GameCardData {
  const slug = getCanonicalSlug(entry);
  const href = getLocalizedPath(`${slug}/`, locale);

  return {
    slug,
    href,
    thumbnail: entry.data.thumbnail,
    title: getCardTitle(entry),
  };
}

