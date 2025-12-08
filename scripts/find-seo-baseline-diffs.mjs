#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = process.cwd();
const baselinePath = path.join(ROOT, 'scripts/snapshots/seo-baseline.json');
const distDir = path.join(ROOT, 'dist');

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

function urlToFilePath(urlPath) {
  const clean = urlPath.replace(/^https?:\/\/[^/]+/, '');
  const rel = clean === '/' ? '/index.html' : `${clean.replace(/\/$/, '')}/index.html`;
  return path.join('dist', rel);
}

function extractSeoFromHtml(html) {
  // Very simplified: just grab <title> and meta name="description" and og:description
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;

  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]*>/i);
  let description = null;
  if (descMatch) {
    const contentMatch = descMatch[0].match(/content=["']([^"']*)["']/i);
    description = contentMatch ? contentMatch[1].trim() : '';
  }

  const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]*>/i);
  let ogDescription = null;
  if (ogDescMatch) {
    const contentMatch = ogDescMatch[0].match(/content=["']([^"']*)["']/i);
    ogDescription = contentMatch ? contentMatch[1].trim() : '';
  }

  return { title, description, ogDescription };
}

const diffs = [];
for (const [url, data] of Object.entries(baseline.pages)) {
  const filePath = urlToFilePath(url);
  const full = path.join(ROOT, filePath);
  if (!fs.existsSync(full)) continue;
  const html = fs.readFileSync(full, 'utf8');
  const current = extractSeoFromHtml(html);

  if (data.description === null && current.description && current.description.length > 0) {
    diffs.push({ url, field: 'description', baseline: data.description, current: current.description.slice(0, 80) + '...' });
  }
  if (data.og && data.og.description === null && current.ogDescription && current.ogDescription.length > 0) {
    diffs.push({ url, field: 'og.description', baseline: data.og.description, current: current.ogDescription.slice(0, 80) + '...' });
  }
}

console.log(JSON.stringify(diffs, null, 2));
