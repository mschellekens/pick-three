import type { Equipment, Exercise, Region, Slot } from './types';

const BAR_LB = [45, 65, 95, 115, 135, 155, 185, 225];
const BAR_KG = [20, 30, 40, 50, 60, 70, 80, 100];
const DB_LB = [10, 15, 20, 25, 30, 35, 40, 50];
const DB_KG = [5, 7.5, 10, 12.5, 15, 17.5, 20, 25];
const MACH_LB = [40, 60, 80, 100, 120, 140, 160, 200];
const MACH_KG = [20, 25, 30, 40, 50, 60, 70, 90];

const SETUP = 'Same setup, same range of motion. Count only clean reps.';

export const CATALOG: Exercise[] = [
  // Lower body
  { id: 'back-squat', name: 'Back squat', slot: 'lower', equipment: ['barbell'], primary: ['quads'], secondary: ['glutes'], loadMode: 'total',
    step: { lb: 5, kg: 2.5 }, starts: { lb: BAR_LB, kg: BAR_KG }, cue: 'Bar over mid foot. Brace, sit down between the hips, stand up the same way.' },
  { id: 'leg-press', name: 'Leg press', slot: 'lower', equipment: ['machine'], primary: ['quads'], secondary: ['glutes'], loadMode: 'machine', setupSensitive: true,
    step: { lb: 10, kg: 5 }, starts: { lb: [90, 140, 180, 230, 270, 320, 360, 410], kg: [40, 60, 80, 100, 120, 140, 160, 180] }, cue: 'Same seat and foot position each time. Lower until your hips stay down, then press.' },
  { id: 'goblet-squat', name: 'Goblet squat', slot: 'lower', equipment: ['dumbbell', 'kettlebell'], primary: ['quads'], secondary: ['glutes'], loadMode: 'single',
    step: { lb: 5, kg: 2 }, starts: { lb: [20, 25, 30, 35, 40, 45, 50, 60], kg: [8, 10, 12, 16, 20, 24, 28, 32] }, cue: 'Weight at the chest. Elbows inside the knees at the bottom.' },
  { id: 'db-split-squat', name: 'Dumbbell split squat', slot: 'lower', equipment: ['dumbbell'], primary: ['quads', 'glutes'], secondary: [], loadMode: 'perHand', perSide: true,
    step: { lb: 5, kg: 2.5 }, starts: { lb: DB_LB, kg: DB_KG }, cue: 'Same stance length each time. Back knee down softly, front foot flat.' },
  { id: 'bb-rdl', name: 'Barbell Romanian deadlift', slot: 'lower', equipment: ['barbell'], primary: ['glutes', 'hamstrings'], secondary: [], loadMode: 'total',
    step: { lb: 5, kg: 2.5 }, starts: { lb: BAR_LB, kg: BAR_KG }, cue: 'Soft knees, hips back, bar close to the legs. Stop where your back stays flat.' },
  { id: 'db-rdl', name: 'Dumbbell Romanian deadlift', slot: 'lower', equipment: ['dumbbell'], primary: ['glutes', 'hamstrings'], secondary: [], loadMode: 'perHand',
    step: { lb: 5, kg: 2.5 }, starts: { lb: DB_LB, kg: DB_KG }, cue: 'Soft knees, hips back, weights close to the legs.' },
  { id: 'hip-thrust', name: 'Hip thrust', slot: 'lower', equipment: ['barbell'], primary: ['glutes'], secondary: ['hamstrings'], loadMode: 'total',
    step: { lb: 10, kg: 5 }, starts: { lb: BAR_LB, kg: BAR_KG }, cue: 'Upper back on the bench, chin tucked, full lockout with the glutes.' },
  // Push
  { id: 'bb-bench', name: 'Barbell bench press', slot: 'push', equipment: ['barbell'], primary: ['chest'], secondary: ['triceps', 'shoulders'], loadMode: 'total',
    step: { lb: 5, kg: 2.5 }, starts: { lb: BAR_LB, kg: BAR_KG }, cue: 'Same grip width. Touch the chest, press back over the shoulders.' },
  { id: 'db-bench', name: 'Dumbbell bench press', slot: 'push', equipment: ['dumbbell'], primary: ['chest'], secondary: ['triceps', 'shoulders'], loadMode: 'perHand',
    step: { lb: 5, kg: 2.5 }, starts: { lb: DB_LB, kg: DB_KG }, cue: 'Lower to chest level, press up and slightly in.' },
  { id: 'incline-db-press', name: 'Incline dumbbell press', slot: 'push', equipment: ['dumbbell'], primary: ['chest'], secondary: ['shoulders', 'triceps'], loadMode: 'perHand',
    step: { lb: 5, kg: 2.5 }, starts: { lb: DB_LB, kg: DB_KG }, cue: 'Same bench angle each time. Lower to upper chest.' },
  { id: 'seated-db-shoulder-press', name: 'Seated dumbbell shoulder press', slot: 'push', equipment: ['dumbbell'], primary: ['shoulders'], secondary: ['triceps'], loadMode: 'perHand',
    step: { lb: 5, kg: 2 }, starts: { lb: DB_LB, kg: DB_KG }, cue: 'Back on the pad. Lower to about ear height, press to lockout.' },
  { id: 'machine-chest-press', name: 'Machine chest press', slot: 'push', equipment: ['machine'], primary: ['chest'], secondary: ['triceps', 'shoulders'], loadMode: 'machine', setupSensitive: true,
    step: { lb: 10, kg: 5 }, starts: { lb: MACH_LB, kg: MACH_KG }, cue: 'Same seat height and handle position each time.' },
  { id: 'push-up', name: 'Push-up', slot: 'push', equipment: ['bodyweight'], primary: ['chest'], secondary: ['triceps', 'shoulders'], loadMode: 'bodyweight',
    step: { lb: 0, kg: 0 }, starts: { lb: [], kg: [] }, cue: 'Body in one line. Chest to a consistent depth.' },
  // Pull
  { id: 'lat-pulldown', name: 'Lat pulldown', slot: 'pull', equipment: ['cable', 'machine'], primary: ['back'], secondary: ['biceps', 'rearShoulders'], loadMode: 'machine', setupSensitive: true,
    step: { lb: 10, kg: 5 }, starts: { lb: MACH_LB, kg: MACH_KG }, cue: 'Same grip and seat. Pull to the upper chest without leaning back further.' },
  { id: 'cs-db-row', name: 'Chest-supported dumbbell row', slot: 'pull', equipment: ['dumbbell'], primary: ['back'], secondary: ['biceps', 'rearShoulders'], loadMode: 'perHand',
    step: { lb: 5, kg: 2.5 }, starts: { lb: DB_LB, kg: DB_KG }, cue: 'Chest stays on the pad. Pull elbows toward the hips.' },
  { id: 'seated-cable-row', name: 'Seated cable row', slot: 'pull', equipment: ['cable', 'machine'], primary: ['back'], secondary: ['biceps', 'rearShoulders'], loadMode: 'machine', setupSensitive: true,
    step: { lb: 10, kg: 5 }, starts: { lb: MACH_LB, kg: MACH_KG }, cue: 'Same handle and foot position. Torso still, pull to the belly.' },
  { id: 'pull-up', name: 'Pull-up', slot: 'pull', equipment: ['bodyweight'], primary: ['back'], secondary: ['biceps'], loadMode: 'bodyweight',
    step: { lb: 0, kg: 0 }, starts: { lb: [], kg: [] }, cue: 'From a dead hang, chin over the bar.' },
  { id: 'weighted-pull-up', name: 'Weighted pull-up', slot: 'pull', equipment: ['bodyweight'], primary: ['back'], secondary: ['biceps'], loadMode: 'added',
    step: { lb: 5, kg: 2.5 }, starts: { lb: [0, 5, 10, 15, 20, 25, 35, 45], kg: [0, 2.5, 5, 7.5, 10, 15, 20, 25] }, cue: 'Log only the added load. Dead hang to chin over the bar.' },
  { id: 'assisted-pull-up', name: 'Assisted pull-up', slot: 'pull', equipment: ['machine'], primary: ['back'], secondary: ['biceps'], loadMode: 'assist', setupSensitive: true,
    step: { lb: 10, kg: 5 }, starts: { lb: [0, 20, 40, 50, 60, 70, 80, 100], kg: [0, 10, 20, 25, 30, 35, 40, 50] }, cue: 'Log the assistance reading. Less assistance is harder.' },
];

export { SETUP as SETUP_REMINDER };

const BY_ID = new Map(CATALOG.map((e) => [e.id, e]));
export function getExercise(id: string): Exercise | undefined {
  return BY_ID.get(id);
}
export function mustExercise(id: string): Exercise {
  const e = BY_ID.get(id);
  if (!e) throw new Error(`Unknown exercise ${id}`);
  return e;
}
export function eligibleFor(slot: Slot): Exercise[] {
  return CATALOG.filter((e) => e.slot === slot);
}

export const REGIONS: Region[] = ['quads', 'glutes', 'hamstrings', 'chest', 'shoulders', 'back', 'triceps', 'biceps', 'rearShoulders'];
export const MAJOR_REGIONS: Region[] = ['quads', 'glutes', 'hamstrings', 'chest', 'shoulders', 'back'];
export const REGION_LABEL: Record<Region, string> = {
  quads: 'Quads',
  glutes: 'Glutes',
  hamstrings: 'Hamstrings',
  chest: 'Chest',
  shoulders: 'Shoulders',
  back: 'Back',
  triceps: 'Triceps',
  biceps: 'Biceps',
  rearShoulders: 'Rear shoulders',
};
export const REGION_VIEW: Record<Region, 'front' | 'back'> = {
  quads: 'front',
  chest: 'front',
  shoulders: 'front',
  biceps: 'front',
  glutes: 'back',
  hamstrings: 'back',
  back: 'back',
  triceps: 'back',
  rearShoulders: 'back',
};

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
};

export const LOAD_CONVENTION: Record<Exercise['loadMode'], string> = {
  total: 'total',
  machine: 'machine reading',
  single: 'one implement',
  perHand: 'per hand',
  bodyweight: 'bodyweight',
  added: 'added',
  assist: 'assistance',
};

export function hasLoad(e: Exercise): boolean {
  return e.loadMode !== 'bodyweight';
}
