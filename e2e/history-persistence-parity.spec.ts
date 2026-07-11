import { expect, test } from '@playwright/test';
import { DEFAULT_SETTINGS, type HistoryEntry } from '../src/types/calculator';
import { setMathFieldLatex } from './helpers';

const APP_STATE_KEY = 'rezanova-classwiz-calculator:app-state:v1';

const RICH_HISTORY_ENTRY: HistoryEntry & {
  futureHistoryExtension: { version: number; payload: string[] };
} = {
  id: 'history.browser-reload.1',
  mode: 'equation',
  inputLatex: 'x+y=3, x-y=-1',
  resolvedInputLatex: 'x+y=3, x-y=-1',
  resultLatex: '(x,y)=(1,2)',
  exactSupplementLatex: ['x=1', 'y=2'],
  approxText: '(1.0, 2.0)',
  detailSections: [{
    title: 'Verification',
    lines: ['x+y=3'],
    lineKinds: ['math'],
    lineParts: [[{ kind: 'math', latex: 'x+y=3' }]],
  }],
  systemReadback: {
    variablesLatex: ['x', 'y'],
    rows: [{ valuesLatex: ['1', '2'] }],
    source: 'linear-system',
  },
  calculateScreen: 'limit',
  calculateSeed: { bodyLatex: '1/x', target: '0', direction: 'left', targetKind: 'finite' },
  calculusScreen: 'finiteLimit',
  calculusSeed: { bodyLatex: '1/x', target: '0', direction: 'left' },
  geometryScreen: 'rectangle',
  geometrySeed: {
    screen: 'rectangle',
    request: { kind: 'rectangle', widthLatex: '3', heightLatex: '4' },
  },
  trigScreen: 'periodPhase',
  trigSeed: {
    screen: 'periodPhase',
    request: { kind: 'periodPhase', expressionLatex: '\\sin(x)', variable: 'x', angleUnit: 'rad' },
  },
  statisticsScreen: 'regression',
  statisticsSeed: {
    screen: 'regression',
    request: { kind: 'regression', points: [{ x: '1', y: '2' }, { x: '2', y: '4' }] },
    workingSource: 'dataset',
  },
  matrixSeed: { operation: 'rankA', matrixA: [[1, 2], [2, 4]] },
  vectorSeed: { operation: 'normA', vectorA: [3, 4], angleUnit: 'rad' },
  equationScreen: 'symbolic',
  equationSeed: {
    screen: 'symbolic',
    equationLatex: 'x+y=3, x-y=-1',
    equationSolveTarget: 'x',
    numericInterval: { start: '-10', end: '10', subdivisions: 40 },
  },
  equationSolveTarget: 'x',
  equationAnswerMode: 'exact',
  equationDomainIntent: 'complex',
  complexExactForm: 'rectangular',
  answerDomain: 'complex',
  solutionKind: 'exact-symbolic',
  numericInterval: { start: '-10', end: '10', subdivisions: 40 },
  variableSubstitutions: [{ name: 'a', valueLatex: '2', numericValue: 2 }],
  historyLaunchOrder: 7,
  runtimeElapsedMs: 42,
  replaySnapshot: {
    version: 1,
    ansLatex: '5',
    angleUnit: 'rad',
    outputStyle: 'both',
    equationAnswerMode: 'exact',
    equationDomainIntent: 'complex',
    complexExactForm: 'rectangular',
    mathNotationDisplay: 'rendered',
    historyInspectorNotationMode: 'plainText',
    historyPageNotationMode: 'latex',
    symbolicDisplayMode: 'powers',
    flattenNestedRootsWhenSafe: false,
    approxDigits: 12,
    numericNotationMode: 'scientific',
    scientificNotationStyle: 'e',
    detailedFactsEnabled: true,
  },
  timestamp: '2026-07-11T00:00:00.000Z',
  futureHistoryExtension: { version: 2, payload: ['kept', 'verbatim'] },
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test('preserves a complete extension-rich History row across a real browser reload', async ({ page }) => {
  await page.addInitScript(({ key, entry, settings }) => {
    const calculatorMemory = {
      version: 1,
      savedAt: '2026-07-11T00:01:00.000Z',
      currentMode: 'calculate',
      previousNonGuideMode: 'calculate',
      settings,
      history: [entry],
      variableMemory: [],
      ansLatex: '0',
      displayOutcome: null,
      session: {},
    };
    window.localStorage.setItem(key, JSON.stringify({
      version: 1,
      currentMode: 'calculate',
      settings,
      history: [entry],
      variableMemory: [],
      calculatorMemory,
    }));
  }, { key: APP_STATE_KEY, entry: RICH_HISTORY_ENTRY, settings: DEFAULT_SETTINGS });

  await page.goto('/');
  await expect(page.getByTestId('main-editor')).toBeVisible();
  await page.getByTestId('history-toggle').click();
  await expect(page.getByTestId('history-entry').first()).toContainText('x+y=3');

  await page.reload();
  await expect(page.getByTestId('main-editor')).toBeVisible();
  await page.getByTestId('history-toggle').click();
  await expect(page.getByTestId('history-entry').first()).toContainText('x+y=3');

  const persisted = await page.evaluate((key) => {
    const state = JSON.parse(window.localStorage.getItem(key) ?? '{}') as {
      history?: unknown[];
      calculatorMemory?: { history?: unknown[] };
    };
    return {
      historyEntry: state.history?.[0],
      calculatorMemoryEntry: state.calculatorMemory?.history?.[0],
    };
  }, APP_STATE_KEY);
  expect(persisted.historyEntry).toEqual(RICH_HISTORY_ENTRY);
  expect(persisted.calculatorMemoryEntry).toEqual(RICH_HISTORY_ENTRY);
});

test('keeps a new row in session and warns when browser persistence fails', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('main-editor')).toBeVisible();
  await page.evaluate((key) => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(storageKey: string, value: string) {
      if (storageKey === key) {
        const state = JSON.parse(value) as { history?: unknown[] };
        if ((state.history?.length ?? 0) > 0) {
          throw new DOMException('Simulated storage failure', 'QuotaExceededError');
        }
      }
      originalSetItem.call(this, storageKey, value);
    };
  }, APP_STATE_KEY);

  await setMathFieldLatex(page, '2+2');
  await page.getByTestId('keypad-execute').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-status')).toHaveText(
    'History is available this session only; it could not be saved.',
  );

  await page.getByTestId('history-toggle').click();
  await expect(page.getByTestId('history-entry').first()).toContainText('2+2');
});
