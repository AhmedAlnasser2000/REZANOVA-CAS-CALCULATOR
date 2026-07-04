import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import {
  getMathFieldLatex,
  openLauncherApp,
  setMathFieldLatex,
} from './helpers';

const screenshotDir = '.task_tmp/linear-algebra-template-natural-input1';

function exactText(label: string) {
  return new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

async function rawLatexIn(page: Page, testId: string) {
  return page.getByTestId(testId).locator('[data-raw-latex]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-raw-latex') ?? '').join('\n'));
}

async function runEditor(page: Page, latex: string) {
  await setMathFieldLatex(page, latex);
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
}

async function runEditorExpectError(page: Page, latex?: string) {
  if (typeof latex === 'string') {
    await setMathFieldLatex(page, latex);
  }
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-error')).toBeVisible();
}

async function expectAnswerContains(page: Page, ...snippets: string[]) {
  for (const snippet of snippets) {
    await expect.poll(() => rawLatexIn(page, 'display-outcome-answer-block')).toContain(snippet);
  }
}

function detailCard(page: Page, title: string) {
  return page.locator('details.result-summary-block')
    .filter({ has: page.locator('.result-summary-label', { hasText: exactText(title) }) })
    .first();
}

async function expectDetailCard(page: Page, title: string) {
  await expect(detailCard(page, title)).toBeVisible();
}

async function expectNoRawSyntaxLeak(page: Page) {
  await expect(page.getByTestId('display-outcome-root')).not.toContainText(/\[\[|\\beginbmatrix|\\OPERATORNAME/u);
}

async function expectCanonicalEditor(page: Page) {
  await expect.poll(() => getMathFieldLatex(page)).toContain('\\begin{bmatrix}');
  const editorLatex = await getMathFieldLatex(page);
  expect(editorLatex).toContain('\\begin{bmatrix}');
  expect(editorLatex).not.toContain('[[');
  return editorLatex;
}

async function setVector(page: Page, name: 'u' | 'v', values: readonly number[]) {
  await page.getByLabel(`Vector ${name} length`).fill(String(values.length));
  const card = page.locator('.linear-algebra-value-card')
    .filter({ has: page.getByLabel(`Vector ${name} name`) });
  const inputs = card.locator('.linear-algebra-vector-grid input');
  await expect(inputs).toHaveCount(values.length);
  for (const [index, value] of values.entries()) {
    await inputs.nth(index).fill(String(value));
    await inputs.nth(index).blur();
  }
}

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Matrix friendly list imports canonicalize to natural notation and keep cards readable', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Matrix');

  await runEditor(page, 'eigen([[2,1],[1,2]])');
  await expectCanonicalEditor(page);
  await expectNoRawSyntaxLeak(page);
  await expect(page.locator('.result-summary-label', { hasText: exactText('Approx') })).toHaveCount(0);
  await expectAnswerContains(page, '\\lambda=3', '\\lambda=1');
  await expectDetailCard(page, 'Characteristic Polynomial');
  await expectDetailCard(page, 'How Eigenvalues Were Found');
  await expectDetailCard(page, 'Eigenspaces');

  await runEditor(page, 'lu([[2,1],[4,3]])');
  await expectCanonicalEditor(page);
  await expectNoRawSyntaxLeak(page);
  await expect(page.locator('.result-summary-label', { hasText: exactText('Approx') })).toHaveCount(0);
  await expectAnswerContains(page, '=LU');
  await expectDetailCard(page, 'LU Factors');
  await expectDetailCard(page, 'Factorization Row Steps');
  await expectDetailCard(page, 'LU Proof');

  await runEditor(page, 'plu([[0,1],[2,3]])');
  await expectCanonicalEditor(page);
  await expectNoRawSyntaxLeak(page);
  await expectAnswerContains(page, 'P', '=LU');
  await expectDetailCard(page, 'PLU Factors');
  await expectDetailCard(page, 'PLU Row Swaps');
  await expectDetailCard(page, 'PLU Proof');

  await runEditor(page, 'coords([[1,2],[3,4]],[5,11])');
  await expectCanonicalEditor(page);
  await expectNoRawSyntaxLeak(page);
  await expect(page.locator('.result-summary-label', { hasText: exactText('Approx') })).toHaveCount(0);
  await expectAnswerContains(page, '\\begin{bmatrix}1\\\\2\\end{bmatrix}');
  await expectDetailCard(page, 'Coordinate Facts');
  await expectDetailCard(page, 'Coordinate Proof');

  await runEditor(page, 'qr([[3,0],[4,5]])');
  await expectCanonicalEditor(page);
  await expectNoRawSyntaxLeak(page);
  await expectAnswerContains(page, '=QR');
  await expectDetailCard(page, 'QR Factors');
  await expectDetailCard(page, 'QR Proof');
  await expectDetailCard(page, 'QR Column Steps');

  await runEditor(page, 'ls([[1,0],[0,1],[0,0]],[2,3,4])');
  await expectCanonicalEditor(page);
  await expectNoRawSyntaxLeak(page);
  await expect(page.locator('.result-summary-label', { hasText: exactText('Approx') })).toHaveCount(0);
  await expectAnswerContains(
    page,
    'x_{\\mathrm{LS}}=\\begin{bmatrix}2\\\\3\\end{bmatrix}',
  );
  await expect.poll(() => rawLatexIn(page, 'display-outcome-root'))
    .toContain('\\begin{bmatrix}0\\\\0\\\\4\\end{bmatrix}');
  await expectDetailCard(page, 'Least-Squares Solution');
  await expectDetailCard(page, 'Residual Vector');
  await expectDetailCard(page, 'Least-Squares Proof');
  await expect.poll(() => rawLatexIn(page, 'display-expression-preview-card'))
    .toContain('\\operatorname{ls}');
  expect(await rawLatexIn(page, 'display-expression-preview-card')).not.toContain('\\operatorname{qr}');
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/matrix-friendly-least-squares-natural.png`,
  });
});

test('MathLive matrix environments and keypad templates stay editable with controlled slot errors', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Matrix');

  await runEditor(page, String.raw`\det\left(\begin{pmatrix}1&2\\3&4\end{pmatrix}\right)`);
  const canonicalDet = await expectCanonicalEditor(page);
  expect(canonicalDet).not.toContain('pmatrix');
  await expectAnswerContains(page, '-2');

  await setMathFieldLatex(page, '');
  await page.getByTestId('keypad-linear-matrix-template').click();
  const matrixTemplateLatex = await getMathFieldLatex(page);
  expect(matrixTemplateLatex).toContain('\\begin{bmatrix}');
  expect(matrixTemplateLatex).toContain('\\placeholder');
  await runEditorExpectError(page);
  await expect(page.getByTestId('display-outcome-error')).toContainText(
    'Fill every Matrix/Vector template slot before running it.',
  );
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/matrix-template-fill-error.png`,
  });

  await openLauncherApp(page, 'Linear', 'Vector');
  await page.getByTestId('keypad-linear-vector-template').click();
  const vectorTemplateLatex = await getMathFieldLatex(page);
  expect(vectorTemplateLatex).toContain('\\begin{bmatrix}');
  expect(vectorTemplateLatex).toContain('\\placeholder');
  await runEditorExpectError(page);
  await expect(page.getByTestId('display-outcome-error')).toContainText(
    'Fill every Matrix/Vector template slot before running it.',
  );
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/vector-template-fill-error.png`,
  });
});

test('Vector friendly imports canonicalize while named vector workflows stay natural', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Vector');

  await runEditor(page, 'gram([1,1],[1,0])');
  await expectCanonicalEditor(page);
  await expectNoRawSyntaxLeak(page);
  await expect(page.locator('.result-summary-label', { hasText: exactText('Approx') })).toHaveCount(0);
  await expect(page.getByTestId('display-outcome-answer-block')).not.toContainText(/roots/i);
  await expectDetailCard(page, 'Orthonormal Basis');
  await expectDetailCard(page, 'Gram-Schmidt Proof');

  await setVector(page, 'u', [1, 0]);
  await setVector(page, 'v', [2, 3]);
  await runEditor(page, String.raw`\operatorname{proj}_{u}\left(v\right)`);
  await expect(page.locator('.result-summary-label', { hasText: exactText('Approx') })).toHaveCount(0);
  await expectAnswerContains(page, '\\begin{bmatrix}2\\\\0\\end{bmatrix}');
  await expect.poll(() => rawLatexIn(page, 'display-expression-preview-card'))
    .toContain('\\operatorname{proj}_{u}');
  expect(await rawLatexIn(page, 'display-expression-preview-card')).not.toContain('\\operatorname{gram}');
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/vector-friendly-projection-natural.png`,
  });
});
