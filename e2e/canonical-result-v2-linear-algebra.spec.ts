import { mkdir } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  closeSidePanelIfOpen,
  getMathFieldLatex,
  openLauncherApp,
  openSettingsPanel,
  setMathFieldLatex,
} from './helpers';
import {
  setMatrixScalarValues,
  setVectorScalarValues,
} from './linear-algebra-scalar-driver';

const APP_STATE_KEY = 'rezanova-classwiz-calculator:app-state:v1';
const SCREENSHOT_DIR = '.task_tmp/linear-algebra-canonical-v2-completion1';

async function setMatrix(
  page: Page,
  name: string,
  rows: number,
  columns: number,
  values: readonly number[],
) {
  await setMatrixScalarValues(page, name, rows, columns, values);
}

async function setVector(page: Page, name: string, values: readonly number[]) {
  await setVectorScalarValues(page, name, values);
}

async function addVector(page: Page, name: string, values: readonly number[]) {
  await page.getByRole('button', { name: 'Add Vector' }).click();
  await expect(page.getByLabel(`Vector ${name} name`)).toBeVisible();
  await setVector(page, name, values);
}

async function runEditor(page: Page, latex: string) {
  await setMathFieldLatex(page, latex);
  await page.getByTestId('editor-runtime-run').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
}

async function latestResultDocument(page: Page) {
  return page.evaluate((key) => {
    const state = JSON.parse(window.localStorage.getItem(key) ?? '{}') as {
      history?: Array<{ resultDocument?: unknown }>;
    };
    return state.history?.at(-1)?.resultDocument;
  }, APP_STATE_KEY);
}

async function latestMatrixSystemSummary(page: Page) {
  const document = await latestResultDocument(page) as {
    version?: unknown;
    primary?: { kind?: unknown; value?: { mathJson?: unknown } };
    details?: Array<{
      title?: unknown;
      lines?: Array<Array<{
        kind?: unknown;
        presentationLatex?: unknown;
        operation?: {
          kind?: unknown;
          firstRow?: unknown;
          secondRow?: unknown;
          row?: unknown;
          targetRow?: unknown;
          sourceRow?: unknown;
          factor?: { canonicalLatex?: unknown; mathJson?: unknown };
        };
      }>>;
    }>;
  } | undefined;
  const operations = document?.details
    ?.find((section) => section.title === 'Row Reduction Steps')
    ?.lines?.flat()
    .filter((part) => part.kind === 'row-operation')
    .map((part) => ({
      presentationLatex: part.presentationLatex,
      kind: part.operation?.kind,
      row: part.operation?.row,
      targetRow: part.operation?.targetRow,
      sourceRow: part.operation?.sourceRow,
      factorLatex: part.operation?.factor?.canonicalLatex,
      hasFactorProof: part.operation?.factor
        ? part.operation.factor.mathJson !== undefined
        : true,
    })) ?? [];
  return {
    version: document?.version,
    primaryKind: document?.primary?.kind,
    hasPrimaryProof: document?.primary?.value?.mathJson !== undefined,
    operations,
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

test.beforeAll(async () => {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
});

test('renders typed Matrix profiles and exact row operations through V2 History', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Matrix');
  await setMatrix(page, 'A', 2, 2, [1, 1, 2, 2]);
  await runEditor(page, 'profile(A)');
  await expect(page.getByTestId('display-outcome-answer-block')).toContainText('rank');
  await expect(page.getByText('Kernel', { exact: true })).toBeVisible();
  await expect.poll(async () => latestResultDocument(page)).toMatchObject({
    version: 2,
    primary: {
      kind: 'linear-map-profile',
      operand: { mathJson: expect.anything() },
      domainDimension: 2,
      codomainDimension: 2,
      rank: 1,
      nullity: 1,
      presentation: { answerRows: { rows: expect.any(Array) } },
    },
  });

  await setMatrix(page, 'A', 3, 2, [1, 0, 0, 1, 0, 0]);
  await runEditor(page, 'profile(A)');
  await expect(page.getByTestId('display-outcome-root')).toContainText(
    'Invertibility is not applicable to rectangular matrices.',
  );
  await expect.poll(async () => latestResultDocument(page)).toMatchObject({
    version: 2,
    primary: {
      kind: 'linear-map-profile',
      domainDimension: 2,
      codomainDimension: 3,
      rank: 2,
      nullity: 0,
    },
  });

  await setMatrix(page, 'A', 2, 2, [2, 1, 1, -1]);
  await runEditor(page, String.raw`A x = \begin{bmatrix}5\\1\end{bmatrix}`);
  await expect(page.getByText('Row Reduction Steps', { exact: true })).toBeVisible();
  await expect.poll(async () => (await latestMatrixSystemSummary(page)).operations.length)
    .toBeGreaterThan(0);
  const systemSummary = await latestMatrixSystemSummary(page);
  expect(systemSummary).toMatchObject({
    version: 2,
    primaryKind: 'math',
    hasPrimaryProof: true,
  });
  expect(systemSummary.operations.every((operation) => (
    typeof operation.presentationLatex === 'string'
    && operation.presentationLatex.includes('R_{')
    && operation.hasFactorProof
  ))).toBe(true);
  expect(systemSummary.operations.some((operation) => operation.kind === 'scale')).toBe(true);
  expect(systemSummary.operations.some((operation) => (
    operation.kind === 'eliminate'
    && typeof operation.targetRow === 'number'
    && typeof operation.sourceRow === 'number'
  ))).toBe(true);
  await expectNoHorizontalOverflow(page.getByTestId('display-outcome-success'));

  await page.getByTestId('history-toggle').click();
  await expect(page.getByTestId('history-entry-result-preview')).toHaveCount(3);
  await page.getByTestId('history-entry-replay').first().click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expectNoHorizontalOverflow(page.getByTestId('display-outcome-success'));
});

test('renders dependent and independent Vector families with typed V2 operands', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Vector');
  await addVector(page, 'p', [1, 0]);
  await addVector(page, 'q', [0, 1]);
  await addVector(page, 'r', [1, 1]);

  await runEditor(page, 'independent(p,q,r)');
  await expect(page.getByTestId('display-outcome-answer-block')).toContainText('No');
  await expect(page.getByText('Dependence Relation', { exact: true })).toBeVisible();
  await expect.poll(async () => latestResultDocument(page)).toMatchObject({
    version: 2,
    primary: {
      kind: 'linear-independence',
      independent: false,
      operandVectors: [
        { mathJson: expect.anything() },
        { mathJson: expect.anything() },
        { mathJson: expect.anything() },
      ],
      presentation: { answerRows: { rows: expect.any(Array) } },
    },
  });
  await expectNoHorizontalOverflow(page.getByTestId('display-outcome-success'));

  await runEditor(page, 'independent(p,q)');
  await expect(page.getByTestId('display-outcome-answer-block')).toContainText('Yes');
  await expect.poll(async () => latestResultDocument(page)).toMatchObject({
    version: 2,
    primary: {
      kind: 'linear-independence',
      independent: true,
      operandVectors: [{ mathJson: expect.anything() }, { mathJson: expect.anything() }],
    },
  });

  await page.getByTestId('history-toggle').click();
  await expect(page.getByTestId('history-entry-result-preview')).toHaveCount(2);
  await page.getByTestId('history-entry-replay').last().click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expectNoHorizontalOverflow(page.getByTestId('display-outcome-success'));
});

test('renders the live gradian Vector angle as V3 and preserves copy and History replay', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await openSettingsPanel(page);
  await page.getByTestId('settings-angle-unit-grad').click();
  await closeSidePanelIfOpen(page);
  await openLauncherApp(page, 'Linear', 'Vector');
  await setVector(page, 'u', [1, 0]);
  await setVector(page, 'v', [0, 1]);

  await runEditor(page, 'angle(u,v)');
  await expect(page.getByTestId('display-outcome-answer-block').locator('[data-raw-latex]').first())
    .toHaveAttribute('data-raw-latex', '100^{g}');
  await expect.poll(async () => latestResultDocument(page)).toMatchObject({
    version: 3,
    primary: {
      kind: 'angle-quantity',
      presentation: { primaryLatex: '100^{g}' },
      magnitude: { canonicalLatex: '100', mathJson: 100 },
      unit: 'grad',
    },
  });
  await page.getByTestId('display-outcome-action-copy-result').click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('100^{g}');
  await expectNoHorizontalOverflow(page.getByTestId('display-outcome-success'));
  await page.screenshot({
    fullPage: true,
    path: `${SCREENSHOT_DIR}/vector-grad-angle.png`,
  });

  await page.getByTestId('history-toggle').click();
  await expect(page.getByTestId('history-entry-result-preview').locator('[data-raw-latex]'))
    .toHaveAttribute('data-raw-latex', '100^{g}');
  await page.getByTestId('history-entry-replay').click();
  await expect(page.getByTestId('display-outcome-answer-block').locator('[data-raw-latex]').first())
    .toHaveAttribute('data-raw-latex', '100^{g}');
});

test('renders the Matrix spectral controlled stop and opens its native polynomial in Equation', async ({ page }) => {
  await openLauncherApp(page, 'Linear', 'Matrix');
  await setMatrix(page, 'A', 2, 2, [0, -1, 1, 0]);
  await setMathFieldLatex(page, 'eigen(A)');
  await page.getByTestId('editor-runtime-run').click();

  await expect(page.getByTestId('display-outcome-error')).toBeVisible();
  await expect(page.getByText('Characteristic Polynomial', { exact: true })).toBeVisible();
  await expect(page.getByText('How Eigenvalues Were Found', { exact: true })).toBeVisible();
  await expect(page.getByTestId('display-outcome-action-send-equation')).toHaveText('Open in Equation');
  await expectNoHorizontalOverflow(page.getByTestId('display-outcome-error'));
  await page.screenshot({
    fullPage: true,
    path: `${SCREENSHOT_DIR}/matrix-spectral-controlled-stop.png`,
  });

  await page.getByTestId('display-outcome-action-send-equation').click();
  await expect.poll(() => getMathFieldLatex(page)).toContain('\\lambda');
  await expect.poll(() => getMathFieldLatex(page)).toContain('+1=0');
});
