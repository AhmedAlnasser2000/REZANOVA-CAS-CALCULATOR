import { expect, test, type Page } from '@playwright/test';
import { openLauncherApp } from './helpers';

function exactText(label: string) {
  return new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

async function openStatisticsTool(page: Page, ...labels: string[]) {
  await openLauncherApp(page, 'Data', 'Statistics');
  for (const label of labels) {
    await page.locator('button.statistics-menu-entry:visible')
      .filter({ has: page.locator('strong', { hasText: exactText(label) }) })
      .click();
  }
}

async function replaceWithOneKeystroke(page: Page, input: ReturnType<Page['locator']>, value: string) {
  await input.fill('');
  await input.click();
  await page.keyboard.type(value);
  await page.waitForTimeout(50);
  await expect(input).toBeFocused();
  await expect(input).toHaveValue(value);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('main-editor')).toBeVisible();
});

test('Statistics dataset entry preserves a trailing comma while typing', async ({ page }) => {
  await openStatisticsTool(page, 'Data Entry');
  const dataset = page.locator('textarea.statistics-textarea');

  await dataset.fill('12');
  await dataset.press('End');
  await page.keyboard.type(',');

  await expect(dataset).toBeFocused();
  await expect(dataset).toHaveValue('12,');
});

test('Statistics probability and inference fields retain focus after one keystroke', async ({ page }) => {
  await openStatisticsTool(page, 'Probability', 'Binomial');
  await replaceWithOneKeystroke(
    page,
    page.locator('.statistics-panel .statistics-input-grid input').nth(1),
    '7',
  );

  await page.reload();
  await openStatisticsTool(page, 'Inference', 'Mean');
  await page.getByRole('button', { name: 'Two-Sided Test' }).click();
  await replaceWithOneKeystroke(
    page,
    page.locator('.statistics-panel .statistics-input-grid input').nth(1),
    '8',
  );
});

test('Statistics relationship cells retain focus after one keystroke', async ({ page }) => {
  for (const tool of ['Regression', 'Correlation']) {
    if (tool !== 'Regression') {
      await page.reload();
    }
    await openStatisticsTool(page, tool);
    await replaceWithOneKeystroke(
      page,
      page.locator('.statistics-panel .statistics-edit-row input').nth(1),
      tool === 'Regression' ? '4' : '5',
    );
  }
});
