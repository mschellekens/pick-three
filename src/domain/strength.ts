/**
 * Strength progress from comparable saved sets. Never a muscle size or physique measure.
 */
import type { Exercise, LoggedSet, Meta, Region, Unit, Workout } from './types';
import { CATALOG, getExercise, REGIONS } from './catalog';
import { addDays } from './dates';
import { seriesSessions, type Session } from './history';
import { difficulty, PROGRESSION_DEFAULTS } from './progression';
import { fmtNum, LOAD_EPS_KG, sameLoad, setLoadIn } from './units';

export const STRENGTH_DEFAULTS = {
  e1rmMinReps: 3,
  e1rmMaxReps: 10,
  minSessionsForPercent: 4,
  sameThresholdPct: 2,
  minLiftsForOverall: 2,
};

export type Period = '4w' | '12w' | 'all';
export const PERIOD_LABEL: Record<Period, string> = { '4w': '4 weeks', '12w': '12 weeks', all: 'All time' };

export function periodStart(period: Period, today: string): string | null {
  if (period === 'all') return null;
  return addDays(today, period === '4w' ? -27 : -83);
}

export function epley(loadKg: number, reps: number): number {
  return loadKg * (1 + reps / 30);
}

/** Estimated strength index only for conventional externally loaded lifts. */
export function e1rmEligible(ex: Exercise): boolean {
  return ex.loadMode === 'total' || ex.loadMode === 'machine' || ex.loadMode === 'single' || ex.loadMode === 'perHand';
}

export function sessionIndex(ex: Exercise, sets: LoggedSet[]): number | null {
  if (!e1rmEligible(ex)) return null;
  let best: number | null = null;
  for (const s of sets) {
    if (s.loadKg > 0 && s.reps >= STRENGTH_DEFAULTS.e1rmMinReps && s.reps <= STRENGTH_DEFAULTS.e1rmMaxReps) {
      const v = epley(s.loadKg, s.reps);
      if (best === null || v > best) best = v;
    }
  }
  return best;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export interface Trend {
  /** Unrounded percent change, null when fewer than four eligible sessions. */
  pct: number | null;
  eligibleSessions: number;
  verdict: 'up' | 'same' | 'down' | null;
}

export function percentTrend(ex: Exercise, sessions: Session[], from: string | null): Trend {
  const idx = sessions
    .filter((s) => from === null || s.localDate >= from)
    .map((s) => sessionIndex(ex, s.sets))
    .filter((v): v is number => v !== null);
  if (idx.length < STRENGTH_DEFAULTS.minSessionsForPercent) return { pct: null, eligibleSessions: idx.length, verdict: null };
  const first = median(idx.slice(0, 2));
  const last = median(idx.slice(-2));
  const pct = ((last - first) / first) * 100;
  const verdict = Math.abs(pct) < STRENGTH_DEFAULTS.sameThresholdPct ? 'same' : pct > 0 ? 'up' : 'down';
  return { pct, eligibleSessions: idx.length, verdict };
}

export interface MatchedPair {
  before: { load: number; reps: number; date: string };
  after: { load: number; reps: number; date: string };
  kind: 'load' | 'reps';
}

function bestAt(ex: Exercise, sets: LoggedSet[], loadKg: number): number {
  return Math.max(0, ...sets.filter((s) => (ex.loadMode === 'bodyweight' ? true : sameLoad(s.loadKg, loadKg))).map((s) => s.reps));
}

/** Matched improvement between two sessions of the same series: more reps at the same load, or harder load at the same reps. */
export function matchedImprovement(ex: Exercise, a: Session, b: Session, unit: Unit): MatchedPair | null {
  const view = (s: LoggedSet, date: string) => ({ load: ex.loadMode === 'bodyweight' ? 0 : setLoadIn(s, unit), reps: s.reps, date });
  // Harder load at matched reps (prefer this, it reads as clearest progress).
  let bestLoad: MatchedPair | null = null;
  let bestGain = 0;
  for (const sb of b.sets) {
    if (ex.loadMode === 'bodyweight') break;
    for (const sa of a.sets) {
      if (sa.reps === sb.reps && !sameLoad(sa.loadKg, sb.loadKg)) {
        const gain = difficulty(ex, sb.loadKg) - difficulty(ex, sa.loadKg);
        // Only count when b beats every set of a at those reps or more.
        const beatsAll = a.sets.every((x) => x.reps < sb.reps || difficulty(ex, x.loadKg) < difficulty(ex, sb.loadKg) - LOAD_EPS_KG);
        if (gain > bestGain && beatsAll) {
          bestGain = gain;
          bestLoad = { before: view(sa, a.localDate), after: view(sb, b.localDate), kind: 'load' };
        }
      }
    }
  }
  if (bestLoad) return bestLoad;
  let bestReps: MatchedPair | null = null;
  let repGain = 0;
  for (const sb of b.sets) {
    const prior = bestAt(ex, a.sets, sb.loadKg);
    if (prior > 0 && sb.reps > prior && sb.reps - prior > repGain) {
      const sa = a.sets.find((x) => (ex.loadMode === 'bodyweight' || sameLoad(x.loadKg, sb.loadKg)) && x.reps === prior)!;
      repGain = sb.reps - prior;
      bestReps = { before: view(sa, a.localDate), after: view(sb, b.localDate), kind: 'reps' };
    }
  }
  return bestReps;
}

export interface PR {
  kind: 'load' | 'reps';
  exerciseId: string;
  seriesId: string;
  workoutId: string;
  set: LoggedSet;
  /** Stable dedupe key. */
  key: string;
  text: string;
}

/**
 * PRs set in a session versus all earlier saved sessions of the same series.
 * load: harder load than any earlier set with at least as many reps.
 * reps: more reps than any earlier set at the same or harder load.
 * The first session of a series is a baseline, never a PR.
 */
export function sessionPRs(ex: Exercise, earlier: Session[], current: Session, unit: Unit): PR[] {
  if (earlier.length === 0) return [];
  const prior = earlier.flatMap((s) => s.sets);
  const out: PR[] = [];
  const conv = ex.loadMode === 'perHand' ? ' per hand' : ex.loadMode === 'assist' ? ' assistance' : ex.loadMode === 'added' ? ' added' : '';
  for (const s of current.sets) {
    if (ex.loadMode === 'bodyweight') {
      if (prior.every((p) => s.reps > p.reps)) out.push({ kind: 'reps', exerciseId: ex.id, seriesId: current.seriesId, workoutId: current.workoutId, set: s, key: `pr:${current.seriesId}:reps:${s.reps}`, text: `${ex.name}: ${s.reps} reps, most so far` });
      continue;
    }
    const d = difficulty(ex, s.loadKg);
    const loadPR = prior.filter((p) => p.reps >= s.reps).every((p) => d > difficulty(ex, p.loadKg) + LOAD_EPS_KG) && prior.some((p) => p.reps >= s.reps);
    const repsPR = prior.filter((p) => difficulty(ex, p.loadKg) >= d - LOAD_EPS_KG).every((p) => s.reps > p.reps) && prior.some((p) => difficulty(ex, p.loadKg) >= d - LOAD_EPS_KG);
    const load = fmtNum(setLoadIn(s, unit));
    if (loadPR) out.push({ kind: 'load', exerciseId: ex.id, seriesId: current.seriesId, workoutId: current.workoutId, set: s, key: `pr:${current.seriesId}:load:${s.reps}:${s.loadKg.toFixed(2)}`, text: `${ex.name}: ${load} ${unit}${conv} × ${s.reps}, best at ${s.reps}+ reps` });
    else if (repsPR) out.push({ kind: 'reps', exerciseId: ex.id, seriesId: current.seriesId, workoutId: current.workoutId, set: s, key: `pr:${current.seriesId}:reps:${s.loadKg.toFixed(2)}:${s.reps}`, text: `${ex.name}: ${s.reps} reps at ${load} ${unit}${conv}, most at this ${ex.loadMode === 'assist' ? 'assistance' : 'weight'}` });
  }
  // Keep the single best PR per kind for the session.
  const best = new Map<string, PR>();
  for (const p of out) {
    const cur = best.get(p.kind);
    const better = !cur || (p.kind === 'load' ? difficulty(ex, p.set.loadKg) > difficulty(ex, cur.set.loadKg) : p.set.reps > cur.set.reps);
    if (better) best.set(p.kind, p);
  }
  return [...best.values()];
}

/** All PRs in a workout, compared against saved sessions before it in each series. */
export function workoutPRs(workouts: Workout[], workoutId: string, unit: Unit): PR[] {
  const w = workouts.find((x) => x.id === workoutId);
  if (!w) return [];
  const out: PR[] = [];
  for (const e of w.entries) {
    const ex = getExercise(e.exerciseId);
    if (!ex || e.sets.length === 0) continue;
    const ss = seriesSessions(workouts, e.seriesId);
    const i = ss.findIndex((s) => s.workoutId === workoutId);
    if (i < 0) continue;
    out.push(...sessionPRs(ex, ss.slice(0, i), ss[i], unit));
  }
  return out;
}

export interface LiftProgress {
  exercise: Exercise;
  seriesId: string;
  sessions: Session[];
  inPeriod: Session[];
  trend: Trend;
  matched: MatchedPair | null;
  status: 'improving' | 'steady' | 'baseline';
}

export function liftProgress(workouts: Workout[], meta: Meta, period: Period, today: string, unit: Unit): LiftProgress[] {
  const from = periodStart(period, today);
  const out: LiftProgress[] = [];
  for (const ex of CATALOG) {
    const seriesId = meta.currentSeries[ex.id];
    if (!seriesId) continue;
    const sessions = seriesSessions(workouts, seriesId);
    if (sessions.length === 0) continue;
    const inPeriod = sessions.filter((s) => from === null || s.localDate >= from);
    if (inPeriod.length === 0) continue;
    const trend = percentTrend(ex, sessions, from);
    const matched = inPeriod.length >= 2 ? matchedImprovement(ex, inPeriod[0], inPeriod[inPeriod.length - 1], unit) : null;
    let status: LiftProgress['status'] = 'baseline';
    if (trend.verdict === 'up') status = 'improving';
    else if (trend.verdict) status = 'steady';
    else if (inPeriod.length >= 2) status = matched ? 'improving' : 'steady';
    out.push({ exercise: ex, seriesId, sessions, inPeriod, trend, matched, status });
  }
  return out;
}

export interface Overall {
  pct: number;
  lifts: number;
  verdict: 'up' | 'same' | 'down';
}

export function overallChange(lifts: LiftProgress[]): Overall | null {
  const pcts = lifts.filter((l) => e1rmEligible(l.exercise) && l.trend.pct !== null).map((l) => l.trend.pct!);
  if (pcts.length < STRENGTH_DEFAULTS.minLiftsForOverall) return null;
  const pct = median(pcts);
  return { pct, lifts: pcts.length, verdict: Math.abs(pct) < STRENGTH_DEFAULTS.sameThresholdPct ? 'same' : pct > 0 ? 'up' : 'down' };
}

export type StrengthState = 'improving' | 'steady' | 'baseline' | 'none';
export const STRENGTH_LABEL: Record<StrengthState, string> = {
  improving: 'Improving',
  steady: 'Holding steady',
  baseline: 'Building baseline',
  none: 'No logged lifts',
};

export interface RegionStrength {
  region: Region;
  state: StrengthState;
  pct: number | null;
  lifts: LiftProgress[];
}

export function regionStrength(lifts: LiftProgress[]): RegionStrength[] {
  return REGIONS.map((region) => {
    const contributing = lifts.filter((l) => l.exercise.primary.includes(region));
    if (contributing.length === 0) return { region, state: 'none' as const, pct: null, lifts: [] };
    const pcts = contributing.filter((l) => l.trend.pct !== null).map((l) => l.trend.pct!);
    let state: StrengthState;
    let pct: number | null = null;
    if (pcts.length) {
      pct = median(pcts);
      state = pct >= STRENGTH_DEFAULTS.sameThresholdPct ? 'improving' : 'steady';
    } else if (contributing.some((l) => l.status === 'improving')) state = 'improving';
    else if (contributing.some((l) => l.status === 'steady')) state = 'steady';
    else state = 'baseline';
    return { region, state, pct, lifts: contributing };
  });
}

export function fmtPct(p: number): string {
  if (Math.abs(p) < STRENGTH_DEFAULTS.sameThresholdPct) return 'About the same';
  return `${p > 0 ? '+' : '−'}${Math.abs(p).toFixed(1)}%`;
}

export function fmtPair(ex: Exercise, m: MatchedPair, unit: Unit): string {
  if (ex.loadMode === 'bodyweight') return `${m.before.reps} → ${m.after.reps} reps`;
  const suffix = ex.loadMode === 'perHand' ? ' per hand' : '';
  const pre = ex.loadMode === 'assist' ? `${unit} assistance ` : ex.loadMode === 'added' ? `${unit} added ` : '';
  if (ex.loadMode === 'assist' || ex.loadMode === 'added')
    return `${fmtNum(m.before.load)} ${pre}× ${m.before.reps} → ${fmtNum(m.after.load)} ${pre}× ${m.after.reps}`;
  return `${fmtNum(m.before.load)} × ${m.before.reps} → ${fmtNum(m.after.load)} × ${m.after.reps} ${unit}${suffix}`;
}

export interface Headline {
  title: string;
  value: string;
  detail: string;
}

/** One strongest defensible performance change for the period. */
export function strongestChange(lifts: LiftProgress[], unit: Unit, period: Period): Headline | null {
  const withPct = lifts.filter((l) => l.trend.verdict === 'up').sort((a, b) => b.trend.pct! - a.trend.pct! || a.exercise.id.localeCompare(b.exercise.id));
  if (withPct.length) {
    const l = withPct[0];
    return { title: l.exercise.name, value: fmtPct(l.trend.pct!), detail: `Estimated strength, median of first two vs latest two sessions · ${PERIOD_LABEL[period]}` };
  }
  const withPair = lifts.filter((l) => l.matched).sort((a, b) => a.exercise.id.localeCompare(b.exercise.id));
  if (withPair.length) {
    const l = withPair[0];
    return { title: l.exercise.name, value: fmtPair(l.exercise, l.matched!, unit), detail: `Matched sets, ${l.matched!.kind === 'load' ? 'same reps, harder load' : 'same load, more reps'}` };
  }
  return null;
}

export function setText(ex: Exercise, s: LoggedSet, unit: Unit): string {
  const side = s.sideReps && s.sideReps[0] !== s.sideReps[1] ? ` (L${s.sideReps[0]} R${s.sideReps[1]})` : '';
  const per = ex.perSide ? ' each side' : '';
  if (ex.loadMode === 'bodyweight') return `${s.reps} reps${side}`;
  const v = fmtNum(setLoadIn(s, unit));
  const conv = ex.loadMode === 'perHand' ? ' per hand' : ex.loadMode === 'assist' ? ' assist' : ex.loadMode === 'added' ? ' added' : '';
  return `${v} ${unit}${conv} × ${s.reps}${per}${side}`;
}

export { PROGRESSION_DEFAULTS };
