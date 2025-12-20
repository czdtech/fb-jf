import { describe, it, expect } from 'vitest';
import { getVoteCountFromScore } from '../../src/lib/score';

describe('getVoteCountFromScore', () => {
  it('parses common "(#### votes)" patterns', () => {
    expect(getVoteCountFromScore('4.7/5  (3719 votes)')).toBe(3719);
    expect(getVoteCountFromScore('4.8/5 (2,345 votes)')).toBe(2345);
    expect(getVoteCountFromScore('4.8/5 (2345 vote)')).toBe(2345);
  });

  it('returns 0 for missing/invalid patterns', () => {
    expect(getVoteCountFromScore('4.8/5')).toBe(0);
    expect(getVoteCountFromScore('')).toBe(0);
    expect(getVoteCountFromScore(null)).toBe(0);
    expect(getVoteCountFromScore(undefined)).toBe(0);
  });
});
