/**
 * Simplified game helper utilities
 * Extracts common game data operations from pages
 */

import type { CollectionEntry } from "astro:content";
import { SUPPORTED_LOCALES } from "@/i18n/utils";

/**
 * Get localized game metadata
 */
export function getGameMetadata(
  game: CollectionEntry<"games">,
  locale: string,
) {
  const translations = game.data.translations || {};
  const localizedData = translations[locale] || translations.en || {};

  return {
    title: localizedData.title || game.data.title,
    description: localizedData.description || game.data.description,
    meta: localizedData.meta || game.data.meta || {},
    keywords: localizedData.meta?.keywords || game.data.meta?.keywords || "",
  };
}

/**
 * Generate game paths for all locales
 */
export function generateGamePaths(baseSlug: string) {
  return SUPPORTED_LOCALES.map((locale) => ({
    locale,
    path: locale === "en" ? `/${baseSlug}/` : `/${locale}/${baseSlug}/`,
    slug: locale === "en" ? baseSlug : `${locale}/${baseSlug}`,
  }));
}

/**
 * Get related games by category
 */
export async function getRelatedGames(
  currentGame: CollectionEntry<"games">,
  allGames: CollectionEntry<"games">[],
  locale: string,
  limit = 6,
) {
  const category = currentGame.data.category;
  const currentSlug = currentGame.data.slug;

  // Filter games by same category, excluding current
  const related = allGames
    .filter((g) => {
      const gameId = g.id.replace(/\.md$/, "");
      const isEnglish =
        !gameId.includes("/") && !/^(zh|es|fr|de|ja|ko)-/.test(gameId);
      return (
        isEnglish && g.data.category === category && g.data.slug !== currentSlug
      );
    })
    .slice(0, limit);

  // Map to localized data
  return related.map((game) => {
    const metadata = getGameMetadata(game, locale);
    return {
      slug: game.data.slug,
      title: metadata.title,
      description: metadata.description,
      image: game.data.image,
      category: game.data.category,
      url:
        locale === "en"
          ? `/${game.data.slug}/`
          : `/${locale}/${game.data.slug}/`,
    };
  });
}

/**
 * Build game structured data
 */
export function buildGameStructuredData(
  game: CollectionEntry<"games">,
  locale: string,
  siteUrl: string,
) {
  const metadata = getGameMetadata(game, locale);
  const url =
    locale === "en"
      ? `${siteUrl}/${game.data.slug}/`
      : `${siteUrl}/${locale}/${game.data.slug}/`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "VideoGame",
        name: metadata.title,
        description: metadata.description,
        url: url,
        image: `${siteUrl}/${game.data.image}`,
        screenshot: `${siteUrl}/${game.data.image}`,
        genre: [game.data.category],
        applicationCategory: "Game",
        operatingSystem: "Web",
        aggregateRating: game.data.rating
          ? {
              "@type": "AggregateRating",
              ratingValue: game.data.rating.value,
              bestRating: game.data.rating.best,
              ratingCount: game.data.rating.count,
            }
          : undefined,
        potentialAction: {
          "@type": "PlayAction",
          target: game.data.iframe,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: siteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Games",
            item: `${siteUrl}/games/`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: metadata.title,
            item: url,
          },
        ],
      },
      {
        name: metadata.title,
        alternateName: "playfiddlebops.com",
        url: url,
      },
    ],
  };
}
