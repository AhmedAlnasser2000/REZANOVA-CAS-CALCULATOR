import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { getMathFieldLatex, openLauncherApp, setMathFieldLatex } from './helpers';

const screenshotDir = '.task_tmp/matrix-vector-core-combinations';

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

async function insertNativeMatrix(page: Page, size: string) {
  await page.getByTestId('main-editor').click({ button: 'right' });
  await page.getByText('Insert Matrix', { exact: true }).hover();
  await page.locator(`[data-tooltip="${size}"]`).click();
}

test('native menu keeps the second and third matrices editable', async ({ page }) => {
  await page.goto('/');
  await openLauncherApp(page, 'Linear', 'Matrix');
  const field = page.getByTestId('main-editor');
  await setMathFieldLatex(page, String.raw`\begin{pmatrix}1&2\\3&4\end{pmatrix}+`);
  await field.evaluate((element) => (element as HTMLElement & { executeCommand: (command: string) => void })
    .executeCommand('moveToMathfieldEnd'));
  await insertNativeMatrix(page, '3 × 3');
  await expect.poll(() => getMathFieldLatex(page)).toContain(String.raw`\begin{pmatrix}\placeholder{}`);
  await page.keyboard.type('9');
  await expect.poll(() => getMathFieldLatex(page)).toMatch(/\+\\begin\{pmatrix\}9/u);
  await page.screenshot({ fullPage: true, path: `${screenshotDir}/native-second-matrix-e2e.png` });

  await setMathFieldLatex(page, String.raw`\begin{pmatrix}1&2\\3&4\end{pmatrix}+\begin{pmatrix}9&2&3\\4&5&6\\7&8&9\end{pmatrix}+`);
  await field.evaluate((element) => (element as HTMLElement & { executeCommand: (command: string) => void })
    .executeCommand('moveToMathfieldEnd'));
  await insertNativeMatrix(page, '3 × 3');
  await expect.poll(async () => (await getMathFieldLatex(page)).match(/\\begin\{pmatrix\}/gu)?.length).toBe(3);
  await page.keyboard.type('8');
  await expect.poll(() => getMathFieldLatex(page)).toMatch(/\+\\begin\{pmatrix\}8/u);
  await page.screenshot({ fullPage: true, path: `${screenshotDir}/native-third-matrix-e2e.png` });
});

test('typed Matrix and Vector compositions and Calculate inline literals give answers', async ({ page }) => {
  await page.goto('/');
  await openLauncherApp(page, 'Linear', 'Matrix');
  await setMathFieldLatex(page, 'det(A)+det(B)');
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();

  await openLauncherApp(page, 'Linear', 'Vector');
  await setMathFieldLatex(page, 'unit(u+v)');
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();

  await openLauncherApp(page, 'Core', 'Calculate');
  await setMathFieldLatex(page, String.raw`\begin{bmatrix}1&2\\3&4\end{bmatrix}\times\begin{bmatrix}1\\2\end{bmatrix}`);
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-answer-block').locator('[data-raw-latex]'))
    .toHaveAttribute('data-raw-latex', String.raw`\begin{bmatrix}5\\11\end{bmatrix}`);
});
