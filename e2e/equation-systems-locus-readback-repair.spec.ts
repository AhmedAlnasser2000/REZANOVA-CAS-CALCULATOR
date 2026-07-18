import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { openEquationSymbolic, setMathFieldLatex } from './helpers';

const screenshotDir = '.task_tmp/equation-systems-locus-readback-repair/screenshots';

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

async function enableComplex(page: Page) {
  const toggle = page.getByTestId('quick-setting-equation-domain-intent');
  if ((await toggle.textContent())?.includes('Off')) await toggle.click();
  await expect(toggle).toContainText('Complex On');
}

async function setAngleUnit(page: Page, unit: 'RAD' | 'DEG' | 'GRAD') {
  const toggle = page.getByTestId('quick-setting-angle-unit');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if ((await toggle.textContent())?.includes(unit)) return;
    await toggle.click();
  }
  await expect(toggle).toContainText(unit);
}

async function expectAnswerLatex(page: Page, pattern: RegExp | string) {
  await expect(page.getByTestId('display-outcome-answer-block').locator('[data-raw-latex]').first())
    .toHaveAttribute('data-raw-latex', pattern);
}

async function setSystemCell(field: ReturnType<Page['locator']>, latex: string) {
  await field.evaluate((element, nextLatex) => {
    const mathfield = element as HTMLElement & { setValue: (value: string) => void };
    mathfield.focus();
    mathfield.setValue(nextLatex as string);
    mathfield.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }, latex);
}

async function openLinearSystem(page: Page, size: 2 | 3) {
  await openEquationSymbolic(page);
  await page.getByTestId('main-editor').evaluate((element) => (element as HTMLElement).blur());
  await page.getByRole('button', { name: /F2\s+Menu/i }).click();
  const homeEntries = page.locator('button.equation-menu-entry:visible');
  await expect(homeEntries).toHaveCount(3);
  await homeEntries.filter({ hasText: 'Simultaneous' }).click();
  const entries = page.locator('button.equation-menu-entry:visible');
  await expect(entries).toHaveCount(3);
  await page.getByTestId(`keypad-${size - 1}`).click();
  await expect(page.locator('math-field[data-linear-algebra-cell]:visible')).toHaveCount(size * (size + 1));
}

async function fillSystem(page: Page, values: readonly string[]) {
  const fields = page.locator('math-field[data-linear-algebra-cell]:visible');
  await expect(fields).toHaveCount(values.length);
  for (const [index, value] of values.entries()) {
    await setSystemCell(fields.nth(index), value);
    await fields.nth(index).evaluate((element) => (element as HTMLElement).blur());
    await page.waitForTimeout(25);
  }
}

test('Equation systems keep focused MathLive cells, classify inconsistency, and render evidence', async ({ page }) => {
  await page.goto('/');
  await openLinearSystem(page, 2);
  const fields = page.locator('math-field[data-linear-algebra-cell]:visible');
  await setSystemCell(fields.nth(1), 'a');
  await expect(fields.nth(1)).toBeFocused();
  await setSystemCell(fields.nth(1), '5');
  await expect(fields.nth(1)).toBeFocused();
  await fillSystem(page, ['3', '5', '9', '30', '50', '-90']);
  await expect(fields.evaluateAll((elements) => elements.map((element) =>
    (element as HTMLElement & { getValue: (format: string) => string }).getValue('latex'),
  ))).resolves.toEqual(['3', '5', '9', '30', '50', '-90']);
  await page.getByTestId('soft-action-solve').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-answer-block')).toContainText('No solution');
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('System Evidence');
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('Augmented RREF');
  await page.screenshot({ path: `${screenshotDir}/linear-2x2-inconsistent-evidence.png`, fullPage: true });
});

test('Equation systems solve a unique 3x3 system as clean rows', async ({ page }) => {
  await page.goto('/');
  await openLinearSystem(page, 3);
  await fillSystem(page, ['1', '1', '1', '6', '2', '-1', '1', '3', '1', '2', '-1', '2']);
  const fields = page.locator('math-field[data-linear-algebra-cell]:visible');
  await expect(fields.evaluateAll((elements) => elements.map((element) =>
    (element as HTMLElement & { getValue: (format: string) => string }).getValue('latex'),
  ))).resolves.toEqual(['1', '1', '1', '6', '2', '-1', '1', '3', '1', '2', '-1', '2']);
  await page.getByTestId('soft-action-solve').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-answer-block')).toContainText('x=1');
  await expect(page.getByTestId('display-outcome-answer-block')).toContainText('y=2');
  await expect(page.getByTestId('display-outcome-answer-block')).toContainText('z=3');
  await page.screenshot({ path: `${screenshotDir}/linear-3x3-unique-rows.png`, fullPage: true });
});

test('Equation systems render an infinite family and bounded symbolic determinant condition', async ({ page }) => {
  await page.goto('/');
  await openLinearSystem(page, 2);
  await fillSystem(page, ['1', '1', '2', '2', '2', '4']);
  await page.getByTestId('soft-action-solve').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-answer-block')).toContainText('x=2−t');
  await expect(page.getByTestId('display-outcome-answer-block')).toContainText('y=t');
  await expect(page.getByTestId('display-outcome-supplement-0').locator('[data-raw-latex]'))
    .toHaveAttribute('data-raw-latex', String.raw`t\in\mathbb{R}`);
  await page.screenshot({ path: `${screenshotDir}/linear-2x2-infinite-family.png`, fullPage: true });

  await page.goto('/');
  await openLinearSystem(page, 3);
  await fillSystem(page, ['a', '0', '0', '2', '0', '1', '0', '3', '0', '0', '1', '4']);
  await page.getByTestId('soft-action-solve').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  const symbolicRow = page.getByTestId('display-outcome-answer-system-row-0').locator('[data-raw-latex]');
  await expect(symbolicRow.nth(0)).toHaveAttribute('data-raw-latex', String.raw`x=\frac{2}{a}`);
  await expect(symbolicRow.nth(1)).toHaveAttribute('data-raw-latex', 'y=3');
  await expect(symbolicRow.nth(2)).toHaveAttribute('data-raw-latex', 'z=4');
  await expect(page.getByTestId('display-outcome-supplement-0').locator('[data-raw-latex]'))
    .toHaveAttribute('data-raw-latex', String.raw`a\ne0`);
  await page.screenshot({ path: `${screenshotDir}/linear-3x3-symbolic-determinant.png`, fullPage: true });
});

test('Equation presents direct complex loci as answers and defers composites without a red error', async ({ page }) => {
  await page.goto('/');
  await enableComplex(page);
  await openEquationSymbolic(page);
  await setMathFieldLatex(page, String.raw`\operatorname{Re}(z)=1`);
  await page.getByTestId('soft-action-solve').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-answer-block')).toContainText('Vertical line');
  await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('Locus Meaning');
  await page.screenshot({ path: `${screenshotDir}/complex-real-part-line.png`, fullPage: true });

  await setMathFieldLatex(page, String.raw`9^z=27`);
  await page.getByTestId('soft-action-solve').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-answer-block')).toContainText('z=');
  await expect(page.getByTestId('display-outcome-answer-block')).toContainText('k');
  await expect(page.getByTestId('display-outcome-answer-block')).not.toContainText('k∈ℤ');
  await expect(page.getByTestId('display-outcome-supplement-0').locator('[data-raw-latex]'))
    .toHaveAttribute('data-raw-latex', String.raw`k\in\mathbb{Z}`);
  await page.screenshot({ path: `${screenshotDir}/complex-exp-branch-condition.png`, fullPage: true });

  await setMathFieldLatex(page, String.raw`\left|z+5\right|=0`);
  await page.getByTestId('soft-action-solve').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-answer-block')).toContainText('z=−5');
  await page.screenshot({ path: `${screenshotDir}/complex-absolute-point.png`, fullPage: true });

  await setMathFieldLatex(page, String.raw`\left|z^2+1\right|=2`);
  await page.getByTestId('soft-action-solve').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-answer-block')).toContainText('Recognized locus');
  await expect(page.getByTestId('display-outcome-error')).toHaveCount(0);
  await page.screenshot({ path: `${screenshotDir}/complex-composite-locus-deferred.png`, fullPage: true });
});

test('Equation readback keeps absolute values, exact logs, and periodic units readable', async ({ page }) => {
  await page.goto('/');
  await openEquationSymbolic(page);
  await setMathFieldLatex(page, String.raw`\log_{9}(x)=-2`);
  await page.getByTestId('soft-action-solve').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-answer-block').locator('[data-raw-latex]'))
    .toHaveAttribute('data-raw-latex', 'x=\\frac{1}{81}');
  await page.screenshot({ path: `${screenshotDir}/exact-base-log.png`, fullPage: true });

  await setMathFieldLatex(page, String.raw`2\sin^2(x)-1=0`);
  await setAngleUnit(page, 'RAD');
  await page.getByTestId('soft-action-solve').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expectAnswerLatex(page, 'x=\\frac{\\pi}{4}+\\frac{\\pi n}{2}');
  await page.screenshot({ path: `${screenshotDir}/periodic-rad.png`, fullPage: true });

  await setAngleUnit(page, 'DEG');
  await page.getByTestId('soft-action-solve').click();
  await expectAnswerLatex(page, 'x=45+90n');
  await page.screenshot({ path: `${screenshotDir}/periodic-deg.png`, fullPage: true });

  await setAngleUnit(page, 'GRAD');
  await page.getByTestId('soft-action-solve').click();
  await expectAnswerLatex(page, 'x=50+100n');
  await page.screenshot({ path: `${screenshotDir}/periodic-grad.png`, fullPage: true });
});
