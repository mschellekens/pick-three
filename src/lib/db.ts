import { openDB } from 'idb';
let dbp: Promise<any> | null = null;
export const getDB = () => dbp ??= openDB('pick-three', 1, { upgrade(db) { db.createObjectStore('workouts', { keyPath: 'id' }); } });
export const saveWorkout = async (w: any) => (await getDB()).put('workouts', w);
export const getAllWorkouts = async () => (await getDB()).getAll('workouts');
