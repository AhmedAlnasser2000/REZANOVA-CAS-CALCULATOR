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

async function draftScalarCell(cell: Locator, latex: string) {
  await cell.evaluate((element, nextLatex) => {
    const field = element as HTMLElement & { setValue: (value: string) => void };
    field.focus();
    field.setValue(nextLatex as string);
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }, latex);
}

async function moveFromCellEdge(cell: Locator, key: 'ArrowLeft' | 'ArrowRight' | 'ArrowDown' | 'ArrowUp') {
  await cell.evaluate((element, pressedKey) => {
    const field = element as HTMLElement & {
      lastOffset: number;
      position: number;
      selectionIsCollapsed: boolean;
    };
    field.focus();
    field.selectionIsCollapsed = true;
    field.position = pressedKey === 'ArrowLeft' || pressedKey === 'ArrowUp'
      ? 0
      : field.lastOffset;
    field.dispatchEvent(new KeyboardEvent('keydown', {
      key: pressedKey as string,
      bubbles: true,
      composed: true,
    }));
  }, key);
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
  await expect(page.getByTestId('keypad-linear-basis')).toContainText('basis');
  await expect(page.getByTestId('keypad-linear-charpoly')).toContainText('char');
  await expect(page.getByTestId('keypad-linear-7')).toContainText('7');
  await expect(page.getByTestId('keypad-left')).toContainText('◄');
  await page.getByTestId('keypad-layer-shift').click();
  await expect(page.getByTestId('keypad-linear-eigen')).toContainText('diagz');
  await expect(page.getByTestId('keypad-linear-basis')).toContainText('coords');
  await page.getByTestId('keypad-layer-base').click();
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
  const wideMatrixCard = page.getByLabel('Matrix B rows')
    .locator('xpath=ancestor::div[contains(@class,"editor-card")]');
  await expect(wideMatrixCard).toHaveClass(/linear-algebra-value-card--wide/);
  expect(await wideMatrixCard.evaluate((element) => element.getBoundingClientRect().width))
    .toBeGreaterThan(matrixCardWidth * 1.7);
  expect(await wideMatrixCell.evaluate((element) => element.getBoundingClientRect().width))
    .toBeGreaterThanOrEqual(112);
  await expect(wideMatrixCell).toHaveCSS('color', 'rgb(247, 251, 239)');
  expect(await wideMatrixCell.evaluate((element) => {
    const content = element.shadowRoot?.querySelector('[part="content"]');
    return content ? getComputedStyle(content).color : null;
  })).toBe('rgb(247, 251, 239)');
  expect(await wideMatrixCell.locator('xpath=ancestor::div[contains(@class,"linear-algebra-matrix-grid")]').evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 1,
  )).toBe(true);

  const cell = page.getByLabel('Matrix A row 1 column 1');
  await setScalarCell(cell, 'i');
  await expect(page.getByRole('alert')).toContainText('requires Complex mode');
  await page.getByLabel('Scalar domain').selectOption('complex');
  await expect(page.getByRole('alert').filter({ hasText: 'requires Complex mode' })).toHaveCount(0);
  await draftScalarCell(cell, 'a');
  await moveFromCellEdge(cell, 'ArrowRight');
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('aria-label')))
    .toBe('Matrix A row 1 column 2');
  await moveFromCellEdge(page.getByLabel('Matrix A row 1 column 2'), 'ArrowDown');
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('aria-label')))
    .toBe('Matrix A row 2 column 2');
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
  await expect(page.getByTestId('keypad-linear-vector-u')).toContainText('u');
  await expect(page.getByTestId('keypad-linear-gram')).toContainText('gram');
  await expect(page.getByTestId('keypad-linear-7')).toContainText('7');
  await expect(page.getByTestId('keypad-left')).toContainText('◄');
  await expect(page.getByTestId('keypad-linear-basis')).toHaveCount(0);
  await draftScalarCell(page.getByLabel('Vector u component 1'), 'p');
  await moveFromCellEdge(page.getByLabel('Vector u component 1'), 'ArrowRight');
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('aria-label')))
    .toBe('Vector u component 2');
});
