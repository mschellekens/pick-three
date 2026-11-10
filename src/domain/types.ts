export type Slot = 'lower' | 'push' | 'pull';
export const SLOTS: Slot[] = ['lower', 'push', 'pull'];
export const SLOT_LABEL: Record<Slot, string> = { lower: 'Lower body', push: 'Push', pull: 'Pull' };

export type Unit = 'lb' | 'kg';

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell';

/**
 * How load is recorded and compared.
 * total: total external load (bar + plates)
 * machine: machine stack reading, comparable on the same setup only
 * single: one implement (e.g. one dumbbell or kettlebell)
 * perHand: load in each hand
 * bodyweight: reps only, no external load
 * added: external load added to bodyweight (belt or vest); bodyweight is never added
 * assist: assistance reading; lower assistance is harder
 */
export type LoadMode = 'total' | 'machine' | 'single' | 'perHand' | 'bodyweight' | 'added' | 'assist';

export type Region =
  | 'quads'
  | 'glutes'
  | 'hamstrings'
  | 'chest'
  | 'shoulders'
  | 'back'
  | 'triceps'
  | 'biceps'
  | 'rearShoulders';

export interface Exercise {
  id: string;
  name: string;
  slot: Slot;
  equipment: Equipment[];
  primary: Region[];
  secondary: Region[];
  loadMode: LoadMode;
  /** Unilateral: reps logged per side for the same weight. */
  perSide?: boolean;
  /** Default increment per unit, in that unit. */
  step: Record<Unit, number>;
  /** Tap-selectable starting values, in each unit. */
  starts: Record<Unit, number[]>;
  cue: string;
  /** Machine or assistance readings are only comparable on the same setup. */
  setupSensitive?: boolean;
}

export interface LoadInput {
  value: number;
  unit: Unit;
}

export interface LoggedSet {
  id: string;
  /** Normalized physical load in kg (per hand for perHand, assistance for assist). 0 for bodyweight. */
  loadKg: number;
  /** Original entry, kept for exact round trip. */
  input: LoadInput;
  /** Clean reps. For unilateral work this is the lower side. */
  reps: number;
  /** Optional per side detail [left, right] for unilateral work. */
  sideReps?: [number, number];
  loggedAt: string;
}

export interface WorkoutEntry {
  slot: Slot;
  exerciseId: string;
  seriesId: string;
  sets: LoggedSet[];
}

export interface Workout {
  id: string;
  startedAt: string;
  finishedAt: string;
  /** Local calendar day of the start, YYYY-MM-DD. Stable across time zone changes. */
  localDate: string;
  partial: boolean;
  entries: WorkoutEntry[];
  updatedAt: string;
}

export interface SetInput {
  value: number;
  unit: Unit;
  reps: number;
  repsRight: number;
  sidesDiffer: boolean;
  touched: boolean;
}

export interface DraftSlot {
  exerciseId: string;
  seriesId: string;
  sets: LoggedSet[];
  input: SetInput;
  suggestion: import('./progression').Suggestion | null;
}

export interface Draft {
  id: string;
  status: 'picking' | 'active';
  createdAt: string;
  startedAt?: string;
  localDate?: string;
  slots: Partial<Record<Slot, DraftSlot>>;
  active: Slot;
  rev: number;
  updatedAt: string;
}

export interface Series {
  id: string;
  exerciseId: string;
  createdAt: string;
  index: number;
}

export interface Settings {
  unit: Unit;
  frequency: number; // 1–5 sessions per week
  equipment: Equipment[]; // empty = all
  look: 'ember' | 'tide';
  /** Per lift per unit increment override. Key `${exerciseId}:${unit}`. */
  increments: Record<string, number>;
  favorites: string[];
  cueDismissed: boolean;
  peerComparison: 'off';
}

export interface Meta {
  /** Current setup series per exercise. */
  currentSeries: Record<string, string>;
  series: Series[];
  /** Milestone keys already celebrated, for dedupe across edits and reloads. */
  milestones: string[];
}

export interface AppData {
  settings: Settings;
  meta: Meta;
  workouts: Workout[];
  draft: Draft | null;
  onboarded: boolean;
}
