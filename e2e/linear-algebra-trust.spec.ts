import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import {
  openLauncherApp,
  setMathFieldLatex,
} from './helpers';
import {
  copyResult,
  installClipboardCapture,
  replayLatestHistoryEntry,
} from './calculus-integral-evidence';

const screenshotDir = '.task_tmp/linear-algebra-editor-trust-milestone1-gate-f';

function exactText(label: string) {
  return new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

async function runEditor(page: Page, latex: string) {
  await setMathFieldLatex(page, latex);
  await page.getByTestId('editor-runtime-run').click();
}

function detailCard(page: Page, title: string) {
  return page.locator('details.result-summary-block')
    .filter({ has: page.locator('.result-summary-label', { hasText: exactText(title) }) })
    .first();
}

async function expectDetailOpen(page: Page, title: string, open: boolean) {
  const card = detailCard(page, title);
  await expect(card).toBeVisible();
  await expect.poll(() => card.evaluate((element) => (element as HTMLDetailsElement).open))
    .toBe(open);
  return card;
}

async function rawLatexValues(page: Page, testId: string) {
  return page.getByTestId(testId).locator('[data-raw-latex]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-raw-latex') ?? ''));
}

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await installClipboardCapture(page);
  await page.goto('/');
});

test('Matrix system readback keeps solve note, proof cards, copy, hints, and history trustworthy', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Matrix');
  await runEditor(page, String.raw`A x = \begin{bmatrix}5\\11\end{bmatrix}`);

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('variable-hint-strip')).toHaveCount(0);

  const solveNote = page.getByTestId('display-outcome-solve-summary');
  await expect(solveNote).toBeVisible();
  if (!(await solveNote.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await solveNote.locator('summary').click();
  }
  await expect(solveNote).toContainText('Exactly one solution.');
  await expect(solveNote).toContainText('Only this vector x satisfies the system.');

  const systemProof = await expectDetailOpen(page, 'System Proof', true);
  await expect(systemProof).toContainText('The ranks match');
  await expect(systemProof).toContainText('Only this vector x satisfies the system.');
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('Rank Facts');
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('Augmented RREF');
  await expectDetailOpen(page, 'Row Reduction Steps', false);

  const copied = await copyResult(page);
  expect(copied).toContain('x=\\begin{bmatrix}1\\\\2\\end{bmatrix}');

  const replayedLatex = await replayLatestHistoryEntry(page);
  expect(replayedLatex).toContain('A x');
  expect(replayedLatex).toContain('\\begin{bmatrix}5\\\\11\\end{bmatrix}');

  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/matrix-system-trust-readback.png`,
  });
});

test('Vector Gram-Schmidt readback avoids root counts and keeps unsupported Matrix input controlled', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Vector');
  await runEditor(page, String.raw`\operatorname{gram}\left(u,v\right)`);

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('variable-hint-strip')).toHaveCount(0);
  await expect(page.getByTestId('display-outcome-answer-block').locator('.result-summary-count'))
    .toHaveCount(0);
  await expect(page.getByTestId('display-outcome-answer-block')).not.toContainText(/roots/i);
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('Orthonormal Basis');
  const gramProof = await expectDetailOpen(page, 'Gram-Schmidt Proof', true);
  await expect(gramProof.locator('[data-raw-latex^="w_{1}="]').first()).toBeVisible();
  await expect(gramProof.locator('[data-raw-latex="w_{1}\\\\cdot w_{2}=0"]').first()).toBeVisible();

  const copied = await copyResult(page);
  expect(copied).toContain('\\operatorname{orthogonal\\ basis}');

  await runEditor(page, String.raw`\operatorname{invertible}\left(A\right)`);
  await expect(page.getByTestId('display-outcome-error')).toContainText(
    'This Vector editor expression is not executable in Vector mode.',
  );

  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/vector-gram-schmidt-trust-readback.png`,
  });
});

test('Vector exact readback preserves inline unit vectors through copy and history replay', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Vector');
  await runEditor(page, String.raw`\operatorname{unit}\left(\begin{bmatrix}3\\4\end{bmatrix}\right)`);

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('variable-hint-strip')).toHaveCount(0);
  await expect.poll(() => rawLatexValues(page, 'display-outcome-answer-block'))
    .toContain(String.raw`\begin{bmatrix}\frac{3}{5}\\\frac{4}{5}\end{bmatrix}`);

  const copied = await copyResult(page);
  expect(copied).toBe(String.raw`\begin{bmatrix}\frac{3}{5}\\\frac{4}{5}\end{bmatrix}`);

  const replayedLatex = await replayLatestHistoryEntry(page);
  expect(replayedLatex).toContain('\\operatorname{unit}');
  expect(replayedLatex).toContain('\\begin{bmatrix}3\\\\4\\end{bmatrix}');

  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/vector-inline-unit-exact-readback.png`,
  });
});
