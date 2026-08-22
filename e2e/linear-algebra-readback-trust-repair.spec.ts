import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  openLauncherApp,
  setMathFieldLatex,
} from './helpers';
import { setVectorScalarValues } from './linear-algebra-scalar-driver';

const screenshotDir = '.task_tmp/linear-algebra-readback-trust-repair1';

function exactText(label: string) {
  return new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

async function runEditor(page: Page, latex: string) {
  await setMathFieldLatex(page, latex);
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
}

function detailCard(page: Page, title: string) {
  return page.locator('details.result-summary-block')
    .filter({ has: page.locator('.result-summary-label', { hasText: exactText(title) }) })
    .first();
}

async function expectDetailCard(page: Page, title: string) {
  const card = detailCard(page, title);
  await expect(card).toBeVisible();
  return card;
}

async function expectTrustReadback(page: Page, options: { expectNoTitle?: boolean } = {}) {
  await expect(page.locator('.result-summary-label', { hasText: exactText('Approx') }))
    .toHaveCount(0);
  if (options.expectNoTitle) {
    await expect(page.getByTestId('display-outcome-title')).toHaveCount(0);
  } else if (await page.getByTestId('display-outcome-title').count()) {
    await expect(page.getByTestId('display-outcome-title')).not.toContainText(/\\begin|\\operatorname|\\OPERATORNAME/u);
  }
  await expect(page.getByTestId('display-outcome-root')).not.toContainText(/\\beginbmatrix|\\OPERATORNAME|\\operatorname\{LS\}/u);
}

function rgbLuma(color: string) {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/u);
  if (!match) {
    return 255;
  }
  return (Number(match[1]) + Number(match[2]) + Number(match[3])) / 3;
}

async function expectReadableDarkPicker(picker: Locator) {
  const styles = await picker.evaluate((element) => {
    const computed = window.getComputedStyle(element);
    return {
      backgroundColor: computed.backgroundColor,
      color: computed.color,
    };
  });
  expect(rgbLuma(styles.backgroundColor)).toBeLessThan(80);
  expect(styles.color).not.toBe('rgba(0, 0, 0, 0)');
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

async function setVector(page: Page, name: 'u' | 'v', values: readonly number[]) {
  await setVectorScalarValues(page, name, values);
}

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Matrix readback cards stay natural and do not leak fake Approx summaries', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Matrix');

  const leftPicker = page.getByLabel('Active Matrix left operand', { exact: true });
  await expect(leftPicker).toBeVisible();
  await expect(leftPicker).toHaveText('A');
  await leftPicker.click();
  await expect(page.getByRole('listbox', { name: 'Active Matrix left operand options' }))
    .toBeVisible();
  await expect(
    page.getByRole('listbox', { name: 'Active Matrix left operand options' })
      .getByRole('option', { selected: true }),
  ).toHaveText('A');
  await expectReadableDarkPicker(leftPicker);

  await runEditor(page, String.raw`\operatorname{eigen}\left(\begin{bmatrix}2&1\\1&2\end{bmatrix}\right)`);
  await expectTrustReadback(page, { expectNoTitle: true });
  await expectAnswerContains(page, String.raw`\lambda=3`, String.raw`\lambda=1`);
  await expectDetailCard(page, 'Characteristic Polynomial');
  await expectDetailCard(page, 'How Eigenvalues Were Found');
  await expectDetailCard(page, 'Eigenspaces');

  await runEditor(page, String.raw`\operatorname{lu}\left(\begin{bmatrix}2&1\\4&3\end{bmatrix}\right)`);
  await expectTrustReadback(page);
  await expectAnswerContains(page, String.raw`=LU`);
  await expectDetailCard(page, 'LU Factors');
  await expectDetailCard(page, 'Factorization Row Steps');
  await expectDetailCard(page, 'LU Proof');

  await runEditor(page, String.raw`\operatorname{plu}\left(\begin{bmatrix}0&1\\2&3\end{bmatrix}\right)`);
  await expectTrustReadback(page);
  await expectAnswerContains(page, String.raw`P`, String.raw`=LU`);
  await expectDetailCard(page, 'PLU Factors');
  await expectDetailCard(page, 'PLU Row Swaps');
  await expectDetailCard(page, 'PLU Proof');

  await runEditor(page, String.raw`\operatorname{coords}\left(\begin{bmatrix}1&2\\3&4\end{bmatrix},\begin{bmatrix}5\\11\end{bmatrix}\right)`);
  await expectTrustReadback(page);
  await expectAnswerContains(page, String.raw`\begin{bmatrix}1\\2\end{bmatrix}`);
  await expectDetailCard(page, 'Coordinate Facts');
  await expectDetailCard(page, 'Coordinate Proof');

  await runEditor(page, String.raw`\operatorname{qr}\left(\begin{bmatrix}3&0\\4&5\end{bmatrix}\right)`);
  await expectTrustReadback(page);
  await expectAnswerContains(page, String.raw`=QR`);
  await expectDetailCard(page, 'QR Factors');
  await expectDetailCard(page, 'QR Proof');
  await expectDetailCard(page, 'QR Column Steps');

  await runEditor(page, String.raw`\operatorname{ls}\left(\begin{bmatrix}1&0\\0&1\\0&0\end{bmatrix},\begin{bmatrix}2\\3\\4\end{bmatrix}\right)`);
  await expectTrustReadback(page);
  await expectAnswerContains(page, String.raw`x_{\mathrm{LS}}=\begin{bmatrix}2\\3\end{bmatrix}`);
  await expectDetailCard(page, 'Least-Squares Solution');
  await expectDetailCard(page, 'Residual Vector');
  await expectDetailCard(page, 'Least-Squares Proof');
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/matrix-least-squares-readback.png`,
  });

  await runEditor(page, String.raw`\operatorname{diag}\left(\begin{bmatrix}2&1\\1&2\end{bmatrix}\right)`);
  await expectTrustReadback(page);
  await expectAnswerContains(
    page,
    String.raw`\operatorname{diag}`,
    String.raw`\begin{bmatrix}1 & -1`,
    String.raw`\frac{1}{2}`,
  );
  await expectDetailCard(page, 'Diagonalization Factors');
  await expectDetailCard(page, 'Diagonalization Proof');
  await expectDetailCard(page, 'Eigenvector Columns');

  await runEditor(page, String.raw`A x = \begin{bmatrix}5\\11\end{bmatrix}`);
  await expectTrustReadback(page);
  const solveNote = page.getByTestId('display-outcome-solve-summary');
  await expect(solveNote).toContainText('Exactly one solution.');
  await expect(solveNote).toContainText('Only this vector x satisfies the system.');
  await expectDetailCard(page, 'System Proof');
  await expectDetailCard(page, 'Rank Facts');
  await expectDetailCard(page, 'Augmented RREF');
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/matrix-system-readback.png`,
  });
});

test('Vector readback keeps operation cards natural while preserving numeric approximations only', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Vector');

  const firstPicker = page.getByLabel('Active Vector first operand', { exact: true });
  await expect(firstPicker).toBeVisible();
  await expect(firstPicker).toHaveText('u');
  await firstPicker.click();
  await expect(page.getByRole('listbox', { name: 'Active Vector first operand options' }))
    .toBeVisible();
  await expectReadableDarkPicker(firstPicker);

  await setVector(page, 'u', [1, 1]);
  await setVector(page, 'v', [1, 0]);
  await runEditor(page, String.raw`\operatorname{gram}\left(u,v\right)`);
  await expectTrustReadback(page);
  await expect(page.getByTestId('display-outcome-answer-block')).not.toContainText(/roots|APPROX/u);
  await expectDetailCard(page, 'Orthonormal Basis');
  await expectDetailCard(page, 'Gram-Schmidt Proof');

  await setVector(page, 'u', [1, 0]);
  await setVector(page, 'v', [2, 3]);
  await runEditor(page, String.raw`\operatorname{proj}_{u}\left(v\right)`);
  await expect(page.locator('.result-summary-label', { hasText: exactText('Approx') }))
    .toHaveCount(0);
  await expectAnswerContains(page, String.raw`\begin{bmatrix}2\\0\end{bmatrix}`);
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/vector-projection-readback.png`,
  });

  await runEditor(page, String.raw`u\cdot v`);
  await expect(page.locator('.result-summary-label', { hasText: exactText('Decimal') }))
    .toBeVisible();
  await expect(page.getByTestId('display-outcome-readback')).toContainText('2');
});
