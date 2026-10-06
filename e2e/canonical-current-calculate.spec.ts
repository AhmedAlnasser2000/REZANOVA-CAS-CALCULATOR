import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { openLauncherApp, setMathFieldLatex } from './helpers';
import { copyResult, installClipboardCapture, openDetailCard } from './calculus-integral-evidence';

const directory = '.task_tmp/canonical-result-consolidation/calculate-browser';
async function document(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('rezanova-classwiz-calculator:app-state:v1') ?? '{}').history?.at(-1)?.resultDocument);
}
async function run(page: Page, latex: string) {
  await setMathFieldLatex(page, latex);
  await page.getByTestId('keypad-execute').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect.poll(() => document(page)).toMatchObject({ version: 7, outcomeKind: 'success' });
}

test.beforeEach(async ({ page }) => {
  await mkdir(directory, { recursive: true });
  await installClipboardCapture(page);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('current-contract-test-initialized')) {
      localStorage.clear(); sessionStorage.clear();
      sessionStorage.setItem('current-contract-test-initialized', 'yes');
    }
  });
  await page.goto('/');
  await openLauncherApp(page, 'Core', 'Calculate');
});

test('Calculate exact answer remains copyable and stored as current mathematics', async ({ page }) => {
  await run(page, String.raw`\frac{9007199254740993}{3}`);
  expect((await document(page)).primary.kind).toBe('math');
  expect((await copyResult(page)).replace(/\\,/g, '')).toContain('3002399751580331');
  await page.getByTestId('display-outcome-success').screenshot({ path: `${directory}/exact.png` });
  await page.reload();
  await expect.poll(() => document(page)).toMatchObject({ version: 7 });
});

test('Calculate derivative at a point executes the original request', async ({ page }) => {
  await run(page, String.raw`\left.\frac{d}{dx}(x^2)\right|_{x=3}`);
  expect((await document(page)).primary.value.mathJson).toBe(6);
  expect(await copyResult(page)).toContain('6');
  await page.getByTestId('display-outcome-success').screenshot({ path: `${directory}/derivative-point.png` });
});

test('Calculate special functions preserve typed formula and mathematical proof scope', async ({ page }) => {
  await run(page, String.raw`\int e^{x^2}\,dx`);
  const result = await document(page);
  expect(result.primary.kind).toBe('special-function-expression');
  expect(result.details.flatMap((section: {lines: {kind: string}[][]}) => section.lines.flat()).some((part: {kind: string}) => part.kind === 'special-function')).toBe(true);
  expect(await copyResult(page)).toContain('erfi');
  for (const section of result.details) await openDetailCard(page, section.title);
  await page.getByTestId('display-outcome-success').screenshot({ path: `${directory}/special.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId('display-outcome-success').screenshot({ path: `${directory}/special-narrow.png` });
});

test('Calculate errors remain controlled current documents', async ({ page }) => {
  await setMathFieldLatex(page, 'root(1,x)');
  await page.getByTestId('keypad-execute').click();
  await expect(page.getByTestId('display-outcome-error')).toBeVisible();
  // Controlled errors are intentionally not persisted as successful History answers.
  expect(await document(page)).toBeUndefined();
  await page.getByTestId('display-outcome-error').screenshot({ path: `${directory}/error.png` });
});
