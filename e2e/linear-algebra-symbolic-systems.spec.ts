import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { openLauncherApp, setMathFieldLatex } from './helpers';

const screenshotDir = '.task_tmp/linear-algebra-symbolic-complex-program/milestone-11';

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
});

test('renders and replays the bounded [a]u=[1] solution cases', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Matrix');
  await expect(page.getByText('Matrix Workspace')).toBeVisible();
  await page.getByLabel('Matrix A rows').fill('1');
  await page.getByLabel('Matrix A columns').fill('1');
  await setScalarCell(page.getByLabel('Matrix A row 1 column 1'), 'a');

  await runEditor(page, 'Au=[1]');
  await expect.poll(() => primaryLatex(page)).toContain('a\\ne0');
  await expect.poll(() => primaryLatex(page)).toContain('a=0');
  await expect.poll(() => primaryLatex(page)).toContain(', &');
  await expect.poll(() => primaryLatex(page)).toContain('\\varnothing');
  await expect.poll(() => primaryLatex(page)).not.toContain('emptyset');
  await expect(page.getByTestId('display-outcome-success').evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 1,
  )).resolves.toBe(true);

  const beforeReplay = await primaryLatex(page);
  await page.getByTestId('history-toggle').click();
  await page.getByTestId('history-entry-replay').last().click();
  await expect.poll(() => primaryLatex(page)).toBe(beforeReplay);

  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/conditional-system-and-readable-matrix-pad.png`,
  });
});

test('renders conditional rank and RREF with visible case separators', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Matrix');
  await expect(page.getByText('Matrix Workspace')).toBeVisible();
  await setMatrixA(page, [['u']]);

  await runEditor(page, String.raw`\operatorname{rank}(A)`);
  await expect.poll(() => primaryLatex(page)).toContain(', &');
  await expect.poll(() => primaryLatex(page)).toContain('u\\ne0');
  await expect.poll(() => primaryLatex(page)).toContain('u=0');

  await runEditor(page, String.raw`\operatorname{rref}(A)`);
  await expect.poll(() => primaryLatex(page)).toContain(', &');
  await expect.poll(() => primaryLatex(page)).toContain('u\\ne0');
  await expect.poll(() => primaryLatex(page)).toContain('u=0');
  await expect(page.getByTestId('display-outcome-success').evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 1,
  )).resolves.toBe(true);

  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/rank-rref-visible-condition-separators.png`,
  });
});

test('parses explicit ordered unknown systems with formal e and f parameters', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Matrix');
  await expect(page.getByText('Matrix Workspace')).toBeVisible();
  await setMatrixA(page, [['a', 'b'], ['c', 'd']]);

  await runEditor(page, 'A[u;v]=[e;f]');
  await expect.poll(() => primaryLatex(page)).toContain('u');
  await expect.poll(() => primaryLatex(page)).toContain('v');
  await expect.poll(() => primaryLatex(page)).toContain('e');
  await expect.poll(() => primaryLatex(page)).toContain('f');
  await expect(page.getByTestId('display-outcome-success')).not.toContainText(
    'outside Matrix/Vector structured forms',
  );
  await expect(page.getByTestId('display-outcome-success').evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 1,
  )).resolves.toBe(true);
});

test('renders conditional Vector independence as a mathematical case', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Vector');
  await expect(page.getByText('Vector Workspace')).toBeVisible();
  await page.getByLabel('Vector u length').fill('1');
  await setScalarCell(page.getByLabel('Vector u component 1'), 'a');

  await runEditor(page, String.raw`\operatorname{independent}(u)`);
  await expect.poll(() => primaryLatex(page)).toContain('a\\ne0');
  await expect.poll(() => primaryLatex(page)).toContain('a=0');
  await expect(page.getByTestId('display-outcome-success').evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 1,
  )).resolves.toBe(true);
});
