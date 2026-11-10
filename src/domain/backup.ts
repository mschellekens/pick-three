/** Versioned backup export, validation and migration. Validation is all or nothing. */
import type { Equipment, LoggedSet, Meta, Series, Settings, Slot, Workout, WorkoutEntry } from './types';
import { SLOTS } from './types';
import { getExercise } from './catalog';
import { isValidIso, isValidLocalDate } from './dates';
import { defaultMeta, defaultSettings, firstSeriesId } from './defaults';
import { toKg } from './units';

export const SCHEMA_VERSION = 2;
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export const MAX_WORKOUTS = 20000;
export const MAX_LOAD_KG = 1000;
export const MAX_REPS = 500;

export interface Backup {
  app: 'pick-three';
  schemaVersion: number;
  exportedAt: string;
  settings: Settings;
  meta: Meta;
  workouts: Workout[];
}

export function makeBackup(settings: Settings, meta: Meta, workouts: Workout[], now = new Date()): Backup {
  return { app: 'pick-three', schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), settings, meta, workouts };
}

export type ImportResult = { ok: true; backup: Backup; migratedFrom: number | null } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 128;
const isNum = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

class Invalid extends Error {}
function req(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Invalid(msg);
}

function validateSet(raw: unknown, where: string, ids: Set<string>, loadMode: string): LoggedSet {
  req(isObj(raw), `${where}: set is not an object`);
  req(isId(raw.id) && !ids.has(raw.id), `${where}: set id missing or duplicated`);
  ids.add(raw.id);
  req(isNum(raw.loadKg, 0, MAX_LOAD_KG), `${where}: load out of range`);
  req(isObj(raw.input) && (raw.input.unit === 'kg' || raw.input.unit === 'lb') && isNum(raw.input.value, 0, MAX_LOAD_KG * 2.5), `${where}: load entry invalid`);
  req(Math.abs(toKg(raw.input.value as number, raw.input.unit as 'kg' | 'lb') - (raw.loadKg as number)) < 0.01, `${where}: load does not match its entry`);
  if (loadMode === 'bodyweight') req(raw.loadKg === 0, `${where}: bodyweight lift has a load`);
  req(Number.isInteger(raw.reps) && isNum(raw.reps, 1, MAX_REPS), `${where}: reps must be a positive whole number`);
  if (raw.sideReps !== undefined) {
    req(Array.isArray(raw.sideReps) && raw.sideReps.length === 2 && raw.sideReps.every((r) => Number.isInteger(r) && isNum(r, 0, MAX_REPS)), `${where}: side reps invalid`);
  }
  req(isValidIso(raw.loggedAt), `${where}: logged time invalid`);
  const out: LoggedSet = { id: raw.id, loadKg: raw.loadKg as number, input: { value: raw.input.value as number, unit: raw.input.unit as 'kg' | 'lb' }, reps: raw.reps as number, loggedAt: raw.loggedAt as string };
  if (raw.sideReps) out.sideReps = raw.sideReps as [number, number];
  return out;
}

function validateWorkout(raw: unknown, i: number, wIds: Set<string>, setIds: Set<string>, seriesIds: Set<string>): Workout {
  const where = `Workout ${i + 1}`;
  req(isObj(raw), `${where} is not an object`);
  req(isId(raw.id) && !wIds.has(raw.id), `${where}: id missing or duplicated`);
  wIds.add(raw.id);
  req(isValidIso(raw.startedAt) && isValidIso(raw.finishedAt) && isValidIso(raw.updatedAt), `${where}: timestamps invalid`);
  req(isValidLocalDate(raw.localDate), `${where}: date invalid`);
  req(typeof raw.partial === 'boolean', `${where}: partial flag invalid`);
  req(Array.isArray(raw.entries) && raw.entries.length >= 1 && raw.entries.length <= 3, `${where}: needs one to three lifts`);
  const slots = new Set<Slot>();
  const entries: WorkoutEntry[] = raw.entries.map((e: unknown, j: number) => {
    const ew = `${where}, lift ${j + 1}`;
    req(isObj(e), `${ew} invalid`);
    req(SLOTS.includes(e.slot as Slot) && !slots.has(e.slot as Slot), `${ew}: slot invalid`);
    slots.add(e.slot as Slot);
    const ex = isId(e.exerciseId) ? getExercise(e.exerciseId) : undefined;
    req(ex, `${ew}: unknown exercise`);
    req(ex.slot === e.slot, `${ew}: exercise does not match its slot`);
    req(isId(e.seriesId) && (e.seriesId as string).startsWith(`${ex.id}:`), `${ew}: setup series invalid`);
    seriesIds.add(e.seriesId as string);
    req(Array.isArray(e.sets) && e.sets.length <= 100, `${ew}: sets invalid`);
    return { slot: e.slot as Slot, exerciseId: ex.id, seriesId: e.seriesId as string, sets: e.sets.map((s: unknown, k: number) => validateSet(s, `${ew}, set ${k + 1}`, setIds, ex.loadMode)) };
  });
  req(entries.some((e) => e.sets.length > 0), `${where}: has no logged sets`);
  return { id: raw.id, startedAt: raw.startedAt as string, finishedAt: raw.finishedAt as string, updatedAt: raw.updatedAt as string, localDate: raw.localDate as string, partial: raw.partial, entries };
}

const EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell'];

function validateSettings(raw: unknown): Settings {
  const d = defaultSettings();
  if (!isObj(raw)) return d;
  return {
    unit: raw.unit === 'lb' || raw.unit === 'kg' ? raw.unit : d.unit,
    frequency: Number.isInteger(raw.frequency) && isNum(raw.frequency, 1, 5) ? (raw.frequency as number) : 3,
    equipment: Array.isArray(raw.equipment) ? (raw.equipment.filter((x) => EQUIPMENT.includes(x as Equipment)) as Equipment[]) : [],
    look: raw.look === 'tide' ? 'tide' : 'ember',
    increments: isObj(raw.increments)
      ? (Object.fromEntries(Object.entries(raw.increments).filter(([k, v]) => /^[a-z0-9-]+:(lb|kg)$/.test(k) && getExercise(k.split(':')[0]) && isNum(v, 0, 100))) as Record<string, number>)
      : {},
    favorites: Array.isArray(raw.favorites) ? raw.favorites.filter((x): x is string => typeof x === 'string' && !!getExercise(x)) : [],
    cueDismissed: raw.cueDismissed === true,
    peerComparison: 'off',
  };
}

function validateMeta(raw: unknown, usedSeries: Set<string>): Meta {
  const meta = defaultMeta();
  if (isObj(raw)) {
    if (Array.isArray(raw.series)) {
      for (const s of raw.series) {
        req(isObj(s) && isId(s.id) && isId(s.exerciseId) && getExercise(s.exerciseId) && isValidIso(s.createdAt) && Number.isInteger(s.index) && (s.index as number) >= 1, 'Setup series list is invalid');
        req(s.id === `${s.exerciseId}:${s.index}`, 'Setup series id is invalid');
        meta.series.push({ id: s.id, exerciseId: s.exerciseId, createdAt: s.createdAt as string, index: s.index as number });
      }
    }
    if (isObj(raw.currentSeries)) {
      for (const [k, v] of Object.entries(raw.currentSeries)) {
        req(getExercise(k) && isId(v) && v.startsWith(`${k}:`), 'Current setup list is invalid');
        meta.currentSeries[k] = v;
      }
    }
    if (Array.isArray(raw.milestones)) meta.milestones = raw.milestones.filter((m): m is string => typeof m === 'string' && m.length < 200).slice(0, 5000);
  }
  // Every referenced series must exist.
  const known = new Set(meta.series.map((s) => s.id));
  for (const id of usedSeries) {
    if (!known.has(id)) {
      const [exerciseId, idx] = [id.slice(0, id.lastIndexOf(':')), Number(id.slice(id.lastIndexOf(':') + 1))];
      req(Number.isInteger(idx) && idx >= 1, 'Setup series reference is invalid');
      meta.series.push({ id, exerciseId, createdAt: new Date(0).toISOString(), index: idx });
      known.add(id);
    }
  }
  for (const s of meta.series) if (!meta.currentSeries[s.exerciseId] || s.index > Number(meta.currentSeries[s.exerciseId].split(':').pop())) meta.currentSeries[s.exerciseId] = s.id;
  for (const v of Object.values(meta.currentSeries)) req(known.has(v), 'Current setup refers to an unknown series');
  return meta;
}

/** v1 stored sets as { kg, reps } with no setup series. */
function migrateV1(raw: Record<string, unknown>): Record<string, unknown> {
  const workouts = Array.isArray(raw.workouts) ? raw.workouts : [];
  return {
    ...raw,
    schemaVersion: 2,
    meta: { series: [], currentSeries: {}, milestones: [] },
    workouts: workouts.map((w) => {
      if (!isObj(w)) return w;
      return {
        ...w,
        updatedAt: w.updatedAt ?? w.finishedAt,
        entries: Array.isArray(w.entries)
          ? w.entries.map((e) =>
              isObj(e)
                ? {
                    ...e,
                    seriesId: typeof e.exerciseId === 'string' ? firstSeriesId(e.exerciseId) : undefined,
                    sets: Array.isArray(e.sets) ? e.sets.map((s) => (isObj(s) ? { id: s.id, loadKg: s.kg, input: { value: s.kg, unit: 'kg' }, reps: s.reps, loggedAt: s.loggedAt } : s)) : e.sets,
                  }
                : e,
            )
          : w.entries,
      };
    }),
  };
}

export function parseBackup(text: string, byteLength = new Blob([text]).size): ImportResult {
  if (byteLength > MAX_BACKUP_BYTES) return { ok: false, error: `This file is larger than ${MAX_BACKUP_BYTES / 1024 / 1024} MB, so it isn't a Pick Three backup.` };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't valid JSON. Choose a backup exported from Pick Three." };
  }
  try {
    req(isObj(raw) && raw.app === 'pick-three', "This file isn't a Pick Three backup.");
    req(Number.isInteger(raw.schemaVersion) && (raw.schemaVersion as number) >= 1, 'The backup version is missing.');
    const version = raw.schemaVersion as number;
    if (version > SCHEMA_VERSION) return { ok: false, error: 'This backup was made by a newer version of Pick Three. Reload the app to update, then try again.' };
    let data = raw as Record<string, unknown>;
    if (version === 1) data = migrateV1(data);
    req(isValidIso(data.exportedAt), 'The backup date is invalid.');
    req(Array.isArray(data.workouts) && data.workouts.length <= MAX_WORKOUTS, 'The workout list is missing or too long.');
    const wIds = new Set<string>();
    const setIds = new Set<string>();
    const seriesIds = new Set<string>();
    const workouts = data.workouts.map((w, i) => validateWorkout(w, i, wIds, setIds, seriesIds));
    const meta = validateMeta(data.meta, seriesIds);
    const settings = validateSettings(data.settings);
    return { ok: true, backup: { app: 'pick-three', schemaVersion: SCHEMA_VERSION, exportedAt: data.exportedAt as string, settings, meta, workouts }, migratedFrom: version === SCHEMA_VERSION ? null : version };
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: `This backup can't be imported. ${e.message}.`.replace('..', '.') };
    return { ok: false, error: "This backup can't be imported." };
  }
}

export type { Series };
