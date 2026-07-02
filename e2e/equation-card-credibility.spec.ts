import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import {
  fillNumericIntervalInput,
  openSettingsPanel,
  openEquationSymbolic,
  setMathFieldLatex,
} from './helpers';

const screenshotDir = '.task_tmp/equation-card-credibility-polish1/screenshots';

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('main-editor')).toBeVisible();
  await openSettingsPanel(page);
  await page.getByTestId('settings-angle-unit-rad').click();
  await expect(page.getByTestId('quick-setting-angle-unit')).toHaveText('RAD');
  await page.getByTestId('side-surface-overlay-backdrop').click();
});

async function openDetailCard(page: Page, title: string) {
  const card = page.locator('details.result-summary-block', { hasText: title }).first();
  await expect(card).toBeVisible();
  const isOpen = await card.evaluate((element) => (element as HTMLDetailsElement).open);
  if (!isOpen) {
    await card.locator('summary').click();
  }
}

async function enableNumericInterval(page: Page, latex: string, start: string, end: string, subdivisions = '256') {
  await openEquationSymbolic(page);
  await setMathFieldLatex(page, latex);
  await page.getByRole('button', { name: 'Enable Numeric Interval' }).click();
  await expect(page.getByText('Numeric Interval Solve')).toBeVisible();
  await fillNumericIntervalInput(page, 'Start', start);
  await fillNumericIntervalInput(page, 'End', end);
  await fillNumericIntervalInput(page, 'Subdivisions', subdivisions);
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
}

test('Equation credibility screenshot keeps quotient domain and periodic cards separated', async ({ page }) => {
  await enableNumericInterval(page, String.raw`\frac{\sin(x)}{x}=0`, '-10', '10');

  await expect(page.locator('[data-testid="display-outcome-detail-sections"]')).toContainText('Domain and Exclusions');
  await expect(page.locator('[data-testid="display-outcome-detail-sections"]')).toContainText('Periodic Structure');
  await openDetailCard(page, 'Periodic Structure');

  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/sin-quotient-domain-periodic.png`,
  });
});

test('Equation credibility screenshot keeps mixed trig domain facts clean', async ({ page }) => {
  await enableNumericInterval(page, String.raw`x^2+\sin(x)=2`, '-10', '10');

  await expect(page.getByTestId('display-outcome-exact')).toContainText('1.728466');
  await expect(page.getByTestId('display-outcome-exact')).toContainText('1.06155');
  await openDetailCard(page, 'Periodic Structure');

  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/mixed-trig-periodic-structure.png`,
  });
});

test('Equation credibility screenshot keeps exact periodic solve notes collapsed', async ({ page }) => {
  await openEquationSymbolic(page);
  await setMathFieldLatex(page, String.raw`\tan(\sin(\ln(x)+1))=1`);
  await page.getByTestId('soft-action-solve').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();

  const solveNote = page.getByTestId('display-outcome-solve-summary');
  await expect(solveNote).toBeVisible();
  await expect.poll(() => solveNote.evaluate((element) => (element as HTMLDetailsElement).open))
    .toBe(false);

  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/exact-periodic-solve-note-collapsed.png`,
  });
});
