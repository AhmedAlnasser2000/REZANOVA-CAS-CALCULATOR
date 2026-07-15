import { expect, test } from '@playwright/test';
import { openLauncherApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await openLauncherApp(page, 'Data', 'Statistics');
  await page.getByRole('tab', { name: 'Relationships' }).click();
});

test('Relationships keeps one paired dataset across both analyses', async ({ page }) => {
  const secondY = page.getByLabel('Point 2 y value');
  await secondY.fill('');
  await secondY.type('5');
  await expect(secondY).toBeFocused();
  await page.getByLabel('Point 3 y value').fill('7');

  await page.getByRole('radio', { name: 'Correlation' }).click();
  await expect(page.getByLabel('Point 2 y value')).toHaveValue('5');
  await expect(page.locator('.statistics-request-preview')).toContainText('correlation(points={(1,2),(2,5),(3,7)})');

  await page.getByTestId('soft-action-evaluate').click();
  await expect(page.getByTestId('display-outcome-title')).toHaveText('Correlation');
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('Strength:');

  await page.getByRole('radio', { name: 'Regression' }).click();
  await expect(page.getByLabel('Point 2 y value')).toHaveValue('5');
  await expect(page.locator('.statistics-request-preview')).toContainText('regression(points={(1,2),(2,5),(3,7)})');

  await page.getByTestId('soft-action-evaluate').click();
  await expect(page.getByTestId('display-outcome-title')).toHaveText('Regression');
  await expect(page.getByTestId('display-outcome-answer-block')
    .locator('[data-raw-latex]')
    .first()).toHaveAttribute('data-raw-latex', /y_\{\\mathrm\{fit\}\}/);
  await page.waitForTimeout(100);
  await page.getByTestId('display-outcome-detail-sections')
    .locator('details', { hasText: 'Quality Summary' })
    .locator('summary')
    .click();
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('SSE');
  await page.getByTestId('display-outcome-success').screenshot({
    path: '.task_tmp/statistics-consolidation7/gate4-relationships-result.png',
    animations: 'disabled',
  });
});

test('Relationships surface stays contained at the minimum supported PC width', async ({ page }) => {
  const surface = page.locator('.statistics-relationships-layout');
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(surface).toBeVisible();
  await expect.poll(() => surface.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);
  await surface.screenshot({
    path: '.task_tmp/statistics-consolidation7/gate7-relationships-pc.png',
    animations: 'disabled',
  });
});
