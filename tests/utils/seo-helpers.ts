export interface OGData {
  title: string | null;
  description: string | null;
  url: string | null;
  siteName: string | null;
  locale: string | null;
  image: string | null;
  type: string | null;
}

export interface TwitterData {
  card: string | null;
  site: string | null;
  title: string | null;
  description: string | null;
  image: string | null;
}

export interface PageSEOData<TJsonLd = Record<string, unknown>> {
  title: string | null;
  description: string | null;
  keywords: string | null;
  robots: string | null;
  canonical: string | null;
  og: OGData;
  twitter: TwitterData;
  jsonLd: TJsonLd[] | null;
}

export function extractMetaContent(html: string, name: string, property = false): string | null {
  const attr = property ? 'property' : 'name';
  const regex = new RegExp(
    `<meta\\s+(?:[^>]*?\\s)?${attr}="${name}"(?:\\s[^>]*?)?\\s+content="([^"]*)"` +
      `|<meta\\s+(?:[^>]*?\\s)?content="([^"]*)"(?:\\s[^>]*?)?\\s+${attr}="${name}"`,
    'i'
  );
  const match = html.match(regex);
  return match ? match[1] || match[2] : null;
}

export function extractTitle(html: string): string | null {
  const match = html.match(/<title>([^<]*)<\/title>/i);
  return match ? match[1] : null;
}

export function extractCanonical(html: string): string | null {
  const regex =
    /<link\s+(?:[^>]*?\s)?rel=["']canonical["'](?:\s[^>]*?)?\s+href=["']([^"']*)["']|<link\s+(?:[^>]*?\s)?href=["']([^"']*)["'](?:\s[^>]*?)?\s+rel=["']canonical["']/i;
  const match = html.match(regex);
  return match ? match[1] || match[2] : null;
}

export function extractJsonLd<TJsonLd = Record<string, unknown>>(html: string): TJsonLd[] | null {
  const regex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const matches: TJsonLd[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    try {
      const jsonContent = match[1]?.trim() ?? '';
      if (!jsonContent) continue;
      matches.push(JSON.parse(jsonContent) as TJsonLd);
    } catch {
      // Skip invalid JSON
    }
  }

  return matches.length > 0 ? matches : null;
}

export function extractSeoFromHtml<TJsonLd = Record<string, unknown>>(html: string): PageSEOData<TJsonLd> {
  return {
    title: extractTitle(html),
    description: extractMetaContent(html, 'description'),
    keywords: extractMetaContent(html, 'keywords'),
    robots: extractMetaContent(html, 'robots'),
    canonical: extractCanonical(html),
    og: {
      title: extractMetaContent(html, 'og:title', true),
      description: extractMetaContent(html, 'og:description', true),
      url: extractMetaContent(html, 'og:url', true),
      siteName: extractMetaContent(html, 'og:site_name', true),
      locale: extractMetaContent(html, 'og:locale', true),
      image: extractMetaContent(html, 'og:image', true),
      type: extractMetaContent(html, 'og:type', true),
    },
    twitter: {
      card: extractMetaContent(html, 'twitter:card'),
      site: extractMetaContent(html, 'twitter:site'),
      title: extractMetaContent(html, 'twitter:title'),
      description: extractMetaContent(html, 'twitter:description'),
      image: extractMetaContent(html, 'twitter:image'),
    },
    jsonLd: extractJsonLd<TJsonLd>(html),
  };
}

