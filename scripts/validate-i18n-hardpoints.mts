#!/usr/bin/env node
/**
 * CI gate: validate i18n hardpoints alignment against canonical English.
 *
 * Modes:
 * - default (baseline): allow issues listed in baseline, fail on new issues
 * - --strict: fail on any issue (ignore baseline)
 * - --report-only: always exit 0 (report only)
 * - --update-baseline: snapshot current issues into baseline file (requires commit)
 *
 * Orphan localized files (exists <slug>.<locale>.md but missing <slug>.en.md) are always errors
 * (except --report-only).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  buildHardpointsDiffReport,
  type DiffItem,
  type DiffReport,
  type HardpointsDiff,
} from './report-i18n-hardpoints-diff.mts';
import {
  DEFAULT_HARDPOINTS_BASELINE_PATH,
  type BaselineEntry,
  type HardpointKind,
  loadHardpointsBaseline,
  saveHardpointsBaseline,
  isKnownBaselineIssue,
} from './lib/hardpoints-baseline.mts';

type Mode = 'strict' | 'baseline' | 'report-only';

type Options = {
  mode: Mode;
  updateBaseline: boolean;
  locales: string[] | null;
  out: string;
  baselinePath: string;
};

type Issue = {
  slug: string;
  locale: string;
  englishFile: string;
  localizedFile: string;
  diff: DiffItem;
};

const DEFAULT_REPORT_PATH = 'i18n-hardpoints-diff-report.json';

function parseCsvArg(value: string | null): string[] | null {
  if (!value) return null;
  const parts = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : null;
}

function parseArgs(argv: string[]): Options {
  const args = argv.slice(2);

  const updateBaseline = args.includes('--update-baseline');
  const reportOnly = args.includes('--report-only');
  const strict = args.includes('--strict');

  const mode: Mode = reportOnly ? 'report-only' : strict ? 'strict' : 'baseline';

  const localeFlag = args.indexOf('--locale');
  const localesFlag = args.indexOf('--locales');
  const outFlag = args.indexOf('--out');
  const baselineFlag = args.indexOf('--baseline');

  const localeRaw =
    localeFlag >= 0
      ? String(args[localeFlag + 1] ?? '').trim()
      : localesFlag >= 0
        ? String(args[localesFlag + 1] ?? '').trim()
        : '';
  const locales = parseCsvArg(localeRaw);

  const out = outFlag >= 0 ? String(args[outFlag + 1] ?? '').trim() : DEFAULT_REPORT_PATH;
  const baselinePath =
    baselineFlag >= 0
      ? String(args[baselineFlag + 1] ?? '').trim()
      : DEFAULT_HARDPOINTS_BASELINE_PATH;

  return {
    mode,
    updateBaseline,
    locales,
    out: out || DEFAULT_REPORT_PATH,
    baselinePath: baselinePath || DEFAULT_HARDPOINTS_BASELINE_PATH,
  };
}

function isHardpointKind(kind: string): kind is HardpointKind {
  return (
    kind === 'iframeSrc' ||
    kind === 'controlsKeys' ||
    kind === 'faqOrder' ||
    kind === 'numbers' ||
    kind === 'frontmatter'
  );
}

function filterReportByLocales(report: DiffReport, locales: string[] | null): DiffReport {
  if (!locales) return report;
  const set = new Set(locales.map((l) => l.toLowerCase()));

  return {
    ...report,
    orphans: report.orphans.filter((o) => set.has(o.locale.toLowerCase())),
    pairs: report.pairs.filter((p) => set.has(p.locale.toLowerCase())),
  };
}

function collectIssues(pairs: HardpointsDiff[]): Issue[] {
  const issues: Issue[] = [];
  for (const p of pairs) {
    if (p.isAligned) continue;
    for (const diff of p.differences) {
      issues.push({
        slug: p.slug,
        locale: p.locale,
        englishFile: p.englishFile,
        localizedFile: p.localizedFile,
        diff,
      });
    }
  }
  return issues;
}

function formatIssue(issue: Issue): string {
  const d = issue.diff;
  const head = `[${issue.locale}] ${issue.slug} (${issue.localizedFile} vs ${issue.englishFile})`;
  if (d.kind === 'frontmatter') {
    return `${head}\n    kind=frontmatter field=${d.field ?? '(unknown)'}\n    expected=${JSON.stringify(
      d.expected
    )}\n    actual=${JSON.stringify(d.actual)}`;
  }
  return `${head}\n    kind=${d.kind}\n    expected=${JSON.stringify(d.expected)}\n    actual=${JSON.stringify(
    d.actual
  )}`;
}

function keyOf(entry: Pick<BaselineEntry, 'slug' | 'locale' | 'kind' | 'fingerprint'>): string {
  return `${entry.slug}::${entry.locale}::${entry.kind}::${entry.fingerprint}`;
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔒 I18n Hardpoints CI Gate');
  console.log('═══════════════════════════════════════════════════════════\n');

  const rawReport = await buildHardpointsDiffReport();
  const report = filterReportByLocales(rawReport, options.locales);
  await writeJson(options.out, report);

  const issues = collectIssues(report.pairs);
  const orphanCount = report.orphans.length;

  console.log(`Scope: ${report.scope}`);
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Report: ${options.out}`);
  console.log(`Mode: ${options.mode}${options.updateBaseline ? ' (+update-baseline)' : ''}`);
  if (options.locales) console.log(`Locales: ${options.locales.join(',')}`);
  console.log(
    `Pairs: total=${report.pairs.length} mismatched=${report.pairs.filter((p) => !p.isAligned).length} orphans=${orphanCount}`
  );
  console.log('');

  if (options.updateBaseline) {
    if (orphanCount > 0) {
      console.error('❌ Orphan localized files detected; cannot baseline these mapping errors:\n');
      for (const o of report.orphans.slice(0, 50)) {
        console.error(`- [${o.locale}] ${o.slug}: ${o.file} (missing ${o.slug}.en.md)`);
      }
      if (report.orphans.length > 50) {
        console.error(`... and ${report.orphans.length - 50} more`);
      }
      process.exitCode = 1;
      return;
    }

    const baseline = await loadHardpointsBaseline(options.baselinePath);
    const oldByKey = new Map<string, BaselineEntry>();
    for (const e of baseline.entries) {
      oldByKey.set(keyOf(e), e);
    }

    const nextEntries: BaselineEntry[] = [];
    for (const issue of issues) {
      if (!isHardpointKind(issue.diff.kind)) continue;
      const k = keyOf({
        slug: issue.slug,
        locale: issue.locale,
        kind: issue.diff.kind,
        fingerprint: issue.diff.fingerprint,
      });
      const old = oldByKey.get(k);
      nextEntries.push({
        slug: issue.slug,
        locale: issue.locale,
        kind: issue.diff.kind,
        fingerprint: issue.diff.fingerprint,
        note: old?.note ?? 'auto-baseline',
        addedAt: old?.addedAt ?? new Date().toISOString(),
      });
    }

    nextEntries.sort((a, b) => {
      const ak = keyOf(a);
      const bk = keyOf(b);
      return ak.localeCompare(bk);
    });

    await saveHardpointsBaseline(
      {
        ...baseline,
        entries: nextEntries,
      },
      options.baselinePath
    );

    console.log(`✅ Baseline updated: ${options.baselinePath}`);
    console.log(`   entries: ${baseline.entries.length} -> ${nextEntries.length}`);
    return;
  }

  if (orphanCount > 0) {
    console.error('❌ Orphan localized files detected (file mapping mismatch):\n');
    for (const o of report.orphans.slice(0, 50)) {
      console.error(`- [${o.locale}] ${o.slug}: ${o.file} (missing ${o.slug}.en.md)`);
    }
    if (report.orphans.length > 50) {
      console.error(`... and ${report.orphans.length - 50} more`);
    }
    if (options.mode !== 'report-only') {
      process.exitCode = 1;
      return;
    }
  }

  if (options.mode === 'report-only') {
    if (issues.length > 0) {
      console.log(`ℹ️  Mismatches found (report-only): ${issues.length}\n`);
      for (const line of issues.slice(0, 20)) {
        console.log(formatIssue(line) + '\n');
      }
      if (issues.length > 20) {
        console.log(`... and ${issues.length - 20} more\n`);
      }
    } else {
      console.log('✅ No mismatches found.\n');
    }
    process.exitCode = 0;
    return;
  }

  if (options.mode === 'strict') {
    if (issues.length > 0) {
      console.error(`❌ Hardpoints mismatch detected (strict): ${issues.length}\n`);
      for (const issue of issues.slice(0, 20)) {
        console.error(formatIssue(issue) + '\n');
      }
      if (issues.length > 20) {
        console.error(`... and ${issues.length - 20} more\n`);
      }
      process.exitCode = 1;
      return;
    }
    console.log('✅ All hardpoints aligned (strict).\n');
    process.exitCode = 0;
    return;
  }

  // baseline mode (default)
  const baseline = await loadHardpointsBaseline(options.baselinePath);
  const newIssues: Issue[] = [];
  const baselinedIssues: Issue[] = [];

  for (const issue of issues) {
    if (!isHardpointKind(issue.diff.kind)) {
      newIssues.push(issue);
      continue;
    }
    const known = isKnownBaselineIssue(baseline, {
      slug: issue.slug,
      locale: issue.locale,
      kind: issue.diff.kind,
      fingerprint: issue.diff.fingerprint,
    });
    if (known) baselinedIssues.push(issue);
    else newIssues.push(issue);
  }

  if (newIssues.length > 0) {
    console.error(`❌ Hardpoints REGRESSION detected: ${newIssues.length} new issue(s).\n`);
    for (const issue of newIssues.slice(0, 20)) {
      console.error(formatIssue(issue) + '\n');
    }
    if (newIssues.length > 20) {
      console.error(`... and ${newIssues.length - 20} more\n`);
    }
    console.error(`baseline: ${options.baselinePath}`);
    console.error(`report: ${options.out}`);
    console.error('');
    console.error('To accept current issues as baseline (requires commit), run:');
    console.error(`  tsx ${path.join('scripts', 'validate-i18n-hardpoints.mts')} --update-baseline`);
    process.exitCode = 1;
    return;
  }

  if (baselinedIssues.length > 0) {
    console.log(`✅ Hardpoints check passed (baseline gate). Known issues: ${baselinedIssues.length}\n`);
  } else {
    console.log('✅ All hardpoints aligned (baseline gate).\n');
  }

  process.exitCode = 0;
}

main().catch((err) => {
  console.error('Fatal error during hardpoints validation:', err);
  process.exitCode = 1;
});

