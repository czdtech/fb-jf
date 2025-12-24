#!/usr/bin/env node
/**
 * Convert Traditional Chinese residues to Simplified Chinese for zh-facing content.
 *
 * Uses OpenCC (t -> cn) conversion.
 *
 * Scope:
 * - src/content/games/*.zh.md
 * - src/pages/zh 下所有 .astro（递归）
 * - src/components 下所有 *.zh.astro（递归）
 * - src/i18n/zh.json
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import * as OpenCC from 'opencc-js';

const converter = OpenCC.Converter({ from: 't', to: 'cn' });

function stabilize(input: string): string {
  let cur = input;
  for (let i = 0; i < 5; i++) {
    const next = converter(cur);
    if (next === cur) return cur;
    cur = next;
  }
  return cur;
}

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const PAGES_ZH_DIR = path.join(process.cwd(), 'src', 'pages', 'zh');
const COMPONENTS_DIR = path.join(process.cwd(), 'src', 'components');
const I18N_ZH_JSON = path.join(process.cwd(), 'src', 'i18n', 'zh.json');

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function walkFilesRecursive(
  rootDir: string,
  filter: (repoRelPath: string) => boolean
): Promise<string[]> {
  const out: string[] = [];

  async function walk(absDir: string): Promise<void> {
    const entries = await fs.readdir(absDir, { withFileTypes: true });
    for (const e of entries) {
      const abs = path.join(absDir, e.name);
      if (e.isDirectory()) {
        await walk(abs);
        continue;
      }
      const rel = path.relative(process.cwd(), abs).replace(/\\/g, '/');
      if (filter(rel)) out.push(abs);
    }
  }

  try {
    await walk(rootDir);
  } catch (err) {
    if ((err as { code?: string }).code === 'ENOENT') return [];
    throw err;
  }

  out.sort((a, b) => a.localeCompare(b));
  return out;
}

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const opts = {
    dryRun: false,
    maxFiles: Infinity as number,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run') {
      opts.dryRun = true;
    } else if (a === '--max-files' && args[i + 1]) {
      const n = Number(args[++i]);
      if (Number.isFinite(n) && n > 0) opts.maxFiles = Math.floor(n);
    } else if (a === '--help' || a === '-h') {
      console.log(`
Convert zh Traditional residue to Simplified (OpenCC t->cn)

Usage:
  tsx scripts/fix-i18n-zh-traditional.mts [options]

Options:
  --dry-run            Do not write files, just print summary
  --max-files <n>      Limit how many files to process (debug)
`);
      process.exit(0);
    }
  }

  return opts;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);

  const gameFiles = (await fs.readdir(GAMES_DIR))
    .filter((f) => f.endsWith('.zh.md'))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, opts.maxFiles)
    .map((f) => path.join(GAMES_DIR, f));

  const pageAstroFiles = await walkFilesRecursive(
    PAGES_ZH_DIR,
    (rel) => rel.startsWith('src/pages/zh/') && rel.endsWith('.astro')
  );

  const componentZhAstroFiles = await walkFilesRecursive(
    COMPONENTS_DIR,
    (rel) => rel.startsWith('src/components/') && rel.endsWith('.zh.astro')
  );

  const files: string[] = [...gameFiles, ...pageAstroFiles, ...componentZhAstroFiles];
  const hasI18nZhJson = await fileExists(I18N_ZH_JSON);
  if (hasI18nZhJson) files.push(I18N_ZH_JSON);

  let changedFiles = 0;

  for (const absPath of files) {
    const relPath = path.relative(process.cwd(), absPath).replace(/\\/g, '/');

    // zh.json needs special handling: keep languages labels as native names.
    if (hasI18nZhJson && relPath === 'src/i18n/zh.json') {
      const raw = await fs.readFile(absPath, 'utf8');
      const json = JSON.parse(raw) as unknown;

      function walk(value: unknown, keyPath: string[]): unknown {
        if (typeof value === 'string') {
          if (keyPath.length >= 1 && keyPath[0] === 'languages') return value;
          return stabilize(value);
        }

        if (Array.isArray(value)) {
          return value.map((v, i) => walk(v, [...keyPath, String(i)]));
        }

        if (value && typeof value === 'object') {
          const out: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            out[k] = walk(v, [...keyPath, k]);
          }
          return out;
        }

        return value;
      }

      const convertedJson = walk(json, []);
      const convertedText = JSON.stringify(convertedJson, null, 2) + '\n';
      if (raw === convertedText) continue;

      changedFiles += 1;
      if (!opts.dryRun) await fs.writeFile(absPath, convertedText, 'utf8');
      continue;
    }

    const raw = await fs.readFile(absPath, 'utf8');
    const converted = stabilize(raw);
    if (raw === converted) continue;

    changedFiles += 1;
    if (!opts.dryRun) await fs.writeFile(absPath, converted, 'utf8');
  }

  const label = opts.dryRun ? 'DRY RUN' : 'DONE';
  console.log(`✅ ${label}: converted Traditional -> Simplified`);
  console.log(`   changed files: ${changedFiles}/${files.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
