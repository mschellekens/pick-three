/** Demo dataset. Generated in memory for previews only. It has no path into storage. */
import type { Meta, Unit, Workout } from './types';
import { addDays } from './dates';
import { makeInput } from './units';

export const DEMO_TAG = 'demo-';

const LOADS: Record<string, Record<Unit, [number, number]>> = {
  'back-squat': { lb: [135, 5], kg: [60, 2.5] },
  'bb-bench': { lb: [95, 5], kg: [42.5, 2.5] },
  'lat-pulldown': { lb: [80, 5], kg: [35, 2.5] },
  'bb-rdl': { lb: [115, 5], kg: [50, 2.5] },
  'seated-db-shoulder-press': { lb: [30, 2.5], kg: [12, 1] },
  'cs-db-row': { lb: [35, 5], kg: [16, 2] },
};

export function demoData(today: string, unit: Unit = 'kg'): { workouts: Workout[]; meta: Meta } {
  const plan: [string, string, string][] = [
    ['back-squat', 'bb-bench', 'lat-pulldown'],
    ['bb-rdl', 'seated-db-shoulder-press', 'cs-db-row'],
  ];
  const workouts: Workout[] = [];
  let n = 0;
  for (let i = 0; i < 27; i++) {
    const date = addDays(today, -80 + i * 3 + (i % 2));
    if (date > addDays(today, -1)) break;
    const [lo, pu, pl] = plan[i % 2];
    const k = Math.floor(i / 2);
    const mk = (ex: string, reps: number[]) => ({
      slot: (ex === lo ? 'lower' : ex === pu ? 'push' : 'pull') as Workout['entries'][number]['slot'],
      exerciseId: ex,
      seriesId: `${ex}:1`,
      sets: reps.map((r) => ({ id: `${DEMO_TAG}s${++n}`, ...makeInput(LOADS[ex][unit][0] + Math.floor(k / 3) * LOADS[ex][unit][1], unit), reps: r, loggedAt: `${date}T18:00:00.000Z` })),
    });
    const reps = [8 + (k % 3), 8 + (k % 3), 7 + (k % 3)];
    workouts.push({
      id: `${DEMO_TAG}w${i}`,
      startedAt: `${date}T17:30:00.000Z`,
      finishedAt: `${date}T18:30:00.000Z`,
      updatedAt: `${date}T18:30:00.000Z`,
      localDate: date,
      partial: i === 9,
      entries:
        i % 2 === 0
          ? [mk(lo, reps), mk(pu, reps), mk(pl, reps)]
          : i === 9
            ? [mk(lo, reps), mk(pu, reps)]
            : [mk(lo, reps), mk(pu, reps), mk(pl, reps)],
    });
  }
  const ids = ['back-squat', 'bb-bench', 'lat-pulldown', 'bb-rdl', 'seated-db-shoulder-press', 'cs-db-row'];
  return {
    workouts,
    meta: { currentSeries: Object.fromEntries(ids.map((i) => [i, `${i}:1`])), series: ids.map((i) => ({ id: `${i}:1`, exerciseId: i, createdAt: workouts[0].startedAt, index: 1 })), milestones: [] },
  };
}
