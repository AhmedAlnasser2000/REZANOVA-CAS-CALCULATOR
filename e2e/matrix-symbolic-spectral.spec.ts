import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { openLauncherApp, setMathFieldLatex } from './helpers';
import { setMatrixScalarValues } from './linear-algebra-scalar-driver';
import {
  copyResult,
  installClipboardCapture,
  replayLatestHistoryEntry,
} from './calculus-integral-evidence';

const screenshotDir = '.task_tmp/linear-algebra-symbolic-complex-program/milestone-12';

async function setMatrixA(page: Page, values: readonly (readonly string[])[]) {
  await setMatrixScalarValues(
    page,
    'A',
    values.length,
    values[0].length,
    values.flat(),
  );
}

async function runEditor(page: Page, latex: string) {
  await setMathFieldLatex(page, latex);
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
}

async function primaryLatex(page: Page) {
  return page.getByTestId('display-outcome-answer-block').locator('[data-raw-latex]').first()
    .getAttribute('data-raw-latex');
}

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await installClipboardCapture(page);
  await page.goto('/');
  await openLauncherApp(page, 'Linear', 'Matrix');
  await expect(page.getByText('Matrix Workspace')).toBeVisible();
});

test('renders, copies, and replays a factorized four-parameter characteristic polynomial', async ({ page }) => {
  await setMatrixA(page, [
    ['a', '0', '0', '0'],
    ['0', 'b', '0', '0'],
    ['0', '0', 'c', '0'],
    ['0', '0', '0', 'd'],
  ]);
  await runEditor(page, 'charpoly(A)');

  await expect.poll(() => primaryLatex(page)).toContain('lambda-a');
  await expect.poll(() => primaryLatex(page)).toContain('lambda-d');
  await expect(page.getByTestId('display-outcome-answer-block'))
    .toContainText('Characteristic polynomial');
  await expect(page.getByTestId('display-outcome-success').evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 1,
  )).resolves.toBe(true);

  const copied = await copyResult(page);
  expect(copied).toContain('lambda-a');
  const replayed = await replayLatestHistoryEntry(page);
  expect(replayed).toContain('charpoly');
  await expect.poll(() => primaryLatex(page)).toContain('lambda-d');

  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/factorized-charpoly-history-copy.png`,
  });
});

test('distinguishes Real and Complex spectral domains for planar rotation', async ({ page }) => {
  await setMatrixA(page, [['0', '-1'], ['1', '0']]);
  await setMathFieldLatex(page, 'eigen(A)');
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-error')).toContainText(
    'Complex eigenvalue and eigenvector readback is deferred for Matrix V1.',
  );

  await page.getByLabel('Scalar domain').selectOption('complex');
  await runEditor(page, 'eigen(A)');
  await expect(page.getByTestId('display-outcome-answer-block').getByText('Eigenvalue', { exact: true }))
    .toHaveCount(2);
  await expect(page.getByTestId('display-outcome-answer-block').getByText('Eigenspace', { exact: true }))
    .toHaveCount(2);
  await expect(page.getByTestId('display-outcome-success').evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 1,
  )).resolves.toBe(true);

  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/real-complex-rotation-spectrum.png`,
  });
});

test('preserves a general symbolic cubic when bounded root presentation stops', async ({ page }) => {
  await setMatrixA(page, [
    ['0', '0', '-c'],
    ['1', '0', '-b'],
    ['0', '1', '-a'],
  ]);
  await runEditor(page, 'eigen(A)');
  await expect(page.getByTestId('display-outcome-answer-block'))
    .toContainText('Characteristic polynomial');
  await expect(page.getByTestId('display-outcome-answer-block'))
    .toContainText('Unresolved factor');
  await expect(page.getByTestId('display-outcome-success'))
    .toContainText('unresolved factor exceeded the bounded polynomial presentation policy');
});
