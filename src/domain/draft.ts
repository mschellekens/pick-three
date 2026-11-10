/** Pure draft transitions. Opening, resuming, changing tabs or accepting a target never creates a set. */
import type { Draft, DraftSlot, Exercise, LoggedSet, Meta, SetInput, Settings, Slot, Unit, Workout } from './types';
import { SLOTS } from './types';
import { mustExercise } from './catalog';
import { localDateOf } from './dates';
import { ensureSeries, uid } from './defaults';
import { seriesSessions } from './history';
import { repRange, representativeSet, stepFor, suggest, type Suggestion } from './progression';
import { fromKg, makeInput, round, setLoadIn } from './units';

export function newDraft(now: Date): Draft {
  const iso = now.toISOString();
  return { id: uid(), status: 'picking', createdAt: iso, slots: {}, active: 'lower', rev: 1, updatedAt: iso };
}

export function computeSuggestion(ex: Exercise, seriesId: string, workouts: Workout[], settings: Settings, now: Date): Suggestion {
  return suggest({ exercise: ex, sessions: seriesSessions(workouts, seriesId), now, unit: settings.unit, step: stepFor(ex, settings.unit, settings.increments) });
}

/** Seed the first set's editable values. Suggestion, else last comparable, else a neutral starting value. */
export function seedInput(ex: Exercise, sug: Suggestion | null, workouts: Workout[], seriesId: string, unit: Unit): SetInput {
  const [lo] = repRange(ex);
  const sessions = seriesSessions(workouts, seriesId);
  const last = sessions.length ? representativeSet(ex, sessions[sessions.length - 1].sets) : null;
  let value = ex.loadMode === 'bodyweight' ? 0 : ex.starts[unit][0] ?? 0;
  let reps = lo;
  if (sug && sug.load !== null) value = sug.load;
  else if (last && ex.loadMode !== 'bodyweight') value = setLoadIn(last, unit);
  if (sug && sug.reps !== null) reps = sug.reps;
  else if (last) reps = last.reps;
  return { value, unit, reps, repsRight: reps, sidesDiffer: false, touched: false };
}

export function chooseLift(draft: Draft, slot: Slot, exerciseId: string, ctx: { meta: Meta; workouts: Workout[]; settings: Settings; now: Date }): { draft: Draft; meta: Meta } {
  const ex = mustExercise(exerciseId);
  if (ex.slot !== slot) throw new Error('Exercise does not belong to this slot');
  const { meta, seriesId } = ensureSeries(ctx.meta, ex.id, ctx.now.toISOString());
  const sug = computeSuggestion(ex, seriesId, ctx.workouts, ctx.settings, ctx.now);
  const ds: DraftSlot = { exerciseId: ex.id, seriesId, sets: [], input: seedInput(ex, sug, ctx.workouts, seriesId, ctx.settings.unit), suggestion: sug };
  return { draft: bump({ ...draft, slots: { ...draft.slots, [slot]: ds } }, ctx.now), meta };
}

export function bump(d: Draft, now: Date): Draft {
  return { ...d, rev: d.rev + 1, updatedAt: now.toISOString() };
}

export function allChosen(d: Draft): boolean {
  return SLOTS.every((s) => !!d.slots[s]);
}

export function startDraft(d: Draft, now: Date): Draft {
  if (!allChosen(d)) throw new Error('Choose one lift in each slot first');
  return bump({ ...d, status: 'active', startedAt: now.toISOString(), localDate: localDateOf(now), active: 'lower' }, now);
}

export function inputToSet(ex: Exercise, input: SetInput, now: Date, id = uid()): LoggedSet {
  const value = ex.loadMode === 'bodyweight' ? 0 : Math.max(0, round(input.value, 3));
  const { input: li, loadKg } = makeInput(value, input.unit);
  const reps = ex.perSide && input.sidesDiffer ? Math.min(input.reps, input.repsRight) : input.reps;
  if (!Number.isInteger(reps) || reps < 1) throw new Error('Reps must be at least 1');
  const s: LoggedSet = { id, loadKg: ex.loadMode === 'bodyweight' ? 0 : loadKg, input: li, reps, loggedAt: now.toISOString() };
  if (ex.perSide && input.sidesDiffer) s.sideReps = [input.reps, input.repsRight];
  return s;
}

export function setToInput(s: LoggedSet): SetInput {
  return { value: s.input.value, unit: s.input.unit, reps: s.sideReps ? s.sideReps[0] : s.reps, repsRight: s.sideReps ? s.sideReps[1] : s.reps, sidesDiffer: !!s.sideReps, touched: true };
}

/** Convert an input to a new display unit, preserving physical load. */
export function convertInput(i: SetInput, unit: Unit, step: number): SetInput {
  if (i.unit === unit) return i;
  const kg = makeInput(i.value, i.unit).loadKg;
  const grid = step > 0 ? step : 0.5;
  const v = Math.round(fromKg(kg, unit) / grid) * grid;
  return { ...i, unit, value: round(v, 3) };
}

export function logSet(d: Draft, slot: Slot, now: Date): Draft {
  const ds = d.slots[slot];
  if (!ds) throw new Error('No lift in this slot');
  const ex = mustExercise(ds.exerciseId);
  const s = inputToSet(ex, ds.input, now);
  // Next set seeds from this one.
  return bump({ ...d, slots: { ...d.slots, [slot]: { ...ds, sets: [...ds.sets, s], input: { ...ds.input, touched: true } } } }, now);
}

export function replaceSet(d: Draft, slot: Slot, setId: string, input: SetInput, now: Date): Draft {
  const ds = d.slots[slot]!;
  const ex = mustExercise(ds.exerciseId);
  const sets = ds.sets.map((s) => (s.id === setId ? { ...inputToSet(ex, input, now, s.id), loggedAt: s.loggedAt } : s));
  return bump({ ...d, slots: { ...d.slots, [slot]: { ...ds, sets } } }, now);
}

export function removeSet(d: Draft, slot: Slot, setId: string, now: Date): Draft {
  const ds = d.slots[slot]!;
  return bump({ ...d, slots: { ...d.slots, [slot]: { ...ds, sets: ds.sets.filter((s) => s.id !== setId) } } }, now);
}

export function loggedCount(d: Draft): number {
  return SLOTS.reduce((n, s) => n + (d.slots[s]?.sets.length ?? 0), 0);
}

export function finishKind(d: Draft): 'full' | 'partial' | 'empty' {
  const withSets = SLOTS.filter((s) => (d.slots[s]?.sets.length ?? 0) > 0).length;
  return withSets === 3 ? 'full' : withSets === 0 ? 'empty' : 'partial';
}

/** Build the saved workout. Id equals the draft id so a repeated finish is idempotent. */
export function draftToWorkout(d: Draft, now: Date): Workout {
  const kind = finishKind(d);
  if (kind === 'empty') throw new Error('A workout needs at least one logged set');
  const iso = now.toISOString();
  return {
    id: d.id,
    startedAt: d.startedAt ?? d.createdAt,
    finishedAt: iso,
    updatedAt: iso,
    localDate: d.localDate ?? localDateOf(new Date(d.startedAt ?? d.createdAt)),
    partial: kind === 'partial',
    entries: SLOTS.filter((s) => d.slots[s]).map((s) => ({ slot: s, exerciseId: d.slots[s]!.exerciseId, seriesId: d.slots[s]!.seriesId, sets: d.slots[s]!.sets })),
  };
}

export function recomputePartial(w: Workout): Workout {
  return { ...w, partial: SLOTS.filter((s) => w.entries.some((e) => e.slot === s && e.sets.length > 0)).length < 3 };
}
