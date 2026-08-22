import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  copyResult,
  installClipboardCapture,
  replayLatestHistoryEntry,
} from './calculus-integral-evidence';
import { openLauncherApp, setMathFieldLatex } from './helpers';
import { setMatrixScalarValues } from './linear-algebra-scalar-driver';

const SCREENSHOT_DIR = '.task_tmp/matrix-symmetric-positive-definite1';

async function setMatrix(
  page: Page,
  name: string,
  rows: number,
  columns: number,
  values: readonly number[],
) {
  await setMatrixScalarValues(page, name, rows, columns, values);
}

async function runEditor(page: Page) {
  await setMathFieldLatex(page, String.raw`\operatorname{definite}\left(A\right)`);
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

test('shows exact and tolerance-labelled definiteness with copy, replay, collapse, and controlled errors', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Matrix');
  await setMatrix(page, 'A', 2, 2, [2, -1, -1, 2]);

  await page.getByTestId('keypad-layer-ctrl').click();
  await expect(page.getByTestId('keypad-linear-invertible')).toContainText('definite');
  await page.getByTestId('keypad-layer-base').click();

  await runEditor(page);
  const exactOutcome = page.getByTestId('display-outcome-success');
  await expect(exactOutcome).toBeVisible();
  await expect.poll(() => rawLatex(exactOutcome)).toContain(
    String.raw`\operatorname{definite}(A)=\text{Positive definite}`,
  );
  const exactEvidence = detailCard(page, 'Exact Principal-Minor Evidence');
  if (!await exactEvidence.evaluate((element) => (element as HTMLDetailsElement).open)) {
    await exactEvidence.locator('summary').click();
  }
  await expect(exactEvidence).toContainText('All-principal-minor counts');
  const criterion = detailCard(page, 'Classification Criterion');
  if (!await criterion.evaluate((element) => (element as HTMLDetailsElement).open)) {
    await criterion.locator('summary').click();
  }
  await expect(criterion).toContainText(
    'All 3 nonempty principal minors were evaluated exactly.',
  );
  expect(await copyResult(page)).toBe(
    String.raw`\operatorname{definite}(A)=\text{Positive definite}`,
  );
  await page.screenshot({ fullPage: true, path: `${SCREENSHOT_DIR}/positive-definite-expanded.png` });
  await exactEvidence.locator('summary').click();
  await expect.poll(() => exactEvidence.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(false);
  expect(await exactOutcome.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);

  const replayed = await replayLatestHistoryEntry(page);
  expect(replayed).toContain('definite');
  await expect.poll(() => rawLatex(page.getByTestId('display-outcome-success'))).toContain(
    String.raw`\text{Positive definite}`,
  );

  await setMatrix(page, 'A', 2, 2, [1.5, 0, 0, 0.5]);
  await runEditor(page);
  const numericOutcome = page.getByTestId('display-outcome-success');
  await expect(numericOutcome).toContainText('Numerical definiteness is tolerance-based');
  const spectralEvidence = detailCard(page, 'Tolerance-Labeled Spectral Evidence');
  if (!await spectralEvidence.evaluate((element) => (element as HTMLDetailsElement).open)) {
    await spectralEvidence.locator('summary').click();
  }
  await expect(spectralEvidence).toContainText('Automatic scale-aware tolerance');
  await expect(spectralEvidence).toContainText('Jacobi eigenvalue estimates');
  await page.screenshot({ fullPage: true, path: `${SCREENSHOT_DIR}/numeric-positive-definite.png` });

  await setMatrix(page, 'A', 2, 2, [1, 2, 2, 1]);
  await runEditor(page);
  await expect.poll(() => rawLatex(page.getByTestId('display-outcome-success'))).toContain(
    String.raw`\text{Indefinite}`,
  );

  await setMatrix(page, 'A', 2, 3, [1, 0, 0, 0, 1, 0]);
  await runEditor(page);
  await expect(page.getByTestId('display-outcome-error')).toContainText(
    'definite(A) requires a square matrix.',
  );
  await page.screenshot({ fullPage: true, path: `${SCREENSHOT_DIR}/rectangular-stop.png` });
});
