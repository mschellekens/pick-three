import { describe, expect, it } from 'vitest';
import { mustExercise } from './catalog';
import { seriesSessions } from './history';
import { suggest, stepFor, PROGRESSION_DEFAULTS } from './progression';
import { workout } from './testkit';
import type { Unit, Workout } from './types';

const bench = mustExercise('bb-bench');
const pushup = mustExercise('push-up');
const assisted = mustExercise('assisted-pull-up');
const dbRow = mustExercise('cs-db-row');

function run(exId: string, ws: Workout[], now: string, unit: Unit = 'kg', step?: number) {
  const ex = mustExercise(exId);
  return suggest({ exercise: ex, sessions: seriesSessions(ws, `${exId}:1`), now: new Date(now), unit, step: step ?? ex.step[unit] });
}

describe('progression', () => {
  it('returns baseline with no history and no load target', () => {
    const s = run('bb-bench', [], '2026-03-01T10:00:00Z');
    expect(s.kind).toBe('baseline');
    expect(s.load).toBeNull();
    expect(s.message).toBe('Set your baseline');
  });

  it('is reproducible for the same inputs', () => {
    const ws = [workout('2026-03-01', [{ ex: 'bb-bench', sets: [[60, 8], [60, 7]] }])];
    expect(run('bb-bench', ws, '2026-03-04T10:00:00Z')).toEqual(run('bb-bench', ws, '2026-03-04T10:00:00Z'));
  });

  it('recent boundary: just under 48 hours repeats, 48 hours does not', () => {
    const ws = [workout('2026-03-01', [{ ex: 'bb-bench', sets: [[60, 8], [60, 8]] }])];
    expect(run('bb-bench', ws, '2026-03-03T09:59:00Z').kind).toBe('recent');
    expect(run('bb-bench', ws, '2026-03-03T10:00:00Z').kind).toBe('reps');
  });

  it('stale boundary: exactly 28 days is not stale, over is', () => {
    const ws = [workout('2026-03-01', [{ ex: 'bb-bench', sets: [[60, 8], [60, 8]] }])];
    expect(run('bb-bench', ws, '2026-03-29T10:00:00Z').kind).toBe('reps');
    const s = run('bb-bench', ws, '2026-03-29T10:01:00Z');
    expect(s.kind).toBe('stale');
    expect(s.load).toBe(57.5);
    expect(s.reps).toBe(6);
    expect(s.reference).toEqual({ load: 60, reps: 8 });
  });

  it('adds the smallest configured step when all sets at the reference load hit the top', () => {
    const ws = [workout('2026-03-01', [{ ex: 'bb-bench', sets: [[60, 10], [60, 10], [60, 10]] }])];
    const s = run('bb-bench', ws, '2026-03-04T10:00:00Z');
    expect(s.kind).toBe('increase');
    expect(s.load).toBe(62.5);
    expect(s.reps).toBe(6);
    expect(s.message).toBe('Try 62.5 kg for 6 reps');
  });

  it('honors a configurable increment and lb unit', () => {
    const ws = [workout('2026-03-01', [{ ex: 'bb-bench', unit: 'lb', sets: [[135, 10], [135, 10]] }])];
    expect(run('bb-bench', ws, '2026-03-04T10:00:00Z', 'lb', 2.5).load).toBe(137.5);
    expect(run('bb-bench', ws, '2026-03-04T10:00:00Z', 'lb', 10).load).toBe(145);
    expect(stepFor(bench, 'lb', { 'bb-bench:lb': 2.5 })).toBe(2.5);
    // Increments are per unit: an lb override never changes the kg step.
    expect(stepFor(bench, 'kg', { 'bb-bench:lb': 10 })).toBe(bench.step.kg);
  });

  it('needs the minimum number of working sets to advance', () => {
    const ws = [workout('2026-03-01', [{ ex: 'bb-bench', sets: [[60, 10]] }])];
    expect(PROGRESSION_DEFAULTS.minSetsToAdvance).toBe(2);
    expect(run('bb-bench', ws, '2026-03-04T10:00:00Z').kind).toBe('repeat');
  });

  it('does not advance when another set at the reference load missed the top', () => {
    const ws = [workout('2026-03-01', [{ ex: 'bb-bench', sets: [[60, 10], [60, 10], [60, 8]] }])];
    expect(run('bb-bench', ws, '2026-03-04T10:00:00Z').kind).toBe('repeat');
  });

  it('suggests one more clean rep at the heaviest qualifying load', () => {
    const ws = [workout('2026-03-01', [{ ex: 'bb-bench', sets: [[60, 8], [60, 7], [60, 6]] }])];
    const s = run('bb-bench', ws, '2026-03-04T10:00:00Z');
    expect(s.kind).toBe('reps');
    expect(s.load).toBe(60);
    expect(s.reps).toBe(9);
    expect(s.message).toBe('One more clean rep at 60 kg');
  });

  it('mixed loads are deterministic and a lone heavy low rep set never jumps the target', () => {
    const ws = [workout('2026-03-01', [{ ex: 'bb-bench', sets: [[80, 3], [62.5, 7], [60, 9], [62.5, 6]] }])];
    const s = run('bb-bench', ws, '2026-03-04T10:00:00Z');
    expect(s.kind).toBe('reps');
    expect(s.load).toBe(62.5);
    expect(s.reps).toBe(8);
    const ws2 = [workout('2026-03-01', [{ ex: 'bb-bench', sets: [[62.5, 6], [60, 9], [62.5, 7], [80, 3]] }])];
    expect(run('bb-bench', ws2, '2026-03-04T10:00:00Z')).toEqual(s);
  });

  it('below the range suggests one step easier', () => {
    const ws = [workout('2026-03-01', [{ ex: 'bb-bench', sets: [[80, 4], [80, 3]] }])];
    const s = run('bb-bench', ws, '2026-03-04T10:00:00Z');
    expect(s.kind).toBe('easier');
    expect(s.load).toBe(77.5);
    expect(s.reps).toBe(6);
  });

  it('detects a clear decline over two consecutive exposures', () => {
    const ws = [
      workout('2026-03-01', [{ ex: 'bb-bench', sets: [[60, 9], [60, 9]] }]),
      workout('2026-03-04', [{ ex: 'bb-bench', sets: [[60, 7], [60, 6]] }]),
      workout('2026-03-07', [{ ex: 'bb-bench', sets: [[60, 7], [60, 7]] }]),
    ];
    const s = run('bb-bench', ws, '2026-03-10T10:00:00Z');
    expect(s.kind).toBe('decline');
    expect(s.load).toBe(60);
    expect(s.reps).toBe(7);
  });

  it('plateau without a clear decline keeps aiming for one more rep', () => {
    const ws = [
      workout('2026-03-01', [{ ex: 'bb-bench', sets: [[60, 8], [60, 8]] }]),
      workout('2026-03-04', [{ ex: 'bb-bench', sets: [[60, 8], [60, 8]] }]),
      workout('2026-03-07', [{ ex: 'bb-bench', sets: [[60, 7], [60, 7]] }]),
    ];
    expect(run('bb-bench', ws, '2026-03-10T10:00:00Z').kind).toBe('reps');
  });

  it('skips decline when the comparison is ambiguous (different load and reps)', () => {
    const ws = [
      workout('2026-03-01', [{ ex: 'bb-bench', sets: [[60, 9], [60, 9]] }]),
      workout('2026-03-04', [{ ex: 'bb-bench', sets: [[62.5, 6]] }]),
      workout('2026-03-07', [{ ex: 'bb-bench', sets: [[62.5, 6]] }]),
    ];
    expect(run('bb-bench', ws, '2026-03-10T10:00:00Z').kind).not.toBe('decline');
  });

  it('reps only lifts never get a load and cap with a neutral note', () => {
    const ws = [workout('2026-03-01', [{ ex: 'push-up', sets: [[0, 12], [0, 12]] }])];
    const s = suggest({ exercise: pushup, sessions: seriesSessions(ws, 'push-up:1'), now: new Date('2026-03-04T10:00:00Z'), unit: 'kg', step: 0 });
    expect(s.kind).toBe('cap');
    expect(s.load).toBeNull();
    expect(s.message).toContain('harder variation');
    const ws2 = [workout('2026-03-01', [{ ex: 'push-up', sets: [[0, 9], [0, 8]] }])];
    const s2 = suggest({ exercise: pushup, sessions: seriesSessions(ws2, 'push-up:1'), now: new Date('2026-03-04T10:00:00Z'), unit: 'kg', step: 0 });
    expect(s2.kind).toBe('reps');
    expect(s2.reps).toBe(10);
    expect(s2.load).toBeNull();
  });

  it('inverts assistance: progression lowers assistance', () => {
    const ws = [workout('2026-03-01', [{ ex: 'assisted-pull-up', sets: [[30, 12], [30, 12]] }])];
    const s = suggest({ exercise: assisted, sessions: seriesSessions(ws, 'assisted-pull-up:1'), now: new Date('2026-03-04T10:00:00Z'), unit: 'kg', step: 5 });
    expect(s.kind).toBe('increase');
    expect(s.load).toBe(25);
    expect(s.message).toContain('assistance');
  });

  it('assistance at zero cannot decrease further, so it repeats with a neutral note', () => {
    const ws = [workout('2026-03-01', [{ ex: 'assisted-pull-up', sets: [[0, 12], [0, 12]] }])];
    const s = suggest({ exercise: assisted, sessions: seriesSessions(ws, 'assisted-pull-up:1'), now: new Date('2026-03-04T10:00:00Z'), unit: 'kg', step: 5 });
    expect(s.kind).toBe('cap');
  });

  it('assistance: harder representative set is the lowest assistance', () => {
    const ws = [workout('2026-03-01', [{ ex: 'assisted-pull-up', sets: [[40, 10], [30, 8]] }])];
    const s = suggest({ exercise: assisted, sessions: seriesSessions(ws, 'assisted-pull-up:1'), now: new Date('2026-03-04T10:00:00Z'), unit: 'kg', step: 5 });
    expect(s.load).toBe(30);
    expect(s.reps).toBe(9);
  });

  it('assistance decline: higher assistance at same reps counts as lower performance', () => {
    const ws = [
      workout('2026-03-01', [{ ex: 'assisted-pull-up', sets: [[30, 8]] }]),
      workout('2026-03-04', [{ ex: 'assisted-pull-up', sets: [[40, 8]] }]),
      workout('2026-03-07', [{ ex: 'assisted-pull-up', sets: [[40, 8]] }]),
    ];
    const s = suggest({ exercise: assisted, sessions: seriesSessions(ws, 'assisted-pull-up:1'), now: new Date('2026-03-10T10:00:00Z'), unit: 'kg', step: 5 });
    expect(s.kind).toBe('decline');
  });

  it('impossible step repeats the target', () => {
    const ws = [workout('2026-03-01', [{ ex: 'cs-db-row', sets: [[20, 10], [20, 10]] }])];
    const s = suggest({ exercise: dbRow, sessions: seriesSessions(ws, 'cs-db-row:1'), now: new Date('2026-03-04T10:00:00Z'), unit: 'kg', step: 0 });
    expect(s.kind).toBe('cap');
    expect(s.load).toBe(20);
  });

  it('a new machine setup is a separate series with a fresh baseline', () => {
    const ws = [workout('2026-03-01', [{ ex: 'lat-pulldown', sets: [[50, 10], [50, 10]] }])];
    const lat = mustExercise('lat-pulldown');
    const s = suggest({ exercise: lat, sessions: seriesSessions(ws, 'lat-pulldown:2'), now: new Date('2026-03-04T10:00:00Z'), unit: 'kg', step: 5 });
    expect(s.kind).toBe('baseline');
  });

  it('suggestion in another unit preserves physical load', () => {
    const ws = [workout('2026-03-01', [{ ex: 'bb-bench', unit: 'lb', sets: [[135, 8], [135, 8]] }])];
    const s = run('bb-bench', ws, '2026-03-04T10:00:00Z', 'kg', 2.5);
    expect(s.load).toBeCloseTo(61.2, 1);
    expect(bench.step.kg).toBe(2.5);
  });
});
