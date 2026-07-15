import { expect, test } from '@playwright/test';
import { openLauncherApp, openSettingsPanel } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await openLauncherApp(page, 'Data', 'Statistics');
  await page.setViewportSize({ width: 1280, height: 800 });
});

test('Relationships switches from fitted scatter to residuals and scatter-only correlation', async ({ page }) => {
  await openSettingsPanel(page);
  await page.getByTestId('settings-approx-digits-input').fill('2');
  await page.getByTestId('settings-approx-digits-input').blur();
  await page.getByTestId('settings-toggle').click();
  await page.getByRole('tab', { name: 'Relationships' }).click();
  await page.getByLabel('Point 2 y value').fill('5');
  await page.getByLabel('Point 3 y value').fill('7');
  await page.getByTestId('soft-action-evaluate').click();

  const dock = page.getByTestId('statistics-visualization-dock');
  const chart = dock.getByTestId('statistics-visualization-chart');
  await expect(page.getByTestId('display-outcome-title')).toHaveText('Regression');
  await expect(chart.locator('svg')).toBeVisible();
  await expect(chart).toHaveAttribute('aria-label', /fitted least-squares line/);
  await expect(dock.getByText('Stale', { exact: true })).toHaveCount(0);
  const visualizationField = dock.locator('.statistics-visualization-field');
  const labelBox = await visualizationField.locator('span').boundingBox();
  const selectBox = await visualizationField.getByRole('combobox').boundingBox();
  expect(labelBox).not.toBeNull();
  expect(selectBox).not.toBeNull();
  expect((selectBox?.x ?? 0) - ((labelBox?.x ?? 0) + (labelBox?.width ?? 0))).toBeGreaterThanOrEqual(10);
  const answerLatex = await page.getByTestId('display-outcome-answer-block')
    .locator('[data-raw-latex]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-raw-latex')).join(' '));
  expect(answerLatex).toContain('-0.33');
  expect(answerLatex).not.toContain('-0.333333');
  await dock.screenshot({
    path: '.task_tmp/statistics-visualization/gate4-regression-fit.png',
    animations: 'disabled',
  });

  await dock.getByRole('combobox', { name: 'Visualization' }).selectOption('residuals');
  await expect(chart).toHaveAttribute('aria-label', /Residual plot/);
  await dock.screenshot({
    path: '.task_tmp/statistics-visualization/gate4-regression-residuals.png',
    animations: 'disabled',
  });

  await page.getByRole('radio', { name: 'Correlation' }).click();
  await page.getByTestId('soft-action-evaluate').click();
  await expect(page.getByTestId('display-outcome-title')).toHaveText('Correlation');
  await expect(chart).toHaveAttribute('aria-label', /without a fitted line/);
  await expect(dock.getByRole('combobox', { name: 'Visualization' })).toHaveCount(0);
  await dock.screenshot({
    path: '.task_tmp/statistics-visualization/gate4-correlation-scatter.png',
    animations: 'disabled',
  });
});

test('Inference renders a confidence interval and the selected Student-t tail', async ({ page }) => {
  await page.getByRole('tab', { name: 'Inference' }).click();
  await page.getByLabel('Mean inference sample values').fill('10, 11, 12, 13, 14');
  await page.getByLabel('Mean inference confidence level').fill('95%');
  await page.getByTestId('soft-action-evaluate').click();

  const dock = page.getByTestId('statistics-visualization-dock');
  const chart = dock.getByTestId('statistics-visualization-chart');
  await expect(page.getByTestId('display-outcome-title')).toHaveText('Mean Inference');
  await expect(chart.locator('svg')).toBeVisible();
  await expect(chart).toHaveAttribute('aria-label', /confidence interval/);
  await dock.screenshot({
    path: '.task_tmp/statistics-visualization/gate4-confidence-interval.png',
    animations: 'disabled',
  });

  await page.getByRole('radio', { name: 'Hypothesis test' }).click();
  await page.getByLabel('Mean inference null mean').fill('15');
  await page.getByLabel('Mean test alternative').selectOption('less');
  await page.getByTestId('soft-action-evaluate').click();
  await expect(chart).toHaveAttribute('aria-label', /Student-t distribution/);
  await expect(chart).toHaveAttribute('aria-label', /less p-value region/);
  await dock.screenshot({
    path: '.task_tmp/statistics-visualization/gate4-test-distribution.png',
    animations: 'disabled',
  });
});
