/**
 * Local-first IndexedDB persistence. Real data only. Demo data never comes through here.
 * Every multi-record change (finish, import, reset) is a single transaction.
 */
import type { Draft, Meta, Settings, Workout } from '../domain/types';

export const DB_NAME = 'pick-three';
export const DB_VERSION = 1;
const KV = 'kv';
const WORKOUTS = 'workouts';

export class StorageError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'StorageError';
  }
}
export class ConflictError extends Error {
  constructor() {
    super('Your workout changed in another tab or window.');
    this.name = 'ConflictError';
  }
}

declare global {
  // Test hook: simulate a failed write. Never set in normal use.
  var __P3_FAIL_WRITES: boolean | undefined;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new StorageError('This browser has no local storage available, so workouts cannot be saved here.'));
      return;
    }
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      reject(new StorageError('Local storage is blocked in this browser mode.', e));
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV);
      if (!db.objectStoreNames.contains(WORKOUTS)) db.createObjectStore(WORKOUTS, { keyPath: 'id' });
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => reject(new StorageError('Local storage could not be opened. Private browsing or low storage can cause this.', req.error));
    req.onblocked = () => reject(new StorageError('Close other Pick Three tabs, then try again.'));
  });
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error instanceof Error && tx.error.name === 'ConflictError' ? tx.error : new StorageError('Saving failed. Your data was not changed.', tx.error));
    tx.onerror = () => {
      /* handled by onabort */
    };
  });
}

function get<T>(store: IDBObjectStore, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const r = store.get(key);
    r.onsuccess = () => resolve(r.result as T | undefined);
    r.onerror = () => reject(r.error);
  });
}

function checkWritable() {
  if (globalThis.__P3_FAIL_WRITES) throw new StorageError('Saving failed. Your data was not changed.');
}

export interface Loaded {
  settings?: Settings;
  meta?: Meta;
  draft?: Draft | null;
  onboarded?: boolean;
  workouts: Workout[];
}

export async function loadAll(): Promise<Loaded> {
  const db = await openDb();
  const tx = db.transaction([KV, WORKOUTS], 'readonly');
  const kv = tx.objectStore(KV);
  const [settings, meta, draft, onboarded] = await Promise.all([
    get<Settings>(kv, 'settings'),
    get<Meta>(kv, 'meta'),
    get<Draft>(kv, 'draft'),
    get<boolean>(kv, 'onboarded'),
  ]);
  const workouts = await new Promise<Workout[]>((resolve, reject) => {
    const r = tx.objectStore(WORKOUTS).getAll();
    r.onsuccess = () => resolve(r.result as Workout[]);
    r.onerror = () => reject(r.error);
  });
  return { settings, meta, draft: draft ?? null, onboarded: !!onboarded, workouts };
}

async function writeTx(stores: string[], body: (tx: IDBTransaction) => void | Promise<void>): Promise<void> {
  checkWritable();
  const db = await openDb();
  const tx = db.transaction(stores, 'readwrite');
  const finished = done(tx);
  try {
    await body(tx);
  } catch (e) {
    try {
      tx.abort();
    } catch {
      /* already finished */
    }
    await finished.catch(() => undefined);
    throw e;
  }
  await finished;
}

export function putKv(key: 'settings' | 'meta' | 'onboarded', value: unknown): Promise<void> {
  return writeTx([KV], (tx) => {
    tx.objectStore(KV).put(value, key);
  });
}

/** Write the draft only if the stored revision is the one this tab last saw. */
export function putDraft(draft: Draft, meta?: Meta): Promise<void> {
  return writeTx([KV], async (tx) => {
    const kv = tx.objectStore(KV);
    const cur = await get<Draft>(kv, 'draft');
    const expected = draft.rev - 1;
    if (cur && (cur.id !== draft.id || cur.rev !== expected)) throw new ConflictError();
    if (!cur && expected > 0) throw new ConflictError();
    kv.put(draft, 'draft');
    if (meta) kv.put(meta, 'meta');
  });
}

export function deleteDraft(draftId: string): Promise<void> {
  return writeTx([KV], async (tx) => {
    const kv = tx.objectStore(KV);
    const cur = await get<Draft>(kv, 'draft');
    if (cur && cur.id === draftId) kv.delete('draft');
  });
}

/**
 * Atomically save a finished workout and clear its draft. Idempotent: the workout id is the
 * draft id, so a repeated finish or a reload mid-save can never create a second workout.
 */
export function finishDraft(workout: Workout, meta: Meta, draftRev: number): Promise<'saved' | 'already'> {
  let result: 'saved' | 'already' = 'saved';
  return writeTx([KV, WORKOUTS], async (tx) => {
    const kv = tx.objectStore(KV);
    const ws = tx.objectStore(WORKOUTS);
    const existing = await get<Workout>(ws, workout.id);
    const cur = await get<Draft>(kv, 'draft');
    if (existing) {
      result = 'already';
      if (cur && cur.id === workout.id) kv.delete('draft');
      return;
    }
    if (!cur || cur.id !== workout.id || cur.rev !== draftRev) throw new ConflictError();
    ws.put(workout);
    kv.put(meta, 'meta');
    kv.delete('draft');
  }).then(() => result);
}

export function putWorkout(workout: Workout, meta?: Meta): Promise<void> {
  return writeTx([KV, WORKOUTS], (tx) => {
    tx.objectStore(WORKOUTS).put(workout);
    if (meta) tx.objectStore(KV).put(meta, 'meta');
  });
}

export function deleteWorkout(id: string): Promise<void> {
  return writeTx([WORKOUTS], (tx) => {
    tx.objectStore(WORKOUTS).delete(id);
  });
}

export function replaceAll(settings: Settings, meta: Meta, workouts: Workout[]): Promise<void> {
  return writeTx([KV, WORKOUTS], (tx) => {
    const ws = tx.objectStore(WORKOUTS);
    ws.clear();
    for (const w of workouts) ws.put(w);
    const kv = tx.objectStore(KV);
    kv.put(settings, 'settings');
    kv.put(meta, 'meta');
    kv.put(true, 'onboarded');
  });
}

export function resetAll(): Promise<void> {
  return writeTx([KV, WORKOUTS], (tx) => {
    tx.objectStore(WORKOUTS).clear();
    tx.objectStore(KV).clear();
  });
}

export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* not supported */
  }
  return false;
}
