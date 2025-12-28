#!/usr/bin/env node
/**
 * Align localized game pages (src/content/games/<slug>.<locale>.md) to canonical English
 * hardpoints (src/content/games/<slug>.en.md).
 *
 * Hardpoints aligned (v1):
 * - frontmatter iframeSrc (copy from English)
 * - section markers (mirror English marker set/order where possible)
 * - FAQ ID sequence (mirror English; inserted as HTML comments inside FAQ section)
 * - controls key token set (mirror English; extracted from inlineCode inside controls section)
 * - numbers token multiset (best-effort normalization of localized unit spellings to match English tokens)
 *
 * Notes:
 * - This script is designed to be reviewable: supports --offset/--limit batching.
 * - It is conservative by default (skips ambiguous insertion points) and reports skipped files.
 * - Missing Controls/FAQ in English is treated as empty: locales MUST NOT introduce tokens/IDs.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { extractHardpointsFromMarkdown } from './extract-i18n-hardpoints.mts';
import { diffHardpoints, type DiffItem } from './report-i18n-hardpoints-diff.mts';
import { parseFaqIdFromHtmlComment } from './lib/faq-id-generator.mts';

const GAMES_DIR = path.join(process.cwd(), 'src', 'content', 'games');

const KNOWN_SECTIONS = new Set(['introduction', 'how-to-play', 'rules', 'tips', 'controls', 'faq']);
const ALLOWED_NUMBER_SECTIONS = new Set(['how-to-play', 'rules', 'tips']);

const SECTION_MARKER_RE = /<!--\s*i18n:section:([a-z0-9-]+)\s*-->/i;
const FAQ_ID_STANDALONE_RE = /<!--\s*i18n:faq:id\s*=\s*([a-z0-9][a-z0-9:._-]*)\s*-->/i;
const HEADING_RE = /^(#{1,6})\s+/;

type TargetLocale = 'zh' | 'ja' | 'es' | 'fr' | 'de' | 'ko';

type Options = {
  apply: boolean;
  conservative: boolean;
  trimFaqExtras: boolean;
  offset: number;
  limit: number | null;
  locales: TargetLocale[];
  slugs: string[] | null;
  out: string | null;
};

type PairResult = {
  slug: string;
  locale: TargetLocale;
  englishFile: string;
  localizedFile: string;
  changed: boolean;
  changes: {
    frontmatter: { syncedKeys: string[] };
    insertedSectionMarkers: string[];
    updatedFaqIds: { inserted: number; removed: number; expected: number; foundQuestions: number | null };
    controls: { updated: boolean; expectedTokens: number };
    numbers: { changed: boolean };
  };
  skippedReasons: string[];
  diffsAfter: DiffItem[];
};

type Report = {
  generatedAt: string;
  scope: string;
  options: Omit<Options, 'out'>;
  summary: {
    totalEnglish: number;
    scannedEnglish: number;
    processedPairs: number;
    changedPairs: number;
    missingLocalized: number;
    skippedPairs: number;
    mismatchedPairsAfter: number;
    byLocale: Record<string, { processed: number; changed: number; skipped: number; missing: number; mismatchedAfter: number }>;
  };
  pairs: PairResult[];
};

function stripBom(s: string): string {
  return s.replace(/^\uFEFF/, '');
}

function normalizeFullwidthDigits(s: string): string {
  return s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xff10 + 0x30));
}

function findFrontmatterEnd(lines: string[]): number {
  if (!lines.length) return 0;
  const first = stripBom(lines[0]).trim();
  if (first !== '---') return 0;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return i + 1;
  }
  return 0;
}

function parseArgs(argv: string[]): Options {
  const args = argv.slice(2);

  const apply = args.includes('--apply');
  const conservative = args.includes('--conservative') || !args.includes('--no-conservative');
  const trimFaqExtras = args.includes('--trim-faq-extras');

  const offsetFlag = args.indexOf('--offset');
  const limitFlag = args.indexOf('--limit');
  const localeFlag = args.indexOf('--locale');
  const slugFlag = args.indexOf('--slug');
  const outFlag = args.indexOf('--out');

  const offset = offsetFlag >= 0 ? Number(args[offsetFlag + 1]) : 0;
  const limit = limitFlag >= 0 ? Number(args[limitFlag + 1]) : null;

  const localeRaw = localeFlag >= 0 ? String(args[localeFlag + 1] ?? '').trim() : 'all';
  const locales = (() => {
    const all: TargetLocale[] = ['zh', 'ja', 'es', 'fr', 'de', 'ko'];
    if (!localeRaw || localeRaw === 'all') return all;
    const parts = localeRaw.split(',').map((s) => s.trim()).filter(Boolean);
    const filtered = parts.filter((p): p is TargetLocale => all.includes(p as TargetLocale));
    return filtered.length ? filtered : all;
  })();

  const slugs = (() => {
    if (slugFlag < 0) return null;
    const value = String(args[slugFlag + 1] ?? '').trim();
    if (!value) return null;
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  })();

  const out = outFlag >= 0 ? String(args[outFlag + 1] ?? '').trim() : null;

  return {
    apply,
    conservative,
    trimFaqExtras,
    offset: Number.isFinite(offset) && offset >= 0 ? offset : 0,
    limit: limit != null && Number.isFinite(limit) && limit > 0 ? limit : null,
    locales,
    slugs,
    out: out || null,
  };
}

function stripHeadingText(raw: string): string {
  return raw
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
    const line = lines[i];
    const m = HEADING_RE.exec(line.trim());
    if (!m) continue;
    out.push({ index: i, level: m[1].length, text: stripHeadingText(line) });
  }
  return out;
}

function extractSectionMarkersInOrder(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const m = SECTION_MARKER_RE.exec(line);
    if (!m) continue;
    const name = m[1].toLowerCase();
    if (!KNOWN_SECTIONS.has(name)) continue;
    out.push(name);
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

function classifyHeading(locale: TargetLocale, text: string): string | null {
  const raw = text.trim();
  const t = raw.toLowerCase();

  // Fast common cases across locales
  if (t.includes('faq') || t.includes('frequently asked')) return 'faq';

  const includesAny = (patterns: Array<string | RegExp>): boolean =>
    patterns.some((p) => (typeof p === 'string' ? raw.includes(p) || t.includes(p.toLowerCase()) : p.test(raw)));

  const rulesByLocale: Record<TargetLocale, Record<string, Array<string | RegExp>>> = {
    zh: {
      faq: ['常见问题', '常見問題', '问题解答', '問題解答', '常见问题解答', '常見問題解答', 'FAQ'],
      controls: ['操作指南', '操作方式', '操作方法', '按键', '键位', '控制', '操作'],
      'how-to-play': ['如何游玩', '怎么玩', '如何玩', '游玩方法', '游玩指南', '新手', '入门'],
      rules: ['规则', '規則'],
      tips: ['技巧', '攻略', '策略', '小贴士', '提示', '心得', '解题', '解題'],
    },
    ja: {
      faq: ['よくある質問', 'FAQ'],
      controls: ['操作', '操作方法', '操作ガイド', 'コントロール', '操作手順'],
      'how-to-play': ['遊び方', 'プレイ方法', /プレイ.*方法/, '遊ぶ', 'やり方'],
      rules: ['ルール', '規則'],
      tips: ['ゲームプレイ', 'コツ', 'ヒント', '攻略', '戦略', 'テクニック'],
    },
    es: {
      faq: ['preguntas frecuentes', 'faq'],
      controls: ['controles', 'guía de controles', 'control'],
      'how-to-play': ['cómo jugar', 'como jugar', 'cómo se juega', 'como se juega', 'modo de juego', 'jugar'],
      rules: ['reglas'],
      tips: ['consejos', 'estrategia', 'estrategias', 'trucos', 'tips'],
    },
    fr: {
      faq: ['questions fréquentes', 'questions frequentes', 'faq'],
      controls: ['commandes', 'contrôles', 'controles', 'contrôle', 'controle'],
      'how-to-play': ['comment jouer', 'mode de jeu', 'jouer'],
      rules: ['règles', 'regles'],
      tips: ['astuces', 'conseils', 'stratégie', 'strategie', 'stratégies', 'strategies', 'tips'],
    },
    de: {
      faq: ['häufig gestellte fragen', 'haeufig gestellte fragen', 'faq'],
      controls: ['steuerung', 'bedienung', 'kontrollen'],
      'how-to-play': ['wie spielt man', 'so spielst du', 'spielanleitung', 'anleitung', 'spielen'],
      rules: ['regeln'],
      tips: ['tipps', 'strateg', 'tricks'],
    },
    ko: {
      faq: ['자주 묻는 질문', '자주하는 질문', 'faq'],
      controls: ['조작', '컨트롤', '조작법', '조작 방법'],
      'how-to-play': ['플레이 방법', '하는 법', '방법', '게임 방법'],
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

  // Introduction is intentionally not relied upon for insertion (we use top-of-file fallback).
  return null;
}

function findSectionInsertIndex(
  lines: string[],
  headings: Array<{ index: number; level: number; text: string }>,
  locale: TargetLocale,
  section: string,
  startAt: number,
  options: { conservative: boolean }
): { index: number | null; reason?: string } {
  if (section === 'introduction') {
    return { index: firstNonEmptyIndex(lines) };
  }

  const aliasesFor = (target: string): string[] => {
    // Some templates use "Gameplay Guide" under tips in English, while locales may translate it
    // closer to "How to Play". Use a conservative fallback mapping to reduce skipped insertions.
    if (target === 'tips') return ['how-to-play'];
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
  locale: TargetLocale,
  desiredOrder: string[],
  options: { conservative: boolean }
): { nextLines: string[]; inserted: string[]; skippedReasons: string[] } {
  const inserted: string[] = [];
  const skippedReasons: string[] = [];

  const headings = findHeadingLines(contentLines);
  const inserts: Array<{ index: number; line: string; section: string }> = [];

  let searchStart = 0;

  for (const section of desiredOrder) {
    if (!KNOWN_SECTIONS.has(section)) continue;
    if (hasMarker(contentLines, section)) continue;

    const { index, reason } = findSectionInsertIndex(
      contentLines,
      headings,
      locale,
      section,
      searchStart,
      { conservative: options.conservative }
    );
    if (index == null) {
      if (reason) skippedReasons.push(reason);
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

  return { nextLines, inserted, skippedReasons };
}

function isStandaloneFaqIdLine(line: string): boolean {
  const t = line.trim();
  if (!t.startsWith('<!--') || !t.endsWith('-->')) return false;
  return Boolean(parseFaqIdFromHtmlComment(t));
}

function findNextSectionMarkerIndex(lines: string[], startExclusive: number): number {
  for (let i = startExclusive + 1; i < lines.length; i++) {
    const m = SECTION_MARKER_RE.exec(lines[i]);
    if (!m) continue;
    const name = m[1].toLowerCase();
    if (!KNOWN_SECTIONS.has(name)) continue;
    return i;
  }
  return lines.length;
}

function findMarkerIndex(lines: string[], section: string): number | null {
  const needle = `<!-- i18n:section:${section} -->`;
  const idx = lines.findIndex((l) => l.trim() === needle);
  return idx >= 0 ? idx : null;
}

function looksLikeFaqQuestionLine(locale: TargetLocale, line: string): boolean {
  if (line == null) return false;
  const raw = line;
  const t = raw.trim();
  if (!t) return false;
  const leadingSpaces = /^(\s*)/.exec(raw)?.[1]?.length ?? 0;
  const lower = t.toLowerCase();

  const looksBold = t.startsWith('**') && t.includes('**');
  const looksList = /^[-*+]\s+/.test(t);

  // Nested list items inside FAQ sections are overwhelmingly answer blocks or lists within answers.
  // Treat only top-level list items as candidate questions.
  if (looksList && leadingSpaces > 0) return false;

  // Accept plain Q-lines (not necessarily bold/list) when they clearly start with a question prefix.
  // This helps avoid "foundQuestions < expected" caused by formatting variance.
  const normalizedStart = (() => {
    // Strip list marker, then strip leading bold markers.
    let s = t.replace(/^[-*+]\s+/, '').trim();
    s = s.replace(/^\*\*/, '').trim();
    // Normalize common bold label forms like "A:** ..." / "R:** ..." to "A: ..." / "R: ...".
    s = s.replace(/^([a-z])\s*[:：]\s*\*\*/i, '$1:');
    return s;
  })();

  // Exclude obvious answers (including list/bold variants).
  const normalizedLower = normalizedStart.toLowerCase();
  if (
    /^([ar])[:：]/.test(normalizedLower) ||
    normalizedLower.startsWith('answer') ||
    normalizedLower.startsWith('respuesta') ||
    normalizedLower.startsWith('réponse') ||
    normalizedLower.startsWith('reponse') ||
    normalizedLower.startsWith('antwort')
  )
    return false;
  if (/^(答|답)[:：]/.test(normalizedStart)) return false;

  if (/^q[:：]/i.test(normalizedStart)) return true;
  if (locale === 'zh' && /^(问|問)：/.test(normalizedStart)) return true;
  if (locale === 'ja' && /^質問/.test(normalizedStart)) return true;
  if (locale === 'ko' && /^질문/.test(normalizedStart)) return true;

  const hasQPrefix = (() => {
    if (lower.includes('**q:') || lower.includes('**q：') || lower.startsWith('q:')) return true;
    if (locale === 'zh' && (t.includes('问：') || t.includes('問：') || t.includes('**问：') || t.includes('**問：'))) return true;
    if (locale === 'ja' && (t.includes('質問') || t.includes('Q：') || t.includes('Q:'))) return true;
    if (locale === 'ko' && (t.includes('질문') || t.includes('Q:') || t.includes('Q：'))) return true;
    if (locale === 'es' && (lower.includes('pregunta') || t.includes('¿') || t.includes('?'))) return true;
    if (locale === 'fr' && (lower.includes('question') || t.includes('?'))) return true;
    if (locale === 'de' && (lower.includes('frage') || t.includes('?'))) return true;
    return false;
  })();

  const hasQuestionMark = t.includes('?') || t.includes('？');

  // Another common FAQ format: bold paragraph lines, often numbered ("**1. ...**").
  if (looksBold && /^\d+[\).]/.test(normalizedStart)) return true;

  if (looksBold && (hasQPrefix || hasQuestionMark)) return true;
  if (looksList && (hasQPrefix || hasQuestionMark)) return true;
  if (hasQPrefix && (looksBold || looksList)) return true;
  return false;
}

function applyFaqIdsToLocale(
  contentLines: string[],
  locale: TargetLocale,
  expectedIds: string[],
  options: { trimFaqExtras: boolean }
): { nextLines: string[]; inserted: number; removed: number; foundQuestions: number | null; skippedReasons: string[] } {
  const skippedReasons: string[] = [];
  const nextLines = contentLines.slice();

  const markerIndex = findMarkerIndex(nextLines, 'faq');
  if (markerIndex == null) {
    skippedReasons.push('missing-faq-marker');
    return { nextLines, inserted: 0, removed: 0, foundQuestions: null, skippedReasons };
  }

  const end = findNextSectionMarkerIndex(nextLines, markerIndex);

  // Remove existing standalone FAQ IDs inside the FAQ section so we can re-apply by position.
  let removed = 0;
  for (let i = end - 1; i > markerIndex; i--) {
    if (!isStandaloneFaqIdLine(nextLines[i])) continue;
    nextLines.splice(i, 1);
    removed++;
  }

  const endAfter = findNextSectionMarkerIndex(nextLines, markerIndex);

  const looksLikeFaqQuestionLineRelaxed = (line: string): boolean => {
    if (looksLikeFaqQuestionLine(locale, line)) return true;
    if (line == null) return false;
    const raw = line;
    const t = raw.trim();
    if (!t) return false;

    const leadingSpaces = /^(\s*)/.exec(raw)?.[1]?.length ?? 0;
    if (leadingSpaces !== 0) return false;
    if (!/^[-*+]\s+/.test(t)) return false;

    // Exclude obvious answers (including list/bold variants).
    const normalizedStart = (() => {
      // Strip list marker, then strip leading bold markers.
      let s = t.replace(/^[-*+]\s+/, '').trim();
      s = s.replace(/^\*\*/, '').trim();
      s = s.replace(/^([a-z])\s*[:：]\s*\*\*/i, '$1:');
      return s;
    })();

    const normalizedLower = normalizedStart.toLowerCase();
    if (
      /^([ar])[:：]/.test(normalizedLower) ||
      normalizedLower.startsWith('answer') ||
      normalizedLower.startsWith('respuesta') ||
      normalizedLower.startsWith('réponse') ||
      normalizedLower.startsWith('reponse') ||
      normalizedLower.startsWith('antwort')
    )
      return false;
    if (/^(答|답)[:：]/.test(normalizedStart)) return false;

    return true;
  };

  const scanQuestionLineIndices = (mode: 'strict' | 'relaxed'): number[] => {
    const out: number[] = [];
    const end = findNextSectionMarkerIndex(nextLines, markerIndex);
    for (let i = markerIndex + 1; i < end; i++) {
      const ok = mode === 'strict' ? looksLikeFaqQuestionLine(locale, nextLines[i]) : looksLikeFaqQuestionLineRelaxed(nextLines[i]);
      if (ok) out.push(i);
    }
    return out;
  };

  // Re-scan question lines after removals.
  let questionLineIndices = scanQuestionLineIndices('strict');

  if (questionLineIndices.length !== expectedIds.length) {
    if (options.trimFaqExtras && questionLineIndices.length > expectedIds.length) {
      // Trim extra FAQ entries beyond expected count (English is canonical). Remove whole Q/A blocks.
      const keep = expectedIds.length;
      const extra = questionLineIndices.slice(keep);
      // Remove from bottom to top to keep indices stable.
      for (let idx = extra.length - 1; idx >= 0; idx--) {
        const qi = extra[idx];
        const nextQi = idx + 1 < extra.length ? extra[idx + 1] : endAfter;
        nextLines.splice(qi, Math.max(0, nextQi - qi));
      }

      // Recompute question lines after trimming (strict only).
      questionLineIndices = scanQuestionLineIndices('strict');
      if (questionLineIndices.length !== expectedIds.length) {
        skippedReasons.push(`faq-question-count-mismatch:expected=${expectedIds.length}:found=${questionLineIndices.length}`);
        return { nextLines, inserted: 0, removed, foundQuestions: questionLineIndices.length, skippedReasons };
      }
    } else if (questionLineIndices.length < expectedIds.length) {
      // Relaxed fallback: accept flat top-level list items when punctuation/formatting varies too much.
      const relaxed = scanQuestionLineIndices('relaxed');
      if (relaxed.length !== expectedIds.length) {
        skippedReasons.push(
          `faq-question-count-mismatch:expected=${expectedIds.length}:foundStrict=${questionLineIndices.length}:foundRelaxed=${relaxed.length}`
        );
        return { nextLines, inserted: 0, removed, foundQuestions: relaxed.length, skippedReasons };
      }
      questionLineIndices = relaxed;
    } else {
      skippedReasons.push(`faq-question-count-mismatch:expected=${expectedIds.length}:found=${questionLineIndices.length}`);
      return { nextLines, inserted: 0, removed, foundQuestions: questionLineIndices.length, skippedReasons };
    }
  }

  let inserted = 0;
  // Insert from bottom to top to keep indices stable.
  for (let k = questionLineIndices.length - 1; k >= 0; k--) {
    const qi = questionLineIndices[k];
    const id = expectedIds[k];
    const prev = qi - 1 >= 0 ? nextLines[qi - 1].trim() : '';
    if (FAQ_ID_STANDALONE_RE.test(prev)) continue;
    nextLines.splice(qi, 0, `<!-- i18n:faq:id=${id} -->`);
    inserted++;
  }

  return { nextLines, inserted, removed, foundQuestions: questionLineIndices.length, skippedReasons };
}

function controlsKeysLineLabel(locale: TargetLocale): string {
  switch (locale) {
    case 'zh':
      return '按键（对齐）';
    case 'ja':
      return 'キー（整合）';
    case 'es':
      return 'Teclas (alineación)';
    case 'fr':
      return 'Touches (alignement)';
    case 'de':
      return 'Tasten (Abgleich)';
    case 'ko':
      return '키(정렬)';
  }
}

function applyControlsTokenAlignment(
  contentLines: string[],
  locale: TargetLocale,
  expectedTokens: string[]
): { nextLines: string[]; updated: boolean; skippedReasons: string[] } {
  const skippedReasons: string[] = [];
  const nextLines = contentLines.slice();

  const markerIndex = findMarkerIndex(nextLines, 'controls');
  if (markerIndex == null) {
    skippedReasons.push('missing-controls-marker');
    return { nextLines, updated: false, skippedReasons };
  }

  const end = findNextSectionMarkerIndex(nextLines, markerIndex);
  const section = nextLines.slice(markerIndex + 1, end);

  const KEYS_MARKER = '<!-- i18n:controls:keys -->';
  const existingMarkerRel = section.findIndex((l) => l.trim() === KEYS_MARKER);
  const existingMarkerAbs = existingMarkerRel >= 0 ? markerIndex + 1 + existingMarkerRel : null;

  const desiredLine = (() => {
    const label = controlsKeysLineLabel(locale);
    const tokens = expectedTokens.map((t) => `\`${t}\``).join(' ');
    return `- ${label}：${tokens ? ` ${tokens}` : ''}`;
  })();

  const rewriteCanonicalBlock = (): void => {
    if (expectedTokens.length === 0) {
      // Remove canonical block if present.
      if (existingMarkerAbs != null) {
        const line2 = existingMarkerAbs + 1;
        if (line2 < nextLines.length && nextLines[line2].trim().startsWith('-')) {
          nextLines.splice(existingMarkerAbs, 2);
        } else {
          nextLines.splice(existingMarkerAbs, 1);
        }
      }
      return;
    }

    if (existingMarkerAbs == null) {
      // Insert after the first heading following the controls marker (if any).
      let insertAt = markerIndex + 1;
      for (let i = markerIndex + 1; i < end; i++) {
        if (HEADING_RE.test(nextLines[i].trim())) {
          insertAt = i + 1;
          break;
        }
      }
      nextLines.splice(insertAt, 0, KEYS_MARKER, desiredLine);
      return;
    }

    const tokenLineAbs = existingMarkerAbs + 1;
    if (tokenLineAbs < nextLines.length) {
      nextLines[tokenLineAbs] = desiredLine;
    } else {
      nextLines.push(desiredLine);
    }
  };

  // Remove inline code tokens from all other lines in controls section to avoid introducing extra tokens.
  // Preserve fenced code blocks and preserve the canonical keys line (which carries the alignment tokens).
  let inFence = false;
  for (let i = markerIndex + 1; i < end; i++) {
    const trimmed = nextLines[i].trim();
    if (/^```/.test(trimmed)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (trimmed === KEYS_MARKER) continue;
    if (existingMarkerAbs != null && i === existingMarkerAbs + 1) continue;

    nextLines[i] = nextLines[i].replace(/`([^`]+)`/g, '$1');
  }

  rewriteCanonicalBlock();
  return { nextLines, updated: true, skippedReasons };
}

function normalizeNumberTokensInRange(
  locale: TargetLocale,
  line: string,
  expectedTokens: Set<string>
): string {
  // Normalize fullwidth digits and common punctuation before applying locale rules.
  line = normalizeFullwidthDigits(line).replace(/．/g, '.').replace(/，/g, ',');

  // Only perform replacements when the resulting token exists in English, to avoid unintended edits.
  const replaceIfExpected = (value: string, token: string) => (expectedTokens.has(token) ? value : null);

  // Normalize decimal comma when English expects a dot-based token (e.g., "1,0" -> "1.0").
  line = line.replace(/(\d+),(\d+)/g, (m, a, b) => {
    const token = `${a}.${b}`;
    const repl = replaceIfExpected(token, token);
    return repl ?? m;
  });

  // Normalize fullwidth percent.
  if (line.includes('％') && expectedTokens.has('%')) {
    line = line.replace(/％/g, '%');
  }

  // Normalize multiplication symbols to "x".
  line = line.replace(/(\d+)\s*[×x]\b/g, (m, n) => {
    const token = `${n}x`;
    const repl = replaceIfExpected(`${n}x`, token);
    return repl ?? m;
  });

  const rules: Array<(input: string) => string> = [];

  if (locale === 'zh') {
    rules.push((input) =>
      input.replace(/(\d+(?:\.\d+)?)\s*(秒|秒钟)\b/g, (m, n) => {
        const token = `${n}s`;
        const repl = replaceIfExpected(`${n}s`, token);
        return repl ?? m;
      })
    );
    rules.push((input) =>
      input.replace(/(\d+(?:\.\d+)?)\s*(分钟)\b/g, (m, n) => {
        const token = `${n}min`;
        const repl = replaceIfExpected(`${n}min`, token);
        return repl ?? m;
      })
    );
    rules.push((input) =>
      input.replace(/(\d+(?:\.\d+)?)\s*(小时)\b/g, (m, n) => {
        const token = `${n}h`;
        const repl = replaceIfExpected(`${n}h`, token);
        return repl ?? m;
      })
    );
    rules.push((input) =>
      input.replace(/(\d+(?:\.\d+)?)\s*(毫秒)\b/g, (m, n) => {
        const token = `${n}ms`;
        const repl = replaceIfExpected(`${n}ms`, token);
        return repl ?? m;
      })
    );
  }

  if (locale === 'ja') {
    rules.push((input) =>
      input.replace(/(\d+(?:\.\d+)?)\s*(秒)\b/g, (m, n) => {
        const token = `${n}s`;
        const repl = replaceIfExpected(`${n}s`, token);
        return repl ?? m;
      })
    );
    rules.push((input) =>
      input.replace(/(\d+(?:\.\d+)?)\s*(分)\b/g, (m, n) => {
        const token = `${n}min`;
        const repl = replaceIfExpected(`${n}min`, token);
        return repl ?? m;
      })
    );
    rules.push((input) =>
      input.replace(/(\d+(?:\.\d+)?)\s*(時間)\b/g, (m, n) => {
        const token = `${n}h`;
        const repl = replaceIfExpected(`${n}h`, token);
        return repl ?? m;
      })
    );
  }

  if (locale === 'ko') {
    rules.push((input) =>
      input.replace(/(\d+(?:\.\d+)?)\s*(초)\b/g, (m, n) => {
        const token = `${n}s`;
        const repl = replaceIfExpected(`${n}s`, token);
        return repl ?? m;
      })
    );
    rules.push((input) =>
      input.replace(/(\d+(?:\.\d+)?)\s*(분)\b/g, (m, n) => {
        const token = `${n}min`;
        const repl = replaceIfExpected(`${n}min`, token);
        return repl ?? m;
      })
    );
    rules.push((input) =>
      input.replace(/(\d+(?:\.\d+)?)\s*(시간)\b/g, (m, n) => {
        const token = `${n}h`;
        const repl = replaceIfExpected(`${n}h`, token);
        return repl ?? m;
      })
    );
  }

  if (locale === 'es') {
    rules.push((input) =>
      input.replace(/(\d+(?:\.\d+)?)\s*(segundos?|secs?)\b/gi, (m, n) => {
        const num = String(n);
        const token = `${num}s`;
        const repl = replaceIfExpected(`${num}s`, token);
        return repl ?? m;
      })
    );
    rules.push((input) =>
      input.replace(/(\d+(?:\.\d+)?)\s*(minutos?|mins?)\b/gi, (m, n) => {
        const num = String(n);
        const token = `${num}min`;
        const repl = replaceIfExpected(`${num}min`, token);
        return repl ?? m;
      })
    );
    rules.push((input) =>
      input.replace(/(\d+(?:\.\d+)?)\s*(horas?|hrs?)\b/gi, (m, n) => {
        const num = String(n);
        const token = `${num}h`;
        const repl = replaceIfExpected(`${num}h`, token);
        return repl ?? m;
      })
    );
  }

  if (locale === 'fr') {
    rules.push((input) =>
      input.replace(/(\d+(?:\.\d+)?)\s*(secondes?|secs?)\b/gi, (m, n) => {
        const num = String(n);
        const token = `${num}s`;
        const repl = replaceIfExpected(`${num}s`, token);
        return repl ?? m;
      })
    );
    rules.push((input) =>
      input.replace(/(\d+(?:\.\d+)?)\s*(minutes?|mins?)\b/gi, (m, n) => {
        const num = String(n);
        const token = `${num}min`;
        const repl = replaceIfExpected(`${num}min`, token);
        return repl ?? m;
      })
    );
    rules.push((input) =>
      input.replace(/(\d+(?:\.\d+)?)\s*(heures?|hrs?)\b/gi, (m, n) => {
        const num = String(n);
        const token = `${num}h`;
        const repl = replaceIfExpected(`${num}h`, token);
        return repl ?? m;
      })
    );
  }

  if (locale === 'de') {
    rules.push((input) =>
      input.replace(/(\d+(?:\.\d+)?)\s*(sekunden?|secs?)\b/gi, (m, n) => {
        const num = String(n);
        const token = `${num}s`;
        const repl = replaceIfExpected(`${num}s`, token);
        return repl ?? m;
      })
    );
    rules.push((input) =>
      input.replace(/(\d+(?:\.\d+)?)\s*(minuten?|mins?)\b/gi, (m, n) => {
        const num = String(n);
        const token = `${num}min`;
        const repl = replaceIfExpected(`${num}min`, token);
        return repl ?? m;
      })
    );
    rules.push((input) =>
      input.replace(/(\d+(?:\.\d+)?)\s*(stunden?|hrs?)\b/gi, (m, n) => {
        const num = String(n);
        const token = `${num}h`;
        const repl = replaceIfExpected(`${num}h`, token);
        return repl ?? m;
      })
    );
  }

  for (const fn of rules) {
    line = fn(line);
  }

  return line;
}

function applyNumbersNormalization(
  contentLines: string[],
  locale: TargetLocale,
  expectedTokenCounts: Record<string, number>
): { nextLines: string[]; changed: boolean } {
  const expectedTokens = new Set(Object.keys(expectedTokenCounts));
  if (expectedTokens.size === 0) return { nextLines: contentLines, changed: false };

  const markerIndices: Array<{ index: number; section: string }> = [];
  for (let i = 0; i < contentLines.length; i++) {
    const m = SECTION_MARKER_RE.exec(contentLines[i]);
    if (!m) continue;
    const section = m[1].toLowerCase();
    if (!ALLOWED_NUMBER_SECTIONS.has(section)) continue;
    markerIndices.push({ index: i, section });
  }
  if (!markerIndices.length) return { nextLines: contentLines, changed: false };

  const nextLines = contentLines.slice();
  let changed = false;

  for (let k = 0; k < markerIndices.length; k++) {
    const start = markerIndices[k].index + 1;
    const end = findNextSectionMarkerIndex(nextLines, markerIndices[k].index);

    let inFence = false;
    for (let i = start; i < end; i++) {
      const trimmed = nextLines[i].trim();
      if (/^```/.test(trimmed)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;

      const before = nextLines[i];
      const after = normalizeNumberTokensInRange(locale, before, expectedTokens);
      if (after !== before) {
        nextLines[i] = after;
        changed = true;
      }
    }
  }

  return { nextLines, changed };
}

function updateScalarKey(
  frontmatterLines: string[],
  key: string,
  value: string
): { nextLines: string[]; changed: boolean } {
  // frontmatterLines includes both --- lines.
  if (frontmatterLines.length < 2) return { nextLines: frontmatterLines, changed: false };
  const next = frontmatterLines.slice();
  const end = next.length - 1; // closing ---

  for (let i = 1; i < end; i++) {
    const line = next[i];
    const m = new RegExp(`^(\\s*)${key}\\s*:\\s*(.*)$`).exec(line);
    if (!m) continue;

    const indent = m[1] ?? '';
    const rest = (m[2] ?? '').trim();

    // Block scalar (>- or |)
    if (rest.startsWith('>') || rest.startsWith('|')) {
      const keyIndent = indent.length;
      const contentIndent = (() => {
        const nextLine = next[i + 1] ?? '';
        const m2 = /^(\s+)/.exec(nextLine);
        const n = m2 ? m2[1].length : keyIndent + 2;
        return Math.max(n, keyIndent + 2);
      })();

      // Consume all lines that belong to the block (indent strictly greater than key indent OR blank).
      let j = i + 1;
      while (j < end) {
        const l = next[j];
        if (!l.trim()) {
          j++;
          continue;
        }
        const leading = /^(\s*)/.exec(l)?.[1]?.length ?? 0;
        if (leading <= keyIndent) break;
        j++;
      }

      const newLine = `${' '.repeat(contentIndent)}${value}`;
      const current = next.slice(i + 1, j).join('\n');
      if (current === newLine) {
        return { nextLines: next, changed: false };
      }

      next.splice(i + 1, j - (i + 1), newLine);
      return { nextLines: next, changed: true };
    }

    // Scalar on same line; preserve quoting style when present.
    const quote = rest.startsWith("'") ? "'" : rest.startsWith('"') ? '"' : null;
    const formatted = quote ? `${quote}${value}${quote}` : value;
    const nextLine = `${indent}${key}: ${formatted}`;
    if (nextLine === line) return { nextLines: next, changed: false };
    next[i] = nextLine;
    return { nextLines: next, changed: true };
  }

  // Key missing: insert before closing ---
  next.splice(end, 0, `${key}: ${value}`);
  return { nextLines: next, changed: true };
}

function normalizeHardSyncScalar(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return JSON.stringify(value);
}

async function listEnglishFiles(): Promise<string[]> {
  const files = await fs.readdir(GAMES_DIR);
  return files
    .filter((f) => f.endsWith('.en.md'))
    .sort((a, b) => a.localeCompare(b))
    .map((f) => path.join(GAMES_DIR, f));
}

function slugFromEnglishFile(abs: string): string {
  return path.basename(abs).replace(/\.en\.md$/i, '');
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function alignPair(
  slug: string,
  locale: TargetLocale,
  englishAbs: string,
  localizedAbs: string,
  options: Options
): Promise<PairResult> {
  const englishRel = path.relative(process.cwd(), englishAbs);
  const localizedRel = path.relative(process.cwd(), localizedAbs);

  const skippedReasons: string[] = [];

  const englishRaw = await fs.readFile(englishAbs, 'utf8');
  const { data: enData, content: enContent } = matter(englishRaw);
  const englishHardpoints = extractHardpointsFromMarkdown(enContent, enData as Record<string, unknown>, { filePath: englishRel });

  const localizedRaw = await fs.readFile(localizedAbs, 'utf8');
  const parsedLocalized = matter(localizedRaw);
  const localizedLines = localizedRaw.split(/\r?\n/);
  const fmEnd = findFrontmatterEnd(localizedLines);
  const frontmatterLines = fmEnd ? localizedLines.slice(0, fmEnd) : [];
  const contentLines = fmEnd ? localizedLines.slice(fmEnd) : localizedLines;

  const desiredMarkers = extractSectionMarkersInOrder(enContent.split(/\r?\n/));

  // 1) frontmatter hard-sync keys (minimal set)
  let nextFrontmatterLines = frontmatterLines;
  const frontmatterSyncedKeys: string[] = [];

  const hardSyncKeys = ['urlstr', 'iframeSrc', 'thumbnail', 'releaseDate', 'score'] as const;
  for (const key of hardSyncKeys) {
    const raw = (enData as Record<string, unknown>)[key];
    const normalized = normalizeHardSyncScalar(raw);
    if (!normalized) continue;

    const current = normalizeHardSyncScalar((parsedLocalized.data as Record<string, unknown>)[key]);
    if (current === normalized) continue;

    const updated = updateScalarKey(nextFrontmatterLines, key, normalized);
    nextFrontmatterLines = updated.nextLines;
    if (updated.changed) frontmatterSyncedKeys.push(key);
  }

  // 2) section markers
  const sectionResult = applySectionMarkersToLocale(contentLines, locale, desiredMarkers, { conservative: options.conservative });
  let nextContentLines = sectionResult.nextLines;
  skippedReasons.push(...sectionResult.skippedReasons);

  // 3) FAQ IDs (only if English has them)
  const faqExpected = englishHardpoints.faq.ids;
  const faqResult =
    faqExpected.length > 0
      ? applyFaqIdsToLocale(nextContentLines, locale, faqExpected, { trimFaqExtras: options.trimFaqExtras })
      : { nextLines: nextContentLines, inserted: 0, removed: 0, foundQuestions: null, skippedReasons: [] as string[] };
  nextContentLines = faqResult.nextLines;
  skippedReasons.push(...faqResult.skippedReasons);

  // 4) Controls tokens (only if English has a controls marker)
  const controlsExpectedTokens = englishHardpoints.controls.sectionFound ? englishHardpoints.controls.keyTokens : [];
  const controlsResult = englishHardpoints.controls.sectionFound
    ? applyControlsTokenAlignment(nextContentLines, locale, controlsExpectedTokens)
    : { nextLines: nextContentLines, updated: false, skippedReasons: [] as string[] };
  nextContentLines = controlsResult.nextLines;
  skippedReasons.push(...controlsResult.skippedReasons);

  // 5) Numbers normalization (best-effort)
  const numbersResult = applyNumbersNormalization(nextContentLines, locale, englishHardpoints.numbers.tokenCounts);
  nextContentLines = numbersResult.nextLines;

  const nextRaw = `${nextFrontmatterLines.concat(nextContentLines).join('\n')}\n`;
  const changed = nextRaw !== `${localizedLines.join('\n')}\n`;

  // Compute diffs after changes (for reporting).
  const nextParsed = matter(nextRaw);
  const nextHardpoints = extractHardpointsFromMarkdown(
    nextParsed.content,
    nextParsed.data as Record<string, unknown>,
    { filePath: localizedRel }
  );
  const diffsAfter = diffHardpoints(englishHardpoints, nextHardpoints);

  if (options.apply && changed) {
    await fs.writeFile(localizedAbs, nextRaw, 'utf8');
  }

  return {
    slug,
    locale,
    englishFile: englishRel,
    localizedFile: localizedRel,
    changed: options.apply ? changed : false,
    changes: {
      frontmatter: { syncedKeys: frontmatterSyncedKeys },
      insertedSectionMarkers: sectionResult.inserted,
      updatedFaqIds: {
        inserted: faqResult.inserted,
        removed: faqResult.removed,
        expected: faqExpected.length,
        foundQuestions: faqResult.foundQuestions,
      },
      controls: { updated: controlsResult.updated, expectedTokens: controlsExpectedTokens.length },
      numbers: { changed: numbersResult.changed },
    },
    skippedReasons: Array.from(new Set(skippedReasons)),
    diffsAfter,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv);
  const allEnglish = await listEnglishFiles();
  const totalEnglish = allEnglish.length;

  const filtered = options.slugs
    ? allEnglish.filter((p) => options.slugs!.includes(slugFromEnglishFile(p)))
    : allEnglish;

  const slice = (() => {
    const start = Math.min(options.offset, filtered.length);
    const end = options.limit == null ? filtered.length : Math.min(start + options.limit, filtered.length);
    return filtered.slice(start, end);
  })();

  const byLocale: Report['summary']['byLocale'] = {};
  for (const loc of options.locales) {
    byLocale[loc] = { processed: 0, changed: 0, skipped: 0, missing: 0, mismatchedAfter: 0 };
  }

  const pairs: PairResult[] = [];

  let processedPairs = 0;
  let changedPairs = 0;
  let missingLocalized = 0;
  let skippedPairs = 0;
  let mismatchedAfter = 0;

  for (const englishAbs of slice) {
    const slug = slugFromEnglishFile(englishAbs);
    for (const locale of options.locales) {
      const localizedAbs = path.join(GAMES_DIR, `${slug}.${locale}.md`);
      if (!(await fileExists(localizedAbs))) {
        missingLocalized++;
        byLocale[locale].missing++;
        continue;
      }

      const res = await alignPair(slug, locale, englishAbs, localizedAbs, options);
      processedPairs++;
      byLocale[locale].processed++;
      pairs.push(res);

      const hasSkips = res.skippedReasons.length > 0;
      if (hasSkips) {
        skippedPairs++;
        byLocale[locale].skipped++;
      }

      if (res.diffsAfter.length > 0) {
        mismatchedAfter++;
        byLocale[locale].mismatchedAfter++;
      }

      if (options.apply && res.changed) {
        changedPairs++;
        byLocale[locale].changed++;
      }
    }
  }

  const report: Report = {
    generatedAt: new Date().toISOString(),
    scope: 'src/content/games/*',
    options: { ...options, out: null },
    summary: {
      totalEnglish,
      scannedEnglish: slice.length,
      processedPairs,
      changedPairs,
      missingLocalized,
      skippedPairs,
      mismatchedPairsAfter: mismatchedAfter,
      byLocale,
    },
    pairs,
  };

  if (options.out) {
    await fs.writeFile(options.out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  // Human-readable summary
  console.log(`Scope: ${report.scope}`);
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Mode: apply=${options.apply} conservative=${options.conservative}`);
  console.log(`Batch: offset=${options.offset} limit=${options.limit ?? 'ALL'} (english ${slice.length}/${filtered.length})`);
  console.log(`Locales: ${options.locales.join(', ')}`);
  console.log('');
  console.log(
    `Pairs: processed=${processedPairs} changed=${changedPairs} missingLocalized=${missingLocalized} skipped=${skippedPairs} mismatchedAfter=${mismatchedAfter}`
  );
  console.log('By locale:');
  for (const [loc, s] of Object.entries(byLocale)) {
    console.log(
      `- ${loc}: processed=${s.processed} changed=${s.changed} missing=${s.missing} skipped=${s.skipped} mismatchedAfter=${s.mismatchedAfter}`
    );
  }

  const sample = pairs
    .filter((p) => p.diffsAfter.length > 0 || p.skippedReasons.length > 0)
    .slice(0, 40)
    .map((p) => {
      const kinds = Array.from(new Set(p.diffsAfter.map((d) => d.kind))).join(', ');
      const skips = p.skippedReasons.join(', ');
      return `- ${p.localizedFile}: diffs=[${kinds || 'none'}] skips=[${skips || 'none'}]`;
    });

  if (sample.length) {
    console.log('\nSample issues (first 40):');
    for (const line of sample) console.log(line);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
