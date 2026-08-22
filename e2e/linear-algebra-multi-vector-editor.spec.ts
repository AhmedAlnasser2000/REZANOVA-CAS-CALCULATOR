import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import {
  openLauncherApp,
  setMathFieldLatex,
} from './helpers';
import { setVectorScalarValues } from './linear-algebra-scalar-driver';

const screenshotDir = '.task_tmp/linear-algebra-multi-vector-editor1';

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

async function setVector(page: Page, name: string, values: readonly number[]) {
  await setVectorScalarValues(page, name, values);
}

async function addVector(page: Page, name: string, values: readonly number[]) {
  await page.getByRole('button', { name: 'Add Vector' }).click();
  await expect(page.getByLabel(`Vector ${name} name`)).toBeVisible();
  await setVector(page, name, values);
}

async function runVectorEditor(page: Page, latex: string) {
  await setMathFieldLatex(page, latex);
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
}

async function rawLatexIn(page: Page, testId: string) {
  return page.getByTestId(testId).locator('[data-raw-latex]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-raw-latex') ?? '').join('\n'));
}

async function expectAnswerContains(page: Page, ...snippets: string[]) {
  for (const snippet of snippets) {
    await expect.poll(() => rawLatexIn(page, 'display-outcome-answer-block')).toContain(snippet);
  }
}

function detailCard(page: Page, title: string) {
  return page.locator('details.result-summary-block')
    .filter({ has: page.locator('.result-summary-label', { hasText: new RegExp(`^${title}$`, 'i') }) })
    .first();
}

test('Vector editor composes arbitrary named vectors with projection and Gram-Schmidt', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Vector');
  await expect(page.getByText('Vector Workspace')).toBeVisible();

  await addVector(page, 'p', [1, 1]);
  await addVector(page, 'q', [1, 0]);
  await addVector(page, 'r', [0, 1]);

  await runVectorEditor(page, String.raw`\operatorname{proj}\left(p,q\right)`);
  await expectAnswerContains(page, String.raw`\begin{bmatrix}\frac{1}{2}\\\frac{1}{2}\end{bmatrix}`);
  await expect(page.getByTestId('display-outcome-root')).not.toContainText(/APPROX|roots/u);
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/vector-proj-p-q-result.png`,
  });

  await runVectorEditor(page, String.raw`\operatorname{gram}\left(p,q\right)`);
  await expectAnswerContains(page, String.raw`w_{1}`, String.raw`w_{2}`, String.raw`\frac{1}{2}`);
  await expect(detailCard(page, 'Orthonormal Basis')).toBeVisible();
  await expect(detailCard(page, 'Gram-Schmidt Proof')).toBeVisible();
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/vector-gram-p-q-result.png`,
  });
});

test('Vector editor supports 3D cross and scalar triple products from named values', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Vector');
  await expect(page.getByText('Vector Workspace')).toBeVisible();

  await addVector(page, 'p', [1, 0, 0]);
  await addVector(page, 'q', [0, 1, 0]);
  await addVector(page, 'r', [0, 0, 2]);

  await runVectorEditor(page, String.raw`\operatorname{cross}\left(p,q\right)`);
  await expectAnswerContains(page, String.raw`\begin{bmatrix}0\\0\\1\end{bmatrix}`);
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/vector-cross-p-q-result.png`,
  });

  await runVectorEditor(page, String.raw`\operatorname{triple}\left(p,q,r\right)`);
  await expectAnswerContains(page, '2');
  await expect(page.getByTestId('display-outcome-root')).not.toContainText('Unsupported');
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/vector-triple-p-q-r-result.png`,
  });
});
