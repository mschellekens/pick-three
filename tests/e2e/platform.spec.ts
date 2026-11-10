import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { backupWith, finishOnboarding, importBackup, localDate, logIn, pickThree, setCount, start } from './helpers';

test('7. failed write shows recovery and never fakes success', async ({ page }) => {
  await finishOnboarding(page);
  await pickThree(page);
  await start(page);
  await logIn(page, 'lower', 1);
  await page.evaluate(() => ((globalThis as { __P3_FAIL_WRITES?: boolean }).__P3_FAIL_WRITES = true));
  await page.getByTestId('log-set').click();
  await expect(page.getByRole('alert')).toContainText('Saving failed');
  expect(await setCount(page, 'lower')).toBe(1);
  await page.getByTestId('finish').click();
  await page.getByRole('button', { name: 'Save partial workout' }).click();
  await expect(page.getByTestId('log-set')).toBeVisible(); // still on the workout, draft intact
  await page.evaluate(() => ((globalThis as { __P3_FAIL_WRITES?: boolean }).__P3_FAIL_WRITES = false));
  await page.reload();
  expect(await setCount(page, 'lower')).toBe(1);
  await page.getByTestId('log-set').click();
  await expect.poll(() => setCount(page, 'lower')).toBe(2);
});

test('7. export then import into a clean profile; malformed and oversized files are rejected', async ({ page, browser }) => {
  await finishOnboarding(page);
  const d = await localDate(page, -2);
  await importBackup(page, backupWith([{ date: d, lifts: [['lower', 'back-squat', [[135, 8]]], ['push', 'bb-bench', [[95, 8]]], ['pull', 'pull-up', [[0, 6]]]] }]));
  await page.goto('./#/settings');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export').click()]);
  const text = readFileSync((await dl.path())!, 'utf8');
  expect(JSON.parse(text).workouts).toHaveLength(1);

  for (const [name, body] of [
    ['bad.json', '{not json'],
    ['wrong.json', JSON.stringify({ app: 'pick-three', schemaVersion: 99, workouts: [] })],
    ['bad-ref.json', JSON.stringify({ ...JSON.parse(text), workouts: [{ ...JSON.parse(text).workouts[0], entries: [{ ...JSON.parse(text).workouts[0].entries[0], exerciseId: 'nope' }] }] })],
    ['big.json', 'x'.repeat(5 * 1024 * 1024 + 10)],
  ] as const) {
    await page.getByTestId('import-file').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(body) });
    await expect(page.getByTestId('import-error')).toBeVisible();
  }
  await page.goto('./#/history');
  await expect(page.locator('.hist-row')).toHaveCount(1);

  const ctx2 = await browser.newContext({ ...test.info().project.use, baseURL: test.info().project.use.baseURL });
  const p2 = await ctx2.newPage();
  await finishOnboarding(p2);
  await importBackup(p2, JSON.parse(text));
  await p2.goto('./#/history');
  await expect(p2.locator('.hist-row')).toHaveCount(1);
  await ctx2.close();
});

test('8. non-root path: manifest, icons, routes and service worker scope', async ({ page, request }) => {
  const res = await request.get('manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m.start_url).toBe('/pick-three/');
  expect(m.scope).toBe('/pick-three/');
  expect(m.display).toBe('standalone');
  for (const i of m.icons) expect((await request.get(i.src)).ok()).toBe(true);
  expect(m.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  expect((await request.get('icons/apple-touch-icon.png')).ok()).toBe(true);
  await page.goto('./#/progress');
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(new URL(scope).pathname).toBe('/pick-three/');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Pick three. Get stronger.' })).toBeVisible();
});

test('8. offline reopen after first cache, and a workout can be logged and kept offline', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // now controlled
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Pick three. Get stronger.' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Pick my three' }).click();
  await pickThree(page);
  await start(page);
  await logIn(page, 'lower', 1);
  await logIn(page, 'push', 1);
  await logIn(page, 'pull', 1);
  await page.getByTestId('finish').click();
  await expect(page.getByRole('heading', { name: /New milestone|Workout saved/ })).toBeVisible();
  await page.reload();
  await page.goto('./#/history');
  await expect(page.locator('.hist-row')).toHaveCount(1);
  await context.setOffline(false);
});

test('8. share falls back to download and copy link without native share', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
  });
  await finishOnboarding(page);
  await pickThree(page);
  await start(page);
  await logIn(page, 'lower', 1);
  await logIn(page, 'push', 1);
  await logIn(page, 'pull', 1);
  await page.getByTestId('finish').click();
  await page.getByRole('button', { name: 'Share milestone' }).click();
  const sheet = page.getByTestId('share-sheet');
  await expect(sheet.getByRole('button', { name: 'Share', exact: true })).toHaveCount(0);
  await expect(sheet.getByTestId('download-image')).toBeVisible();
  await expect(sheet.getByTestId('copy-link')).toBeVisible();
  await page.getByRole('button', { name: 'Not now' }).click();
  await expect(sheet).toBeHidden();
});

test('9. avatar regions by keyboard, legends, focus restore, reduced motion, 320 px without clipping', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await finishOnboarding(page);
  await page.goto('./#/progress');
  await expect(page.getByRole('list', { name: 'Legend' })).toContainText('Improving');
  const btn = page.getByRole('button', { name: /Chest: No logged lifts/ });
  await btn.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('region-sheet')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('region-sheet')).toBeHidden();
  await expect(btn).toBeFocused();
  await page.goto('./#/today');
  await expect(page.getByRole('img', { name: /Training attention, front view/ })).toBeVisible();

  await page.setViewportSize({ width: 320, height: 568 });
  for (const r of ['#/today', '#/progress', '#/settings', '#/pick']) {
    await page.goto(`./${r}`);
    await page.waitForTimeout(150);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, r).toBeLessThanOrEqual(0);
  }
  await pickThree(page);
  await start(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const box = await page.getByTestId('log-set').boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.y + box!.height).toBeLessThanOrEqual(568);
  // Finish milestone animation is disabled under reduced motion.
  await logIn(page, 'lower', 1);
  await logIn(page, 'push', 1);
  await logIn(page, 'pull', 1);
  await page.getByTestId('finish').click();
  const anim = await page.locator('.avatar-pulse').evaluate((el) => getComputedStyle(el).animationName);
  expect(anim).toBe('none');
});
