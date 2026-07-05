import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { getMathFieldLatex, openLauncherApp } from './helpers';

const screenshotDir = '.task_tmp/linear-algebra-named-library-ergonomics1';

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Matrix named library card actions stay readable and drive active soft keys', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Matrix');
  await expect(page.getByText('Matrix Workspace')).toBeVisible();

  await page.getByRole('button', { name: 'Add Matrix' }).click();
  await expect(page.getByLabel('Matrix C name')).toBeVisible();
  await expect(page.getByLabel('Active Matrix left operand', { exact: true })).toHaveText('C');

  await page.getByLabel('Matrix C name').fill('D');
  await expect(page.getByLabel('Matrix D name')).toBeVisible();
  await expect(page.getByLabel('Active Matrix left operand', { exact: true })).toHaveText('D');
  await expect(page.getByTestId('soft-action-add')).toHaveText(/D\+B/u);
  await expect(page.getByText('Active Left', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Insert Matrix D in editor' }).click();
  await expect.poll(() => getMathFieldLatex(page)).toBe('D');

  await page.getByRole('button', { name: 'Set Matrix B as Left' }).click();
  await page.getByRole('button', { name: 'Set Matrix D as Right' }).click();
  await expect(page.getByLabel('Active Matrix left operand', { exact: true })).toHaveText('B');
  await expect(page.getByLabel('Active Matrix right operand', { exact: true })).toHaveText('D');
  await expect(page.getByTestId('soft-action-add')).toHaveText(/B\+D/u);

  await page.getByLabel('Matrix D name').fill('B');
  await expect(page.getByRole('alert')).toContainText('Name already exists.');
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/matrix-library-duplicate-name-feedback.png`,
  });
  await page.getByLabel('Matrix D name').blur();

  await page.getByRole('button', { name: 'Duplicate Matrix D' }).click();
  await expect(page.getByLabel('Matrix C name')).toBeVisible();
  await expect(page.getByLabel('Active Matrix left operand', { exact: true })).toHaveText('C');
  await expect(page.getByLabel('Active Matrix right operand', { exact: true })).toHaveText('D');
  await expect(page.getByTestId('soft-action-add')).toHaveText(/C\+D/u);

  await page.getByTestId('soft-action-add').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-answer-block')).toBeVisible();
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/matrix-library-active-result-card.png`,
  });
});

test('Vector named library card actions stay readable and drive active soft keys', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Vector');
  await expect(page.getByText('Vector Workspace')).toBeVisible();

  await page.getByRole('button', { name: 'Add Vector' }).click();
  await expect(page.getByLabel('Vector p name')).toBeVisible();
  await expect(page.getByLabel('Active Vector first operand', { exact: true })).toHaveText('p');

  await page.getByLabel('Vector p name').fill('q');
  await expect(page.getByLabel('Vector q name')).toBeVisible();
  await expect(page.getByLabel('Active Vector first operand', { exact: true })).toHaveText('q');
  await expect(page.getByTestId('soft-action-dot')).toHaveText(/q·v/u);
  await expect(page.getByText('Active First', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Insert Vector q in editor' }).click();
  await expect.poll(() => getMathFieldLatex(page)).toBe('q');

  await page.getByRole('button', { name: 'Set Vector v as First' }).click();
  await page.getByRole('button', { name: 'Set Vector q as Second' }).click();
  await expect(page.getByLabel('Active Vector first operand', { exact: true })).toHaveText('v');
  await expect(page.getByLabel('Active Vector second operand', { exact: true })).toHaveText('q');
  await expect(page.getByTestId('soft-action-dot')).toHaveText(/v·q/u);

  await page.getByRole('button', { name: 'Duplicate Vector q' }).click();
  await expect(page.getByLabel('Vector p name')).toBeVisible();
  await expect(page.getByLabel('Active Vector first operand', { exact: true })).toHaveText('p');
  await expect(page.getByLabel('Active Vector second operand', { exact: true })).toHaveText('q');
  await expect(page.getByTestId('soft-action-dot')).toHaveText(/p·q/u);

  await page.getByLabel('Vector p name').fill('q');
  await expect(page.getByRole('alert')).toContainText('Name already exists.');
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/vector-library-duplicate-name-feedback.png`,
  });
  await page.getByLabel('Vector p name').blur();

  await page.getByTestId('soft-action-dot').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-answer-block')).toBeVisible();
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/vector-library-active-result-card.png`,
  });
});
