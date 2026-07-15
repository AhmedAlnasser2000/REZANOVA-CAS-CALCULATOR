import { expect, test } from '@playwright/test';
import { openLauncherApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await openLauncherApp(page, 'Data', 'Statistics');
  await page.setViewportSize({ width: 1280, height: 800 });
});

test('Data & Summary renders weighted histogram and Calcwiz box plot locally', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Values' }).fill('1, 2, 3, 4, 100');
  await page.getByLabel('Quartile method').selectOption('linear');
  await page.getByTestId('soft-action-evaluate').click();

  const dock = page.getByTestId('statistics-visualization-dock');
  const chart = dock.getByTestId('statistics-visualization-chart');
  await expect(chart.locator('svg')).toBeVisible();
  await expect(dock.getByRole('combobox', { name: 'Visualization' })).toHaveValue('histogram');
  await dock.screenshot({
    path: '.task_tmp/statistics-visualization/gate3-data-histogram.png',
    animations: 'disabled',
  });
  const automaticSvg = await chart.locator('svg').innerHTML();

  await dock.getByRole('spinbutton', { name: 'Histogram bins' }).fill('8');
  await expect.poll(async () => chart.locator('svg').innerHTML()).not.toBe(automaticSvg);
  await expect(page.getByTestId('display-outcome-title')).toHaveText('Descriptive');

  await dock.getByRole('combobox', { name: 'Visualization' }).selectOption('boxPlot');
  await expect(dock.getByRole('combobox', { name: 'Visualization' })).toHaveValue('boxPlot');
  await expect(chart.locator('svg')).toBeVisible();
  await dock.screenshot({
    path: '.task_tmp/statistics-visualization/gate3-data-box-plot.png',
    animations: 'disabled',
  });
});

test('Probability renders selected mass and Normal exact versus density markers', async ({ page }) => {
  await page.getByRole('tab', { name: 'Probability' }).click();
  await page.getByLabel('Probability distribution').selectOption('binomial');
  await page.getByLabel('Probability event').selectOption('atLeast');
  await page.getByLabel('Trials (n)').fill('10');
  await page.getByLabel('Success probability (p)').fill('0.5');
  await page.getByLabel('Event value (x)').fill('7');
  await page.getByTestId('soft-action-evaluate').click();

  const dock = page.getByTestId('statistics-visualization-dock');
  const chart = dock.getByTestId('statistics-visualization-chart');
  await expect(chart.locator('svg')).toBeVisible();
  await expect(chart).toHaveAttribute('aria-label', /Binomial probability bars/);
  await dock.screenshot({
    path: '.task_tmp/statistics-visualization/gate3-binomial-bars.png',
    animations: 'disabled',
  });

  await page.getByLabel('Probability distribution').selectOption('normal');
  await page.getByLabel('Probability event').selectOption('exactly');
  await page.getByLabel('Event value (x)').fill('0');
  await expect(page.locator('.statistics-request-preview')).toContainText('normal(');
  await page.getByTestId('soft-action-evaluate').click();
  await expect(page.getByTestId('display-outcome-title')).toHaveText('Normal');
  await expect(chart).toHaveAttribute('aria-label', /Normal density curve/);
  const exactSvg = await chart.locator('svg').innerHTML();

  await page.getByLabel('Probability event').selectOption('density');
  await expect(page.locator('.statistics-request-preview')).toContainText('event=density');
  await page.getByTestId('soft-action-evaluate').click();
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('Density at x');
  await expect.poll(async () => chart.locator('svg').innerHTML()).not.toBe(exactSvg);
  await dock.screenshot({
    path: '.task_tmp/statistics-visualization/gate3-normal-density.png',
    animations: 'disabled',
  });
});
