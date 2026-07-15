import { expect, test } from '@playwright/test';
import { openLauncherApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await openLauncherApp(page, 'Data', 'Statistics');
  await page.getByRole('tab', { name: 'Inference' }).click();
});

test('Inference runs a percent-level one-sided test with full readback', async ({ page }) => {
  const values = page.getByLabel('Mean inference sample values');
  await values.fill('10,');
  await values.type(' 11, 12, 13, 14');
  await expect(values).toBeFocused();

  await page.getByRole('radio', { name: 'Hypothesis test' }).click();
  await page.getByLabel('Mean inference confidence level').fill('95%');
  await page.getByLabel('Mean inference null mean').fill('15');
  await page.getByLabel('Mean test alternative').selectOption('less');

  await expect(page.locator('.statistics-request-preview')).toContainText('level=95%');
  await expect(page.locator('.statistics-request-preview')).toContainText('alternative=less');
  await page.getByTestId('soft-action-evaluate').click();

  const answer = page.getByTestId('display-outcome-answer-block')
    .locator('[data-raw-latex]')
    .first();
  await expect(answer).toHaveAttribute('data-raw-latex', /H_a=.*\\mu<15/);
  await expect(answer).toHaveAttribute('data-raw-latex', /SE=/);
  await expect(answer).toHaveAttribute('data-raw-latex', /df=4/);
  await expect(answer).toHaveAttribute('data-raw-latex', /p=/);

  await page.waitForTimeout(100);
  const details = page.getByTestId('display-outcome-detail-sections');
  for (const title of ['Decision and interpretation', 'Assumptions and checks']) {
    await details.locator('details', { hasText: title }).locator('summary').click();
  }
  await expect(details).toContainText('Reject the null hypothesis');
  await expect(details).toContainText('Verified from the entered data');
  await expect(details).toContainText('Not verifiable by Calcwiz');
  await page.getByTestId('display-outcome-success').screenshot({
    path: '.task_tmp/statistics-consolidation7/gate5-inference-result.png',
    animations: 'disabled',
  });

  await page.getByRole('tab', { name: 'Data & Summary' }).click();
  await expect(page.getByRole('textbox', { name: 'Values' }))
    .toHaveValue('10, 11, 12, 13, 14');
});

test('Inference evaluates the shared compact frequency table', async ({ page }) => {
  await page.getByRole('radio', { name: 'Frequency table' }).click();
  await page.getByLabel('Inference frequency row 1 value').fill('1');
  await page.getByLabel('Inference frequency row 1 count').fill('2');
  await page.getByLabel('Inference frequency row 2 value').fill('2');
  await page.getByLabel('Inference frequency row 2 count').fill('3');
  await expect(page.locator('.statistics-request-preview')).toContainText('freq={1:2,2:3}');

  await page.getByTestId('soft-action-evaluate').click();
  const answer = page.getByTestId('display-outcome-answer-block')
    .locator('[data-raw-latex]')
    .first();
  await expect(answer).toHaveAttribute('data-raw-latex', /\\bar\{x\}=1\.6/);
  await expect(answer).toHaveAttribute('data-raw-latex', /df=4/);
});

test('Inference surface stays contained at the minimum supported PC width', async ({ page }) => {
  const surface = page.locator('.statistics-inference-layout');
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(surface).toBeVisible();
  await expect.poll(() => surface.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);
  await surface.screenshot({
    path: '.task_tmp/statistics-consolidation7/gate7-inference-pc.png',
    animations: 'disabled',
  });
});
