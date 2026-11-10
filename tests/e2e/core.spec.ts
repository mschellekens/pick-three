import { expect, test } from '@playwright/test';
import { backupWith, finishOnboarding, importBackup, localDate, logIn, pickThree, setCount, start } from './helpers';

test('1. first-time user: intro, three empty slots, full session by taps only', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Pick three. Get stronger.' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Train full body. Beat your last good set.' })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: 'Pick three. Get stronger.' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'See what’s stronger. See what needs attention.' })).toBeVisible();
  await expect(page.getByText('Example', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Strength progress' }).click();
  await expect(page.getByText('Improving', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pick my three' }).click();

  for (const s of ['lower', 'push', 'pull']) await expect(page.getByTestId(`slot-${s}`)).toContainText('Choose a lift');
  await expect(page.getByRole('button', { name: 'Start workout' })).toBeDisabled();
  await pickThree(page);
  await start(page);
  // No keyboard input anywhere in the normal path.
  await expect(page.locator('input:not([type=file]), textarea')).toHaveCount(0);

  // Coarse weight entry: one tap on a starting value, never dozens of taps.
  await page.getByRole('button', { name: /Weight: .*Tap for quick values/ }).click();
  await page.getByTestId('start-135').click();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByTestId('weight')).toHaveAttribute('data-value', '135');
  await page.getByRole('button', { name: 'Increase Clean reps' }).click();
  await page.getByRole('button', { name: 'Increase Clean reps' }).click();
  await logIn(page, 'lower', 2);
  await expect(page.getByRole('list', { name: 'Logged sets' })).toContainText('135 lb × 8');
  await logIn(page, 'push', 1);
  await logIn(page, 'pull', 1);
  await page.getByTestId('finish').click();
  await expect(page.getByRole('heading', { name: /New milestone|Workout saved/ })).toBeVisible();
  await expect(page.getByText('First lifting day logged')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.locator('.hist-row')).toHaveCount(1);
  await expect(page.locator('.hist-row')).toContainText('Full');
});

test('2. returning user: dashboard, same three, history and reproducible suggestion only after selection', async ({ page }) => {
  await finishOnboarding(page);
  const d = await localDate(page, -3);
  await importBackup(
    page,
    backupWith([
      {
        date: d,
        lifts: [
          ['lower', 'back-squat', [[135, 8], [135, 8]]],
          ['push', 'bb-bench', [[95, 10], [95, 10]]],
          ['pull', 'lat-pulldown', [[80, 7]]],
        ],
      },
    ]),
  );
  await page.goto('./#/today');
  await expect(page.getByText(/Quads · Last direct work 3 days ago/)).toBeVisible();
  await page.getByRole('button', { name: 'Continue picking' }).click();
  // Nothing is preselected and no target is shown before choosing.
  await expect(page.getByTestId('slot-push')).toContainText('Choose a lift');
  await expect(page.getByText(/Try 100 lb/)).toHaveCount(0);
  await page.getByTestId('slot-push').click();
  await expect(page.getByTestId('pick-bb-bench')).toContainText('Last: 95 lb × 10');
  await page.getByTestId('pick-bb-bench').click();
  await expect(page.getByTestId('slot-push')).toContainText('Try 100 lb for 6 reps');
  await page.getByTestId('slot-lower').click();
  await page.getByTestId('pick-back-squat').click();
  await page.getByTestId('slot-pull').click();
  await page.getByTestId('pick-lat-pulldown').click();
  await start(page);
  await expect(page.getByLabel("Today's target")).toContainText('One more clean rep at 135 lb');
  await expect(page.getByLabel('Last time')).toContainText('135 lb × 8');
  await expect(page.getByTestId('weight')).toHaveAttribute('data-value', '135');
  await expect(page.getByTestId('reps')).toHaveAttribute('data-value', '9');
  // Opening and switching tabs never creates sets.
  await page.getByTestId('tab-push').click();
  await page.getByTestId('tab-pull').click();
  expect(await setCount(page, 'lower')).toBe(0);
  await page.getByTestId('tab-push').click();
  await expect(page.getByLabel("Today's target")).toContainText('Try 100 lb for 6 reps');
  await page.reload();
  await page.getByTestId('tab-push').click();
  await expect(page.getByLabel("Today's target")).toContainText('Try 100 lb for 6 reps');
});

test('3. reload keeps the draft, double taps and repeated finish cannot duplicate, partial and empty drafts', async ({ page }) => {
  await finishOnboarding(page);
  await pickThree(page, 'goblet-squat', 'push-up', 'assisted-pull-up');
  await start(page);
  await page.getByRole('button', { name: 'Increase Weight' }).click();
  await expect(page.getByTestId('weight')).toHaveAttribute('data-value', '25');
  await page.reload();
  await expect(page.getByTestId('tab-push')).toContainText('Push-up');
  await expect(page.getByTestId('weight')).toHaveAttribute('data-value', '25');

  // Zero-set draft cannot become history.
  await page.getByTestId('finish').click();
  await expect(page.getByTestId('finish-sheet')).toContainText('Nothing logged yet');
  await page.getByRole('button', { name: 'Keep training' }).click();

  // Fast double tap logs at most one set per tap and never duplicates.
  const btn = page.getByTestId('log-set');
  await btn.dblclick();
  await expect.poll(() => setCount(page, 'lower')).toBeGreaterThanOrEqual(1);
  const afterDouble = await setCount(page, 'lower');
  expect(afterDouble).toBeLessThanOrEqual(2);
  await page.reload();
  expect(await setCount(page, 'lower')).toBe(afterDouble);

  await logIn(page, 'push', 1);
  await page.getByTestId('finish').click();
  await expect(page.getByTestId('finish-sheet')).toContainText('Save a partial workout?');
  const save = page.getByRole('button', { name: 'Save partial workout' });
  await save.click();
  await expect(page.getByRole('heading', { name: /New milestone|Workout saved/ })).toBeVisible();
  await expect(page.getByText('Partial', { exact: true })).toBeVisible();
  await page.goBack();
  await page.reload();
  await page.goto('./#/history');
  await expect(page.locator('.hist-row')).toHaveCount(1);
  await expect(page.locator('.hist-row')).toContainText('Partial');
});

test('3b. interrupted workout can be resumed from Today', async ({ page }) => {
  await finishOnboarding(page);
  await pickThree(page);
  await start(page);
  await logIn(page, 'lower', 1);
  await page.goto('./');
  await expect(page.getByText('Workout in progress')).toBeVisible();
  await page.getByRole('button', { name: 'Resume workout' }).click();
  expect(await setCount(page, 'lower')).toBe(1);
});

test('6. swap with logged sets needs confirmation; undo; demo data never enters history', async ({ page }) => {
  await finishOnboarding(page);
  await pickThree(page);
  await start(page);
  await logIn(page, 'lower', 1);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => setCount(page, 'lower')).toBe(0);
  await logIn(page, 'lower', 1);
  await page.getByRole('button', { name: 'Swap lift' }).click();
  await page.getByTestId('pick-leg-press').click();
  await expect(page.getByRole('dialog')).toContainText('removes the 1 set');
  await page.getByRole('button', { name: 'Keep Back squat' }).click();
  expect(await setCount(page, 'lower')).toBe(1);

  await page.goto('./#/demo');
  await expect(page.getByText('Demo data. Nothing here is saved')).toBeVisible();
  await expect(page.getByTestId('headline')).toBeVisible();
  await page.goto('./#/history');
  await expect(page.locator('.hist-row')).toHaveCount(0);
});

test('4/5. history edit and delete recalculates; two workouts on one date count once', async ({ page }) => {
  await finishOnboarding(page);
  const d = await localDate(page, 0);
  await importBackup(
    page,
    backupWith([
      { id: 'a', date: d, lifts: [['lower', 'back-squat', [[135, 8]]], ['push', 'bb-bench', [[95, 8]]], ['pull', 'lat-pulldown', [[80, 8]]]] },
      { id: 'b', date: d, lifts: [['lower', 'back-squat', [[140, 8]]]], partial: true },
    ]),
  );
  await page.goto('./#/progress');
  await expect(page.getByTestId('month-days')).toHaveText('1');
  await page.goto('./#/history/b');
  await page.getByRole('button', { name: 'Edit Back squat set 1' }).click();
  await page.getByRole('button', { name: 'Increase Clean reps' }).click();
  await page.getByRole('button', { name: 'Save set' }).click();
  await expect(page.locator('.logged')).toContainText('140 lb × 9');
  await page.getByRole('button', { name: 'Delete workout' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete workout' }).click();
  await expect(page.locator('.hist-row')).toHaveCount(1);
  await page.goto('./#/progress');
  await expect(page.getByTestId('month-days')).toHaveText('1');
});
