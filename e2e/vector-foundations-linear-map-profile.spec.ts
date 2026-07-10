import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { openLauncherApp, setMathFieldLatex } from './helpers';

const screenshotDir = '.task_tmp/vector-foundations-linear-map-profile';

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

function vectorCard(page: Page, name: string): Locator {
  return page.locator('.linear-algebra-value-card')
    .filter({ has: page.getByLabel(`Vector ${name} name`) })
    .first();
}

async function setVector(page: Page, name: string, values: readonly number[]) {
  await page.getByLabel(`Vector ${name} length`).fill(String(values.length));
  const inputs = vectorCard(page, name).locator('.linear-algebra-vector-grid input');
  await expect(inputs).toHaveCount(values.length);
  for (let index = 0; index < values.length; index += 1) {
    await inputs.nth(index).fill(String(values[index]));
    await inputs.nth(index).blur();
  }
}

async function addVector(page: Page, name: string, values: readonly number[]) {
  await page.getByRole('button', { name: 'Add Vector' }).click();
  await expect(page.getByLabel(`Vector ${name} name`)).toBeVisible();
  await setVector(page, name, values);
}

async function rawAnswerLatex(page: Page) {
  return page.getByTestId('display-outcome-answer-block').locator('[data-raw-latex]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-raw-latex') ?? '').join('\n'));
}

test('exact scalar/vector combinations render naturally without approximation leakage', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Vector');
  await addVector(page, 'p', [3, 6]);
  await addVector(page, 'q', [6, 3]);

  await setMathFieldLatex(page, '2p-q/3');
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect.poll(() => rawAnswerLatex(page)).toContain(
    String.raw`\begin{bmatrix}4\\11\end{bmatrix}`,
  );
  await expect(page.getByTestId('display-outcome-root')).not.toContainText(/APPROX|Unsupported/u);

  await setMathFieldLatex(page, String.raw`\frac{1}{2}(p+q)`);
  await page.getByTestId('editor-runtime-run').click();
  await expect.poll(() => rawAnswerLatex(page)).toContain(
    String.raw`\begin{bmatrix}\frac{9}{2}\\\frac{9}{2}\end{bmatrix}`,
  );
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/vector-exact-linear-combination.png`,
  });
});
