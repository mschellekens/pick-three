export type Region = 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Quads' | 'Glutes' | 'Hamstrings' | 'Core';

export interface Exercise {
  id: string;
  name: string;
  regions: Region[];
  holyGrail?: boolean;
  step: number;
}

export const SHORTLIST: Exercise[] = [
  { id: 'squat', name: 'Barbell back squat', regions: ['Quads', 'Glutes'], holyGrail: true, step: 5 },
  { id: 'deadlift', name: 'Conventional deadlift', regions: ['Back', 'Glutes', 'Hamstrings'], holyGrail: true, step: 10 },
  { id: 'bench', name: 'Barbell bench press', regions: ['Chest', 'Arms'], holyGrail: true, step: 5 },
  { id: 'ohp', name: 'Overhead press', regions: ['Shoulders', 'Arms'], holyGrail: true, step: 5 },
  { id: 'pullup', name: 'Pull-up', regions: ['Back', 'Arms'], holyGrail: true, step: 0 },
  { id: 'row', name: 'Barbell row', regions: ['Back'], holyGrail: true, step: 5 },
  { id: 'rdl', name: 'Romanian deadlift', regions: ['Hamstrings', 'Glutes'], holyGrail: true, step: 5 },
  { id: 'hipthrust', name: 'Hip thrust', regions: ['Glutes'], holyGrail: true, step: 10 },
  { id: 'dip', name: 'Dip', regions: ['Chest', 'Arms'], holyGrail: true, step: 0 },
  { id: 'incline', name: 'Incline bench press', regions: ['Chest', 'Shoulders'], holyGrail: true, step: 5 },
];

export const LIBRARY: Exercise[] = [
  ...SHORTLIST,
  { id: 'legpress', name: 'Leg press', regions: ['Quads'], step: 10 },
  { id: 'pulldown', name: 'Lat pulldown', regions: ['Back'], step: 10 },
  { id: 'dbbench', name: 'Dumbbell bench', regions: ['Chest'], step: 5 },
  { id: 'lateral', name: 'Lateral raise', regions: ['Shoulders'], step: 2.5 },
  { id: 'curl', name: 'Barbell curl', regions: ['Arms'], step: 2.5 },
  { id: 'tricep', name: 'Tricep pushdown', regions: ['Arms'], step: 5 },
  { id: 'lunge', name: 'Walking lunge', regions: ['Quads', 'Glutes'], step: 5 },
  { id: 'facepull', name: 'Face pull', regions: ['Shoulders', 'Back'], step: 5 },
  { id: 'legcurl', name: 'Leg curl', regions: ['Hamstrings'], step: 5 },
  { id: 'calf', name: 'Calf raise', regions: ['Quads'], step: 10 },
  { id: 'plank', name: 'Plank', regions: ['Core'], step: 0 },
  { id: 'hangingleg', name: 'Hanging leg raise', regions: ['Core'], step: 0 },
];

export const getExercise = (id: string) => LIBRARY.find(e => e.id === id);
