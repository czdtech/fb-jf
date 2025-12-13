type SeedStrategy = 'daily' | 'weekly';

function toUtcYyyyMmDd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getIsoWeekKeyUtc(date: Date): string {
  // ISO week based on UTC date to avoid timezone-dependent builds.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  // Thursday in current week decides the year.
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));

  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  const year = d.getUTCFullYear();
  const week = String(weekNo).padStart(2, '0');
  return `${year}-W${week}`;
}

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createSeededRng(seed: string): () => number {
  const seedFn = xmur3(seed);
  return mulberry32(seedFn());
}

export function getTrendingSeed(strategy: SeedStrategy = 'daily', now: Date = new Date()): string {
  // Optional override for reproducible builds/tests.
  // Note: this runs at build-time in Astro, so process.env is available in Node.
  const override = typeof process !== 'undefined' ? process.env.TRENDING_SEED : undefined;
  if (override && override.trim()) return override.trim();

  if (strategy === 'weekly') return getIsoWeekKeyUtc(now);
  return toUtcYyyyMmDd(now);
}

export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const result = [...items];
  const rand = createSeededRng(seed);

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

