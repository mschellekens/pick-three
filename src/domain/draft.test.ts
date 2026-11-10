import { describe, expect, it } from 'vitest';
import { defaultMeta, defaultSettings } from './defaults';
import { allChosen, chooseLift, convertInput, draftToWorkout, finishKind, logSet, newDraft, removeSet, startDraft } from './draft';
import { workout } from './testkit';

const now = new Date('2026-03-10T15:00:00Z');
const ctx = { meta: defaultMeta(), workouts: [], settings: defaultSettings('en-US'), now };

function picked() {
  let d = newDraft(now);
  let meta = ctx.meta;
  for (const [slot, id] of [['lower', 'back-squat'], ['push', 'bb-bench'], ['pull', 'lat-pulldown']] as const) {
    const r = chooseLift(d, slot, id, { ...ctx, meta });
    d = r.draft;
    meta = r.meta;
  }
  return { d, meta };
}

describe('draft', () => {
  it('starts empty, never auto-selects lifts, and opening or choosing creates no sets', () => {
    const d = newDraft(now);
    expect(d.slots).toEqual({});
    const { d: p } = picked();
    expect(allChosen(p)).toBe(true);
    expect(Object.values(p.slots).every((s) => s!.sets.length === 0)).toBe(true);
    expect(p.slots.push!.suggestion!.kind).toBe('baseline');
  });

  it('rejects a lift from the wrong slot', () => {
    expect(() => chooseLift(newDraft(now), 'push', 'back-squat', ctx)).toThrow();
  });

  it('logging seeds the next set from the previous one, and zero-set drafts cannot be saved', () => {
    let { d } = picked();
    d = startDraft(d, now);
    expect(finishKind(d)).toBe('empty');
    expect(() => draftToWorkout(d, now)).toThrow();
    d = { ...d, slots: { ...d.slots, push: { ...d.slots.push!, input: { ...d.slots.push!.input, value: 135, reps: 8 } } } };
    d = logSet(d, 'push', now);
    expect(d.slots.push!.sets[0]).toMatchObject({ reps: 8, input: { value: 135, unit: 'lb' } });
    expect(d.slots.push!.input.value).toBe(135);
    expect(finishKind(d)).toBe('partial');
    const w = draftToWorkout(d, now);
    expect(w.partial).toBe(true);
    expect(w.id).toBe(d.id);
    d = removeSet(d, 'push', d.slots.push!.sets[0].id, now);
    expect(finishKind(d)).toBe('empty');
  });

  it('returning user sees a reproducible suggestion seeded into the first set', () => {
    const ws = [workout('2026-03-06', [{ ex: 'bb-bench', unit: 'lb', sets: [[135, 8], [135, 8]] }])];
    const r1 = chooseLift(newDraft(now), 'push', 'bb-bench', { ...ctx, workouts: ws });
    const r2 = chooseLift(newDraft(now), 'push', 'bb-bench', { ...ctx, workouts: ws });
    expect(r1.draft.slots.push!.suggestion).toEqual(r2.draft.slots.push!.suggestion);
    expect(r1.draft.slots.push!.input).toMatchObject({ value: 135, reps: 9, touched: false });
  });

  it('unit conversion of in-flight input keeps physical load on the step grid', () => {
    expect(convertInput({ value: 135, unit: 'lb', reps: 8, repsRight: 8, sidesDiffer: false, touched: true }, 'kg', 2.5).value).toBe(60);
  });

  it('unilateral work keeps the lower side as clean reps', () => {
    let d = newDraft(now);
    d = chooseLift(d, 'lower', 'db-split-squat', ctx).draft;
    d = { ...d, slots: { lower: { ...d.slots.lower!, input: { value: 30, unit: 'lb', reps: 9, repsRight: 8, sidesDiffer: true, touched: true } } } };
    d = logSet(d, 'lower', now);
    expect(d.slots.lower!.sets[0]).toMatchObject({ reps: 8, sideReps: [9, 8] });
  });
});
