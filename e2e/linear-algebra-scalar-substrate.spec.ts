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
