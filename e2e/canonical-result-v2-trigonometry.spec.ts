import { expect, test, type Locator, type Page } from '@playwright/test';
import { openLauncherApp, setMathFieldLatex } from './helpers';

const APP_STATE_KEY = 'rezanova-classwiz-calculator:app-state:v1';

async function latestPeriodPhaseSummary(page: Page) {
  return page.evaluate((key) => {
    const state = JSON.parse(window.localStorage.getItem(key) ?? '{}') as {
      history?: Array<{
        resultDocument?: {
          version?: unknown;
          primary?: {
            kind?: unknown;
            presentation?: { primaryLatex?: unknown };
            normalizedEquation?: { canonicalLatex?: unknown; mathJson?: unknown };
            period?: { canonicalLatex?: unknown; mathJson?: unknown };
            phaseShift?: { canonicalLatex?: unknown; mathJson?: unknown };
          };
        };
      }>;
    };
    const document = state.history?.at(-1)?.resultDocument;
    return {
      version: document?.version,
      kind: document?.primary?.kind,
      presentation: document?.primary?.presentation?.primaryLatex,
      normalizedEquation: document?.primary?.normalizedEquation?.canonicalLatex,
      period: document?.primary?.period?.canonicalLatex,
      phaseShift: document?.primary?.phaseShift?.canonicalLatex,
      hasProof: document?.primary?.normalizedEquation?.mathJson !== undefined
        && document?.primary?.period?.mathJson !== undefined
        && document?.primary?.phaseShift?.mathJson !== undefined,
    };
  }, APP_STATE_KEY);
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

test('renders sine, cosine, and tangent Period & Phase V2 across all angle units', async ({ page }) => {
  await openLauncherApp(page, 'Shape Math', 'Trigonometry');
  await page.getByRole('button', { name: /Period & Phase/i }).click();

  const cases = [
    {
      unit: 'DEG',
      latex: '-3\\cos\\left(2x+90\\right)-4',
      period: '180^{\\circ}',
      phaseShift: '-45^{\\circ}',
      nextUnit: true,
    },
    {
      unit: 'RAD',
      latex: '2\\sin\\left(3x-\\pi\\right)+1',
      period: '\\frac{2\\pi}{3}',
      phaseShift: '\\frac{\\pi}{3}',
      nextUnit: true,
    },
    {
      unit: 'GRAD',
      latex: '\\tan\\left(2x-100\\right)',
      period: '100',
      phaseShift: '50',
      nextUnit: false,
    },
  ] as const;

  for (const entry of cases) {
    await expect(page.getByTestId('quick-setting-angle-unit')).toHaveText(entry.unit);
    await setMathFieldLatex(page, entry.latex);
    await page.getByTestId('soft-action-evaluate').click();

    const result = page.getByTestId('display-outcome-success');
    await expect(result).toBeVisible();
    await expect(page.getByTestId('display-outcome-title')).toHaveText('Period & Phase');
    await expect(page.getByText('Wave Facts', { exact: true })).toBeVisible();
    await expect(page.getByText('First Cycle Landmarks', { exact: true })).toBeVisible();
    await page.getByText('Wave Facts', { exact: true }).click();
    await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('Period');
    await expect(page.getByTestId('display-outcome-detail-sections')).toContainText('Phase shift');
    await expectNoHorizontalOverflow(result);

    await expect.poll(async () => latestPeriodPhaseSummary(page)).toMatchObject({
      version: 2,
      kind: 'period-phase',
      normalizedEquation: expect.stringMatching(/^y=/u),
      period: entry.period,
      phaseShift: entry.phaseShift,
      hasProof: true,
    });

    if (entry.nextUnit) await page.getByTestId('quick-setting-angle-unit').click();
  }

  await page.getByTestId('history-toggle').click();
  await expect(page.getByTestId('history-entry-result-preview')).toHaveCount(3);
  await page.getByTestId('history-entry-replay').first().click();
  await expect(page.getByTestId('display-outcome-title')).toHaveText('Period & Phase');
  await expectNoHorizontalOverflow(page.getByTestId('display-outcome-success'));
});
