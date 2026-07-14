import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  openEquationSymbolic,
  openTable,
  setMathFieldLatex,
} from './helpers';

const APP_STATE_KEY = 'rezanova-classwiz-calculator:app-state:v1';

async function latestResultDocument(page: Page) {
  return page.evaluate((key) => {
    const state = JSON.parse(window.localStorage.getItem(key) ?? '{}') as {
      history?: Array<{ resultDocument?: unknown }>;
    };
    return state.history?.at(-1)?.resultDocument;
  }, APP_STATE_KEY);
}

async function latestSupplementSummary(page: Page) {
  const document = await latestResultDocument(page) as {
    version?: unknown;
    supplements?: Array<{
      role?: unknown;
      presentationLatex?: unknown;
      math?: { mathJson?: unknown };
    }>;
  } | undefined;
  const supplement = document?.supplements?.[0];
  return {
    version: document?.version,
    role: supplement?.role,
    presentationLatex: supplement?.presentationLatex,
    hasMathJson: supplement?.math?.mathJson !== undefined,
  };
}

async function latestTableUndefinedReasons(page: Page) {
  const document = await latestResultDocument(page) as {
    version?: unknown;
    table?: { rows?: Array<{ primary?: { kind?: unknown; reason?: unknown } }> };
  } | undefined;
  return {
    version: document?.version,
    reasons: document?.table?.rows
      ?.filter((row) => row.primary?.kind === 'undefined')
      .map((row) => row.primary?.reason) ?? [],
  };
}

async function expectNoHorizontalOverflow(locator: Locator) {
  await expect(locator).toBeVisible();
  expect(await locator.evaluate((element) => element.scrollWidth <= element.clientWidth + 1))
    .toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto('/');
  await expect(page.getByTestId('main-editor')).toBeVisible();
});

test('renders all five typed Equation supplement cases and stores V2 History', async ({ page }) => {
  await openEquationSymbolic(page);
  const cases = [
    { latex: '\\frac{1}{x}=0', role: 'exclusion', label: '\\text{Exclusions: } x\\ne0', visible: 'x\\ne0', history: false },
    { latex: '\\sqrt{x}=-1', role: 'condition', label: '\\text{Conditions: } x\\ge0', visible: 'x\\ge0', history: false },
    { latex: '\\frac{x^2-1}{x-1}=2', role: 'exclusion', label: '\\text{Exclusions: } x-1\\ne0', visible: 'x-1\\ne0', history: false },
    { latex: '\\frac{x+1}{x-1}=2', role: 'exclusion', label: '\\text{Exclusions: } x-1\\ne0', visible: 'x-1\\ne0', history: true },
    { latex: '\\frac{1}{3}+\\frac{1}{6x}=1', role: 'exclusion', label: '\\text{Exclusions: } x\\ne0', visible: 'x\\ne0', history: true },
  ] as const;

  for (const entry of cases) {
    await setMathFieldLatex(page, entry.latex);
    await page.getByTestId('soft-action-solve').click();
    await expect(page.getByTestId('display-outcome-supplement-0').locator('[data-raw-latex]'))
      .toHaveAttribute('data-raw-latex', entry.visible);
    const shell = page.locator(
      '[data-testid="display-outcome-success"],[data-testid="display-outcome-error"]',
    );
    await expectNoHorizontalOverflow(shell);
    if (entry.history) {
      await expect.poll(async () => latestSupplementSummary(page)).toEqual({
        version: 2,
        role: entry.role,
        presentationLatex: entry.label,
        hasMathJson: true,
      });
    }
  }

  await page.getByTestId('history-toggle').click();
  await expect(page.getByTestId('history-entry-result-preview')).toHaveCount(2);
  await page.getByTestId('history-entry-replay').first().click();
  await expect(page.getByTestId('display-outcome-supplement-0')).toBeVisible();
});

test('renders typed outside-domain and pole Table cells with defined neighbors', async ({ page }) => {
  await openTable(page);
  await setMathFieldLatex(page, '\\sqrt{x}', 'table-primary-editor');
  await page.getByTestId('soft-action-build').click();
  await expect(page.getByTestId('table-row-1')).toContainText('undefined');
  await expect(page.getByTestId('table-row-2')).not.toContainText('undefined');
  await expect.poll(async () => latestTableUndefinedReasons(page)).toEqual({
    version: 2,
    reasons: ['outside-real-domain', 'outside-real-domain'],
  });
  await expectNoHorizontalOverflow(page.getByTestId('table-preview'));

  await setMathFieldLatex(page, '\\frac{1}{x}', 'table-primary-editor');
  await page.getByTestId('soft-action-build').click();
  await expect(page.getByTestId('table-row-1')).not.toContainText('undefined');
  await expect(page.getByTestId('table-row-2')).toContainText('undefined');
  await expect(page.getByTestId('table-row-3')).not.toContainText('undefined');
  await expect.poll(async () => latestTableUndefinedReasons(page)).toEqual({
    version: 2,
    reasons: ['pole'],
  });
  await expectNoHorizontalOverflow(page.getByTestId('table-preview'));
});
