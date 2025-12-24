#!/usr/bin/env node
/**
 * Normalize zh-CN wording in zh game markdown files.
 *
 * Purpose:
 * - 修复简体中文页面中“偏港台用词”（多由繁体/港台译法转写而来）
 * - 对齐平台风格与术语表（docs/i18n/GLOSSARY.zh.md）
 *
 * Scope:
 * - src/content/games/*.zh.md
 * - src/pages/zh 下所有 .astro（递归）
 * - src/components 下所有 *.zh.astro（递归）
 * - src/i18n/zh.json
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const PAGES_ZH_DIR = path.join(process.cwd(), 'src', 'pages', 'zh');
const COMPONENTS_DIR = path.join(process.cwd(), 'src', 'components');
const I18N_ZH_JSON = path.join(process.cwd(), 'src', 'i18n', 'zh.json');

type ReplaceKey =
  | 'benjuGame'
  | 'benju'
  | 'touguo'
  | 'yizhao'
  | 'huashu'
  | 'tuoye'
  | 'yingmu'
  | 'mobileDevice'
  | 'audio';

const REPLACEMENTS: Array<{ key: ReplaceKey; re: RegExp; to: string; label: string }> = [
  { key: 'benjuGame', re: /本局游戏/g, to: '这一局', label: '本局游戏→这一局' },
  { key: 'benju', re: /本局/g, to: '这一局', label: '本局→这一局' },
  { key: 'touguo', re: /透过/g, to: '通过', label: '透过→通过' },
  { key: 'yizhao', re: /依照/g, to: '按照', label: '依照→按照' },
  { key: 'huashu', re: /滑鼠/g, to: '鼠标', label: '滑鼠→鼠标' },
  { key: 'tuoye', re: /拖曳/g, to: '拖拽', label: '拖曳→拖拽' },
  { key: 'yingmu', re: /萤幕/g, to: '屏幕', label: '萤幕→屏幕' },
  { key: 'mobileDevice', re: /行动装置/g, to: '移动设备', label: '行动装置→移动设备' },
  { key: 'audio', re: /音讯/g, to: '音频', label: '音讯→音频' },
];

function countMatches(re: RegExp, s: string): number {
  const m = s.match(re);
  return m ? m.length : 0;
}

function applyReplacements(input: string): { output: string; counts: Record<ReplaceKey, number> } {
  const counts = {
    benjuGame: 0,
    benju: 0,
    touguo: 0,
    yizhao: 0,
    huashu: 0,
    tuoye: 0,
    yingmu: 0,
    mobileDevice: 0,
    audio: 0,
  } satisfies Record<ReplaceKey, number>;

  let out = input;
  for (const r of REPLACEMENTS) {
    const n = countMatches(r.re, out);
    if (n <= 0) continue;
    counts[r.key] += n;
    out = out.replace(r.re, r.to);
  }

  return { output: out, counts };
}

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
Normalize zh-CN wording (港台用词统一)

Usage:
  tsx scripts/fix-i18n-zh-cn-wording.mts [options]

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

  const gameAbs = (await fs.readdir(GAMES_DIR))
    .filter((f) => f.endsWith('.zh.md'))
    .sort((a, b) => a.localeCompare(b))
    .map((f) => path.join(GAMES_DIR, f));

  const pageAbs = await walkFilesRecursive(
    PAGES_ZH_DIR,
    (rel) => rel.startsWith('src/pages/zh/') && rel.endsWith('.astro')
  );
  const componentAbs = await walkFilesRecursive(
    COMPONENTS_DIR,
    (rel) => rel.startsWith('src/components/') && rel.endsWith('.zh.astro')
  );
  const hasI18n = await fileExists(I18N_ZH_JSON);

  const absFiles = [...gameAbs, ...pageAbs, ...componentAbs, ...(hasI18n ? [I18N_ZH_JSON] : [])]
    .map((absPath) => ({ absPath, relPath: path.relative(process.cwd(), absPath).replace(/\\/g, '/') }))
    .sort((a, b) => a.relPath.localeCompare(b.relPath))
    .slice(0, opts.maxFiles);

  let changedFiles = 0;
  const totals: Record<ReplaceKey, number> = {
    benjuGame: 0,
    benju: 0,
    touguo: 0,
    yizhao: 0,
    huashu: 0,
    tuoye: 0,
    yingmu: 0,
    mobileDevice: 0,
    audio: 0,
  };

  for (const f of absFiles) {
    const absPath = f.absPath;
    const raw = await fs.readFile(absPath, 'utf8');
    const { output, counts } = applyReplacements(raw);
    if (output === raw) continue;

    changedFiles += 1;
    for (const k of Object.keys(totals) as ReplaceKey[]) {
      totals[k] += counts[k];
    }

    if (!opts.dryRun) await fs.writeFile(absPath, output, 'utf8');
  }

  const label = opts.dryRun ? 'DRY RUN' : 'DONE';
  console.log(`✅ ${label}: normalized zh-CN wording`);
  console.log(`   changed files: ${changedFiles}/${absFiles.length}`);
  for (const r of REPLACEMENTS) {
    console.log(`   - ${r.label}: ${totals[r.key]}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
