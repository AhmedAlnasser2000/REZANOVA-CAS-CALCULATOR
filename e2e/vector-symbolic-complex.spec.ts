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

async function setNumberInput(input: Locator, value: string) {
  await input.evaluate((element, nextValue) => {
    const inputElement = element as HTMLInputElement;
    const descriptor = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    );
    descriptor?.set?.call(inputElement, nextValue);
    inputElement.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    inputElement.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }, value);
}

async function setVector(page: Page, name: string, values: readonly string[]) {
  const lengthInput = page.getByLabel(`Vector ${name} length`);
  await setNumberInput(lengthInput, String(values.length));
  await expect(lengthInput).toHaveValue(String(values.length));
  await expect(page.getByLabel(`Vector ${name} component ${values.length}`)).toBeVisible();
  for (let index = 0; index < values.length; index += 1) {
    const cell = page.getByLabel(`Vector ${name} component ${index + 1}`);
    await setScalarCell(cell, values[index]);
    await expect.poll(async () => {
      const currentLatex = await cell.evaluate((element) =>
        (element as HTMLElement & { getValue: (format: string) => string }).getValue('latex'));
      return values[index] === 'i'
        ? currentLatex === 'i' || currentLatex.includes('\\imaginaryI')
        : currentLatex === values[index];
    }).toBe(true);
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
  await expect(page.getByLabel('Vector u component 1')).toHaveCSS('color', 'rgb(247, 251, 239)');

  await page.getByLabel('Vector u length').fill('8');
  const wideVectorCell = page.getByLabel('Vector u component 8');
  await expect(wideVectorCell).toBeVisible();
  const wideVectorCard = page.getByLabel('Vector u length')
    .locator('xpath=ancestor::div[contains(@class,"editor-card")]');
  await expect(wideVectorCard).toHaveClass(/linear-algebra-value-card--wide/);
  expect(await wideVectorCard.evaluate((element) => element.getBoundingClientRect().width))
    .toBeGreaterThan(vectorCardWidth * 1.7);
  expect(await wideVectorCell.evaluate((element) => element.getBoundingClientRect().width))
    .toBeGreaterThanOrEqual(112);
  await expect(wideVectorCell).toHaveCSS('color', 'rgb(247, 251, 239)');
  expect(await wideVectorCell.evaluate((element) => {
    const content = element.shadowRoot?.querySelector('[part="content"]');
    return content ? getComputedStyle(content).color : null;
  })).toBe('rgb(247, 251, 239)');
  expect(await wideVectorCell.locator('xpath=ancestor::div[contains(@class,"linear-algebra-vector-grid")]').evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 1,
  )).toBe(true);
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/vector-wide-readable-inputs.png`,
  });

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

  await runEditor(page, String.raw`u\cdot v`);
  await expect.poll(() => primaryLatex(page)).toBe('0');

  await runEditor(page, String.raw`\operatorname{orthogonal}(u,v)`);
  await expect.poll(() => primaryLatex(page)).toBe(String.raw`\text{Orthogonal}`);

  await runEditor(page, String.raw`\angle(u,v)`);
  await expect(page.getByTestId('display-outcome-title')).toHaveText('Principal line angle');
  await expect(page.getByTestId('display-outcome-success')).not.toContainText(/orientation|handedness/i);
  await expect(page.getByTestId('display-outcome-success').evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 1,
  )).resolves.toBe(true);

  await runEditor(page, String.raw`\operatorname{gramSchmidt}(u,v)`);
  await expect(page.getByTestId('display-outcome-success')).not.toContainText(
    'This scalar expression could not be parsed.',
  );
  await expect(page.getByTestId('display-outcome-success')).not.toContainText(
    'Unsupported Matrix/Vector editor expression.',
  );
  await expect(page.getByTestId('display-outcome-success').evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 1,
  )).resolves.toBe(true);

  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/complex-principal-line-angle.png`,
  });
});
