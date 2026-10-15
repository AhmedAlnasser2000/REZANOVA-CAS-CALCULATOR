import { expect, test, type Locator, type Page } from '@playwright/test';
import {
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
