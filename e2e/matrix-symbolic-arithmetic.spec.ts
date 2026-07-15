import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { openLauncherApp, setMathFieldLatex } from './helpers';

const screenshotDir = '.task_tmp/linear-algebra-symbolic-complex-program/milestone-10';

async function setScalarCell(cell: Locator, latex: string) {
  await cell.evaluate((element, nextLatex) => {
    const field = element as HTMLElement & { setValue: (value: string) => void };
    field.focus();
    field.setValue(nextLatex as string);
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    field.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      composed: true,
    }));
  }, latex);
}

async function setMatrixA(page: Page, values: readonly (readonly string[])[]) {
  await page.getByLabel('Matrix A rows').fill(String(values.length));
  await page.getByLabel('Matrix A columns').fill(String(values[0].length));
  for (let row = 0; row < values.length; row += 1) {
    for (let column = 0; column < values[row].length; column += 1) {
      await setScalarCell(
        page.getByLabel(`Matrix A row ${row + 1} column ${column + 1}`),
        values[row][column],
      );
    }
  }
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
  await page.goto('/');
  await openLauncherApp(page, 'Linear', 'Matrix');
  await expect(page.getByText('Matrix Workspace')).toBeVisible();
});

test('renders the distinct complex adjoint', async ({ page }) => {
  await page.getByLabel('Scalar domain').selectOption('complex');
  await setMatrixA(page, [['1', 'i'], ['a', '1-i']]);

  await runEditor(page, 'adjoint(A)');
  await expect.poll(() => primaryLatex(page)).toContain('imaginaryI');
  await expect.poll(() => primaryLatex(page)).toMatch(/a\^\\star|a\^\{\\star\}/);

  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/complex-adjoint-and-readable-cells.png`,
  });
});

test('shows the familiar symbolic determinant', async ({ page }) => {
  await setMatrixA(page, [['a', 'b'], ['c', 'd']]);
  await runEditor(page, String.raw`\det(A)`);
  await expect.poll(() => primaryLatex(page)).toMatch(/ad-bc|-bc\+ad/);
});

test('shows the symbolic inverse condition and replays the result', async ({ page }) => {
  await setMatrixA(page, [['a', '0'], ['0', '1']]);
  await runEditor(page, String.raw`A^{-1}`);
  await expect(page.getByTestId('display-outcome-success')).toContainText('Valid when');
  const inverseLatex = await primaryLatex(page);
  await page.getByTestId('history-toggle').click();
  await page.getByTestId('history-entry-replay').last().click();
  await expect.poll(() => primaryLatex(page)).toBe(inverseLatex);
});
