import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import {
  getMathFieldLatex,
  openLauncherApp,
  setMathFieldLatex,
} from './helpers';

const screenshotDir = '.task_tmp/linear-algebra-paste-naturalization1';

function exactText(label: string) {
  return new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

async function rawLatexIn(page: Page, testId: string) {
  return page.getByTestId(testId).locator('[data-raw-latex]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-raw-latex') ?? '').join('\n'));
}

async function pasteIntoMainEditor(page: Page, text: string) {
  await page.getByTestId('main-editor').evaluate((element, pastedText) => {
    const data = new DataTransfer();
    data.setData('text/plain', pastedText as string);
    const event = new ClipboardEvent('paste', {
      clipboardData: data,
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    element.dispatchEvent(event);
    if (!event.defaultPrevented) {
      (element as HTMLElement & { insert?: (latex: string) => void }).insert?.(pastedText as string);
    }
  }, text);
}

async function pasteWithAppButton(page: Page, text: string) {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(async (pastedText) => {
    await navigator.clipboard.writeText(pastedText as string);
  }, text);
  await expect(page.getByRole('button', { name: 'Paste' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Paste' }).first().click();
}

async function expectNaturalEditor(page: Page) {
  await expect.poll(() => getMathFieldLatex(page)).toContain('\\begin{bmatrix}');
  const latex = await getMathFieldLatex(page);
  expect(latex).not.toContain('[[');
  return latex;
}

async function runEditor(page: Page) {
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
}

async function expectAnswerContains(page: Page, ...snippets: string[]) {
  for (const snippet of snippets) {
    await expect.poll(() => rawLatexIn(page, 'display-outcome-answer-block')).toContain(snippet);
  }
}

function detailCard(page: Page, title: string) {
  return page.locator('details.result-summary-block')
    .filter({ has: page.locator('.result-summary-label', { hasText: exactText(title) }) })
    .first();
}

async function expectDetailCard(page: Page, title: string) {
  await expect(detailCard(page, title)).toBeVisible();
}

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('keyboard paste naturalizes Matrix list input before Run and renders eigen rows readably', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Matrix');
  await setMathFieldLatex(page, '');

  await pasteIntoMainEditor(page, 'eigen([[2,1],[1,2]])');
  const editorLatex = await expectNaturalEditor(page);
  expect(editorLatex).toContain('\\operatorname{eigen}');
  await expect(page.getByTestId('display-outcome-root')).toContainText(/result/i);

  await runEditor(page);
  await expect(page.locator('.result-summary-label', { hasText: exactText('Approx') })).toHaveCount(0);
  await expectAnswerContains(page, '\\lambda=3', '\\lambda=1');
  await expect.poll(() => rawLatexIn(page, 'display-outcome-answer-block')).toContain('\\lambda=3');
  await expect.poll(() => rawLatexIn(page, 'display-outcome-answer-block')).toContain('\\lambda=1');
  await expectDetailCard(page, 'Characteristic Polynomial');
  await expectDetailCard(page, 'How Eigenvalues Were Found');
  await expectDetailCard(page, 'Eigenspaces');
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/matrix-paste-eigen-answer-rows.png`,
  });
});

test('app Paste naturalizes Matrix coordinates and keeps textbook coordinate readback', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Matrix');
  await setMathFieldLatex(page, 'A');
  await expect(page.getByTestId('display-expression-preview-card')).toBeVisible();
  await page.getByTestId('main-editor').evaluate((element) => {
    const field = element as HTMLElement & { executeCommand?: (command: string) => void };
    field.focus();
    field.executeCommand?.('selectAll');
  });

  await pasteWithAppButton(page, 'coords([[1,2],[3,4]],[5,11])');
  const editorLatex = await expectNaturalEditor(page);
  expect(editorLatex).toContain('\\operatorname{coords}');
  await runEditor(page);

  await expect(page.locator('.result-summary-label', { hasText: exactText('Approx') })).toHaveCount(0);
  await expectAnswerContains(page, '\\begin{bmatrix}1\\\\2\\end{bmatrix}');
  await expectDetailCard(page, 'Coordinate Facts');
  await expectDetailCard(page, 'Coordinate Proof');
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/matrix-app-paste-coordinates.png`,
  });
});

test('malformed Matrix paste remains editable and Run shows a controlled error', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Matrix');
  await setMathFieldLatex(page, '');

  await pasteIntoMainEditor(page, 'eigen([[2,1],[bad]])');
  await expect.poll(() => getMathFieldLatex(page)).toContain('[[');

  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-error')).toBeVisible();
  await expect(page.getByTestId('display-outcome-error')).toContainText(
    'Unsupported numeric entry "bad".',
  );
});

test('Vector paste naturalizes list input and renders Gram-Schmidt answer rows readably', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Vector');
  await setMathFieldLatex(page, '');

  await pasteIntoMainEditor(page, 'gram([1,1],[1,0])');
  const editorLatex = await expectNaturalEditor(page);
  expect(editorLatex).toContain('\\operatorname{gram}');

  await runEditor(page);
  await expect(page.locator('.result-summary-label', { hasText: exactText('Approx') })).toHaveCount(0);
  await expect(page.getByTestId('display-outcome-answer-block')).not.toContainText(/roots/i);
  await expect.poll(() => rawLatexIn(page, 'display-outcome-answer-block')).toContain('w_{1}');
  await expect.poll(() => rawLatexIn(page, 'display-outcome-answer-block')).toContain('w_{2}');
  await expectDetailCard(page, 'Orthonormal Basis');
  await expectDetailCard(page, 'Gram-Schmidt Proof');
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDir}/vector-paste-gram-answer-rows.png`,
  });
});
