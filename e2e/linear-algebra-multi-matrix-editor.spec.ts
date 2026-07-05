import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  openLauncherApp,
  setMathFieldLatex,
} from './helpers';

const screenshotDir = '.task_tmp/linear-algebra-multi-matrix-editor1';

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

function matrixCard(page: Page, name: string): Locator {
  return page.locator('.linear-algebra-value-card')
    .filter({ has: page.getByLabel(`Matrix ${name} name`) })
    .first();
}

async function fillMatrix(page: Page, name: string, values: readonly number[]) {
  const inputs = matrixCard(page, name).locator('.matrix-grid input');
  await expect(inputs).toHaveCount(values.length);
  for (let index = 0; index < values.length; index += 1) {
    await inputs.nth(index).fill(String(values[index]));
  }
}

async function runMatrixEditor(page: Page, latex: string) {
  await setMathFieldLatex(page, latex);
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
}

async function expectAnswerRawLatex(page: Page, pattern: RegExp) {
  await expect(page.getByTestId('display-outcome-answer-block').locator('[data-raw-latex]').first())
    .toHaveAttribute('data-raw-latex', pattern);
}

test('Matrix editor can compose more named matrices than the active Left/Right pair', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Matrix');
  await expect(page.getByText('Matrix Workspace')).toBeVisible();

  await page.getByRole('button', { name: 'Add Matrix' }).click();
  await expect(page.getByLabel('Matrix C name')).toBeVisible();
  await fillMatrix(page, 'C', [1, 0, 0, 1]);

  await page.getByRole('button', { name: 'Add Matrix' }).click();
  await expect(page.getByLabel('Matrix D name')).toBeVisible();
  await fillMatrix(page, 'D', [2, 1, 4, 3]);

  await page.getByRole('button', { name: 'Add Matrix' }).click();
  await expect(page.getByLabel('Matrix E name')).toBeVisible();
  await fillMatrix(page, 'E', [1, 2, 0, 1]);

  await runMatrixEditor(page, 'CDE');
  await expect(page.getByTestId('display-outcome-answer-block')).toContainText('2');
  await expect(page.getByTestId('display-outcome-answer-block')).toContainText('11');
  await expectAnswerRawLatex(page, /\\begin\{bmatrix\}2 & 5\\\\4 & 11\\end\{bmatrix\}/u);
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/matrix-cde-composed-result.png`,
  });

  await runMatrixEditor(page, String.raw`\det\left(CD\right)`);
  await expectAnswerRawLatex(page, /^2$/u);
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/matrix-det-cd-result.png`,
  });
});
