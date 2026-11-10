import { expect, type Page } from '@playwright/test';

export async function finishOnboarding(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Pick my three' }).click();
  await expect(page.getByRole('heading', { name: 'Pick your three' })).toBeVisible();
}

export async function pickThree(page: Page, lower = 'back-squat', push = 'bb-bench', pull = 'lat-pulldown') {
  for (const [slot, id] of [
    ['lower', lower],
    ['push', push],
    ['pull', pull],
  ]) {
    await page.getByTestId(`slot-${slot}`).click();
    await page.getByTestId(`pick-${id}`).click();
    await expect(page.getByTestId('exercise-sheet')).toBeHidden();
  }
}

export async function start(page: Page) {
  await page.getByRole('button', { name: 'Start workout' }).click();
  await expect(page.getByTestId('log-set')).toBeVisible();
}

export async function setCount(page: Page, slot: string): Promise<number> {
  const t = await page.getByTestId(`tab-${slot}`).locator('.count').textContent();
  return Number(t);
}

export async function logIn(page: Page, slot: string, times = 1) {
  await page.getByTestId(`tab-${slot}`).click();
  for (let i = 0; i < times; i++) {
    const before = await setCount(page, slot);
    await page.getByTestId('log-set').click();
    await expect.poll(() => setCount(page, slot)).toBe(before + 1);
  }
}

export async function localDate(page: Page, offsetDays: number): Promise<string> {
  return page.evaluate((o) => {
    const d = new Date();
    d.setDate(d.getDate() + o);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, offsetDays);
}

const LB = 0.45359237;
let n = 0;
export function backupWith(entries: { date: string; lifts: [string, string, [number, number][]][]; id?: string; partial?: boolean }[]) {
  const workouts = entries.map((e) => ({
    id: e.id ?? `seed-${++n}`,
    startedAt: `${e.date}T15:00:00.000Z`,
    finishedAt: `${e.date}T16:00:00.000Z`,
    updatedAt: `${e.date}T16:00:00.000Z`,
    localDate: e.date,
    partial: e.partial ?? false,
    entries: e.lifts.map(([slot, ex, sets]) => ({
      slot,
      exerciseId: ex,
      seriesId: `${ex}:1`,
      sets: sets.map(([lb, reps]) => ({ id: `s-${++n}`, loadKg: lb * LB, input: { value: lb, unit: 'lb' }, reps, loggedAt: `${e.date}T15:10:00.000Z` })),
    })),
  }));
  return {
    app: 'pick-three',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    settings: { unit: 'lb', frequency: 3, equipment: [], look: 'ember', increments: {}, favorites: [], cueDismissed: true, peerComparison: 'off' },
    meta: { currentSeries: {}, series: [], milestones: [] },
    workouts,
  };
}

export async function importBackup(page: Page, data: unknown) {
  await page.goto('./#/settings');
  await page.getByTestId('import-file').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
  await expect(page.getByTestId('import-preview')).toBeVisible();
  await page.getByRole('button', { name: 'Replace with backup' }).click();
  await expect(page.getByTestId('import-preview')).toBeHidden();
}
