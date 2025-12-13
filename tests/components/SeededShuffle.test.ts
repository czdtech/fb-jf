import { describe, it, expect } from 'vitest';
import { seededShuffle } from '../../src/lib/seeded-shuffle';

describe('Seeded shuffle', () => {
  it('should be deterministic for the same seed', () => {
    const input = Array.from({ length: 50 }, (_, i) => i + 1);
    const out1 = seededShuffle(input, 'seed-1');
    const out2 = seededShuffle(input, 'seed-1');

    expect(out1).toEqual(out2);
  });

  it('should not mutate the input array', () => {
    const input = [1, 2, 3, 4, 5, 6, 7];
    const snapshot = [...input];

    const out = seededShuffle(input, 'seed-2');

    expect(input).toEqual(snapshot);
    expect(out).not.toBe(input);
  });
});

