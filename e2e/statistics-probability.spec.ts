import { expect, test } from '@playwright/test';
import { openLauncherApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await openLauncherApp(page, 'Data', 'Statistics');
  await page.getByRole('tab', { name: 'Probability' }).click();
});

test('Probability evaluates an endpoint-aware discrete interval with real result facts', async ({ page }) => {
  await page.getByLabel('Probability distribution').selectOption('binomial');
  await page.getByLabel('Probability event').selectOption('between');
  await page.getByLabel('Trials (n)').fill('4');
  await page.getByLabel('Success probability (p)').fill('0.5');
  await page.getByLabel('Lower endpoint').fill('1');
  await page.getByLabel('Lower bound').selectOption('exclusive');
  await page.getByLabel('Upper endpoint').fill('3');
  await page.getByLabel('Upper bound').selectOption('inclusive');

  await expect(page.locator('.statistics-request-preview')).toContainText('event=between');
  await expect(page.locator('.statistics-request-preview')).toContainText('lowerBound=exclusive');
  await page.getByTestId('soft-action-evaluate').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-title')).toHaveText('Binomial');
  const primary = page.getByTestId('display-outcome-answer-block')
    .locator('[data-raw-latex]')
    .first();
  await expect(primary).toHaveAttribute('data-raw-latex', /1<X\\le3/);
  await expect(primary).toHaveAttribute('data-raw-latex', /p=/);
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('Percent: 62.5%');
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('Expected value: 2');
  await page.getByTestId('display-outcome-detail-sections')
    .locator('details', { hasText: 'Probability' })
    .locator('summary')
    .click();
  await page.getByTestId('display-outcome-success').screenshot({
    path: '.task_tmp/statistics-consolidation7/gate3-probability-result.png',
    animations: 'disabled',
  });
});

test('Probability distinguishes Normal exact probability from density', async ({ page }) => {
  await page.getByLabel('Probability distribution').selectOption('normal');
  await page.getByLabel('Probability event').selectOption('exactly');
  await page.getByLabel('Event value (x)').fill('0');
  await page.getByTestId('soft-action-evaluate').click();
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('probability zero');

  await page.getByLabel('Probability event').selectOption('density');
  await page.getByTestId('soft-action-evaluate').click();
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('Density at x');
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('not the probability');
});

test('Probability surface stays contained at the minimum supported PC width', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const surface = page.locator('.statistics-probability-layout');
  await expect(surface).toBeVisible();
  await expect.poll(() => surface.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);
  await surface.screenshot({
    path: '.task_tmp/statistics-consolidation7/gate7-probability-pc.png',
    animations: 'disabled',
  });
});
