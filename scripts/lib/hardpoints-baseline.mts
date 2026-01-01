import fs from 'node:fs/promises';
import path from 'node:path';

export type HardpointKind =
  | 'iframeSrc'
  | 'controlsKeys'
  | 'faqOrder'
  | 'numbers'
  | 'frontmatter';

export type BaselineMode = 'strict' | 'baseline' | 'report-only';

export interface BaselineEntry {
  slug: string;
  locale: string;
  kind: HardpointKind;
  fingerprint: string;
  note: string;
  addedAt: string;
}

export interface HardpointsBaselineFile {
  version: string;
  updatedAt: string;
  entries: BaselineEntry[];
}

export class BaselineCorruptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BaselineCorruptError';
  }
}

export const DEFAULT_HARDPOINTS_BASELINE_PATH = path.join(
  'config',
  'i18n',
  'baselines',
  'hardpoints-baseline.json'
);

export function createEmptyBaseline(now = new Date()): HardpointsBaselineFile {
  return {
    version: '1.0',
    updatedAt: now.toISOString(),
    entries: [],
  };
}

function assertBaselineShape(value: unknown): asserts value is HardpointsBaselineFile {
  if (!value || typeof value !== 'object') {
    throw new BaselineCorruptError('Baseline must be an object');
  }

  const baseline = value as Partial<HardpointsBaselineFile>;
  if (typeof baseline.version !== 'string' || !baseline.version.trim()) {
    throw new BaselineCorruptError('Baseline.version must be a non-empty string');
  }
  if (typeof baseline.updatedAt !== 'string' || !baseline.updatedAt.trim()) {
    throw new BaselineCorruptError('Baseline.updatedAt must be a non-empty string');
  }
  if (!Array.isArray(baseline.entries)) {
    throw new BaselineCorruptError('Baseline.entries must be an array');
  }

  for (const [i, entry] of baseline.entries.entries()) {
    if (!entry || typeof entry !== 'object') {
      throw new BaselineCorruptError(`Baseline.entries[${i}] must be an object`);
    }
    const e = entry as Partial<BaselineEntry>;
    if (typeof e.slug !== 'string' || !e.slug.trim()) {
      throw new BaselineCorruptError(`Baseline.entries[${i}].slug must be a non-empty string`);
    }
    if (typeof e.locale !== 'string' || !e.locale.trim()) {
      throw new BaselineCorruptError(`Baseline.entries[${i}].locale must be a non-empty string`);
    }
    if (
      e.kind !== 'iframeSrc' &&
      e.kind !== 'controlsKeys' &&
      e.kind !== 'faqOrder' &&
      e.kind !== 'numbers' &&
      e.kind !== 'frontmatter'
    ) {
      throw new BaselineCorruptError(`Baseline.entries[${i}].kind is invalid`);
    }
    if (typeof e.fingerprint !== 'string' || !e.fingerprint.trim()) {
      throw new BaselineCorruptError(
        `Baseline.entries[${i}].fingerprint must be a non-empty string`
      );
    }
    if (typeof e.note !== 'string') {
      throw new BaselineCorruptError(`Baseline.entries[${i}].note must be a string`);
    }
    if (typeof e.addedAt !== 'string' || !e.addedAt.trim()) {
      throw new BaselineCorruptError(`Baseline.entries[${i}].addedAt must be a string`);
    }
  }
}

export async function loadHardpointsBaseline(
  baselinePath = DEFAULT_HARDPOINTS_BASELINE_PATH
): Promise<HardpointsBaselineFile> {
  let raw = '';
  try {
    raw = await fs.readFile(baselinePath, 'utf8');
  } catch (err) {
    throw new BaselineCorruptError(
      `Failed to read baseline file at ${baselinePath}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new BaselineCorruptError(
      `Baseline JSON parse failed at ${baselinePath}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  assertBaselineShape(parsed);
  return parsed;
}

export async function saveHardpointsBaseline(
  baseline: HardpointsBaselineFile,
  baselinePath = DEFAULT_HARDPOINTS_BASELINE_PATH
): Promise<void> {
  const dir = path.dirname(baselinePath);
  await fs.mkdir(dir, { recursive: true });
  const next: HardpointsBaselineFile = {
    ...baseline,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(baselinePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
}

export function isKnownBaselineIssue(
  baseline: HardpointsBaselineFile,
  input: Pick<BaselineEntry, 'slug' | 'locale' | 'kind' | 'fingerprint'>
): boolean {
  return baseline.entries.some((e) => e.slug === input.slug && e.locale === input.locale && e.kind === input.kind);
}

export function addBaselineEntry(
  baseline: HardpointsBaselineFile,
  entry: Omit<BaselineEntry, 'addedAt'> & { addedAt?: string }
): void {
  baseline.entries.push({
    ...entry,
    addedAt: entry.addedAt ?? new Date().toISOString(),
  });
  baseline.updatedAt = new Date().toISOString();
}
