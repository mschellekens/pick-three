/* Test helpers. Not imported by the app. */
import type { LoggedSet, Slot, Unit, Workout } from './types';
import { mustExercise } from './catalog';
import { makeInput } from './units';

let n = 0;
export function set(value: number, reps: number, unit: Unit = 'kg', at = '2026-01-01T10:00:00.000Z'): LoggedSet {
  n += 1;
  return { id: `s${n}`, ...makeInput(value, unit), reps, loggedAt: at };
}

export interface EntrySpec {
  ex: string;
  sets: [number, number][] | LoggedSet[];
  series?: string;
  unit?: Unit;
}

export function workout(date: string, entries: EntrySpec[], opts: { id?: string; hour?: number; partial?: boolean } = {}): Workout {
  n += 1;
  const startedAt = `${date}T${String(opts.hour ?? 10).padStart(2, '0')}:00:00.000Z`;
  return {
    id: opts.id ?? `w${n}`,
    startedAt,
    finishedAt: startedAt,
    updatedAt: startedAt,
    localDate: date,
    partial: opts.partial ?? false,
    entries: entries.map((e) => {
      const ex = mustExercise(e.ex);
      return {
        slot: ex.slot as Slot,
        exerciseId: ex.id,
        seriesId: e.series ?? `${ex.id}:1`,
        sets: (e.sets as unknown[]).map((s) => (Array.isArray(s) ? set(s[0], s[1], e.unit ?? 'kg', startedAt) : (s as LoggedSet))),
      };
    }),
  };
}
