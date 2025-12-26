#!/usr/bin/env node
/**
 * Apply terminology normalization rules for non-English locales.
 *
 * Rules source (per locale):
 * - docs/i18n/terminology.{locale}.json
 *
 * Scope (per locale):
  * - src/content/games/*.{locale}.md (frontmatter title/description + body text)
 * - src/pages/{locale} 下所有 .astro（递归，跳过 Astro frontmatter）
 * - src/components 下所有 *.{locale}.astro（递归，跳过 Astro frontmatter）
 * - src/i18n/{locale}.json (JSON values only)
 */

import fs from 'node:fs/promises';
import path from 'node:path';

type Locale = 'ja' | 'ko' | 'es' | 'fr' | 'de';
const DEFAULT_LOCALES: Locale[] = ['ja', 'ko', 'es', 'fr', 'de'];

type RuleKind = 'plain' | 'regex';

interface TerminologyRule {
  id: string;
  kind: RuleKind;
  from: string;
  to?: string;
  flags?: string;
}

interface RuleFile {
  locale: Locale;
  version: number;
  rules: TerminologyRule[];
}

const RULES_DIR = path.join(process.cwd(), 'docs', 'i18n');
const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const PAGES_DIR = path.join(process.cwd(), 'src', 'pages');
const COMPONENTS_DIR = path.join(process.cwd(), 'src', 'components');
const I18N_DIR = path.join(process.cwd(), 'src', 'i18n');

function stripBom(s: string): string {
  return s.replace(/^\uFEFF/, '');
}

function findFrontmatterEnd(lines: string[]): number {
  if (lines.length === 0) return 0;
  const first = stripBom(lines[0]).trim();
  if (first !== '---') return 0;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return i + 1;
  }
  return 0;
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

  out.sort((a, b) => a.localeCompare(b));
  return out;
}

function ensureGlobalFlags(flags: string | undefined): string {
  const f = flags ?? 'g';
  return f.includes('g') ? f : `${f}g`;
}

type CompiledRule =
  | { id: string; kind: 'plain'; from: string; to: string }
  | { id: string; kind: 'regex'; re: RegExp; to: string };

function compileFixRules(rules: TerminologyRule[]): CompiledRule[] {
  const out: CompiledRule[] = [];
  for (const r of rules) {
    if (!r.to) continue;
    if (r.kind === 'plain') {
      out.push({ id: r.id, kind: 'plain', from: r.from, to: r.to });
    } else {
      const flags = ensureGlobalFlags(r.flags);
      out.push({ id: r.id, kind: 'regex', re: new RegExp(r.from, flags), to: r.to });
    }
  }
  return out;
}

function countPlain(needle: string, haystack: string): number {
  if (!needle) return 0;
  let idx = 0;
  let count = 0;
  while (true) {
    const hit = haystack.indexOf(needle, idx);
    if (hit < 0) break;
    count += 1;
    idx = hit + needle.length;
  }
  return count;
}

function countRule(rule: CompiledRule, text: string): number {
  if (!text) return 0;
  if (rule.kind === 'plain') return countPlain(rule.from, text);
  const m = text.match(rule.re);
  return m ? m.length : 0;
}

function applyRule(rule: CompiledRule, text: string): string {
  if (!text) return text;
  if (rule.kind === 'plain') return text.split(rule.from).join(rule.to);
  return text.replace(rule.re, rule.to);
}

function applyRules(text: string, rules: CompiledRule[], totals: Record<string, number>): string {
  let out = text;
  for (const r of rules) {
    const n = countRule(r, out);
    if (n <= 0) continue;
    totals[r.id] = (totals[r.id] ?? 0) + n;
    out = applyRule(r, out);
  }
  return out;
}

function applyToLinePreservingInlineCode(
  line: string,
  rules: CompiledRule[],
  totals: Record<string, number>
): string {
  const parts = line.split(/(`+)/);
  let inCode = false;
  let out = '';
  for (const p of parts) {
    if (p.startsWith('`')) {
      inCode = !inCode;
      out += p;
      continue;
    }
    out += inCode ? p : applyRules(p, rules, totals);
  }
  return out;
}

function fixMarkdown(raw: string, rules: CompiledRule[], totals: Record<string, number>): string {
  const lines = raw.split(/\r?\n/);
  const fmEnd = findFrontmatterEnd(lines);
  if (fmEnd <= 0) {
    return fixMarkdownBody(lines, 0, rules, totals).join('\n');
  }

  const out = lines.slice();
  const fmLines = out.slice(0, fmEnd);

  let inDescBlock = false;
  let descIndent: string | null = null;

  for (let i = 0; i < fmLines.length; i++) {
    const line = fmLines[i];
    if (line.trim() === '---') continue;

    const titleMatch = /^(\s*title\s*:\s*)(.+?)\s*$/.exec(line);
    if (titleMatch) {
      const prefix = titleMatch[1] ?? '';
      const value = titleMatch[2] ?? '';
      fmLines[i] = `${prefix}${applyRules(value, rules, totals)}`;
      continue;
    }

    const descMatch = /^(\s*description\s*:\s*)(.*)\s*$/.exec(line);
    if (descMatch) {
      const prefix = descMatch[1] ?? '';
      const rest = (descMatch[2] ?? '').trim();
      if (!rest) continue;

      const isBlock = /^[>|]/.test(rest);
      if (!isBlock) {
        const fixed = applyRules(rest, rules, totals);
        fmLines[i] = `${prefix}${fixed}`;
        continue;
      }

      inDescBlock = true;
      descIndent = null;
      continue;
    }

    if (inDescBlock) {
      if (line.trim() === '---') {
        inDescBlock = false;
        descIndent = null;
        continue;
      }

      if (descIndent === null) {
        const m = /^(\s+)\S/.exec(line);
        if (!m) {
          if (line.trim() === '') continue;
          inDescBlock = false;
          continue;
        }
        descIndent = m[1];
      }

      if (!line.startsWith(descIndent)) {
        inDescBlock = false;
        descIndent = null;
        continue;
      }

      fmLines[i] = applyRules(line, rules, totals);
    }
  }

  const bodyFixed = fixMarkdownBody(out.slice(fmEnd), fmEnd, rules, totals);
  return [...fmLines, ...bodyFixed].join('\n');
}

function fixMarkdownBody(
  bodyLines: string[],
  lineOffset: number,
  rules: CompiledRule[],
  totals: Record<string, number>
): string[] {
  const out = bodyLines.slice();
  let inCodeFence = false;

  for (let i = 0; i < out.length; i++) {
    const line = out[i];
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const fixed = applyToLinePreservingInlineCode(line, rules, totals);
    if (fixed !== line) out[i] = fixed;
  }

  return out;
}

function fixAstro(raw: string, rules: CompiledRule[], totals: Record<string, number>): string {
  const lines = raw.split(/\r?\n/);
  const fmEnd = findFrontmatterEnd(lines);
  const out = lines.slice();

  const start = fmEnd > 0 ? fmEnd : 0;
  for (let i = start; i < out.length; i++) {
    const line = out[i];
    const fixed = applyRules(line, rules, totals);
    if (fixed !== line) out[i] = fixed;
  }

  return out.join('\n');
}

function fixJson(raw: string, rules: CompiledRule[], totals: Record<string, number>): string {
  const cleaned = stripBom(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return applyRules(raw, rules, totals);
  }

  function walk(v: unknown): unknown {
    if (typeof v === 'string') return applyRules(v, rules, totals);
    if (Array.isArray(v)) return v.map((x) => walk(x));
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      for (const k of Object.keys(o)) o[k] = walk(o[k]);
      return o;
    }
    return v;
  }

  const fixed = walk(parsed);
  return JSON.stringify(fixed, null, 2) + '\n';
}

async function loadRuleFile(locale: Locale): Promise<RuleFile> {
  const abs = path.join(RULES_DIR, `terminology.${locale}.json`);
  const raw = await fs.readFile(abs, 'utf8');
  const parsed = JSON.parse(raw) as RuleFile;
  if (!parsed || parsed.locale !== locale || !Array.isArray(parsed.rules)) {
    throw new Error(`Invalid terminology rules file: ${abs}`);
  }
  return parsed;
}

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const opts = {
    locales: DEFAULT_LOCALES as Locale[],
    dryRun: false,
    maxFiles: Infinity as number,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--locales' && args[i + 1]) {
      const raw = args[++i];
      const parts = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) as Locale[];
      const unique = Array.from(new Set(parts)).filter((x) => DEFAULT_LOCALES.includes(x));
      if (unique.length > 0) opts.locales = unique;
    } else if (a === '--dry-run') {
      opts.dryRun = true;
    } else if (a === '--max-files' && args[i + 1]) {
      const n = Number(args[++i]);
      if (Number.isFinite(n) && n > 0) opts.maxFiles = Math.floor(n);
    } else if (a === '--help' || a === '-h') {
      console.log(`
Fix other locales terminology

Usage:
  tsx scripts/fix-i18n-terminology.mts [options]

Options:
  --locales <a,b,c>        Locales to fix (default: ${DEFAULT_LOCALES.join(',')})
  --dry-run                Do not write files, just print summary
  --max-files <n>          Limit how many files to process (debug)
`);
      process.exit(0);
    }
  }

  return opts;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);

  let changedFiles = 0;
  const totalsByRule: Record<string, number> = {};

  for (const locale of opts.locales) {
    const rf = await loadRuleFile(locale);
    const rules = compileFixRules(rf.rules ?? []);
    if (rules.length === 0) continue;

    const gameAbs = (await fs.readdir(GAMES_DIR))
      .filter((f) => f.endsWith(`.${locale}.md`))
      .sort((a, b) => a.localeCompare(b))
      .map((f) => path.join(GAMES_DIR, f));

    const pageAbs = await walkFilesRecursive(
      path.join(PAGES_DIR, locale),
      (rel) => rel.startsWith(`src/pages/${locale}/`) && rel.endsWith('.astro')
    );

    const componentAbs = await walkFilesRecursive(
      COMPONENTS_DIR,
      (rel) => rel.startsWith('src/components/') && rel.endsWith(`.${locale}.astro`)
    );

    const localeJsonAbs = path.join(I18N_DIR, `${locale}.json`);
    const hasLocaleJson = await fileExists(localeJsonAbs);

    const absFiles = [...gameAbs, ...pageAbs, ...componentAbs, ...(hasLocaleJson ? [localeJsonAbs] : [])]
      .slice(0, opts.maxFiles);

    for (const absPath of absFiles) {
      const relPath = path.relative(process.cwd(), absPath).replace(/\\/g, '/');
      const raw = await fs.readFile(absPath, 'utf8');

      let fixed = raw;
      if (relPath.endsWith('.md')) fixed = fixMarkdown(raw, rules, totalsByRule);
      else if (relPath.endsWith('.astro')) fixed = fixAstro(raw, rules, totalsByRule);
      else if (relPath.endsWith('.json')) fixed = fixJson(raw, rules, totalsByRule);

      if (fixed === raw) continue;
      changedFiles += 1;
      if (!opts.dryRun) await fs.writeFile(absPath, fixed, 'utf8');
    }
  }

  const label = opts.dryRun ? 'DRY RUN' : 'DONE';
  console.log(`✅ ${label}: terminology normalized`);
  console.log(`   changed files: ${changedFiles}`);
  const ids = Object.keys(totalsByRule).sort((a, b) => a.localeCompare(b));
  for (const id of ids) console.log(`   - ${id}: ${totalsByRule[id]}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
