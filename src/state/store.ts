import { useSyncExternalStore } from 'react';
import type { AppData, Draft, LoggedSet, Meta, SetInput, Settings, Slot, Workout } from '../domain/types';
import { mustExercise } from '../domain/catalog';
import { defaultMeta, defaultSettings, newSeries } from '../domain/defaults';
import * as D from '../domain/draft';
import { newMilestones, type Milestone } from '../domain/milestones';
import { stepFor } from '../domain/progression';
import { makeBackup, type Backup } from '../domain/backup';
import * as db from '../storage/db';

export type Status = 'loading' | 'ready' | 'error';

export interface State extends AppData {
  status: Status;
  loadError: string | null;
  saveError: string | null;
  conflict: boolean;
  pending: boolean;
  lastFinish: { workoutId: string; milestones: Milestone[] } | null;
  undo: { label: string; draft: Draft } | null;
}

const listeners = new Set<() => void>();
let state: State = {
  status: 'loading',
  loadError: null,
  saveError: null,
  conflict: false,
  pending: false,
  settings: defaultSettings(typeof navigator !== 'undefined' ? navigator.language : undefined),
  meta: defaultMeta(),
  workouts: [],
  draft: null,
  onboarded: false,
  lastFinish: null,
  undo: null,
};

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getState(): State {
  return state;
}

export function useStore(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pick-three-sync') : null;
const tabId = Math.random().toString(36).slice(2);
function broadcast() {
  channel?.postMessage({ type: 'changed', from: tabId });
}
channel?.addEventListener('message', (e: MessageEvent) => {
  if (e.data?.type === 'changed' && e.data.from !== tabId) void reload();
});

/** Serialize all writes so rapid taps persist in order. */
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const p = queue.then(fn, fn);
  queue = p.catch(() => undefined);
  return p;
}

function describe(e: unknown): string {
  if (e instanceof db.ConflictError) return e.message;
  if (e instanceof db.StorageError) return e.message;
  return 'Saving failed. Your data was not changed.';
}

export async function reload(): Promise<void> {
  try {
    const l = await db.loadAll();
    set({
      status: 'ready',
      loadError: null,
      conflict: false,
      settings: { ...defaultSettings(navigator.language), ...(l.settings ?? {}) },
      meta: l.meta ?? defaultMeta(),
      workouts: l.workouts,
      draft: l.draft ?? null,
      onboarded: !!l.onboarded,
    });
  } catch (e) {
    set({ status: 'error', loadError: describe(e) });
  }
}

export function dismissSaveError() {
  set({ saveError: null });
}

type Change = { draft: Draft | null; meta?: Meta; undo?: State['undo'] } | null;

/**
 * Persist first, then commit to memory. A failed save never shows success.
 * The change is computed inside the write queue from the latest committed draft,
 * so rapid taps never race each other.
 */
function mutate(fn: (d: Draft | null) => Change): Promise<boolean> {
  return enqueue(async () => {
    let change: Change;
    try {
      change = fn(state.draft);
    } catch {
      return false;
    }
    if (!change) return false;
    const { draft: next, meta, undo } = change;
    try {
      if (next) await db.putDraft(next, meta);
      else if (state.draft) await db.deleteDraft(state.draft.id);
      set({ draft: next, ...(meta ? { meta } : {}), saveError: null, ...(undo !== undefined ? { undo } : {}) });
      broadcast();
      return true;
    } catch (e) {
      if (e instanceof db.ConflictError) set({ conflict: true, saveError: describe(e) });
      else set({ saveError: describe(e) });
      return false;
    }
  });
}

function need(d: Draft | null): Draft {
  if (!d) throw new Error('No draft');
  return d;
}

const now = () => new Date();

export const actions = {
  async completeOnboarding() {
    try {
      await db.putKv('onboarded', true);
      set({ onboarded: true });
    } catch (e) {
      set({ onboarded: true, saveError: describe(e) });
    }
  },

  async beginPicking(): Promise<boolean> {
    if (state.draft) return true;
    return mutate((d) => (d ? null : { draft: D.newDraft(now()) }));
  },

  async chooseLift(slot: Slot, exerciseId: string): Promise<boolean> {
    return mutate((dd) => {
      const d = need(dd);
      const r = D.chooseLift(d, slot, exerciseId, { meta: state.meta, workouts: state.workouts, settings: state.settings, now: now() });
      return { draft: d.status === 'active' ? { ...r.draft, active: slot } : r.draft, meta: r.meta, undo: null };
    });
  },

  async newSetup(slot: Slot): Promise<boolean> {
    return mutate((dd) => {
      const d = need(dd);
      const ds = d.slots[slot];
      if (!ds || ds.sets.length > 0) return null;
      const r = newSeries(state.meta, ds.exerciseId, now().toISOString());
      const ex = mustExercise(ds.exerciseId);
      const sug = D.computeSuggestion(ex, r.seriesId, state.workouts, state.settings, now());
      const next = D.bump({ ...d, slots: { ...d.slots, [slot]: { ...ds, seriesId: r.seriesId, suggestion: sug, input: D.seedInput(ex, sug, state.workouts, r.seriesId, state.settings.unit) } } }, now());
      return { draft: next, meta: r.meta };
    });
  },

  async start(): Promise<boolean> {
    return mutate((dd) => {
    const d = need(dd);
    if (d.status === 'active') return null;
    // Refresh suggestions at start so they reflect the latest saved history, then keep them fixed.
    const slots = { ...d.slots };
    for (const s of ['lower', 'push', 'pull'] as Slot[]) {
      const ds = slots[s]!;
      const ex = mustExercise(ds.exerciseId);
      const sug = D.computeSuggestion(ex, ds.seriesId, state.workouts, state.settings, now());
      slots[s] = { ...ds, suggestion: sug, input: ds.input.touched ? ds.input : D.seedInput(ex, sug, state.workouts, ds.seriesId, state.settings.unit) };
    }
    return { draft: D.startDraft({ ...d, slots }, now()) };
    });
  },

  async setActive(slot: Slot) {
    return mutate((dd) => {
      const d = need(dd);
      return d.active === slot ? null : { draft: D.bump({ ...d, active: slot }, now()) };
    });
  },

  async updateInput(slot: Slot, patch: Partial<SetInput> | ((i: SetInput) => Partial<SetInput>)) {
    return mutate((dd) => {
      const d = need(dd);
      const ds = d.slots[slot]!;
      const p = typeof patch === 'function' ? patch(ds.input) : patch;
      return { draft: D.bump({ ...d, slots: { ...d.slots, [slot]: { ...ds, input: { ...ds.input, ...p, touched: true } } } }, now()) };
    });
  },

  async logSet(slot: Slot): Promise<boolean> {
    if (state.pending) return false;
    set({ pending: true });
    try {
      return await mutate((dd) => {
        const d = need(dd);
        return { draft: D.logSet(d, slot, now()), undo: { label: 'Set logged', draft: d } };
      });
    } finally {
      set({ pending: false });
    }
  },

  async editSet(slot: Slot, setId: string, input: SetInput) {
    return mutate((dd) => {
      const d = need(dd);
      return { draft: D.replaceSet(d, slot, setId, input, now()), undo: { label: 'Set updated', draft: d } };
    });
  },

  async removeSet(slot: Slot, setId: string) {
    return mutate((dd) => {
      const d = need(dd);
      return { draft: D.removeSet(d, slot, setId, now()), undo: { label: 'Set removed', draft: d } };
    });
  },

  async undo() {
    return mutate((d) => {
      const u = state.undo;
      if (!u || !d || u.draft.id !== d.id) return null;
      return { draft: { ...u.draft, rev: d.rev + 1, updatedAt: now().toISOString() }, undo: null };
    });
  },

  clearUndo() {
    set({ undo: null });
  },

  async discardDraft() {
    return mutate(() => ({ draft: null, undo: null }));
  },

  async finish(): Promise<{ ok: true; workoutId: string } | { ok: false; error: string }> {
    if (state.pending) return { ok: false, error: 'Saving…' };
    set({ pending: true });
    try {
      return await enqueue(async () => {
        if (!state.draft) {
          return state.lastFinish ? { ok: true as const, workoutId: state.lastFinish.workoutId } : { ok: false as const, error: 'There is no workout in progress.' };
        }
        const d = state.draft;
        if (D.finishKind(d) === 'empty') return { ok: false as const, error: 'Log at least one set before saving.' };
        const w = D.draftToWorkout(d, now());
        const nextWorkouts = [...state.workouts.filter((x) => x.id !== w.id), w];
        const ms = newMilestones(nextWorkouts, w.id, state.settings.unit, state.meta.milestones);
        const meta = { ...state.meta, milestones: [...state.meta.milestones, ...ms.map((m) => m.key)] };
        try {
          const r = await db.finishDraft(w, meta, d.rev);
          if (r === 'already') {
            await reload();
            set({ lastFinish: { workoutId: w.id, milestones: [] } });
          } else {
            set({ workouts: nextWorkouts, meta, draft: null, undo: null, saveError: null, lastFinish: { workoutId: w.id, milestones: ms } });
          }
          broadcast();
          return { ok: true as const, workoutId: w.id };
        } catch (e) {
          if (e instanceof db.ConflictError) set({ conflict: true });
          const error = describe(e);
          set({ saveError: error });
          return { ok: false as const, error };
        }
      });
    } finally {
      set({ pending: false });
    }
  },

  async updateSettings(patch: Partial<Settings>): Promise<boolean> {
    const next = { ...state.settings, ...patch };
    try {
      await db.putKv('settings', next);
      const draft = state.draft;
      set({ settings: next, saveError: null });
      if (patch.unit && draft) {
        const slots = { ...draft.slots };
        for (const k of Object.keys(slots) as Slot[]) {
          const ds = slots[k]!;
          const ex = mustExercise(ds.exerciseId);
          const sug = D.computeSuggestion(ex, ds.seriesId, state.workouts, next, now());
          slots[k] = { ...ds, input: D.convertInput(ds.input, next.unit, stepFor(ex, next.unit, next.increments)), suggestion: sug };
        }
        const converted = D.bump({ ...draft, slots }, now());
        await mutate((d) => (d && d.id === converted.id && d.rev === converted.rev - 1 ? { draft: converted } : null));
      }
      broadcast();
      return true;
    } catch (e) {
      set({ saveError: describe(e) });
      return false;
    }
  },

  async toggleFavorite(id: string) {
    const f = state.settings.favorites;
    return actions.updateSettings({ favorites: f.includes(id) ? f.filter((x) => x !== id) : [...f, id] });
  },

  async saveWorkout(w: Workout): Promise<boolean> {
    return enqueue(async () => {
      const next = D.recomputePartial({ ...w, updatedAt: now().toISOString() });
      try {
        await db.putWorkout(next);
        set({ workouts: state.workouts.map((x) => (x.id === next.id ? next : x)), saveError: null });
        broadcast();
        return true;
      } catch (e) {
        set({ saveError: describe(e) });
        return false;
      }
    });
  },

  async editWorkoutSet(workoutId: string, slot: Slot, setId: string, input: SetInput | null): Promise<boolean> {
    const w = state.workouts.find((x) => x.id === workoutId);
    if (!w) return false;
    const entries = w.entries.map((e) => {
      if (e.slot !== slot) return e;
      const ex = mustExercise(e.exerciseId);
      const sets: LoggedSet[] = input
        ? e.sets.map((s) => (s.id === setId ? { ...D.inputToSet(ex, input, now(), s.id), loggedAt: s.loggedAt } : s))
        : e.sets.filter((s) => s.id !== setId);
      return { ...e, sets };
    });
    if (!entries.some((e) => e.sets.length > 0)) return false;
    return actions.saveWorkout({ ...w, entries });
  },

  async deleteWorkout(id: string): Promise<boolean> {
    return enqueue(async () => {
      try {
        await db.deleteWorkout(id);
        set({ workouts: state.workouts.filter((w) => w.id !== id), saveError: null });
        broadcast();
        return true;
      } catch (e) {
        set({ saveError: describe(e) });
        return false;
      }
    });
  },

  exportBackup(): Backup {
    return makeBackup(state.settings, state.meta, state.workouts);
  },

  async importBackup(b: Backup): Promise<boolean> {
    return enqueue(async () => {
      try {
        await db.replaceAll(b.settings, b.meta, b.workouts);
        set({ settings: b.settings, meta: b.meta, workouts: b.workouts, onboarded: true, saveError: null });
        broadcast();
        return true;
      } catch (e) {
        set({ saveError: describe(e) });
        return false;
      }
    });
  },

  async resetData(): Promise<boolean> {
    return enqueue(async () => {
      try {
        await db.resetAll();
        set({ settings: defaultSettings(navigator.language), meta: defaultMeta(), workouts: [], draft: null, onboarded: false, undo: null, lastFinish: null, saveError: null });
        broadcast();
        return true;
      } catch (e) {
        set({ saveError: describe(e) });
        return false;
      }
    });
  },

  async reloadLatest() {
    await reload();
  },
};

export function isSaving(): boolean {
  return state.pending;
}
