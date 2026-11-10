export type Slot = 'lower' | 'push' | 'pull';
export interface Exercise {
  id: string; name: string; slot: Slot; primaryRegions: string[];
  loadMode: string; defaultStepLb: number;
}
export const EXERCISES: Exercise[] = [
  { id: 'back-squat', name: 'Back squat', slot: 'lower', primaryRegions: ['Quads'], loadMode: 'total-external', defaultStepLb: 5 },
  { id: 'leg-press', name: 'Leg press', slot: 'lower', primaryRegions: ['Quads'], loadMode: 'machine-indicated', defaultStepLb: 10 },
  { id: 'goblet-squat', name: 'Goblet squat', slot: 'lower', primaryRegions: ['Quads'], loadMode: 'single-implement', defaultStepLb: 5 },
  { id: 'bb-rdl', name: 'Barbell Romanian deadlift', slot: 'lower', primaryRegions: ['Glutes'], loadMode: 'total-external', defaultStepLb: 5 },
  { id: 'hip-thrust', name: 'Hip thrust', slot: 'lower', primaryRegions: ['Glutes'], loadMode: 'total-external', defaultStepLb: 10 },
  { id: 'bb-bench', name: 'Barbell bench press', slot: 'push', primaryRegions: ['Chest'], loadMode: 'total-external', defaultStepLb: 5 },
  { id: 'db-bench', name: 'Dumbbell bench press', slot: 'push', primaryRegions: ['Chest'], loadMode: 'per-hand', defaultStepLb: 5 },
  { id: 'seated-db-press', name: 'Seated dumbbell shoulder press', slot: 'push', primaryRegions: ['Shoulders'], loadMode: 'per-hand', defaultStepLb: 5 },
  { id: 'push-up', name: 'Push-up', slot: 'push', primaryRegions: ['Chest'], loadMode: 'bodyweight-reps', defaultStepLb: 0 },
  { id: 'lat-pulldown', name: 'Lat pulldown', slot: 'pull', primaryRegions: ['Back'], loadMode: 'machine-indicated', defaultStepLb: 10 },
  { id: 'cs-db-row', name: 'Chest-supported dumbbell row', slot: 'pull', primaryRegions: ['Back'], loadMode: 'per-hand', defaultStepLb: 5 },
  { id: 'pull-up', name: 'Pull-up', slot: 'pull', primaryRegions: ['Back'], loadMode: 'bodyweight-reps', defaultStepLb: 0 },
  { id: 'assisted-pull-up', name: 'Assisted pull-up', slot: 'pull', primaryRegions: ['Back'], loadMode: 'assistance-indicated', defaultStepLb: 10 },
];
export const getExercise = (id: string) => EXERCISES.find(e => e.id === id);
export const exercisesForSlot = (s: Slot) => EXERCISES.filter(e => e.slot === s);
