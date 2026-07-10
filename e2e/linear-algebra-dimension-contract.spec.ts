import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { openLauncherApp, setMathFieldLatex } from './helpers';

const screenshotDir = '.task_tmp/linear-algebra-dimension-contract1';

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Matrix distinguishes the 8 by 8 editor cap from the 6 by 6 exact RREF cap', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Matrix');

  await page.getByLabel('Matrix A rows').fill('8');
  await page.getByLabel('Matrix A columns').fill('8');
  await expect(page.locator('.linear-algebra-value-card').first().locator('.matrix-grid input')).toHaveCount(64);

  await setMathFieldLatex(page, String.raw`\operatorname{rank}\left(A\right)`);
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-error')).toContainText(
    'The exact matrix limit for rank and RREF is 6 by 6.',
  );
  await expect(page.getByTestId('display-status')).toContainText('Ready');
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/matrix-exact-limit.png`,
  });

  await setMathFieldLatex(
    page,
    String.raw`\operatorname{rank}\left(\begin{bmatrix}1&0\\2&0\\3&0\\4&0\\5&0\\6&0\\7&0\\8&0\\9&0\end{bmatrix}\right)`,
  );
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-error')).toContainText(
    'Matrix inputs support up to 8 by 8; received 9 by 2.',
  );
  await expect(page.getByTestId('display-status')).toContainText('Ready');
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/matrix-editor-limit.png`,
  });
});

test('Vector accepts length 8 and stops an inline length-9 operand clearly', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Vector');

  await page.getByLabel('Vector u length').fill('8');
  await expect(page.locator('.linear-algebra-value-card').first().locator('.vector-grid input')).toHaveCount(8);
  await page.getByRole('button', { name: 'F3 ‖u‖' }).click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();

  await setMathFieldLatex(
    page,
    String.raw`\lVert\begin{bmatrix}1\\2\\3\\4\\5\\6\\7\\8\\9\end{bmatrix}\rVert`,
  );
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-error')).toContainText(
    'Vector inputs support up to 8 entries; received 9.',
  );
  await expect(page.getByTestId('display-status')).toContainText('Ready');
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/vector-editor-limit.png`,
  });
});
