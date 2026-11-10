/**
 * Training attention: what logged training covered. Not a recovery or readiness measure.
 */
import type { Region, Workout } from './types';
import { getExercise, MAJOR_REGIONS, REGION_LABEL, REGIONS } from './catalog';
import { addDays, daysBetween } from './dates';
import { liftingDays } from './history';

export type AttentionState = 'noData' | 'noDirect' | 'recent' | 'rotation' | 'attention';

export const ATTENTION_LABEL: Record<AttentionState, string> = {
  noData: 'No data yet',
  noDirect: 'No direct work logged',
  recent: 'Recently trained',
  rotation: 'In rotation',
  attention: 'Worth attention',
};

export interface RegionAttention {
  region: Region;
  state: AttentionState;
  lastPrimary: string | null;
  daysSince: number | null;
  /** Distinct primary exposure days in the past seven local calendar days, today included. */
  daysInWeek: number;
  lastSecondary: string | null;
  primaryLifts: string[];
  secondaryLifts: string[];
}

export const RECENT_DAYS = 2;

export function attentionThreshold(frequency: number): number {
  const f = Math.min(5, Math.max(1, Math.round(frequency)));
  return Math.max(4, 2 * Math.ceil(7 / f));
}

export function computeAttention(workouts: Workout[], today: string, frequency: number): RegionAttention[] {
  const threshold = attentionThreshold(frequency);
  const days = liftingDays(workouts).filter((d) => d <= today);
  const weekStart = addDays(today, -6);
  const prim = new Map<Region, Set<string>>();
  const sec = new Map<Region, Set<string>>();
  const pl = new Map<Region, Set<string>>();
  const sl = new Map<Region, Set<string>>();
  for (const w of workouts) {
    if (w.localDate > today) continue;
    for (const e of w.entries) {
      if (e.sets.length === 0) continue;
      const ex = getExercise(e.exerciseId);
      if (!ex) continue;
      for (const r of ex.primary) {
        (prim.get(r) ?? prim.set(r, new Set()).get(r)!).add(w.localDate);
        (pl.get(r) ?? pl.set(r, new Set()).get(r)!).add(ex.name);
      }
      for (const r of ex.secondary) {
        (sec.get(r) ?? sec.set(r, new Set()).get(r)!).add(w.localDate);
        (sl.get(r) ?? sl.set(r, new Set()).get(r)!).add(ex.name);
      }
    }
  }
  return REGIONS.map((region) => {
    const pd = [...(prim.get(region) ?? [])].sort();
    const sd = [...(sec.get(region) ?? [])].sort();
    const lastPrimary = pd.length ? pd[pd.length - 1] : null;
    const daysSince = lastPrimary ? daysBetween(lastPrimary, today) : null;
    const daysInWeek = pd.filter((d) => d >= weekStart && d <= today).length;
    let state: AttentionState;
    if (daysSince === null) state = days.length >= 2 && MAJOR_REGIONS.includes(region) ? 'noDirect' : 'noData';
    else if (daysSince <= RECENT_DAYS) state = 'recent';
    else if (daysSince < threshold) state = 'rotation';
    else state = 'attention';
    return {
      region,
      state,
      lastPrimary,
      daysSince,
      daysInWeek,
      lastSecondary: sd.length ? sd[sd.length - 1] : null,
      primaryLifts: [...(pl.get(region) ?? [])],
      secondaryLifts: [...(sl.get(region) ?? [])],
    };
  });
}

function times(n: number): string {
  return n === 0 ? '0 days' : n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`;
}

export function attentionReason(a: RegionAttention): string {
  if (a.state === 'noData') return 'No logged lifts for this area yet';
  if (a.state === 'noDirect') return 'No direct work logged';
  const ago = a.daysSince === 0 ? 'today' : a.daysSince === 1 ? 'yesterday' : `${a.daysSince} days ago`;
  if (a.state === 'recent') return a.daysInWeek >= 2 ? `Trained ${times(a.daysInWeek)} in the last 7 days` : `Last direct work ${ago}`;
  return `Last direct work ${ago} · ${a.daysInWeek} ${a.daysInWeek === 1 ? 'day' : 'days'} in the past week`;
}

const ORDER: Record<AttentionState, number> = { noDirect: 0, attention: 1, rotation: 2, recent: 3, noData: 9 };

/** Up to `cap` observations: never or least recently logged first, major regions emphasized, stable tie break. */
export function attentionObservations(list: RegionAttention[], cap = 3): { region: Region; text: string; state: AttentionState }[] {
  const ranked = list
    .filter((a) => a.state !== 'noData')
    .sort((a, b) => {
      const ma = MAJOR_REGIONS.includes(a.region) ? 0 : 1;
      const mb = MAJOR_REGIONS.includes(b.region) ? 0 : 1;
      return ORDER[a.state] - ORDER[b.state] || ma - mb || (b.daysSince ?? 999) - (a.daysSince ?? 999) || REGIONS.indexOf(a.region) - REGIONS.indexOf(b.region);
    });
  const major = ranked.filter((a) => MAJOR_REGIONS.includes(a.region));
  const pool = major.length >= cap ? major : ranked;
  return pool.slice(0, cap).map((a) => ({ region: a.region, state: a.state, text: `${REGION_LABEL[a.region]} · ${attentionReason(a)}` }));
}
