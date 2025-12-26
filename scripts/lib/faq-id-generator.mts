import crypto from 'node:crypto';

export type FaqId = `faq:${string}:${string}`;

export function normalizeQuestionText(text: string): string {
  return text
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '');
}

export function generateKebabPrefix(text: string): string {
  const words = normalizeQuestionText(text).split(' ').filter(Boolean);
  const cleaned = words
    .map((w) => w.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)
    .slice(0, 5);

  const joined = cleaned.join('-') || 'q';
  const limited = joined.slice(0, 30).replace(/-+$/g, '');
  return limited || 'q';
}

export function generateHash(normalizedText: string, length: number): string {
  return crypto.createHash('sha1').update(normalizedText).digest('hex').slice(0, length);
}

export function generateFaqId(
  slug: string,
  questionText: string,
  options?: {
    existingIds?: Set<string>;
  }
): FaqId {
  const cleanSlug = slug.trim();
  const normalized = normalizeQuestionText(questionText);
  const prefix = generateKebabPrefix(questionText);

  const baseHash = generateHash(normalized, 8);
  let candidate = `faq:${cleanSlug}:${prefix}-${baseHash}` as const;

  const existing = options?.existingIds;
  if (!existing || !existing.has(candidate)) {
    return candidate;
  }

  const extendedHash = generateHash(normalized, 12);
  candidate = `faq:${cleanSlug}:${prefix}-${extendedHash}` as const;
  if (!existing.has(candidate)) {
    return candidate;
  }

  // Extremely unlikely, but keep behavior deterministic.
  let n = 2;
  while (existing.has(`${candidate}-${n}`)) {
    n++;
  }
  return `${candidate}-${n}` as FaqId;
}

export function parseFaqIdFromHtmlComment(raw: string): FaqId | null {
  const match = /<!--\s*i18n:faq:id\s*=\s*([a-z0-9][a-z0-9:._-]*)\s*-->/i.exec(raw);
  if (!match) return null;
  const id = match[1];
  if (!id.startsWith('faq:')) return null;
  return id as FaqId;
}

