#!/usr/bin/env tsx
import { readFileSync } from 'fs';
import { join } from 'path';

type Check = { file: string; checks: ((html: string) => void)[] };

function expectTag(html: string, pattern: RegExp, label: string) {
  if (!pattern.test(html)) {
    throw new Error(`Missing ${label}`);
  }
}

const checks: Check[] = [
  {
    file: 'incredibox/index.html',
    checks: [
      (h) => expectTag(h, /<link[^>]+rel=["']canonical["'][^>]*>/i, 'canonical'),
      (h) => expectTag(h, /<meta[^>]+property=["']og:image["'][^>]*>/i, 'og:image'),
    ],
  },
  {
    file: 'zh/incredibox/index.html',
    checks: [
      (h) => expectTag(h, /<link[^>]+rel=["']canonical["'][^>]*>/i, 'canonical'),
      (h) => expectTag(h, /<meta[^>]+property=["']og:image["'][^>]*>/i, 'og:image'),
    ],
  },
  {
    file: 'popular-games/index.html',
    checks: [
      (h) => expectTag(h, /<link[^>]+rel=["']canonical["'][^>]*>/i, 'canonical'),
    ],
  },
];

let failures = 0;
for (const c of checks) {
  try {
    const html = readFileSync(join('dist', c.file), 'utf8');
    c.checks.forEach((fn) => fn(html));
    console.log(`✅ ${c.file} passed`);
  } catch (e: any) {
    failures++;
    console.error(`❌ ${c.file}: ${e?.message || e}`);
  }
}

if (failures > 0) {
  process.exit(1);
} else {
  console.log('✅ Dist page assertions passed');
}

