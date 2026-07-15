import { expect, test } from '@playwright/test';
import { openLauncherApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await openLauncherApp(page, 'Data', 'Statistics');
  await page.getByRole('tab', { name: 'Data & Summary' }).click();
});

test('Data & Summary preserves both drafts and renders the expanded summary', async ({ page }) => {
  const dataset = page.locator('textarea.statistics-textarea');
  await dataset.fill('1, 2, 3, 4, 100');
  await page.getByLabel('Quartile method').selectOption('linear');
  await page.getByTestId('soft-action-evaluate').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-title')).toHaveText('Descriptive');
  const primary = page.getByTestId('display-outcome-answer-block')
    .locator('[data-raw-latex]')
    .first();
  await expect(primary).toHaveAttribute('data-raw-latex', /operatorname\{IQR\}/);
  await expect(primary).toHaveAttribute('data-raw-latex', /operatorname\{outliers\}/);
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('Type-7');
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('Population');
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('Sample');

  await page.getByRole('radio', { name: 'Frequency table' }).click();
  const tableValue = page.getByRole('textbox', { name: 'Value row 1' });
  await tableValue.fill('9');
  await page.getByRole('radio', { name: 'List' }).click();
  await expect(dataset).toHaveValue('1, 2, 3, 4, 100');
  await page.getByRole('radio', { name: 'Frequency table' }).click();
  await expect(tableValue).toHaveValue('9');
});

test('Data & Summary stays contained at the minimum supported PC width', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const surface = page.locator('.statistics-data-summary');
  await expect(surface).toBeVisible();
  await expect(surface.locator('.statistics-data-grid > .editor-card')).toHaveCount(2);
  await expect(surface.locator('.statistics-request-preview')).toContainText('descriptive');
  await expect.poll(() => surface.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);
  await surface.screenshot({
    path: '.task_tmp/statistics-consolidation7/gate7-data-summary-pc.png',
    animations: 'disabled',
  });
});
