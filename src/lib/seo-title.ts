import { type Locale, defaultLocale, isValidLocale } from '../i18n/routing';

const BRAND_SUFFIX = 'FiddleBops';

// Unicode helpers for emoji stripping.
// - \p{Extended_Pictographic}: modern emoji set
// - U+FE0E/U+FE0F: variation selectors
// - U+200D: zero-width joiner
const EMOJI_RE = /\p{Extended_Pictographic}/gu;
const VARIATION_SELECTORS_RE = /[\uFE0E\uFE0F]/g;
const ZWJ_RE = /\u200D/g;

function normalizeWhitespace(input: string): string {
  return String(input ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function toLocale(input: string | undefined): Locale {
  const raw = String(input ?? '').trim().replace(/_/g, '-').toLowerCase();
  const base = raw.split('-')[0] || '';
  return isValidLocale(base) ? (base as Locale) : defaultLocale;
}

export function stripEmoji(input: string): string {
  // Keep this intentionally dumb and deterministic.
  // We only need to ensure emoji doesn't leak into <title>.
  const s = String(input ?? '');
  return normalizeWhitespace(
    s.replace(EMOJI_RE, '').replace(VARIATION_SELECTORS_RE, '').replace(ZWJ_RE, '')
  );
}

function ensureNoBrandSuffix(input: string): string {
  const s = normalizeWhitespace(input);
  if (!s) return s;

  // Avoid duplicating "| FiddleBops" when callers pass already-suffixed titles.
  const brandRe = new RegExp(`\\s*\\|\\s*${BRAND_SUFFIX}\\s*$`, 'i');
  return normalizeWhitespace(s.replace(brandRe, ''));
}

function withBrandSuffix(base: string): string {
  const clean = ensureNoBrandSuffix(base);
  return `${clean} | ${BRAND_SUFFIX}`.trim();
}

export function buildGameSeoTitle(locale: Locale, displayTitle: string): string {
  const name = stripEmoji(displayTitle);
  const cleanName = normalizeWhitespace(name);

  const base = (() => {
    switch (locale) {
      case 'zh':
        return `免费在线玩 ${cleanName}`;
      case 'ja':
        return `無料で${cleanName}をオンラインでプレイ`;
      case 'ko':
        return `${cleanName} 무료 온라인 플레이`;
      case 'es':
        return `Juega a ${cleanName} en línea gratis`;
      case 'fr':
        return `Jouez à ${cleanName} en ligne gratuitement`;
      case 'de':
        return `Spiele ${cleanName} kostenlos online`;
      case 'en':
      default:
        return `Play ${cleanName} Online Free`;
    }
  })();

  return withBrandSuffix(base);
}

export function buildListSeoTitle(locale: Locale, baseTitle: string, pageNum: number): string {
  const base = ensureNoBrandSuffix(stripEmoji(baseTitle));
  const n = Number(pageNum);

  if (!Number.isFinite(n) || n <= 1) {
    return withBrandSuffix(base);
  }

  const pageSuffix = (() => {
    switch (locale) {
      case 'zh':
        return `（第 ${n} 页）`;
      case 'ja':
        return `（${n}ページ目）`;
      case 'ko':
        return ` (${n}페이지)`;
      case 'es':
        return ` (Página ${n})`;
      case 'fr':
        return ` (Page ${n})`;
      case 'de':
        return ` (Seite ${n})`;
      case 'en':
      default:
        return ` (Page ${n})`;
    }
  })();

  return withBrandSuffix(`${base}${pageSuffix}`);
}

export function buildCategorySeoTitle(locale: Locale, displayTagName: string): string {
  const tag = stripEmoji(displayTagName);
  const base = (() => {
    switch (locale) {
      case 'zh':
        return `${tag} 游戏`;
      case 'ja':
        return `${tag} ゲーム`;
      case 'ko':
        return `${tag} 게임`;
      case 'es':
        return `Juegos de ${tag}`;
      case 'fr':
        return `Jeux de ${tag}`;
      case 'de':
        return `${tag}-Spiele`;
      case 'en':
      default:
        return `${tag} Games`;
    }
  })();

  return withBrandSuffix(base);
}

