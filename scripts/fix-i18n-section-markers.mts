#!/usr/bin/env node
/**
 * Fix missing `<!-- i18n:section:* -->` markers for localized game markdown files.
 *
 * This script is designed to clear the baseline created by:
 * - scripts/validate-i18n-section-markers.mts
 *
 * Behavior:
 * - Reads the baseline file (default: `config/i18n/baselines/section-markers-baseline.json`)
 * - Groups missing marker entries by (slug, locale)
 * - Inserts missing markers at the best-effort position (usually right above the matching heading)
 * - Conservative by default: if multiple candidate headings exist for a section, it skips the insertion
 *
 * Flags:
 * - --dry-run: report only, do not write
 * - --offset N / --limit N: process a slice of (slug, locale) pairs (not entries)
 * - --locale <csv>: limit to locales, e.g. "fr,es"
 * - --slug <csv>: limit to slugs, e.g. "sprunki-abgerny,grow-a-garden"
 * - --no-conservative: pick the first candidate on ambiguity
 * - --baseline <path>: override baseline path
 * - --out <path>: write json report (default: tmp-i18n-section-markers-fix-report.json)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

type Locale = 'zh' | 'ja' | 'es' | 'fr' | 'de' | 'ko';
const ALL_LOCALES: Locale[] = ['zh', 'ja', 'es', 'fr', 'de', 'ko'];

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');
const KNOWN_SECTIONS = new Set(['introduction', 'how-to-play', 'rules', 'tips', 'controls', 'faq']);

const SECTION_MARKER_RE = /<!--\s*i18n:section:([a-z0-9-]+)\s*-->/i;
const HEADING_RE = /^(#{1,6})\s+/;

const DEFAULT_BASELINE_PATH = path.join(
  'config',
  'i18n',
  'baselines',
  'section-markers-baseline.json'
);

type BaselineEntry = { slug: string; locale: Locale; section: string };
type BaselineFile = { version?: string; updatedAt?: string; entries?: BaselineEntry[] };

type Options = {
  dryRun: boolean;
  conservative: boolean;
  offset: number;
  limit: number | null;
  locales: Locale[] | null;
  slugs: string[] | null;
  baselinePath: string;
  out: string;
};

type Pair = { slug: string; locale: Locale };

type PairResult = {
  slug: string;
  locale: Locale;
  file: string; // repo-relative
  changed: boolean;
  inserted: string[];
  skipped: Array<{ section: string; reason: string }>;
};

type Report = {
  generatedAt: string;
  options: Omit<Options, 'out'> & { out: string };
  summary: {
    totalBaselineEntries: number;
    totalPairs: number;
    processedPairs: number;
    changedPairs: number;
    skippedPairs: number;
    insertedMarkers: number;
  };
  pairs: PairResult[];
};

function parseCsv(value: string | null): string[] | null {
  if (!value) return null;
  const parts = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : null;
}

function parseArgs(argv: string[]): Options {
  const args = argv.slice(2);

  const dryRun = args.includes('--dry-run');
  const conservative = args.includes('--conservative') || !args.includes('--no-conservative');

  const offsetFlag = args.indexOf('--offset');
  const limitFlag = args.indexOf('--limit');
  const localeFlag = args.indexOf('--locale');
  const slugFlag = args.indexOf('--slug');
  const baselineFlag = args.indexOf('--baseline');
  const outFlag = args.indexOf('--out');

  const offset = offsetFlag >= 0 ? Number(args[offsetFlag + 1]) : 0;
  const limit = limitFlag >= 0 ? Number(args[limitFlag + 1]) : null;

  const localeRaw = localeFlag >= 0 ? String(args[localeFlag + 1] ?? '').trim() : '';
  const locales = (() => {
    const parsed = parseCsv(localeRaw);
    if (!parsed) return null;
    const filtered = parsed
      .map((x) => x.toLowerCase())
      .filter((x): x is Locale => ALL_LOCALES.includes(x as Locale));
    return filtered.length ? filtered : null;
  })();

  const slugs = (() => {
    const raw = slugFlag >= 0 ? String(args[slugFlag + 1] ?? '').trim() : '';
    return parseCsv(raw);
  })();

  const baselinePath =
    baselineFlag >= 0 ? String(args[baselineFlag + 1] ?? '').trim() : DEFAULT_BASELINE_PATH;

  const out = outFlag >= 0 ? String(args[outFlag + 1] ?? '').trim() : 'tmp-i18n-section-markers-fix-report.json';

  return {
    dryRun,
    conservative,
    offset: Number.isFinite(offset) && offset >= 0 ? offset : 0,
    limit: limit != null && Number.isFinite(limit) && limit > 0 ? limit : null,
    locales,
    slugs,
    baselinePath: baselinePath || DEFAULT_BASELINE_PATH,
    out: out || 'tmp-i18n-section-markers-fix-report.json',
  };
}

function stripHeadingText(rawLine: string): string {
  return rawLine
    .trim()
    .replace(/^#+\s+/, '')
    .replace(/[*_`]/g, '')
    .replace(/["']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findHeadingLines(lines: string[]): Array<{ index: number; level: number; text: string }> {
  const out: Array<{ index: number; level: number; text: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const m = HEADING_RE.exec(lines[i].trim());
    if (!m) continue;
    out.push({ index: i, level: m[1].length, text: stripHeadingText(lines[i]) });
  }
  return out;
}

function extractSectionMarkersInOrder(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const m = SECTION_MARKER_RE.exec(line);
    if (!m) continue;
    const name = (m[1] || '').toLowerCase();
    if (!KNOWN_SECTIONS.has(name)) continue;
    out.push(name);
  }
  return out;
}

function uniq(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of items) {
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

function hasMarker(lines: string[], section: string): boolean {
  const needle = `<!-- i18n:section:${section} -->`;
  return lines.some((l) => l.trim() === needle);
}

function firstNonEmptyIndex(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) return i;
  }
  return 0;
}

function classifyHeading(locale: Locale, text: string): string | null {
  const raw = text.trim();
  const t = raw.toLowerCase();

  if (t.includes('faq') || t.includes('frequently asked')) return 'faq';

  const includesAny = (patterns: Array<string | RegExp>): boolean =>
    patterns.some((p) => (typeof p === 'string' ? raw.includes(p) || t.includes(p.toLowerCase()) : p.test(raw)));

  const rulesByLocale: Record<Locale, Record<string, Array<string | RegExp>>> = {
    zh: {
      faq: ['常见问题', '常見問題', '问题解答', '問題解答', '常见问题解答', '常見問題解答', 'FAQ'],
      controls: ['操作指南', '操作方式', '操作方法', '按键', '键位', '控制', '操作'],
      'how-to-play': [
        '如何游玩',
        '怎么玩',
        '如何玩',
        '游玩方法',
        '游玩指南',
        '玩法指南',
        '玩法',
        '游戏玩法',
        '核心玩法',
        '游戏指南',
        '游戏玩法指南',
        '新手',
        '入门',
      ],
      rules: ['规则', '規則'],
      tips: ['技巧', '攻略', '策略', '小贴士', '提示', '心得', '解题', '解題'],
    },
    ja: {
      faq: ['よくある質問', 'FAQ'],
      controls: ['操作', '操作方法', '操作ガイド', 'コントロール', '操作手順'],
      'how-to-play': ['遊び方', 'プレイ方法', /プレイ.*方法/, '遊ぶ', 'やり方'],
      rules: ['ルール', '規則'],
      tips: ['ゲームプレイ', 'ゲームガイド', 'プレイガイド', 'コツ', 'ヒント', '攻略', '戦略', 'テクニック'],
    },
    es: {
      faq: ['preguntas frecuentes', 'faq'],
      controls: ['controles', 'guía de controles', 'guia de controles', 'guía de manejo', 'guia de manejo', 'manejo', 'control'],
      'how-to-play': [
        'cómo jugar',
        'como jugar',
        'cómo se juega',
        'como se juega',
        /c[oó]mo\s+(crear|hacer)\b/i,
        'modo de juego',
        'guía de juego',
        'guia de juego',
        'guía del juego',
        'guia del juego',
        'jugabilidad',
        'núcleo jugable',
        'nucleo jugable',
        'jugar',
      ],
      rules: ['reglas'],
      tips: ['consejos', 'estrategia', 'estrategias', 'trucos', 'tips', 'recorrido', 'walkthrough'],
    },
    fr: {
      faq: ['questions fréquentes', 'questions frequentes', 'foire aux questions', 'faq'],
      controls: ['commandes', 'guide d’utilisation', "guide d'utilisation", 'contrôles', 'controles', 'contrôle', 'controle'],
      'how-to-play': ['comment jouer', 'comment se joue', 'mode de jeu', 'guide de jeu', 'guide du jeu', 'jouer', 'gameplay'],
      rules: ['règles', 'regles'],
      tips: ['guide de jeu', 'types de mini-jeux', 'mini-jeux', 'astuces', 'conseils', 'stratégie', 'strategie', 'stratégies', 'strategies', 'tips'],
    },
    de: {
      faq: ['häufig gestellte fragen', 'haeufig gestellte fragen', 'häufige fragen', 'haeufige fragen', 'faq'],
      controls: ['steuerung', 'bedienung', 'kontrollen'],
      'how-to-play': [
        'wie spielt man',
        'wie spielst du',
        'so spielst du',
        'spielanleitung',
        'anleitung',
        'spielen',
        'gameplay',
        'ablauf',
        'grundregeln',
        'aufbau',
        'spielmodi',
        'beispiele',
        'lösungen',
        'loesungen',
      ],
      rules: ['regeln'],
      tips: ['tipps', 'strateg', 'tricks'],
    },
    ko: {
      faq: ['자주 묻는 질문', '자주하는 질문', 'faq'],
      controls: ['조작', '컨트롤', '조작법', '조작 방법'],
      'how-to-play': ['플레이 방법', '플레이 가이드', '플레이 흐름', '하는 법', '방법', '게임 방법', '게임 플레이', '게임플레이', 'gameplay'],
      rules: ['규칙'],
      tips: ['팁', '공략', '전략', '요령'],
    },
  };

  const rules = rulesByLocale[locale];
  if (includesAny(rules.faq ?? [])) return 'faq';
  if (includesAny(rules.controls ?? [])) return 'controls';
  if (includesAny(rules['how-to-play'] ?? [])) return 'how-to-play';
  if (includesAny(rules.rules ?? [])) return 'rules';
  if (includesAny(rules.tips ?? [])) return 'tips';

  return null;
}

function findSectionInsertIndex(
  lines: string[],
  headings: Array<{ index: number; level: number; text: string }>,
  locale: Locale,
  section: string,
  startAt: number,
  options: { conservative: boolean }
): { index: number | null; reason?: string } {
  if (section === 'introduction') {
    return { index: firstNonEmptyIndex(lines) };
  }

  const aliasesFor = (target: string): string[] => {
    if (target === 'tips') return ['how-to-play'];
    if (target === 'how-to-play') return ['tips', 'controls'];
    return [];
  };

  const primary = headings
    .filter((h) => h.index >= startAt)
    .filter((h) => classifyHeading(locale, h.text) === section)
    .map((h) => h.index);

  const candidates = (() => {
    if (primary.length > 0) return primary;
    const aliases = aliasesFor(section);
    if (aliases.length === 0) return primary;
    return headings
      .filter((h) => h.index >= startAt)
      .filter((h) => {
        const c = classifyHeading(locale, h.text);
        return c != null && aliases.includes(c);
      })
      .map((h) => h.index);
  })();

  if (candidates.length === 0) return { index: null, reason: `missing-heading:${section}` };
  if (candidates.length > 1 && options.conservative) return { index: null, reason: `ambiguous-heading:${section}` };
  return { index: candidates[0] };
}

function applySectionMarkersToLocale(
  contentLines: string[],
  locale: Locale,
  desiredOrder: string[],
  options: { conservative: boolean; onlySections?: Set<string> }
): { nextLines: string[]; inserted: string[]; skipped: Array<{ section: string; reason: string }> } {
  const inserted: string[] = [];
  const skipped: Array<{ section: string; reason: string }> = [];

  const headings = findHeadingLines(contentLines);
  const inserts: Array<{ index: number; line: string; section: string }> = [];

  let searchStart = 0;

  for (const section of desiredOrder) {
    if (!KNOWN_SECTIONS.has(section)) continue;
    if (options.onlySections && !options.onlySections.has(section)) continue;
    if (hasMarker(contentLines, section)) continue;

    const { index, reason } = findSectionInsertIndex(contentLines, headings, locale, section, searchStart, {
      conservative: options.conservative,
    });
    if (index == null) {
      skipped.push({ section, reason: reason || 'unknown' });
      continue;
    }

    inserts.push({ index, line: `<!-- i18n:section:${section} -->`, section });
    inserted.push(section);
    searchStart = index + 1;
  }

  const nextLines = contentLines.slice();
  for (const ins of inserts.sort((a, b) => b.index - a.index)) {
    const prev = ins.index - 1 >= 0 ? nextLines[ins.index - 1].trim() : '';
    if (prev === ins.line) continue;
    nextLines.splice(ins.index, 0, ins.line);
  }

  return { nextLines, inserted, skipped };
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function filterBaselineEntries(entries: BaselineEntry[], options: Options): BaselineEntry[] {
  let out = entries.filter((e) => e && typeof e.slug === 'string' && typeof e.locale === 'string' && typeof e.section === 'string');
  out = out.filter((e) => ALL_LOCALES.includes(e.locale));
  out = out.filter((e) => KNOWN_SECTIONS.has(e.section));

  if (options.locales) {
    const set = new Set(options.locales);
    out = out.filter((e) => set.has(e.locale));
  }
  if (options.slugs) {
    const set = new Set(options.slugs);
    out = out.filter((e) => set.has(e.slug));
  }
  return out;
}

function groupPairs(entries: BaselineEntry[]): Map<string, { pair: Pair; sections: Set<string> }> {
  const map = new Map<string, { pair: Pair; sections: Set<string> }>();
  for (const e of entries) {
    const key = `${e.locale}::${e.slug}`;
    const existing = map.get(key);
    if (existing) {
      existing.sections.add(e.section);
      continue;
    }
    map.set(key, { pair: { slug: e.slug, locale: e.locale }, sections: new Set([e.section]) });
  }
  return map;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv);
  const baseline = await readJson<BaselineFile>(options.baselinePath);
  const baselineEntries = filterBaselineEntries(Array.isArray(baseline.entries) ? baseline.entries : [], options);

  const grouped = groupPairs(baselineEntries);
  const pairs = Array.from(grouped.values())
    .map((v) => v.pair)
    .sort((a, b) => {
      const byLocale = a.locale.localeCompare(b.locale);
      if (byLocale !== 0) return byLocale;
      return a.slug.localeCompare(b.slug);
    });

  const slice = pairs.slice(options.offset, options.limit ? options.offset + options.limit : undefined);

  const results: PairResult[] = [];
  let changedPairs = 0;
  let skippedPairs = 0;
  let insertedMarkers = 0;

  for (const pair of slice) {
    const key = `${pair.locale}::${pair.slug}`;
    const sections = grouped.get(key)?.sections ?? new Set<string>();

    const enFile = `${pair.slug}.en.md`;
    const locFile = `${pair.slug}.${pair.locale}.md`;
    const enAbs = path.join(GAMES_DIR, enFile);
    const locAbs = path.join(GAMES_DIR, locFile);

    const enRaw = await fs.readFile(enAbs, 'utf8');
    const { content: enBody } = matter(enRaw);
    const desiredOrder = uniq(extractSectionMarkersInOrder(enBody.split(/\r?\n/)));

    const locRaw = await fs.readFile(locAbs, 'utf8');
    const parsed = matter(locRaw);
    const bodyLines = parsed.content.split(/\r?\n/);

    const beforeMarkers = uniq(extractSectionMarkersInOrder(bodyLines));
    const onlySections = new Set<string>(Array.from(sections.values()));

    const { nextLines, inserted, skipped } = applySectionMarkersToLocale(bodyLines, pair.locale, desiredOrder, {
      conservative: options.conservative,
      onlySections,
    });

    const afterMarkers = uniq(extractSectionMarkersInOrder(nextLines));
    const changed = inserted.length > 0 && nextLines.join('\n') !== bodyLines.join('\n');

    if (changed) {
      changedPairs += 1;
      insertedMarkers += inserted.length;
    }
    if (skipped.length > 0) skippedPairs += 1;

    results.push({
      slug: pair.slug,
      locale: pair.locale,
      file: path.join('src', 'content', 'games', locFile).replace(/\\/g, '/'),
      changed,
      inserted,
      skipped,
    });

    if (!changed || options.dryRun) continue;

    const nextContent = matter.stringify(nextLines.join('\n'), parsed.data);
    await fs.writeFile(locAbs, nextContent, 'utf8');

    // Sanity: ensure we did not remove existing markers (only insert).
    // This is a runtime assert; if it fails, we prefer a hard failure over silent drift.
    for (const m of beforeMarkers) {
      if (!afterMarkers.includes(m)) {
        throw new Error(`Unexpected marker removal in ${locFile}: missing ${m} after rewrite`);
      }
    }
  }

  const report: Report = {
    generatedAt: new Date().toISOString(),
    options: { ...options, out: options.out },
    summary: {
      totalBaselineEntries: baselineEntries.length,
      totalPairs: pairs.length,
      processedPairs: slice.length,
      changedPairs,
      skippedPairs,
      insertedMarkers,
    },
    pairs: results,
  };

  await writeJson(options.out, report);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧩 Fix Missing i18n Section Markers');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`Baseline: ${options.baselinePath}`);
  console.log(`Report: ${options.out}`);
  console.log(`Mode: ${options.dryRun ? 'dry-run' : 'write'}; conservative=${options.conservative}`);
  console.log(`Scope pairs: total=${pairs.length} processed=${slice.length} offset=${options.offset} limit=${options.limit ?? '∞'}`);
  console.log(`Results: changedPairs=${changedPairs} skippedPairs=${skippedPairs} insertedMarkers=${insertedMarkers}`);

  if (skippedPairs > 0) {
    const skipped = results.filter((r) => r.skipped.length > 0).slice(0, 20);
    console.log('\nSkipped samples (up to 20):');
    for (const r of skipped) {
      for (const s of r.skipped) {
        console.log(`- [${r.locale}] ${r.slug}: ${s.section} (${s.reason})`);
      }
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
