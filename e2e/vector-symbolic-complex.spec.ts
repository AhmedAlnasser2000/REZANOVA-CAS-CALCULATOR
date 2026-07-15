import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { openLauncherApp, setMathFieldLatex } from './helpers';

const screenshotDir = '.task_tmp/linear-algebra-symbolic-complex-program/milestone-9';

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

async function setVector(page: Page, name: string, values: readonly string[]) {
  await page.getByLabel(`Vector ${name} length`).fill(String(values.length));
  for (let index = 0; index < values.length; index += 1) {
    await setScalarCell(page.getByLabel(`Vector ${name} component ${index + 1}`), values[index]);
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
  await openLauncherApp(page, 'Linear', 'Vector');
  await expect(page.getByText('Vector Workspace')).toBeVisible();
});

test('renders the real symbolic dot product and replays it from History', async ({ page }) => {
  await expect(page.getByLabel('Scalar domain')).toHaveCSS('color', 'rgb(23, 32, 29)');
  await expect(page.getByLabel('Scalar domain')).toHaveCSS('background-color', 'rgb(242, 244, 239)');
  await expect(page.getByLabel('Vector u length')).toHaveCSS('color', 'rgb(23, 32, 29)');
  await expect(page.getByLabel('Vector u length')).toHaveCSS('background-color', 'rgb(242, 244, 239)');

  const workspaceWidth = await page.locator('main.workspace').evaluate((element) => element.clientWidth);
  const vectorPanelWidth = await page.locator('section.mode-panel').filter({ hasText: 'Vector Workspace' })
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(vectorPanelWidth).toBeGreaterThan(workspaceWidth * 0.94);

  const vectorCardWidth = await page.getByLabel('Vector u length').locator('xpath=ancestor::div[contains(@class,"editor-card")]')
    .evaluate((element) => element.getBoundingClientRect().width);
  const firstCellWidth = await page.getByLabel('Vector u component 1')
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(firstCellWidth).toBeGreaterThan(vectorCardWidth * 0.22);

  await setVector(page, 'u', ['a', 'b']);
  await setVector(page, 'v', ['c', 'd']);
  await runEditor(page, String.raw`u\cdot v`);

  await expect.poll(() => primaryLatex(page)).toBe('ac+bd');
  await expect(page.getByTestId('display-outcome-success').evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 1,
  )).resolves.toBe(true);

  await page.getByTestId('history-toggle').click();
  await page.getByTestId('history-entry-replay').last().click();
  await expect.poll(() => primaryLatex(page)).toBe('ac+bd');
});

test('renders Hermitian orthogonality and the Principal line angle in Complex mode', async ({ page }) => {
  await page.getByLabel('Scalar domain').selectOption('complex');
  await setVector(page, 'u', ['1', 'i']);
  await setVector(page, 'v', ['i', '1']);

  await runEditor(page, String.raw`\operatorname{orthogonal}(u,v)`);
  await expect.poll(() => primaryLatex(page)).toBe(String.raw`\text{Orthogonal}`);

  await runEditor(page, String.raw`\angle(u,v)`);
  await expect(page.getByTestId('display-outcome-title')).toHaveText('Principal line angle');
  await expect(page.getByTestId('display-outcome-success')).not.toContainText(/orientation|handedness/i);
  await expect(page.getByTestId('display-outcome-success').evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 1,
  )).resolves.toBe(true);

  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/complex-principal-line-angle.png`,
  });
});
