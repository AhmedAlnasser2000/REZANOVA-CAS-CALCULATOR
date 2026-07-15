import { expect, test } from '@playwright/test';
import { openLauncherApp, openSettingsPanel } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await openLauncherApp(page, 'Data', 'Statistics');
  await page.setViewportSize({ width: 1280, height: 800 });
});

test('Statistics chart supports zoom, pan, reset, hover, and exact paginated data', async ({ page }) => {
  await openSettingsPanel(page);
  await page.getByTestId('settings-approx-digits-input').fill('2');
  await page.getByTestId('settings-approx-digits-input').blur();
  await page.getByTestId('settings-toggle').click();

  await page.getByRole('textbox', { name: 'Values' }).fill('0, 0.333333, 1');
  await page.getByTestId('soft-action-evaluate').click();

  const dock = page.getByTestId('statistics-visualization-dock');
  const chart = dock.getByTestId('statistics-visualization-chart');
  const zoomStatus = dock.getByRole('status', { name: 'Chart zoom' });
  await expect(chart.locator('svg')).toBeVisible();
  await expect(zoomStatus).toHaveText('100%');

  await dock.getByRole('button', { name: 'Zoom in' }).click();
  await expect(zoomStatus).toHaveText('80%');
  const keyboardStart = Number(await chart.getAttribute('data-zoom-start'));
  await chart.focus();
  await chart.press('ArrowRight');
  await expect.poll(async () => Number(await chart.getAttribute('data-zoom-start')))
    .toBeGreaterThan(keyboardStart);

  await dock.getByRole('button', { name: 'Reset chart zoom' }).click();
  await expect(zoomStatus).toHaveText('100%');
  const chartBox = await chart.boundingBox();
  expect(chartBox).not.toBeNull();
  await page.mouse.move(
    (chartBox?.x ?? 0) + ((chartBox?.width ?? 0) * 0.55),
    (chartBox?.y ?? 0) + ((chartBox?.height ?? 0) * 0.5),
  );
  await page.mouse.wheel(0, -420);
  await expect.poll(async () => await zoomStatus.textContent()).not.toBe('100%');
  const dragStart = Number(await chart.getAttribute('data-zoom-start'));
  await page.mouse.down();
  await page.mouse.move(
    (chartBox?.x ?? 0) + ((chartBox?.width ?? 0) * 0.7),
    (chartBox?.y ?? 0) + ((chartBox?.height ?? 0) * 0.5),
    { steps: 5 },
  );
  await page.mouse.up();
  await expect.poll(async () => Number(await chart.getAttribute('data-zoom-start')))
    .not.toBe(dragStart);

  await dock.getByRole('spinbutton', { name: 'Histogram bins' }).fill('3');
  await expect(zoomStatus).toHaveText('100%');
  const firstBar = chart.locator('svg path[fill="#79a993"]').first();
  await expect(firstBar).toBeVisible();
  await firstBar.hover();
  await expect(dock).toContainText(/Frequency/);
  await dock.screenshot({
    path: '.task_tmp/statistics-visualization/gate5-hover-inspection.png',
    animations: 'disabled',
  });

  await dock.getByRole('button', { name: 'View data' }).click();
  const dataTable = dock.getByRole('table', { name: 'Histogram data' });
  await expect(dataTable).toBeVisible();
  await expect(dataTable).toContainText('0-0.33');
  await expect(dock.getByRole('status', { name: 'Data page' })).toHaveText('1 / 1');

  await page.getByRole('tab', { name: 'Probability' }).click();
  await page.getByLabel('Probability distribution').selectOption('normal');
  await page.getByLabel('Probability event').selectOption('atMost');
  await page.getByLabel('Event value (x)').fill('0');
  await page.getByTestId('soft-action-evaluate').click();
  await expect(zoomStatus).toHaveText('100%');
  await expect(dock.getByRole('button', { name: 'View data' })).toBeVisible();
  await dock.getByRole('button', { name: 'View data' }).click();
  await expect(dock.getByRole('status', { name: 'Data page' })).toHaveText('1 / 16');
  await dock.getByRole('button', { name: 'Next data page' }).click();
  await expect(dock.getByRole('status', { name: 'Data page' })).toHaveText('2 / 16');

  await dock.screenshot({
    path: '.task_tmp/statistics-visualization/gate5-interactive-data.png',
    animations: 'disabled',
  });
});

test('Statistics visualization dock has no page-level horizontal overflow at PC widths', async ({ page }) => {
  await page.getByTestId('soft-action-evaluate').click();
  const dock = page.getByTestId('statistics-visualization-dock');
  await expect(dock.getByTestId('statistics-visualization-chart').locator('svg')).toBeVisible();
  await dock.getByRole('button', { name: 'View data' }).click();

  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 1600, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => (
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    ))).toBe(true);
  }
});
