#!/usr/bin/env node
/**
 * Generate `src/data/trending.json` from GA4 page view data.
 *
 * Intended usage:
 * - Run daily (CI cron / Cloudflare workflow) with GA4 credentials in env vars.
 * - Commit/ship the updated JSON, then rebuild/deploy the site (Plan A).
 *
 * Env vars (required):
 * - GA4_PROPERTY_ID
 * - GA4_CLIENT_EMAIL
 * - GA4_PRIVATE_KEY          (service account key; supports \\n escaped newlines)
 *
 * Env vars (optional):
 * - TRENDING_OUT             (default: src/data/trending.json)
 * - TRENDING_WINDOW_DAYS     (default: 7; uses yesterday..yesterday for 1, otherwise <N>daysAgo..yesterday)
 * - GA4_LIMIT                (default: 500)
 * - GA4_METRIC               (default: screenPageViews)
 * - GA4_DIMENSION            (default: pagePath)
 * - GA4_EVENT_NAME           (optional; when set, uses eventCount and filters by eventName==GA4_EVENT_NAME)
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { defaultLocale, locales, isValidLocale } from '../src/i18n/routing';

type TrendingItem = { slug: string; score: number };
type TrendingJson = {
  generatedAt: string;
  window: string;
  source: 'ga4';
  items: TrendingItem[];
};

const LOCALE_PREFIXES = new Set(locales.filter((l) => l !== defaultLocale));

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value.trim();
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwtRs256(payload: Record<string, unknown>, privateKeyPem: string): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();

  const signature = signer.sign(privateKeyPem);
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

async function getGa4AccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const assertion = signJwtRs256(payload, privateKeyPem);

  const body = new URLSearchParams();
  body.set('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  body.set('assertion', assertion);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to get GA4 access token (${res.status}): ${text || res.statusText}`);
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('GA4 token response missing access_token');
  return json.access_token;
}

async function loadCanonicalSlugSet(gamesDir: string): Promise<Set<string>> {
  const files = await fs.readdir(gamesDir);
  const slugs = new Set<string>();

  for (const file of files) {
    // Canonical games are stored as `<urlstr>.en.md` and are the only source of truth.
    // Using filenames avoids parsing ~7x localized variants, speeding up the job.
    if (!file.endsWith('.en.md')) continue;
    const raw = file.replace(/\.en\.md$/, '').trim();
    const slug = raw.replace(/^\/+/, '').replace(/\/+$/, '');
    if (slug) slugs.add(slug);
  }

  return slugs;
}

function extractCanonicalSlugFromPath(pagePathRaw: string, canonicalSlugs: Set<string>): string | null {
  if (!pagePathRaw || typeof pagePathRaw !== 'string') return null;

  // Strip query/hash, then trim slashes.
  const cleaned = pagePathRaw.split('?')[0].split('#')[0].trim();
  const parts = cleaned.replace(/^\/+/, '').replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts.length === 0) return null;

  // Drop locale prefix if present.
  const first = parts[0];
  const withoutLocale = isValidLocale(first) && LOCALE_PREFIXES.has(first) ? parts.slice(1) : parts;
  if (withoutLocale.length === 0) return null;

  const slug = withoutLocale[0];
  if (!slug) return null;

  // Ignore non-game routes; we only accept known canonical slugs.
  if (!canonicalSlugs.has(slug)) return null;

  return slug;
}

async function runGa4Report(options: {
  propertyId: string;
  accessToken: string;
  startDate: string;
  endDate: string;
  limit: number;
  metric: string;
  dimension: string;
  eventName?: string | null;
}): Promise<Array<{ pagePath: string; score: number }>> {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${options.propertyId}:runReport`;
  const body = {
    dateRanges: [{ startDate: options.startDate, endDate: options.endDate }],
    dimensions: [{ name: options.dimension }],
    metrics: [{ name: options.metric }],
    orderBys: [{ metric: { metricName: options.metric }, desc: true }],
    limit: String(options.limit),
    ...(options.eventName
      ? {
          dimensionFilter: {
            filter: {
              fieldName: 'eventName',
              stringFilter: { matchType: 'EXACT', value: options.eventName },
            },
          },
        }
      : {}),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${options.accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GA4 runReport failed (${res.status}): ${text || res.statusText}`);
  }

  const json = (await res.json()) as {
    rows?: Array<{
      dimensionValues?: Array<{ value?: string }>;
      metricValues?: Array<{ value?: string }>;
    }>;
  };

  const rows = Array.isArray(json.rows) ? json.rows : [];
  const out: Array<{ pagePath: string; score: number }> = [];

  for (const row of rows) {
    const pagePath = row.dimensionValues?.[0]?.value || '';
    const rawScore = row.metricValues?.[0]?.value || '0';
    const score = Number(rawScore);
    if (!pagePath) continue;
    if (!Number.isFinite(score) || score <= 0) continue;
    out.push({ pagePath, score });
  }

  return out;
}

async function main(): Promise<void> {
  const propertyId = requiredEnv('GA4_PROPERTY_ID');
  const clientEmail = requiredEnv('GA4_CLIENT_EMAIL');
  const privateKeyPem = requiredEnv('GA4_PRIVATE_KEY').replace(/\\n/g, '\n');

  const outPath = process.env.TRENDING_OUT
    ? path.resolve(process.env.TRENDING_OUT)
    : path.join(process.cwd(), 'src', 'data', 'trending.json');

  const windowDays = Math.max(1, Number.parseInt(process.env.TRENDING_WINDOW_DAYS || '7', 10) || 7);
  const limit = Math.max(1, Number.parseInt(process.env.GA4_LIMIT || '500', 10) || 500);
  const eventName = (process.env.GA4_EVENT_NAME || '').trim() || null;
  const metric = (process.env.GA4_METRIC || (eventName ? 'eventCount' : 'screenPageViews')).trim();
  const dimension = (process.env.GA4_DIMENSION || 'pagePath').trim();

  const gamesDir = path.join(process.cwd(), 'src', 'content', 'games');
  const canonicalSlugs = await loadCanonicalSlugSet(gamesDir);

  const accessToken = await getGa4AccessToken(clientEmail, privateKeyPem);

  const startDate = windowDays === 1 ? 'yesterday' : `${windowDays}daysAgo`;
  const endDate = 'yesterday';
  const rows = await runGa4Report({ propertyId, accessToken, startDate, endDate, limit, metric, dimension, eventName });

  const scores = new Map<string, number>();
  for (const row of rows) {
    const slug = extractCanonicalSlugFromPath(row.pagePath, canonicalSlugs);
    if (!slug) continue;
    scores.set(slug, (scores.get(slug) || 0) + row.score);
  }

  const items: TrendingItem[] = [...scores.entries()]
    .map(([slug, score]) => ({ slug, score }))
    .sort((a, b) => (b.score - a.score) || a.slug.localeCompare(b.slug));

  const payload: TrendingJson = {
    generatedAt: new Date().toISOString(),
    window: `${windowDays}d`,
    source: 'ga4',
    items,
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  console.log(`✅ Wrote ${items.length} trending item(s) to ${outPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
