import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  BaselineCorruptError,
  addBaselineEntry,
  createEmptyBaseline,
  isKnownBaselineIssue,
  loadHardpointsBaseline,
  saveHardpointsBaseline,
} from '../../scripts/lib/hardpoints-baseline.mts';

const FIXTURES_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'i18n-hardpoints');

describe('Hardpoints - baseline manager', () => {
  it('loads a valid baseline file', async () => {
    const file = path.join(FIXTURES_DIR, 'baseline', 'sample-baseline.json');
    const baseline = await loadHardpointsBaseline(file);
    expect(baseline.entries.length).toBe(1);
    expect(baseline.entries[0].slug).toBe('simple-game');
  });

  it('throws BaselineCorruptError on corrupted baseline', async () => {
    const file = path.join(FIXTURES_DIR, 'baseline', 'corrupted-baseline.json');
    await expect(loadHardpointsBaseline(file)).rejects.toBeInstanceOf(BaselineCorruptError);
  });

  it('saves and reloads baseline', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hardpoints-baseline-'));
    const baselinePath = path.join(dir, 'baseline.json');

    const baseline = createEmptyBaseline(new Date('2025-12-26T00:00:00.000Z'));
    addBaselineEntry(baseline, {
      slug: 'simple-game',
      locale: 'zh',
      kind: 'iframeSrc',
      fingerprint: 'deadbeefdead',
      note: 'tmp',
    });

    await saveHardpointsBaseline(baseline, baselinePath);
    const loaded = await loadHardpointsBaseline(baselinePath);

    expect(
      isKnownBaselineIssue(loaded, {
        slug: 'simple-game',
        locale: 'zh',
        kind: 'iframeSrc',
        fingerprint: 'different-fingerprint',
      })
    ).toBe(true);
  });
});
