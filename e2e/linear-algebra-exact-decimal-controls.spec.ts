import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  closeSidePanelIfOpen,
  openLauncherApp,
  openSettingsPanel,
  setMathFieldLatex,
} from './helpers';
import { setVectorScalarValues } from './linear-algebra-scalar-driver';

const SCREENSHOT_DIR = '.task_tmp/linear-algebra-exact-decimal-controls1';

async function setVector(page: Page, name: string, values: readonly number[]) {
  await setVectorScalarValues(page, name, values);
}

async function rawLatex(locator: Locator) {
  return locator.locator('[data-raw-latex]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-raw-latex') ?? '').join('\n'));
}

test.beforeAll(async () => {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto('/');
  await expect(page.getByTestId('main-editor')).toBeVisible();
});

test('keeps exact Vector copy truth while Both and Decimal render precision-aware math', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await openSettingsPanel(page);
  await page.getByTestId('settings-approx-digits-input').fill('4');
  await page.getByTestId('settings-approx-digits-input').blur();
  await closeSidePanelIfOpen(page);

  await openLauncherApp(page, 'Linear', 'Vector');
  await setVector(page, 'u', [1, 1, 1]);
  await setVector(page, 'v', [1, 1, 0]);
  await setMathFieldLatex(page, String.raw`\operatorname{proj}_{u}(v)`);
  await page.getByTestId('editor-runtime-run').click();

  const exact = page.getByTestId('display-outcome-answer-block');
  const decimal = page.getByTestId('display-outcome-approx');
  await expect(exact).toBeVisible();
  await expect(decimal).toBeVisible();
  await expect.poll(() => rawLatex(exact)).toContain(String.raw`\frac{2}{3}`);
  await expect.poll(() => rawLatex(decimal)).toContain('0.666');
  await expect.poll(() => rawLatex(decimal)).toContain('7');
  await expect(page.getByText('Decimal', { exact: true })).toBeVisible();

  await page.getByTestId('display-outcome-action-copy-result').click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain(String.raw`\frac{2}{3}`);

  await page.getByTestId('quick-setting-output-style').click();
  await expect(page.getByTestId('quick-setting-output-style')).toContainText('Exact');
  await expect(exact).toBeVisible();
  await expect(decimal).toHaveCount(0);

  await page.getByTestId('quick-setting-output-style').click();
  await expect(page.getByTestId('quick-setting-output-style')).toContainText('Decimal');
  await expect(exact).toHaveCount(0);
  await expect(page.getByTestId('display-outcome-approx')).toBeVisible();
  await expect.poll(() => rawLatex(page.getByTestId('display-outcome-approx')))
    .toContain('0.666');

  await page.getByTestId('display-outcome-action-copy-result').click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain(String.raw`\frac{2}{3}`);
  await expect(page.getByTestId('display-outcome-success').evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 1,
  )).resolves.toBe(true);
  await page.screenshot({
    fullPage: true,
    path: `${SCREENSHOT_DIR}/vector-projection-decimal.png`,
  });

  await page.getByTestId('history-toggle').click();
  await expect(page.getByTestId('history-entry-result-preview')).toContainText('2');
  await page.getByTestId('history-entry-replay').click();
  await expect(page.getByTestId('display-outcome-approx')).toBeVisible();
  await expect.poll(() => rawLatex(page.getByTestId('display-outcome-approx')))
    .toContain('0.666');
});
