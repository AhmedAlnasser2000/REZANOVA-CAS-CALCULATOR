import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { openLauncherApp, setMathFieldLatex } from './helpers';
import { copyResult, installClipboardCapture, openIndefiniteIntegral } from './calculus-integral-evidence';
import { setVectorScalarValues } from './linear-algebra-scalar-driver';

const directory = '.task_tmp/canonical-result-consolidation/current-browser';
async function latestDocument(page: Page) {
  return page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('rezanova-classwiz-calculator:app-state:v1') ?? '{}');
    return state.history?.at(-1)?.resultDocument;
  });
}

test.beforeEach(async ({ page }) => {
  await mkdir(directory, { recursive: true });
  await installClipboardCapture(page);
  await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('/');
});

test('current Statistics preserves mathematical rows, details and storage', async ({ page }) => {
  await openLauncherApp(page, 'Data', 'Statistics');
  await page.getByRole('tab', { name: 'Data & Summary' }).click();
  await page.locator('textarea.statistics-textarea').fill('1, 2, 3, 4, 100');
  await page.getByTestId('soft-action-evaluate').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect.poll(() => latestDocument(page)).toMatchObject({ version: 7, outcomeKind: 'success' });
  const doc = await latestDocument(page);
  expect(doc.answerRows.rows.length).toBeGreaterThan(3);
  expect(doc.answerRows.rows.every((row: {math: {mathJson?: unknown}}) => row.math.mathJson !== undefined)).toBe(true);
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('Population');
  expect(await copyResult(page)).toContain('IQR');
  await page.getByTestId('display-outcome-success').screenshot({ path: `${directory}/statistics.png` });
});

test('current special-function answer renders and copies its typed expression', async ({ page }) => {
  await openIndefiniteIntegral(page);
  await setMathFieldLatex(page, String.raw`e^{x^2}`);
  await page.getByTestId('keypad-execute').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect.poll(() => latestDocument(page)).toMatchObject({ version: 7,
    primary: { kind: 'special-function-expression' } });
  expect(await copyResult(page)).toContain('erfi');
  await page.getByTestId('display-outcome-success').screenshot({ path: `${directory}/special-function.png` });
});

test('current angle answer retains its gradian unit and copy meaning', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Vector');
  await page.getByTestId('settings-toggle').click();
  await page.getByTestId('settings-angle-unit-grad').click();
  await page.getByTestId('settings-toggle').click();
  await setVectorScalarValues(page, 'u', [1, 0]);
  await setVectorScalarValues(page, 'v', [0, 1]);
  await setMathFieldLatex(page, String.raw`\operatorname{angle}\left(u,v\right)`);
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect.poll(() => latestDocument(page)).toMatchObject({ version: 7,
    primary: { kind: 'angle-quantity', unit: 'grad' } });
  expect(await copyResult(page)).toMatch(/100/);
  await page.getByTestId('display-outcome-success').screenshot({ path: `${directory}/angle.png` });
});
