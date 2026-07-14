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

test('Data & Summary uses a stable two-column surface at desktop width', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const surface = page.locator('.statistics-data-summary');
  await expect(surface).toBeVisible();
  await expect(surface.locator('.statistics-data-grid > .editor-card')).toHaveCount(2);
  await expect(surface.locator('.statistics-request-preview')).toContainText('descriptive');
  await surface.screenshot({
    path: '.task_tmp/statistics-consolidation7/gate2-data-summary-desktop.png',
    animations: 'disabled',
  });
});

test('Data & Summary stacks without local horizontal overflow on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const surface = page.locator('.statistics-data-summary');
  const cards = surface.locator('.statistics-data-grid > .editor-card');
  await expect(cards).toHaveCount(2);
  await expect.poll(() => surface.evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }))).toEqual(expect.objectContaining({ client: expect.any(Number) }));
  const sizes = await surface.evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client + 1);
  const first = await cards.nth(0).boundingBox();
  const second = await cards.nth(1).boundingBox();
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(second!.y).toBeGreaterThan(first!.y + first!.height - 1);
  await surface.screenshot({
    path: '.task_tmp/statistics-consolidation7/gate2-data-summary-mobile.png',
    animations: 'disabled',
  });
});
