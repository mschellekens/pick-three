import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { ConflictError, finishDraft, loadAll, putDraft, putKv, replaceAll, resetAll, StorageError } from './db';
import { chooseLift, draftToWorkout, logSet, newDraft, startDraft } from '../domain/draft';
import { defaultMeta, defaultSettings } from '../domain/defaults';
import { parseBackup, makeBackup } from '../domain/backup';

const now = new Date('2026-03-10T15:00:00Z');

async function activeDraft() {
  let d = newDraft(now);
  let meta = defaultMeta();
  const settings = defaultSettings('en-US');
  for (const [slot, id] of [['lower', 'back-squat'], ['push', 'bb-bench'], ['pull', 'lat-pulldown']] as const) {
    const r = chooseLift(d, slot, id, { meta, workouts: [], settings, now });
    d = r.draft;
    meta = r.meta;
  }
  d = startDraft(d, now);
  d = logSet(logSet(logSet(d, 'lower', now), 'push', now), 'pull', now);
  d = { ...d, rev: 1 };
  await putDraft(d);
  return { d, meta };
}

beforeEach(async () => {
  globalThis.__P3_FAIL_WRITES = false;
  await resetAll();
});

describe('storage', () => {
  it('finish is atomic and idempotent', async () => {
    const { d, meta } = await activeDraft();
    const w = draftToWorkout(d, now);
    expect(await finishDraft(w, meta, d.rev)).toBe('saved');
    expect(await finishDraft(w, meta, d.rev)).toBe('already');
    const all = await loadAll();
    expect(all.workouts).toHaveLength(1);
    expect(all.draft).toBeNull();
  });

  it('rejects a stale draft write from another tab', async () => {
    const { d } = await activeDraft();
    await putDraft({ ...d, rev: 2 }); // tab A
    await expect(putDraft({ ...d, rev: 2 })).rejects.toBeInstanceOf(ConflictError); // tab B with stale rev
    const all = await loadAll();
    expect(all.draft!.rev).toBe(2);
  });

  it('a failed write leaves data untouched and does not clear the draft', async () => {
    const { d, meta } = await activeDraft();
    globalThis.__P3_FAIL_WRITES = true;
    await expect(finishDraft(draftToWorkout(d, now), meta, d.rev)).rejects.toBeInstanceOf(StorageError);
    globalThis.__P3_FAIL_WRITES = false;
    const all = await loadAll();
    expect(all.workouts).toHaveLength(0);
    expect(all.draft!.id).toBe(d.id);
  });

  it('exported backup imports into a clean profile, and a bad file leaves history intact', async () => {
    const { d, meta } = await activeDraft();
    await finishDraft(draftToWorkout(d, now), meta, d.rev);
    await putKv('settings', defaultSettings('en-US'));
    const before = await loadAll();
    const text = JSON.stringify(makeBackup(before.settings!, before.meta!, before.workouts));
    await resetAll();
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    await replaceAll(parsed.backup.settings, parsed.backup.meta, parsed.backup.workouts);
    const after = await loadAll();
    expect(after.workouts).toEqual(before.workouts);
    const bad = parseBackup('{"app":"pick-three","schemaVersion":2,"exportedAt":"x"}');
    expect(bad.ok).toBe(false);
    expect((await loadAll()).workouts).toHaveLength(1);
  });
});
