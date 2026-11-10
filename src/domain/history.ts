import type { LoggedSet, Workout } from './types';

export interface Session {
  workoutId: string;
  localDate: string;
  startedAt: string;
  finishedAt: string;
  exerciseId: string;
  seriesId: string;
  sets: LoggedSet[];
}

export function sortWorkouts(ws: Workout[]): Workout[] {
  return [...ws].sort((a, b) =>
    a.localDate === b.localDate ? a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id) : a.localDate.localeCompare(b.localDate),
  );
}

/** Chronological sessions of one comparison series (same exercise and setup) with at least one saved set. */
export function seriesSessions(workouts: Workout[], seriesId: string): Session[] {
  const out: Session[] = [];
  for (const w of sortWorkouts(workouts)) {
    for (const e of w.entries) {
      if (e.seriesId === seriesId && e.sets.length > 0) {
        out.push({ workoutId: w.id, localDate: w.localDate, startedAt: w.startedAt, finishedAt: w.finishedAt, exerciseId: e.exerciseId, seriesId, sets: e.sets });
      }
    }
  }
  return out;
}

export function exerciseSessions(workouts: Workout[], exerciseId: string): Session[] {
  const out: Session[] = [];
  for (const w of sortWorkouts(workouts)) {
    for (const e of w.entries) {
      if (e.exerciseId === exerciseId && e.sets.length > 0) {
        out.push({ workoutId: w.id, localDate: w.localDate, startedAt: w.startedAt, finishedAt: w.finishedAt, exerciseId, seriesId: e.seriesId, sets: e.sets });
      }
    }
  }
  return out;
}

export function liftingDays(workouts: Workout[]): string[] {
  const s = new Set<string>();
  for (const w of workouts) if (w.entries.some((e) => e.sets.length > 0)) s.add(w.localDate);
  return [...s].sort();
}
