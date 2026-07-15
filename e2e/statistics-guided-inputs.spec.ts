import { expect, test, type Page } from '@playwright/test';
import { openLauncherApp } from './helpers';

function exactText(label: string) {
  return new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

async function openStatisticsTool(page: Page, ...labels: string[]) {
  await openLauncherApp(page, 'Data', 'Statistics');
  const sectionByLabel: Record<string, string> = {
    'Data Entry': 'Data & Summary',
    Descriptive: 'Data & Summary',
    Frequency: 'Data & Summary',
    Probability: 'Probability',
    Binomial: 'Probability',
    Normal: 'Probability',
    Poisson: 'Probability',
    Inference: 'Inference',
    Mean: 'Inference',
    Regression: 'Relationships',
    Correlation: 'Relationships',
  };
  const target = labels.at(-1) ?? 'Descriptive';
  const section = sectionByLabel[target] ?? sectionByLabel[labels[0]];
  if (section) {
    await page.getByRole('tab', { name: exactText(section) }).click();
  }
  const toolSelect = page.getByRole('combobox', { name: 'Statistics tool' });
  if (await toolSelect.count() > 0 && !['Probability', 'Inference'].includes(target)) {
    await toolSelect.selectOption({ label: target });
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
  await page.getByRole('radio', { name: 'Hypothesis test' }).click();
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

test('Statistics results use labeled vertical rows and support Full result', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openStatisticsTool(page, 'Descriptive');
  await page.getByTestId('editor-runtime-run').click();

  const result = page.locator('.statistics-embedded-display-panel');
  await expect(result).toBeVisible();
  await expect(result.locator('.result-answer-row-label').filter({ hasText: 'Size and total' }))
    .toBeVisible();
  await expect(result.locator('.result-answer-row-label').filter({ hasText: 'Center' }))
    .toBeVisible();
  await expect(result).toHaveClass(/statistics-result-view--contained/);

  await result.getByRole('button', { name: 'Show full result' }).click();
  await expect(result).toHaveClass(/statistics-result-view--full/);
  await expect(result.getByRole('button', { name: 'Use contained result' })).toBeVisible();

  const overflow = await result.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('Statistics replaces the lower keypad with a stable visualization dock', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('.keypad-panel')).toBeVisible();
  await openStatisticsTool(page, 'Descriptive');

  const dock = page.getByTestId('statistics-visualization-dock');
  await expect(dock).toBeVisible();
  await expect(page.locator('.keypad-panel')).toHaveCount(0);
  await expect(dock.getByTestId('statistics-visualization-empty')).toBeVisible();

  await page.getByRole('radio', { name: 'Expression', exact: true }).click();
  await dock.getByRole('button', { name: 'Show keypad' }).click();
  await expect(dock.getByTestId('statistics-expression-keypad')).toBeVisible();
  await expect(dock.locator('.keypad-panel')).toBeVisible();

  await dock.getByRole('button', { name: 'Show visualization' }).click();
  await expect(dock.getByTestId('statistics-expression-keypad')).toHaveCount(0);
  await expect(dock).toBeVisible();
});
