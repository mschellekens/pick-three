import { describe, expect, it } from 'vitest';
import { mustExercise } from './catalog';
import { seriesSessions } from './history';
import { newMilestones } from './milestones';
import { epley, fmtPair, fmtPct, liftProgress, matchedImprovement, overallChange, percentTrend, regionStrength, sessionPRs, strongestChange, workoutPRs } from './strength';
import { workout } from './testkit';
import type { Meta } from './types';

const bench = mustExercise('bb-bench');
const meta = (ids: string[]): Meta => ({ currentSeries: Object.fromEntries(ids.map((i) => [i.split(':')[0], i])), series: [], milestones: [] });

describe('estimated strength trend', () => {
  it('uses Epley on clean sets of 3–10 reps only', () => {
    expect(epley(100, 5)).toBeCloseTo(116.667, 2);
  });

  it('needs four eligible sessions and compares medians of first two and last two', () => {
    const ws = [
      workout('2026-01-01', [{ ex: 'bb-bench', sets: [[60, 8]] }]),
      workout('2026-01-08', [{ ex: 'bb-bench', sets: [[60, 9]] }]),
      workout('2026-01-15', [{ ex: 'bb-bench', sets: [[65, 8]] }]),
    ];
    const ss = seriesSessions(ws, 'bb-bench:1');
    expect(percentTrend(bench, ss, null).pct).toBeNull();
    ws.push(workout('2026-01-22', [{ ex: 'bb-bench', sets: [[67.5, 8]] }]));
    const t = percentTrend(bench, seriesSessions(ws, 'bb-bench:1'), null);
    const first = (epley(60, 8) + epley(60, 9)) / 2;
    const last = (epley(65, 8) + epley(67.5, 8)) / 2;
    expect(t.pct).toBeCloseTo(((last - first) / first) * 100, 6);
    expect(t.verdict).toBe('up');
  });

  it('excludes 1RM, high rep and zero load sets', () => {
    const ws = ['01', '08', '15', '22'].map((d) => workout(`2026-01-${d}`, [{ ex: 'bb-bench', sets: [[100, 1], [40, 15]] }]));
    expect(percentTrend(bench, seriesSessions(ws, 'bb-bench:1'), null).eligibleSessions).toBe(0);
  });

  it('changes under 2% read as About the same', () => {
    expect(fmtPct(1.99)).toBe('About the same');
    expect(fmtPct(-1.5)).toBe('About the same');
    expect(fmtPct(2)).toBe('+2.0%');
    expect(fmtPct(-3.25)).toBe('−3.3%');
  });

  it('respects the selected period start', () => {
    const ws = [
      workout('2025-06-01', [{ ex: 'bb-bench', sets: [[40, 8]] }]),
      ...['01', '08', '15', '22'].map((d) => workout(`2026-01-${d}`, [{ ex: 'bb-bench', sets: [[60, 8]] }])),
    ];
    const lp = liftProgress(ws, meta(['bb-bench:1']), '4w', '2026-01-25', 'kg');
    expect(lp[0].trend.verdict).toBe('same');
    const all = liftProgress(ws, meta(['bb-bench:1']), 'all', '2026-01-25', 'kg');
    expect(all[0].trend.verdict).toBe('up');
  });
});

describe('overall change', () => {
  const four = (ex: string, a: number, b: number) =>
    ['01', '08', '15', '22'].map((d, i) => workout(`2026-01-${d}`, [{ ex, sets: [[i < 2 ? a : b, 8]] }]));

  it('a new exercise cannot move the overall percentage until it has eligible repeat data', () => {
    const ws = [...four('bb-bench', 60, 66), ...four('back-squat', 80, 84)];
    const before = overallChange(liftProgress(ws, meta(['bb-bench:1', 'back-squat:1']), 'all', '2026-01-25', 'kg'))!;
    ws.push(workout('2026-01-24', [{ ex: 'lat-pulldown', sets: [[40, 10]] }]));
    const after = overallChange(liftProgress(ws, meta(['bb-bench:1', 'back-squat:1', 'lat-pulldown:1']), 'all', '2026-01-25', 'kg'))!;
    expect(after).toEqual(before);
    expect(before.lifts).toBe(2);
    expect(before.pct).toBeCloseTo(7.5, 6);
  });

  it('requires at least two eligible lifts', () => {
    expect(overallChange(liftProgress(four('bb-bench', 60, 66), meta(['bb-bench:1']), 'all', '2026-01-25', 'kg'))).toBeNull();
  });

  it('excludes bodyweight, added load and assistance from percentage aggregates', () => {
    const ws = [...four('bb-bench', 60, 66), ...four('weighted-pull-up', 10, 20), ...four('assisted-pull-up', 30, 20)];
    expect(overallChange(liftProgress(ws, meta(['bb-bench:1', 'weighted-pull-up:1', 'assisted-pull-up:1']), 'all', '2026-01-25', 'kg'))).toBeNull();
  });

  it('keeps only the current machine setup in aggregates', () => {
    const old = four('lat-pulldown', 40, 60);
    const ws = [...old, ...four('bb-bench', 60, 66)];
    const lp = liftProgress(ws, meta(['bb-bench:1', 'lat-pulldown:2']), 'all', '2026-01-25', 'kg');
    expect(lp.map((l) => l.exercise.id)).toEqual(['bb-bench']);
  });
});

describe('PRs and matched pairs', () => {
  it('first session is a baseline, not a PR', () => {
    const ws = [workout('2026-01-01', [{ ex: 'bb-bench', sets: [[60, 8]] }], { id: 'a' })];
    expect(workoutPRs(ws, 'a', 'kg')).toEqual([]);
  });

  it('flags a load PR only when it beats all earlier comparable sets', () => {
    const ws = [
      workout('2026-01-01', [{ ex: 'bb-bench', sets: [[60, 8], [70, 8]] }], { id: 'a' }),
      workout('2026-01-04', [{ ex: 'bb-bench', sets: [[65, 8]] }], { id: 'b' }),
      workout('2026-01-08', [{ ex: 'bb-bench', sets: [[72.5, 8]] }], { id: 'c' }),
    ];
    expect(workoutPRs(ws, 'b', 'kg')).toEqual([]);
    const c = workoutPRs(ws, 'c', 'kg');
    expect(c).toHaveLength(1);
    expect(c[0].kind).toBe('load');
  });

  it('rep PR at the same load', () => {
    const ws = [
      workout('2026-01-01', [{ ex: 'bb-bench', sets: [[60, 8]] }], { id: 'a' }),
      workout('2026-01-04', [{ ex: 'bb-bench', sets: [[60, 10]] }], { id: 'b' }),
    ];
    const prs = workoutPRs(ws, 'b', 'kg');
    expect(prs.map((p) => p.kind)).toEqual(['reps']);
  });

  it('changing units never creates a PR', () => {
    const ws = [
      workout('2026-01-01', [{ ex: 'bb-bench', unit: 'lb', sets: [[135, 8]] }], { id: 'a' }),
      workout('2026-01-04', [{ ex: 'bb-bench', unit: 'kg', sets: [[61.25, 8]] }], { id: 'b' }),
    ];
    expect(workoutPRs(ws, 'b', 'kg')).toEqual([]);
    expect(workoutPRs(ws, 'b', 'lb')).toEqual([]);
  });

  it('assistance PR means less assistance at the same reps', () => {
    const ex = mustExercise('assisted-pull-up');
    const ws = [
      workout('2026-01-01', [{ ex: 'assisted-pull-up', sets: [[45, 8]] }], { id: 'a' }),
      workout('2026-01-04', [{ ex: 'assisted-pull-up', sets: [[35, 8]] }], { id: 'b' }),
      workout('2026-01-08', [{ ex: 'assisted-pull-up', sets: [[50, 8]] }], { id: 'c' }),
    ];
    expect(workoutPRs(ws, 'b', 'kg').map((p) => p.kind)).toEqual(['load']);
    expect(workoutPRs(ws, 'c', 'kg')).toEqual([]);
    const ss = seriesSessions(ws, 'assisted-pull-up:1');
    const m = matchedImprovement(ex, ss[0], ss[1], 'lb')!;
    expect(m.kind).toBe('load');
    expect(fmtPair(ex, { ...m, before: { ...m.before, load: 45 }, after: { ...m.after, load: 35 } }, 'lb')).toBe('45 lb assistance × 8 → 35 lb assistance × 8');
  });

  it('matched pairs: same reps harder load, then same load more reps', () => {
    const db = mustExercise('db-bench');
    const ws = [
      workout('2026-01-01', [{ ex: 'db-bench', unit: 'lb', sets: [[60, 8]] }]),
      workout('2026-01-04', [{ ex: 'db-bench', unit: 'lb', sets: [[70, 8]] }]),
      workout('2026-01-08', [{ ex: 'db-bench', unit: 'lb', sets: [[70, 10]] }]),
    ];
    const ss = seriesSessions(ws, 'db-bench:1');
    expect(fmtPair(db, matchedImprovement(db, ss[0], ss[1], 'lb')!, 'lb')).toBe('60 × 8 → 70 × 8 lb per hand');
    expect(fmtPair(db, matchedImprovement(db, ss[1], ss[2], 'lb')!, 'lb')).toBe('70 × 8 → 70 × 10 lb per hand');
    expect(matchedImprovement(db, ss[2], ss[1], 'lb')).toBeNull();
  });

  it('bodyweight PR is more reps', () => {
    const ex = mustExercise('push-up');
    const ws = [workout('2026-01-01', [{ ex: 'push-up', sets: [[0, 10]] }]), workout('2026-01-03', [{ ex: 'push-up', sets: [[0, 12]] }])];
    const ss = seriesSessions(ws, 'push-up:1');
    expect(sessionPRs(ex, ss.slice(0, 1), ss[1], 'kg')[0].kind).toBe('reps');
  });

  it('milestones are deduplicated by key across recomputation', () => {
    const ws = [
      workout('2026-01-01', [{ ex: 'bb-bench', sets: [[60, 8]] }], { id: 'a' }),
      workout('2026-01-04', [{ ex: 'bb-bench', sets: [[62.5, 8]] }], { id: 'b' }),
    ];
    const first = newMilestones(ws, 'b', 'kg', []);
    expect(first.some((m) => m.kind === 'pr')).toBe(true);
    expect(newMilestones(ws, 'b', 'kg', first.map((m) => m.key))).toEqual([]);
    expect(newMilestones(ws.slice(0, 1), 'a', 'kg', [])[0].text).toBe('First lifting day logged');
  });
});

describe('regions and headline', () => {
  it('insufficient, unchanged and improving states render distinctly', () => {
    const ws = [
      workout('2026-01-01', [{ ex: 'bb-bench', sets: [[60, 8]] }, { ex: 'back-squat', sets: [[80, 8]] }]),
      workout('2026-01-05', [{ ex: 'bb-bench', sets: [[60, 10]] }, { ex: 'back-squat', sets: [[80, 8]] }, { ex: 'lat-pulldown', sets: [[40, 8]] }]),
    ];
    const lp = liftProgress(ws, meta(['bb-bench:1', 'back-squat:1', 'lat-pulldown:1']), 'all', '2026-01-06', 'kg');
    const r = Object.fromEntries(regionStrength(lp).map((x) => [x.region, x.state]));
    expect(r.chest).toBe('improving');
    expect(r.quads).toBe('steady');
    expect(r.back).toBe('baseline');
    expect(r.hamstrings).toBe('none');
    expect(strongestChange(lp, 'kg', 'all')!.value).toBe('60 × 8 → 60 × 10 kg');
  });
});
