import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  openAdvancedCalcTool,
  openLauncherApp,
  setMathFieldLatex,
} from './helpers';

const APP_STATE_KEY = 'rezanova-classwiz-calculator:app-state:v1';

async function clickVisibleLauncherEntry(page: Page, label: string) {
  await page.locator('button.launcher-entry:visible')
    .filter({ has: page.locator('strong', { hasText: new RegExp(`^${label}$`, 'i') }) })
    .click();
}

async function expectNoHorizontalOverflow(locator: Locator) {
  await expect(locator).toBeVisible();
  expect(await locator.evaluate((element) => element.scrollWidth <= element.clientWidth + 1))
    .toBe(true);
}

async function latestResultDocument(page: Page) {
  return page.evaluate((key) => {
    const state = JSON.parse(window.localStorage.getItem(key) ?? '{}') as {
      history?: Array<{ resultDocument?: unknown }>;
    };
    return state.history?.at(-1)?.resultDocument;
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

test('renders and replays the corrected derivative-at-point V2 result', async ({ page }) => {
  await openAdvancedCalcTool(page, 'Derivatives', 'Derivative at Point');
  await setMathFieldLatex(page, 'x^2');
  const point = page.getByLabel('Point x =');
  await point.fill('3');
  await page.getByTestId('editor-runtime-run').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-title')).toHaveText('Derivative');
  await expect(page.getByTestId('display-outcome-answer-block').locator('[data-raw-latex]').first())
    .toHaveAttribute('data-raw-latex', '6');
  await expect(page.getByText('Derivative Steps', { exact: true })).toBeVisible();
  await page.getByText('Derivative Steps', { exact: true }).click();
  const details = page.getByTestId('display-outcome-detail-sections');
  await expect(details.locator('[data-raw-latex="D_{1}=2x"]')).toBeVisible();
  await expect(details.locator('[data-raw-latex="x=3"]')).toBeVisible();
  await expect(details.locator('[data-raw-latex="D_{1}=6"]')).toBeVisible();
  await expect(page.getByText('Resolved form', { exact: true })).toHaveCount(0);
  await expectNoHorizontalOverflow(page.getByTestId('display-outcome-success'));

  await expect.poll(async () => latestResultDocument(page)).toMatchObject({
    version: 2,
    title: 'Derivative',
    primary: { kind: 'math', value: { canonicalLatex: '6', mathJson: 6 } },
    request: {
      kind: 'derivative-at-point',
      presentationLatex: '\\left.\\frac{d}{dx}\\left(x^2\\right)\\right|_{x=3}',
      body: { canonicalLatex: 'x^2' },
      point: { canonicalLatex: '3', mathJson: 3 },
    },
  });

  await page.getByTestId('history-toggle').click();
  await expect(page.getByTestId('history-entry-result-preview').first().locator('[data-raw-latex]').first())
    .toHaveAttribute('data-raw-latex', '6');
  await page.getByTestId('history-entry-replay').first().click();
  await expect(page.getByTestId('display-outcome-title')).toHaveText('Derivative');
  await expect(page.getByTestId('display-outcome-answer-block').locator('[data-raw-latex]').first())
    .toHaveAttribute('data-raw-latex', '6');
});

test('renders typed angle-conversion and right-triangle V2 requests without overflow', async ({ page }) => {
  await openLauncherApp(page, 'Shape Math', 'Trigonometry');
  await clickVisibleLauncherEntry(page, 'Angle Convert');
  await expect(page.getByLabel('Value')).toHaveValue('30');
  await page.getByTestId('editor-runtime-run').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-title')).toHaveText('Angle Convert');
  await expect(page.getByTestId('display-outcome-answer-block').locator('[data-raw-latex]').first())
    .toHaveAttribute('data-raw-latex', '\\frac{\\pi}{6}');
  await expect(page.getByText('Resolved form', { exact: true })).toBeVisible();
  await expect(page.locator('.resolved-preview-math'))
    .toHaveAttribute('data-raw-latex', 'angleConvert(value=30,from=deg,to=rad)');
  await expectNoHorizontalOverflow(page.getByTestId('display-outcome-success'));
  await expect.poll(async () => latestResultDocument(page)).toMatchObject({
    version: 2,
    request: {
      kind: 'angle-conversion',
      value: { canonicalLatex: '30', mathJson: 30 },
      fromUnit: 'deg',
      toUnit: 'rad',
    },
  });

  await openLauncherApp(page, 'Shape Math', 'Trigonometry');
  await clickVisibleLauncherEntry(page, 'Triangles');
  await clickVisibleLauncherEntry(page, 'Right Triangle');
  await expect(page.getByLabel('Side a')).toHaveValue('3');
  await expect(page.getByLabel('Side b')).toHaveValue('4');
  await page.getByTestId('editor-runtime-run').click();

  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-title')).toHaveText('Right Triangle');
  await expect(page.getByTestId('display-outcome-answer-block').locator('[data-raw-latex]').first())
    .toHaveAttribute('data-raw-latex', /c=5/);
  await expect(page.getByText('Resolved form', { exact: true })).toBeVisible();
  await expect(page.locator('.resolved-preview-math'))
    .toHaveAttribute('data-raw-latex', 'rightTriangle(a=3,b=4,c=?,A=?,B=?)');
  await expectNoHorizontalOverflow(page.getByTestId('display-outcome-success'));
  await expect.poll(async () => latestResultDocument(page)).toMatchObject({
    version: 2,
    request: {
      kind: 'right-triangle',
      angleUnit: 'deg',
      knownQuantities: [
        { kind: 'side', name: 'a', value: { canonicalLatex: '3', mathJson: 3 } },
        { kind: 'side', name: 'b', value: { canonicalLatex: '4', mathJson: 4 } },
      ],
    },
  });
});
