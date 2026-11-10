import { describe, expect, it } from 'vitest';
import { makeBackup, MAX_BACKUP_BYTES, parseBackup, SCHEMA_VERSION } from './backup';
import { defaultMeta, defaultSettings, ensureSeries, newSeries } from './defaults';
import { workout } from './testkit';
import { addDays, daysBetween, isValidLocalDate, localDateOf } from './dates';
import { defaultUnitForLocale, fromKg, makeInput, setLoadIn, toKg } from './units';

const sample = () => {
  const ws = [workout('2026-02-01', [{ ex: 'bb-bench', unit: 'lb', sets: [[135, 8], [135, 7]] }, { ex: 'back-squat', sets: [[80, 6]] }], { id: 'w-a', partial: true })];
  return makeBackup(defaultSettings('en-US'), { ...defaultMeta(), currentSeries: { 'bb-bench': 'bb-bench:1', 'back-squat': 'back-squat:1' }, series: [] }, ws, new Date('2026-02-02T00:00:00Z'));
};

describe('backup', () => {
  it('round trips exactly, including original units', () => {
    const b = sample();
    const r = parseBackup(JSON.stringify(b));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backup.workouts).toEqual(b.workouts);
    expect(r.backup.workouts[0].entries[0].sets[0].input).toEqual({ value: 135, unit: 'lb' });
    expect(r.backup.meta.series.map((s) => s.id).sort()).toEqual(['back-squat:1', 'bb-bench:1']);
    expect(r.backup.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('rejects malformed JSON, wrong app, newer versions and oversized files', () => {
    expect(parseBackup('{oops').ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: 'other', schemaVersion: 2 })).ok).toBe(false);
    const newer = parseBackup(JSON.stringify({ ...sample(), schemaVersion: 99 }));
    expect(newer.ok === false && newer.error).toContain('newer version');
    expect(parseBackup('{}', MAX_BACKUP_BYTES + 1).ok).toBe(false);
  });

  it('rejects unknown exercises, bad dates, bad reps, duplicate ids and mismatched loads', () => {
    const mut = (f: (b: ReturnType<typeof sample>) => void) => {
      const b = sample();
      f(b);
      return parseBackup(JSON.stringify(b)).ok;
    };
    expect(mut((b) => (b.workouts[0].entries[0].exerciseId = 'nope'))).toBe(false);
    expect(mut((b) => (b.workouts[0].localDate = '2026-02-30'))).toBe(false);
    expect(mut((b) => (b.workouts[0].entries[0].sets[0].reps = 0))).toBe(false);
    expect(mut((b) => (b.workouts[0].entries[0].sets[0].reps = 2.5))).toBe(false);
    expect(mut((b) => (b.workouts[0].entries[0].sets[1].id = b.workouts[0].entries[0].sets[0].id))).toBe(false);
    expect(mut((b) => (b.workouts[0].entries[0].sets[0].loadKg = 999))).toBe(false);
    expect(mut((b) => (b.workouts[0].entries[0].sets[0].loadKg = -1))).toBe(false);
    expect(mut((b) => (b.workouts[0].entries[0].slot = 'pull'))).toBe(false);
    expect(mut((b) => b.workouts.push({ ...b.workouts[0] }))).toBe(false);
    expect(mut((b) => b.workouts[0].entries.forEach((e) => (e.sets = [])))).toBe(false);
  });

  it('migrates schema v1', () => {
    const v1 = {
      app: 'pick-three',
      schemaVersion: 1,
      exportedAt: '2025-12-01T00:00:00.000Z',
      settings: { unit: 'kg' },
      workouts: [
        { id: 'old', startedAt: '2025-11-30T10:00:00.000Z', finishedAt: '2025-11-30T11:00:00.000Z', localDate: '2025-11-30', partial: false, entries: [{ slot: 'push', exerciseId: 'bb-bench', sets: [{ id: 'x1', kg: 60, reps: 8, loggedAt: '2025-11-30T10:10:00.000Z' }] }] },
      ],
    };
    const r = parseBackup(JSON.stringify(v1));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.migratedFrom).toBe(1);
    expect(r.backup.workouts[0].entries[0].seriesId).toBe('bb-bench:1');
    expect(r.backup.workouts[0].entries[0].sets[0]).toMatchObject({ loadKg: 60, input: { value: 60, unit: 'kg' } });
    expect(r.backup.meta.currentSeries['bb-bench']).toBe('bb-bench:1');
  });
});

describe('series', () => {
  it('new setup starts a new series and preserves the old one', () => {
    let m = ensureSeries(defaultMeta(), 'lat-pulldown', '2026-01-01T00:00:00Z').meta;
    const r = newSeries(m, 'lat-pulldown', '2026-02-01T00:00:00Z');
    m = r.meta;
    expect(r.seriesId).toBe('lat-pulldown:2');
    expect(m.series.map((s) => s.id)).toEqual(['lat-pulldown:1', 'lat-pulldown:2']);
    expect(m.currentSeries['lat-pulldown']).toBe('lat-pulldown:2');
  });
});

describe('dates and units', () => {
  it('local dates are calendar based and roll over correctly', () => {
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2); // DST weekend in the US
    expect(isValidLocalDate('2026-13-01')).toBe(false);
    expect(localDateOf(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('stored local day is stable whatever the current time zone', () => {
    // The day is captured once at start and never recomputed from the ISO timestamp.
    const w = workout('2026-03-01', [{ ex: 'bb-bench', sets: [[60, 8]] }]);
    w.startedAt = '2026-03-01T23:30:00.000-08:00';
    expect(w.localDate).toBe('2026-03-01');
  });

  it('unit conversion preserves physical load and exact original entry', () => {
    const s = { ...makeInput(135, 'lb') };
    expect(s.loadKg).toBeCloseTo(61.235, 3);
    expect(setLoadIn(s, 'lb')).toBe(135);
    expect(setLoadIn(s, 'kg')).toBe(61.2);
    expect(fromKg(toKg(137.5, 'lb'), 'lb')).toBeCloseTo(137.5, 9);
    expect(defaultUnitForLocale('en-US')).toBe('lb');
    expect(defaultUnitForLocale('en-GB')).toBe('kg');
    expect(defaultUnitForLocale('nl-NL')).toBe('kg');
  });
});
