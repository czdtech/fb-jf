import { describe, it, expect } from 'vitest';
import {
  generateFaqId,
  normalizeQuestionText,
  parseFaqIdFromHtmlComment,
} from '../../scripts/lib/faq-id-generator.mts';

describe('Hardpoints - FAQ ID generator', () => {
  it('normalizes question text deterministically', () => {
    expect(normalizeQuestionText('  Hello,   World!  ')).toBe('hello world');
  });

  it('generates a stable faq id format', () => {
    const id = generateFaqId('simple-game', 'What is this?');
    expect(id.startsWith('faq:simple-game:')).toBe(true);
    expect(id.split(':').length).toBe(3);
  });

  it('extends hash length on collision (8 -> 12)', () => {
    const base = generateFaqId('simple-game', 'Collision?');
    const existing = new Set<string>([base]);
    const id2 = generateFaqId('simple-game', 'Collision?', { existingIds: existing });

    expect(id2).not.toBe(base);
    const suffix = id2.split(':')[2]; // "<prefix>-<hash...>"
    const hash = suffix.split('-').pop() || '';
    expect(hash.length).toBeGreaterThanOrEqual(12);
  });

  it('parses faq id from html comment', () => {
    const raw = '<!-- i18n:faq:id=faq:simple-game:what-is-this-11111111 -->';
    expect(parseFaqIdFromHtmlComment(raw)).toBe('faq:simple-game:what-is-this-11111111');
  });
});

