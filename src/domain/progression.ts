/**
 * Progression policy. Pure and deterministic.
 * These defaults implement a conservative product policy. They are not claims that a
 * specific rep range, rest interval or progression scheme is optimal for everyone.
 */
import type { Exercise, LoggedSet, Unit } from './types';
import type { Session } from './history';
import { elapsedHours } from './dates';
import { fmtNum, round, sameLoad, setLoadIn, toKg } from './units';

export const PROGRESSION_DEFAULTS = {
  /** Loaded compound working rep range (clean reps). */
  loadedRange: [6, 10] as [number, number],
  /** Bodyweight and assisted working rep range (clean reps). */
  bodyweightRange: [6, 12] as [number, number],
  /** Minimum working sets at the reference load to advance load or assistance. */
  minSetsToAdvance: 2,
  /** Last exposure under this many elapsed hours counts as a recent repeat. */
  recentHours: 48,
  /** Last exposure over this many elapsed days counts as stale. */
  staleDays: 28,
  /** Clear decline: at least this many fewer reps at the same load. */
  declineRepDrop: 2,
};
export type ProgressionConfig = typeof PROGRESSION_DEFAULTS;

export type SuggestionKind = 'baseline' | 'stale' | 'recent' | 'decline' | 'increase' | 'reps' | 'repeat' | 'easier' | 'cap';

export interface Suggestion {
  kind: SuggestionKind;
  /** One line of guidance. */
  message: string;
  /** Short explanation of why. */
  detail: string;
  /** Target load in the display unit, null when there is no load target. */
  load: number | null;
  unit: Unit;
  reps: number | null;
  range: [number, number];
  /** Reference set the suggestion is built from. */
  reference: { load: number; reps: number } | null;
}

export function repRange(ex: Exercise, cfg: ProgressionConfig = PROGRESSION_DEFAULTS): [number, number] {
  return ex.loadMode === 'bodyweight' || ex.loadMode === 'assist' ? cfg.bodyweightRange : cfg.loadedRange;
}

/** Higher is harder. Assistance is inverted. Bodyweight has no load dimension. */
export function difficulty(ex: Exercise, loadKg: number): number {
  if (ex.loadMode === 'bodyweight') return 0;
  return ex.loadMode === 'assist' ? -loadKg : loadKg;
}

/** Representative set: hardest load reaching the low end of the range; else hardest set. Ties → more reps → earlier. */
export function representativeSet(ex: Exercise, sets: LoggedSet[], cfg: ProgressionConfig = PROGRESSION_DEFAULTS): LoggedSet {
  const [lo] = repRange(ex, cfg);
  const pick = (pool: LoggedSet[]) =>
    pool.reduce((best, s) => {
      const d = difficulty(ex, s.loadKg) - difficulty(ex, best.loadKg);
      if (!sameLoad(s.loadKg, best.loadKg) && d > 0) return s;
      if (sameLoad(s.loadKg, best.loadKg) && s.reps > best.reps) return s;
      return best;
    });
  const qualifying = sets.filter((s) => s.reps >= lo);
  return pick(qualifying.length ? qualifying : sets);
}

/** Clear decline from a to b, or null when the comparison is ambiguous. */
export function clearlyBelow(ex: Exercise, a: LoggedSet, b: LoggedSet, cfg: ProgressionConfig = PROGRESSION_DEFAULTS): boolean | null {
  if (ex.loadMode === 'bodyweight' || sameLoad(a.loadKg, b.loadKg)) return b.reps <= a.reps - cfg.declineRepDrop;
  if (a.reps === b.reps) return difficulty(ex, b.loadKg) < difficulty(ex, a.loadKg);
  return null;
}

function shiftLoad(ex: Exercise, base: number, step: number, harder: boolean): number | null {
  if (ex.loadMode === 'bodyweight') return null;
  const dir = ex.loadMode === 'assist' ? (harder ? -1 : 1) : harder ? 1 : -1;
  const v = round(base + dir * step, 3);
  return v < 0 ? null : v;
}

export interface ProgressionInput {
  exercise: Exercise;
  /** Saved sessions in the same comparison series, chronological. Draft sets never belong here. */
  sessions: Session[];
  now: Date;
  unit: Unit;
  /** Configured increment in the display unit. 0 means no harder step is configured. */
  step: number;
  config?: ProgressionConfig;
}

export function suggest(input: ProgressionInput): Suggestion {
  const { exercise: ex, sessions, now, unit, step } = input;
  const cfg = input.config ?? PROGRESSION_DEFAULTS;
  const range = repRange(ex, cfg);
  const [lo, hi] = range;
  const bw = ex.loadMode === 'bodyweight';
  const u = (v: number) => `${fmtNum(v)} ${unit}`;
  const make = (kind: SuggestionKind, message: string, detail: string, load: number | null, reps: number | null, ref: LoggedSet | null): Suggestion => ({
    kind,
    message,
    detail,
    load: bw ? null : load,
    unit,
    reps,
    range,
    reference: ref ? { load: bw ? 0 : setLoadIn(ref, unit), reps: ref.reps } : null,
  });

  // 1. No comparable history.
  if (sessions.length === 0) {
    return make('baseline', 'Set your baseline', `Pick a weight you can move cleanly for ${lo}–${hi} reps and log what happens.`, null, null, null);
  }

  const last = sessions[sessions.length - 1];
  const lastRep = representativeSet(ex, last.sets, cfg);
  const lastLoad = setLoadIn(lastRep, unit);
  const hours = elapsedHours(last.startedAt, now);

  // 2. Stale history.
  if (hours > cfg.staleDays * 24) {
    const lighter = shiftLoad(ex, lastLoad, step, false);
    const days = Math.floor(hours / 24);
    return make(
      'stale',
      bw ? `Start at ${lo} clean reps` : lighter !== null && step > 0 ? `Start around ${u(lighter)} for ${lo} reps` : `Start at the low end, ${lo} reps`,
      `Last logged ${days} days ago at ${bw ? '' : `${u(lastLoad)} × `}${lastRep.reps}. Shown as a reference only; the app doesn't know how you trained in between.`,
      lighter ?? lastLoad,
      lo,
      lastRep,
    );
  }

  // 3. Recent repeat.
  if (hours < cfg.recentHours) {
    return make(
      'recent',
      bw ? `Repeat ${lastRep.reps} clean reps` : `Repeat ${u(lastLoad)} × ${lastRep.reps}`,
      `Last session was under ${cfg.recentHours} hours ago. Repeating is a conservative default, not a recovery measurement.`,
      lastLoad,
      lastRep.reps,
      lastRep,
    );
  }

  // 4. Clear decline over two consecutive exposures versus the preceding anchor.
  if (sessions.length >= 3) {
    const anchor = representativeSet(ex, sessions[sessions.length - 3].sets, cfg);
    const prev = representativeSet(ex, sessions[sessions.length - 2].sets, cfg);
    const d1 = clearlyBelow(ex, anchor, prev, cfg);
    const d2 = clearlyBelow(ex, anchor, lastRep, cfg);
    if (d1 === true && d2 === true) {
      return make(
        'decline',
        bw ? `Repeat ${lastRep.reps} clean reps` : `Repeat ${u(lastLoad)} × ${lastRep.reps}`,
        'The last two sessions came in below the one before. Repeat the latest manageable set, or go one step easier.',
        lastLoad,
        lastRep.reps,
        lastRep,
      );
    }
  }

  // 5. Top of range on every set at the reference load.
  const refKg = lastRep.loadKg;
  const atRef = last.sets.filter((s) => sameLoad(s.loadKg, refKg));
  if (atRef.length >= cfg.minSetsToAdvance && atRef.every((s) => s.reps >= hi)) {
    if (bw) {
      return make('cap', `Repeat ${hi}+ reps or choose a harder variation next time`, `You hit ${hi} reps on all ${atRef.length} sets.`, null, hi, lastRep);
    }
    const harder = step > 0 ? shiftLoad(ex, lastLoad, step, true) : null;
    if (harder === null) {
      return make('cap', `Repeat ${u(lastLoad)} × ${hi} or choose a harder variation next time`, `You hit ${hi} reps on all sets at this ${ex.loadMode === 'assist' ? 'assistance' : 'weight'}.`, lastLoad, hi, lastRep);
    }
    return make(
      'increase',
      ex.loadMode === 'assist' ? `Try ${u(harder)} assistance for ${lo} reps` : `Try ${u(harder)} for ${lo} reps`,
      `You hit ${hi} reps on all ${atRef.length} sets at ${u(lastLoad)}.`,
      harder,
      lo,
      lastRep,
    );
  }

  // 6. Heaviest qualifying load → one more clean rep, or below range → easier.
  const qualifying = last.sets.filter((s) => s.reps >= lo);
  if (qualifying.length > 0) {
    const ref = representativeSet(ex, qualifying, cfg);
    const best = Math.max(...qualifying.filter((s) => sameLoad(s.loadKg, ref.loadKg)).map((s) => s.reps));
    const load = setLoadIn(ref, unit);
    if (best < hi) {
      return make('reps', bw ? `One more clean rep: ${best + 1}` : `One more clean rep at ${u(load)}`, `Last time: ${bw ? '' : `${u(load)} × `}${best}. Aim for ${best + 1}.`, load, best + 1, ref);
    }
    return make('repeat', bw ? `Repeat ${hi} reps on every set` : `Bring every set at ${u(load)} to ${hi} reps`, `You reached ${hi} on at least one set at this ${bw ? 'level' : 'weight'}.`, load, hi, ref);
  }
  const easier = shiftLoad(ex, lastLoad, step, false);
  if (bw || easier === null || step === 0) {
    return make('repeat', bw ? `Aim for ${lo} clean reps` : `Repeat ${u(lastLoad)} and aim for ${lo} reps`, `Last time was below the ${lo}–${hi} range.`, lastLoad, lo, lastRep);
  }
  return make('easier', ex.loadMode === 'assist' ? `Try ${u(easier)} assistance for ${lo} reps` : `Try ${u(easier)} for ${lo} reps`, `Last time was below the ${lo}–${hi} range at ${u(lastLoad)}.`, easier, lo, lastRep);
}

/** Step for a lift in the display unit, honoring a per lift override. */
export function stepFor(ex: Exercise, unit: Unit, overrides: Record<string, number>): number {
  const o = overrides[`${ex.id}:${unit}`];
  return typeof o === 'number' && o >= 0 ? o : ex.step[unit];
}

export function suggestionLoadKg(s: Suggestion): number | null {
  return s.load === null ? null : toKg(s.load, s.unit);
}
