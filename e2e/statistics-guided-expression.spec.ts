import { expect, test } from '@playwright/test';
import {
  getMathFieldLatex,
  openLauncherApp,
  setMathFieldLatex,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await openLauncherApp(page, 'Data', 'Statistics');
});

test('Statistics keeps one embedded authority across Guided and Expression', async ({ page }) => {
  const host = page.getByTestId('statistics-display-panel-host');
  await expect(host.locator('.display-panel')).toHaveCount(1);
  await expect(page.getByTestId('main-editor')).toHaveCount(0);
  await expect(page.getByRole('radio', { name: 'Guided' })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('textbox', { name: 'Values' }).fill('2, 4, 6, 8');
  await page.getByTestId('soft-action-evaluate').click();
  await expect(host.getByTestId('display-outcome-title')).toHaveText('Descriptive');

  await page.getByRole('radio', { name: 'Expression' }).click();
  await expect(host.getByTestId('main-editor')).toBeVisible();
  await expect.poll(() => getMathFieldLatex(page)).toContain('descriptive(values={2,4,6,8}');

  const expression = 'normal(mean=0,sd=1,event=atLeast,x=1.96)';
  await setMathFieldLatex(page, expression);
  await page.getByRole('tab', { name: 'Relationships' }).click();
  await expect.poll(() => getMathFieldLatex(page)).toBe(expression);

  await page.getByTestId('soft-action-evaluate').click();
  await expect(host.getByText('Probability = 0.0249979 (2.49979%)')).toBeVisible();

  await page.getByRole('radio', { name: 'Guided' }).click();
  await expect(page.getByRole('tab', { name: 'Probability' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('Probability distribution')).toHaveValue('normal');
  await expect(page.getByLabel('Probability event')).toHaveValue('atLeast');
  await expect(page.getByTestId('main-editor')).toHaveCount(0);
});

test('Statistics mode layouts stay contained on desktop and mobile', async ({ page }) => {
  const surface = page.locator('.statistics-panel');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(surface).toBeVisible();
  await expect.poll(() => surface.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);
  await surface.screenshot({
    path: '.task_tmp/statistics-consolidation7/gate6-guided-desktop.png',
    animations: 'disabled',
  });

  await page.getByRole('radio', { name: 'Expression' }).click();
  await expect(page.getByTestId('main-editor')).toBeVisible();
  await surface.screenshot({
    path: '.task_tmp/statistics-consolidation7/gate6-expression-desktop.png',
    animations: 'disabled',
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => surface.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);
  await expect(page.getByTestId('statistics-display-panel-host')).toBeVisible();
  await surface.screenshot({
    path: '.task_tmp/statistics-consolidation7/gate6-expression-mobile.png',
    animations: 'disabled',
  });
});
