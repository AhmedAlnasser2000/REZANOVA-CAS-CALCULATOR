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

test('Statistics uses the full calculator workspace at supported PC widths', async ({ page }) => {
  const surface = page.locator('.statistics-panel');
  const workspace = page.locator('main.workspace');
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(surface).toBeVisible();
  await expect(workspace).toHaveClass(/workspace--statistics/);
  await expect.poll(() => surface.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);
  const minimumWorkspaceBox = await workspace.boundingBox();
  const minimumSurfaceBox = await surface.boundingBox();
  expect(minimumWorkspaceBox).not.toBeNull();
  expect(minimumSurfaceBox).not.toBeNull();
  expect(minimumWorkspaceBox!.width - minimumSurfaceBox!.width).toBeLessThanOrEqual(34);

  const quartileMethod = page.getByLabel('Quartile method');
  await expect(quartileMethod).toHaveCSS('color', 'rgb(21, 37, 27)');
  await expect(quartileMethod).toHaveCSS('background-color', 'rgb(244, 247, 239)');
  await page.getByTestId('soft-action-evaluate').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await surface.screenshot({
    path: '.task_tmp/statistics-consolidation7/gate7-guided-pc-minimum.png',
    animations: 'disabled',
  });

  await page.getByRole('tab', { name: 'Probability' }).click();
  let selectColors = await surface.locator('select').evaluateAll((selects) => selects.map((select) => ({
    background: getComputedStyle(select).backgroundColor,
    color: getComputedStyle(select).color,
  })));
  expect(selectColors.length).toBeGreaterThan(0);
  expect(selectColors.every(({ background, color }) => (
    background === 'rgb(244, 247, 239)' && color === 'rgb(21, 37, 27)'
  ))).toBe(true);

  await page.getByRole('tab', { name: 'Inference' }).click();
  await page.getByRole('radio', { name: 'Hypothesis test' }).click();
  selectColors = await surface.locator('select').evaluateAll((selects) => selects.map((select) => ({
      background: getComputedStyle(select).backgroundColor,
      color: getComputedStyle(select).color,
  })));
  expect(selectColors.length).toBeGreaterThan(0);
  expect(selectColors.every(({ background, color }) => (
    background === 'rgb(244, 247, 239)' && color === 'rgb(21, 37, 27)'
  ))).toBe(true);

  await page.getByRole('tab', { name: 'Data & Summary' }).click();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect.poll(() => surface.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);
  await surface.screenshot({
    path: '.task_tmp/statistics-consolidation7/gate7-guided-pc-wide.png',
    animations: 'disabled',
  });

  await page.getByRole('radio', { name: 'Expression' }).click();
  await expect(page.getByTestId('main-editor')).toBeVisible();
  await surface.screenshot({
    path: '.task_tmp/statistics-consolidation7/gate7-expression-pc-wide.png',
    animations: 'disabled',
  });
});
