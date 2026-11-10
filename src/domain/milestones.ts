import type { Unit, Workout } from './types';
import { liftingDays } from './history';
import { workoutPRs, type PR } from './strength';

export const CONSISTENCY_MILESTONES = [1, 5, 10, 25, 50, 100, 150, 200, 300, 500];

export interface Milestone {
  key: string;
  kind: 'pr' | 'consistency';
  text: string;
  pr?: PR;
}

/** Milestones earned by a workout that have not been celebrated before. */
export function newMilestones(workouts: Workout[], workoutId: string, unit: Unit, seen: string[]): Milestone[] {
  const seenSet = new Set(seen);
  const out: Milestone[] = [];
  for (const pr of workoutPRs(workouts, workoutId, unit)) {
    if (!seenSet.has(pr.key)) out.push({ key: pr.key, kind: 'pr', text: pr.text, pr });
  }
  const w = workouts.find((x) => x.id === workoutId);
  if (w) {
    const days = liftingDays(workouts);
    const n = days.indexOf(w.localDate) + 1;
    if (n > 0 && days[days.length - 1] === w.localDate && CONSISTENCY_MILESTONES.includes(n)) {
      const key = `days:${n}`;
      if (!seenSet.has(key)) out.push({ key, kind: 'consistency', text: n === 1 ? 'First lifting day logged' : `${n} lifting days logged` });
    }
  }
  return out;
}
