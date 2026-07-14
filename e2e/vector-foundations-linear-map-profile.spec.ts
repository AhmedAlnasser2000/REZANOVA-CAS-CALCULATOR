import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { openLauncherApp, setMathFieldLatex } from './helpers';
import {
  expectAnswerOverflowReady,
  replayLatestHistoryEntry,
} from './calculus-integral-evidence';

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

function matrixCard(page: Page, name: string): Locator {
  return page.locator('.linear-algebra-value-card')
    .filter({ has: page.getByLabel(`Matrix ${name} name`) })
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

async function setMatrix(
  page: Page,
  name: string,
  rows: number,
  columns: number,
  values: readonly number[],
) {
  await page.getByLabel(`Matrix ${name} rows`).fill(String(rows));
  await page.getByLabel(`Matrix ${name} columns`).fill(String(columns));
  const inputs = matrixCard(page, name).locator('.linear-algebra-matrix-grid input');
  await expect(inputs).toHaveCount(rows * columns);
  for (let index = 0; index < values.length; index += 1) {
    await inputs.nth(index).fill(String(values[index]));
    await inputs.nth(index).blur();
  }
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

test('span and independence show an input-selected basis and exact dependence proof', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Vector');
  await addVector(page, 'p', [1, 0]);
  await addVector(page, 'q', [0, 1]);
  await addVector(page, 'r', [1, 1]);

  await setMathFieldLatex(page, 'span(p,q,r)');
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect.poll(() => rawAnswerLatex(page)).toContain(
    String.raw`\dim\operatorname{span}\left(p,q,r\right)=2`,
  );
  await expect.poll(() => rawAnswerLatex(page)).toContain(
    String.raw`\operatorname{basis}=\left\{p,q\right\}`,
  );
  await expect(page.getByText('Span Facts', { exact: true })).toBeVisible();
  await expect(page.getByText('Dependence Relation', { exact: true })).toBeVisible();
  await expect(page.getByTestId('display-outcome-root')).not.toContainText(/APPROX|Unsupported/u);

  await setMathFieldLatex(page, 'independent(p,q,r)');
  await page.getByTestId('editor-runtime-run').click();
  await expect.poll(() => rawAnswerLatex(page)).toContain(String.raw`\text{No}`);
  await expect(page.getByTestId('display-outcome-detail-line-1-0')).toBeVisible();
  await expect(page.getByTestId('display-outcome-detail-line-1-1')).toBeVisible();
  await expect(page.getByTestId('display-outcome-detail-section-2')).not.toHaveAttribute('open');
  await expect(page.getByTestId('display-outcome-root')).toContainText('Span dimension:');
  await expect(page.getByTestId('display-outcome-root')).toContainText('Pivot columns:');
  await expect(page.getByTestId('display-outcome-root')).toContainText('Selected basis:');
  await expect(page.getByRole('button', { name: 'Open Formula Viewer' })).toHaveCount(0);
  await expectAnswerOverflowReady(page);

  const replayed = await replayLatestHistoryEntry(page);
  expect(replayed).toContain('independent');
  await expect(page.getByTestId('display-outcome-root')).toContainText('Selected basis:');

  await page.getByRole('button', { name: 'Shift', exact: true }).click();
  await expect(page.getByRole('button', { name: /independent/u })).toBeVisible();
  await expect(page.getByRole('button', { name: /span/u })).toBeVisible();
  await page.getByRole('button', { name: 'Base', exact: true }).click();

  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/vector-span-independence-history.png`,
  });
});

test('linear-map profile explains square and rectangular maps without misleading claims', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Matrix');
  await setMatrix(page, 'A', 2, 2, [1, 1, 2, 2]);

  await setMathFieldLatex(page, 'profile(A)');
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect.poll(() => rawAnswerLatex(page)).toContain(
    String.raw`A:\mathbb{R}^{2}\to\mathbb{R}^{2}`,
  );
  await expect.poll(() => rawAnswerLatex(page)).toContain(String.raw`\operatorname{rank}(A)=1`);
  await expect.poll(() => rawAnswerLatex(page)).toContain(String.raw`\operatorname{nullity}(A)=1`);
  for (const title of ['Rank-Nullity Facts', 'Kernel', 'Image', 'Invertibility', 'RREF Evidence']) {
    await expect(page.getByText(title, { exact: true })).toBeVisible();
  }
  await expect(page.getByTestId('display-outcome-detail-section-0')).toHaveAttribute('open');
  await expect(page.getByTestId('display-outcome-detail-section-1')).toHaveAttribute('open');
  await expect(page.getByTestId('display-outcome-detail-section-2')).toHaveAttribute('open');
  await expect(page.getByTestId('display-outcome-detail-section-3')).toHaveAttribute('open');
  await expect(page.getByTestId('display-outcome-detail-section-4')).not.toHaveAttribute('open');
  await expect(page.getByTestId('display-outcome-root')).toContainText(
    'Nullity is 1, so nonzero vectors in the kernel map to zero.',
  );
  await expect(page.getByTestId('display-outcome-root')).toContainText(
    'The rank is 1, smaller than the codomain dimension 2',
  );
  await expect(page.getByTestId('display-outcome-root')).toContainText('Rank-nullity:');
  await expect(page.getByTestId('display-outcome-root')).toContainText('Kernel spanning set:');
  await expect(page.getByTestId('display-outcome-root')).toContainText('Image spanning set:');
  await expect(page.getByTestId('display-outcome-root')).toContainText('Determinant:');
  await expect(page.getByTestId('display-outcome-root')).not.toContainText(/APPROX|Unsupported/u);
  await expect(page.getByRole('button', { name: 'Open Formula Viewer' })).toHaveCount(0);
  await expectAnswerOverflowReady(page);

  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/matrix-linear-map-profile-singular.png`,
  });

  const replayed = await replayLatestHistoryEntry(page);
  expect(replayed).toContain('profile');
  const replayedOutcome = page.getByTestId('display-outcome-root');
  await expect(replayedOutcome).toContainText('Kernel spanning set:');
  await page.waitForTimeout(300);
  await replayedOutcome.screenshot({
    path: `${screenshotDir}/matrix-linear-map-profile-history.png`,
  });

  await setMatrix(page, 'A', 3, 2, [1, 0, 0, 1, 0, 0]);
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-root')).toContainText(
    'Invertibility is not applicable to rectangular matrices.',
  );
  await expect(page.getByTestId('display-outcome-root')).not.toContainText(
    'The square matrix is not invertible.',
  );

  await page.getByRole('button', { name: 'Shift', exact: true }).click();
  await expect(page.getByRole('button', { name: /profile/u })).toBeVisible();
  await page.getByRole('button', { name: 'Base', exact: true }).click();

  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/matrix-linear-map-profile-rectangular.png`,
  });
});
