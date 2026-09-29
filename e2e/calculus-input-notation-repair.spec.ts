import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  getMathFieldLatex,
  openAdvancedCalcTool,
  setMathFieldLatex,
} from './helpers';

const APP_STATE_KEY = 'rezanova-classwiz-calculator:app-state:v1';

async function expectNoHorizontalOverflow(locator: Locator) {
  await expect(locator).toBeVisible();
  expect(await locator.evaluate((element) => element.scrollWidth <= element.clientWidth + 1))
    .toBe(true);
}

async function historyCount(page: Page) {
  return page.evaluate((key) => {
    const state = JSON.parse(window.localStorage.getItem(key) ?? '{}') as {
      history?: unknown[];
    };
    return state.history?.length ?? 0;
  }, APP_STATE_KEY);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto('/');
  await expect(page.getByTestId('main-editor')).toBeVisible();
});

test('keeps one smart-fence pair for physical and keypad opening parentheses across Calculus editors', async ({ page }) => {
  const tools = [
    ['Derivative'],
    ['Derivatives', 'Derivative at Point'],
    ['Derivatives', 'Partial Derivative'],
    ['Integrals', 'Indefinite'],
    ['Integrals', 'Definite'],
    ['Integrals', 'Improper'],
  ];

  for (const path of tools) {
    await openAdvancedCalcTool(page, ...path);
    const editor = page.getByTestId('main-editor');
    await expect.poll(() => getMathFieldLatex(page)).toBe('');

    await editor.click();
    await editor.press('Shift+Digit9');
    await expect.poll(() => getMathFieldLatex(page)).toBe('\\left(\\right)');
    await editor.press('x');
    await expect.poll(() => getMathFieldLatex(page)).toBe('\\left(x\\right)');

    await setMathFieldLatex(page, '');
    await editor.click();
    await page.getByTestId('keypad-left-paren').click();
    await expect.poll(() => getMathFieldLatex(page)).toBe(
      '\\left(\\placeholder{}\\right)',
    );
    await editor.press('x');
    await expect.poll(() => getMathFieldLatex(page)).toBe('\\left(x\\right)');
  }
});

test('uses complete derivative notation as the target authority in the real app', async ({ page }, testInfo) => {
  const derivativeCases = [
    { input: 'd/dz(z^3+az)', output: '3z^2+a' },
    { input: 'd/dc(c\\sin x)', output: '\\sin(x)' },
    { input: 'd/dx(c\\sin x)', output: 'c\\cos(x)' },
    { input: 'd/dt(t^3+2t)', output: '3t^2+2' },
  ];

  for (const derivativeCase of derivativeCases) {
    await openAdvancedCalcTool(page, 'Derivative');
    await setMathFieldLatex(page, derivativeCase.input);
    await page.getByTestId('editor-runtime-run').click();
    const outcome = page.getByTestId('display-outcome-success');
    await expect(outcome).toBeVisible();
    await expect(page.getByTestId('display-outcome-answer-block').locator('[data-raw-latex]').first())
      .toHaveAttribute('data-raw-latex', derivativeCase.output);
    await expect(page.getByText('Derivative Steps', { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(outcome);
    await page.screenshot({path: testInfo.outputPath(`derivative-${derivativeCases.indexOf(derivativeCase)}.png`), fullPage: true});
  }

  await openAdvancedCalcTool(page, 'Derivatives', 'Partial Derivative');
  await setMathFieldLatex(
    page,
    '\\frac{\\partial}{\\partial y}\\left(xy+y^2\\right)',
  );
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-answer-block').locator('[data-raw-latex]').first())
    .toHaveAttribute('data-raw-latex', 'x+2y');

  await openAdvancedCalcTool(page, 'Derivatives', 'Derivative at Point');
  await setMathFieldLatex(page, 'd/dt(t^2)');
  await page.getByLabel('Point t =').fill('3');
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-answer-block').locator('[data-raw-latex]').first())
    .toHaveAttribute('data-raw-latex', '6');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByTestId('display-outcome-action-copy-result').click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('6\n6');

  await page.getByTestId('history-toggle').click();
  await expect(page.getByTestId('history-entry-result-preview').first().locator('[data-raw-latex]').first())
    .toHaveAttribute('data-raw-latex', '6');
  await page.getByTestId('history-entry-replay').first().click();
  await expect(page.getByTestId('display-outcome-answer-block').locator('[data-raw-latex]').first())
    .toHaveAttribute('data-raw-latex', '6');
});

test('rejects incomplete and cross-screen derivative notation before creating History', async ({ page }) => {
  await openAdvancedCalcTool(page, 'Derivative');
  const initialHistoryCount = await historyCount(page);

  await setMathFieldLatex(page, 'x\\sin x');
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-error')).toContainText(
    'Enter a complete derivative request such as d/dz(f(z)).',
  );

  await setMathFieldLatex(page, 'd/d()');
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-error')).toContainText(
    'Enter the differentiation variable after d/d',
  );

  await setMathFieldLatex(
    page,
    '\\frac{\\partial}{\\partial x}\\left(x^2\\right)',
  );
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-error')).toContainText(
    'Use an ordinary derivative operator on this screen.',
  );

  await openAdvancedCalcTool(page, 'Derivatives', 'Partial Derivative');
  await setMathFieldLatex(page, 'd/dx(xy)');
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-error')).toContainText(
    'Use a partial derivative operator on this screen.',
  );
  await expect.poll(() => historyCount(page)).toBe(initialHistoryCount);
});
