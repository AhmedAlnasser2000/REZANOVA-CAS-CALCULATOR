import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator } from '@playwright/test';
import { openLauncherApp } from './helpers';

const screenshotDir = '.task_tmp/linear-algebra-symbolic-complex-program/milestone-8';

async function setScalarCell(cell: Locator, latex: string) {
  await cell.evaluate((element, nextLatex) => {
    const field = element as HTMLElement & { setValue: (value: string) => void };
    field.focus();
    field.setValue(nextLatex as string);
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    field.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      composed: true,
    }));
  }, latex);
}

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto('/');
});

test('shows source-preserving scalar cells, domain guidance, and stored-value previews', async ({ page }) => {
  await page.getByTestId('variables-toggle').click();
  await page.getByTestId('variables-name-input').fill('a');
  await page.getByTestId('variables-value-input').fill('5');
  await page.getByTestId('variables-set-button').click();
  await expect(page.getByTestId('variables-entry')).toContainText('a');
  await page.getByTestId('variables-panel').getByRole('button', { name: /close/i }).click();

  await openLauncherApp(page, 'Linear', 'Matrix');
  await expect(page.getByText('Matrix Workspace')).toBeVisible();
  await expect(page.getByLabel('Scalar domain')).toHaveValue('real');
  await expect(page.getByLabel('Parameter substitution')).toHaveValue('symbolic');
  await expect(page.getByLabel('Scalar domain')).toHaveCSS('color', 'rgb(23, 32, 29)');
  await expect(page.getByLabel('Scalar domain')).toHaveCSS('background-color', 'rgb(242, 244, 239)');
  await expect(page.getByLabel('Matrix A rows')).toHaveCSS('color', 'rgb(23, 32, 29)');
  await expect(page.getByLabel('Matrix A rows')).toHaveCSS('background-color', 'rgb(242, 244, 239)');

  const workspaceWidth = await page.locator('main.workspace').evaluate((element) => element.clientWidth);
  const matrixPanelWidth = await page.locator('section.mode-panel').filter({ hasText: 'Matrix Workspace' })
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(matrixPanelWidth).toBeGreaterThan(workspaceWidth * 0.94);

  const matrixCardWidth = await page.getByLabel('Matrix A rows').locator('xpath=ancestor::div[contains(@class,"editor-card")]')
    .evaluate((element) => element.getBoundingClientRect().width);
  const firstCellWidth = await page.getByLabel('Matrix A row 1 column 1')
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(firstCellWidth).toBeGreaterThan(matrixCardWidth * 0.35);
  await expect(page.getByLabel('Matrix A row 1 column 1')).toHaveCSS('color', 'rgb(247, 251, 239)');

  await page.getByLabel('Matrix B columns').fill('7');
  const wideMatrixCell = page.getByLabel('Matrix B row 1 column 7');
  await expect(wideMatrixCell).toBeVisible();
  expect(await wideMatrixCell.evaluate((element) => element.getBoundingClientRect().width))
    .toBeGreaterThanOrEqual(112);
  await expect(wideMatrixCell).toHaveCSS('color', 'rgb(247, 251, 239)');
  expect(await wideMatrixCell.locator('xpath=ancestor::div[contains(@class,"linear-algebra-matrix-grid")]').evaluate(
    (element) => element.scrollWidth > element.clientWidth,
  )).toBe(true);

  const cell = page.getByLabel('Matrix A row 1 column 1');
  await setScalarCell(cell, 'i');
  await expect(page.getByRole('alert')).toContainText('requires Complex mode');
  await page.getByLabel('Scalar domain').selectOption('complex');
  await setScalarCell(cell, 'a');
  await page.getByLabel('Parameter substitution').selectOption('use-stored-values');

  await expect(page.getByText('Used: a=5')).toBeVisible();
  await expect(page.getByTitle('Resolved stored-value preview')).toContainText('5');
  await expect.poll(() => cell.evaluate((element) =>
    (element as HTMLElement & { getValue: (format: string) => string }).getValue('latex')))
    .toBe('a');
  await expect(page.locator('section.mode-panel').filter({ hasText: 'Matrix Workspace' }).evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 1,
  )).resolves.toBe(true);

  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/matrix-stored-value-preview.png`,
  });

  await openLauncherApp(page, 'Linear', 'Vector');
  await expect(page.getByText('Vector Workspace')).toBeVisible();
  await expect(page.getByLabel('Scalar domain')).toHaveValue('real');
  await expect(page.getByLabel('Parameter substitution')).toHaveValue('symbolic');
});
