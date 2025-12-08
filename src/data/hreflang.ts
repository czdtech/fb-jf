// Centralized hreflang link definitions for multi-language pages

const BASE = 'https://www.playfiddlebops.com';

export const GAMES_HREFLANG = [
  { lang: 'x-default', url: `${BASE}/games/` },
  { lang: 'en', url: `${BASE}/games/` },
  { lang: 'zh-CN', url: `${BASE}/zh/games/` },
  { lang: 'es', url: `${BASE}/es/games/` },
  { lang: 'fr', url: `${BASE}/fr/games/` },
  { lang: 'de', url: `${BASE}/de/games/` },
  { lang: 'ja', url: `${BASE}/ja/games/` },
  { lang: 'ko', url: `${BASE}/ko/games/` }
];

export const UPDATE_GAMES_HREFLANG = [
  { lang: 'x-default', url: `${BASE}/update-games/` },
  { lang: 'en', url: `${BASE}/update-games/` },
  { lang: 'zh-CN', url: `${BASE}/zh/update-games/` },
  { lang: 'es', url: `${BASE}/es/update-games/` },
  { lang: 'fr', url: `${BASE}/fr/update-games/` },
  { lang: 'de', url: `${BASE}/de/update-games/` },
  { lang: 'ja', url: `${BASE}/ja/update-games/` },
  { lang: 'ko', url: `${BASE}/ko/update-games/` }
];

export const FIDDLEBOPS_MOD_HREFLANG = [
  { lang: 'x-default', url: `${BASE}/fiddlebops-mod/` },
  { lang: 'en', url: `${BASE}/fiddlebops-mod/` },
  { lang: 'zh-CN', url: `${BASE}/zh/fiddlebops-mod/` },
  { lang: 'es', url: `${BASE}/es/fiddlebops-mod/` },
  { lang: 'fr', url: `${BASE}/fr/fiddlebops-mod/` },
  { lang: 'de', url: `${BASE}/de/fiddlebops-mod/` },
  { lang: 'ja', url: `${BASE}/ja/fiddlebops-mod/` },
  { lang: 'ko', url: `${BASE}/ko/fiddlebops-mod/` }
];

export const INCREDIBOX_MOD_HREFLANG = [
  { lang: 'x-default', url: `${BASE}/incredibox-mod/` },
  { lang: 'en', url: `${BASE}/incredibox-mod/` },
  { lang: 'zh-CN', url: `${BASE}/zh/incredibox-mod/` },
  { lang: 'es', url: `${BASE}/es/incredibox-mod/` },
  { lang: 'fr', url: `${BASE}/fr/incredibox-mod/` },
  { lang: 'de', url: `${BASE}/de/incredibox-mod/` },
  { lang: 'ja', url: `${BASE}/ja/incredibox-mod/` },
  { lang: 'ko', url: `${BASE}/ko/incredibox-mod/` }
];

export const SPRUNKI_MOD_HREFLANG = [
  { lang: 'x-default', url: `${BASE}/sprunki-mod/` },
  { lang: 'en', url: `${BASE}/sprunki-mod/` },
  { lang: 'zh-CN', url: `${BASE}/zh/sprunki-mod/` },
  { lang: 'es', url: `${BASE}/es/sprunki-mod/` },
  { lang: 'fr', url: `${BASE}/fr/sprunki-mod/` },
  { lang: 'de', url: `${BASE}/de/sprunki-mod/` },
  { lang: 'ja', url: `${BASE}/ja/sprunki-mod/` },
  { lang: 'ko', url: `${BASE}/ko/sprunki-mod/` }
];

/**
 * 动态生成分类页的 hreflang 配置。
 * 
 * 所有语言版本共享同一个 slug，例如：
 * - 英文：/c/rhythm-games/
 * - 中文：/zh/c/rhythm-games/
 */
export function getCategoryHreflang(slug: string) {
  const baseCategoryPath = `/c/${slug}/`;

  return [
    { lang: 'x-default', url: `${BASE}${baseCategoryPath}` },
    { lang: 'en', url: `${BASE}${baseCategoryPath}` },
    { lang: 'zh-CN', url: `${BASE}/zh${baseCategoryPath}` },
    { lang: 'es', url: `${BASE}/es${baseCategoryPath}` },
    { lang: 'fr', url: `${BASE}/fr${baseCategoryPath}` },
    { lang: 'de', url: `${BASE}/de${baseCategoryPath}` },
    { lang: 'ja', url: `${BASE}/ja${baseCategoryPath}` },
    { lang: 'ko', url: `${BASE}/ko${baseCategoryPath}` }
  ];
}

/**
 * 动态生成游戏详情页的 hreflang 配置。
 * 所有语言版本共享同一个 slug，例如：
 * - 英文：/sprunki-retake/
 * - 中文：/zh/sprunki-retake/
 */
export function getGameHreflang(slug: string) {
  const gamePath = `/${slug}/`;

  return [
    { lang: 'x-default', url: `${BASE}${gamePath}` },
    { lang: 'en', url: `${BASE}${gamePath}` },
    { lang: 'zh-CN', url: `${BASE}/zh${gamePath}` },
    { lang: 'es', url: `${BASE}/es${gamePath}` },
    { lang: 'fr', url: `${BASE}/fr${gamePath}` },
    { lang: 'de', url: `${BASE}/de${gamePath}` },
    { lang: 'ja', url: `${BASE}/ja${gamePath}` },
    { lang: 'ko', url: `${BASE}/ko${gamePath}` }
  ];
}

// Privacy Policy hreflang
export const PRIVACY_HREFLANG = [
  { lang: 'x-default', url: `${BASE}/privacy/` },
  { lang: 'en', url: `${BASE}/privacy/` },
  { lang: 'zh-CN', url: `${BASE}/zh/privacy/` },
  { lang: 'es', url: `${BASE}/es/privacy/` },
  { lang: 'fr', url: `${BASE}/fr/privacy/` },
  { lang: 'de', url: `${BASE}/de/privacy/` },
  { lang: 'ja', url: `${BASE}/ja/privacy/` },
  { lang: 'ko', url: `${BASE}/ko/privacy/` }
];

// Terms of Service hreflang
export const TERMS_HREFLANG = [
  { lang: 'x-default', url: `${BASE}/terms-of-service/` },
  { lang: 'en', url: `${BASE}/terms-of-service/` },
  { lang: 'zh-CN', url: `${BASE}/zh/terms-of-service/` },
  { lang: 'es', url: `${BASE}/es/terms-of-service/` },
  { lang: 'fr', url: `${BASE}/fr/terms-of-service/` },
  { lang: 'de', url: `${BASE}/de/terms-of-service/` },
  { lang: 'ja', url: `${BASE}/ja/terms-of-service/` },
  { lang: 'ko', url: `${BASE}/ko/terms-of-service/` }
];
