import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  copyResult,
  installClipboardCapture,
  replayLatestHistoryEntry,
} from './calculus-integral-evidence';
import { openLauncherApp, setMathFieldLatex } from './helpers';

const SCREENSHOT_DIR = '.task_tmp/matrix-svd-pinverse-conditioning1';

function matrixCard(page: Page, name: string): Locator {
  return page.locator('.linear-algebra-value-card')
    .filter({ has: page.getByLabel(`Matrix ${name} name`) })
    .first();
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

async function runEditor(page: Page, latex: string) {
  await setMathFieldLatex(page, latex);
  await page.getByTestId('editor-runtime-run').click();
}

async function rawLatex(locator: Locator) {
  return locator.locator('[data-raw-latex]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-raw-latex') ?? '').join('\n'));
}

function detailCard(page: Page, title: string) {
  return page.locator('details.result-summary-block')
    .filter({ has: page.locator('.result-summary-label', { hasText: title }) })
    .first();
}

test.beforeAll(async () => {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await installClipboardCapture(page);
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto('/');
});

test('shows bounded numerical decompositions with diagnostics, copy, replay, and controlled stops', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Matrix');
  await setMatrix(page, 'A', 2, 2, [3, 0, 4, 0]);

  await page.getByTestId('keypad-layer-ctrl').click();
  await expect(page.getByTestId('keypad-linear-rank')).toContainText('nrank');
  await expect(page.getByTestId('keypad-linear-eigen')).toContainText('cond');
  await expect(page.getByTestId('keypad-linear-inverse')).toContainText('pinv');
  await expect(page.getByTestId('keypad-linear-qr')).toContainText('svd');
  await page.getByTestId('keypad-layer-base').click();

  await runEditor(page, String.raw`\operatorname{pinv}\left(A\right)`);
  const pseudoinverseOutcome = page.getByTestId('display-outcome-success');
  await expect(pseudoinverseOutcome).toBeVisible();
  await expect(pseudoinverseOutcome).toContainText(
    'SVD, pseudoinverse, condition number, and numerical rank are approximate',
  );
  await expect.poll(() => rawLatex(pseudoinverseOutcome)).toContain(
    String.raw`\operatorname{pinv}\left(A\right)\approx \begin{bmatrix}0.12 & 0.16\\0 & 0\end{bmatrix}`,
  );
  const diagnostics = detailCard(page, 'SVD Diagnostics');
  if (!await diagnostics.evaluate((element) => (element as HTMLDetailsElement).open)) {
    await diagnostics.locator('summary').click();
  }
  await expect(diagnostics).toContainText('Automatic SVD threshold');
  await expect(diagnostics).toContainText('Numerical rank');
  const pseudoinverseCheck = detailCard(page, 'Pseudoinverse Check');
  if (!await pseudoinverseCheck.evaluate((element) => (element as HTMLDetailsElement).open)) {
    await pseudoinverseCheck.locator('summary').click();
  }
  await expect(pseudoinverseCheck).toContainText('Moore-Penrose reconstruction relation');
  expect(await copyResult(page)).toBe(
    String.raw`\operatorname{pinv}\left(A\right)\approx \begin{bmatrix}0.12 & 0.16\\0 & 0\end{bmatrix}`,
  );
  await page.screenshot({ fullPage: true, path: `${SCREENSHOT_DIR}/pseudoinverse-expanded.png` });
  await diagnostics.locator('summary').click();
  await expect.poll(() => diagnostics.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(false);
  expect(await pseudoinverseOutcome.evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 1,
  )).toBe(true);

  const replayed = await replayLatestHistoryEntry(page);
  expect(replayed).toContain('pinv');
  await expect(page.getByRole('tab', { name: 'Matrix Linear Algebra' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect.poll(() => rawLatex(page.getByTestId('display-outcome-success'))).toContain('0.12');

  await setMatrix(page, 'A', 2, 2, [3, 0, 0, 1]);
  await runEditor(page, String.raw`\operatorname{cond}\left(A\right)`);
  await expect.poll(() => rawLatex(page.getByTestId('display-outcome-success'))).toContain(
    String.raw`\operatorname{cond}\left(A\right)\approx 3`,
  );

  await setMatrix(page, 'A', 2, 2, [1, 0, 0, 0]);
  await runEditor(page, String.raw`\operatorname{cond}\left(A\right)`);
  await expect.poll(() => rawLatex(page.getByTestId('display-outcome-success'))).toContain(
    String.raw`\operatorname{cond}\left(A\right)= \infty`,
  );

  await setMatrix(page, 'A', 2, 3, [1, 2, 3, 4, 5, 6]);
  await runEditor(page, String.raw`\operatorname{svd}\left(A\right)`);
  const svdOutcome = page.getByTestId('display-outcome-success');
  await expect(svdOutcome).toBeVisible();
  const factors = detailCard(page, 'Numerical SVD Factors');
  if (!await factors.evaluate((element) => (element as HTMLDetailsElement).open)) {
    await factors.locator('summary').click();
  }
  await expect(factors).toContainText('Left singular vectors');
  await expect(factors).toContainText('Reconstruction relation');
  await page.screenshot({ fullPage: true, path: `${SCREENSHOT_DIR}/rectangular-svd-expanded.png` });

  await runEditor(
    page,
    String.raw`\operatorname{pinv}\left(\begin{bmatrix}1&0\\2&0\\3&0\\4&0\\5&0\\6&0\\7&0\\8&0\\9&0\end{bmatrix}\right)`,
  );
  await expect(page.getByTestId('display-outcome-error')).toContainText(
    'Matrix inputs support up to 8 by 8; received 9 by 2.',
  );
  await page.screenshot({ fullPage: true, path: `${SCREENSHOT_DIR}/oversized-inline-matrix-stop.png` });
});
