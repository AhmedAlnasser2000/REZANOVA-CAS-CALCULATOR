import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  copyResult,
  installClipboardCapture,
  replayLatestHistoryEntry,
} from './calculus-integral-evidence';
import { openLauncherApp, setMathFieldLatex } from './helpers';

const SCREENSHOT_DIR = '.task_tmp/vector-gram-schmidt-n1';

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

test('orthogonalizes three named vectors with exact copy, proof, replay, and bounded errors', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Vector');
  await addVector(page, 'p', [1, 0, 0]);
  await addVector(page, 'q', [1, 1, 0]);
  await addVector(page, 'r', [1, 1, 1]);

  await runEditor(page, String.raw`\operatorname{gram}\left(p,q,r\right)`);
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  const answer = page.getByTestId('display-outcome-answer-block');
  await expect.poll(() => rawLatex(answer)).toContain(String.raw`w_{3}=\begin{bmatrix}0\\0\\1\end{bmatrix}`);

  const proof = detailCard(page, 'Gram-Schmidt Proof');
  await expect(proof).toBeVisible();
  await expect(proof.locator('[data-raw-latex*="w_{3}=r-"]').first()).toBeVisible();
  await expect.poll(() => rawLatex(proof)).toContain(String.raw`w_{2}\cdot w_{3}=0`);
  await expect(detailCard(page, 'Orthonormal Basis')).toBeVisible();

  const copied = await copyResult(page);
  expect(copied).toContain(String.raw`\operatorname{orthogonal\ basis}`);
  expect(copied).toContain(String.raw`\begin{bmatrix}0\\0\\1\end{bmatrix}`);

  await proof.locator('summary').click();
  await expect.poll(() => proof.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(false);
  await expect(page.getByTestId('display-outcome-success').evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 1,
  )).resolves.toBe(true);
  await page.screenshot({
    fullPage: true,
    path: `${SCREENSHOT_DIR}/variadic-gram-schmidt.png`,
  });

  const replayed = await replayLatestHistoryEntry(page);
  expect(replayed).toContain('\\operatorname{gram}');
  expect(replayed).toContain('p,q,r');
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect.poll(() => rawLatex(page.getByTestId('display-outcome-answer-block')))
    .toContain(String.raw`w_{3}=\begin{bmatrix}0\\0\\1\end{bmatrix}`);

  await runEditor(page, String.raw`\operatorname{gram}\left(p,p,p,p,p,p,p\right)`);
  await expect(page.getByTestId('display-outcome-error')).toContainText(
    'Gram-Schmidt requires one through six vector operands.',
  );
  await page.screenshot({
    fullPage: true,
    path: `${SCREENSHOT_DIR}/gram-schmidt-count-stop.png`,
  });
});
