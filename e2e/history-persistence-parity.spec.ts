import { expect, test } from '@playwright/test';
import { DEFAULT_SETTINGS, type HistoryEntry } from '../src/types/calculator';
import {
  closeSidePanelIfOpen,
  openSettingsPanel,
  setMathFieldLatex,
} from './helpers';

const APP_STATE_KEY = 'rezanova-classwiz-calculator:app-state:v1';

const RICH_HISTORY_ENTRY: HistoryEntry & {
  futureHistoryExtension: { version: number; payload: string[] };
} = {
  id: 'history.browser-reload.1',
  mode: 'equation',
  inputLatex: 'x+y=3, x-y=-1',
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
  numericInterval: { start: '-10', end: '10', subdivisions: 40 },
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
  resultDocument: {
    version: 1,
    outcomeKind: 'success',
    title: 'Solved system',
    primaryMath: { canonicalLatex: '(x,y)=(1,2)' },
    systemReadback: {
      variables: [{ canonicalLatex: 'x' }, { canonicalLatex: 'y' }],
      rows: [{
        values: [{ canonicalLatex: '1' }, { canonicalLatex: '2' }],
        approxText: '(1.0, 2.0)',
      }],
      source: 'linear-system',
    },
    details: [{
      title: 'Verification',
      lines: [[{ kind: 'math', math: { canonicalLatex: 'x+y=3' } }]],
    }],
    supplements: [{ canonicalLatex: 'x=1' }, { canonicalLatex: 'y=2' }],
    approximations: { primary: '(1.0, 2.0)' },
    metadata: {
      resolvedInput: { canonicalLatex: 'x+y=3, x-y=-1' },
      answerDomain: 'complex',
      solutionKind: 'exact-symbolic',
      variableSubstitutions: [{
        name: 'a',
        value: { canonicalLatex: '2' },
        numericValue: 2,
      }],
    },
    warnings: [],
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
  }, {
    key: APP_STATE_KEY,
    entry: RICH_HISTORY_ENTRY as unknown,
    settings: DEFAULT_SETTINGS as unknown,
  });

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

test('renders stored canonical History math with current root and power preferences', async ({ page }) => {
  const entry: HistoryEntry = {
    id: 'history.current-presentation.1',
    mode: 'calculate',
    inputLatex: String.raw`(\sqrt{x})^{1/3}`,
    resultDocument: {
      version: 1,
      outcomeKind: 'success',
      title: 'Simplify',
      primaryMath: { canonicalLatex: String.raw`(\sqrt{x})^{1/3}` },
      warnings: [],
    },
    timestamp: '2026-07-12T00:00:00.000Z',
  };
  await page.addInitScript(({ key, historyEntry, settings }) => {
    window.localStorage.setItem(key, JSON.stringify({
      version: 1,
      currentMode: 'calculate',
      settings,
      history: [historyEntry],
      variableMemory: [],
    }));
  }, {
    key: APP_STATE_KEY,
    historyEntry: entry as unknown,
    settings: DEFAULT_SETTINGS as unknown,
  });

  await page.goto('/');
  await expect(page.getByTestId('main-editor')).toBeVisible();
  await openSettingsPanel(page);
  const powersButton = page.getByTestId('settings-symbolic-mode-powers');
  await powersButton.click();
  await expect(powersButton).toHaveClass(/is-active/);
  await expect.poll(async () => page.evaluate((key) => {
    const state = JSON.parse(window.localStorage.getItem(key) ?? '{}') as {
      settings?: { symbolicDisplayMode?: unknown };
    };
    return state.settings?.symbolicDisplayMode;
  }, APP_STATE_KEY)).toBe('powers');
  await closeSidePanelIfOpen(page);
  await page.getByTestId('history-toggle').click();

  const resultMath = page.getByTestId('history-entry-result-preview').locator('[data-raw-latex]');
  await expect(resultMath).toHaveAttribute('data-raw-latex', String.raw`(\sqrt{x})^{1/3}`);
  await expect(resultMath).toHaveAttribute('aria-label', String.raw`x^{\frac{1}{6}}`);

  await closeSidePanelIfOpen(page);
  await openSettingsPanel(page);
  const rootsButton = page.getByTestId('settings-symbolic-mode-roots');
  await rootsButton.click();
  await expect(rootsButton).toHaveClass(/is-active/);
  await closeSidePanelIfOpen(page);
  await page.getByTestId('history-toggle').click();
  await expect(page.getByTestId('history-entry-result-preview').locator('[data-raw-latex]'))
    .toHaveAttribute('aria-label', String.raw`\sqrt[6]{x}`);
});

test('loads, renders, and replays a current V2 History result', async ({ page }) => {
  const entry: HistoryEntry = {
    id: 'history.v2-visible.1',
    mode: 'calculate',
    inputLatex: 'x=2',
    resultDocument: {
      version: 2,
      outcomeKind: 'success',
      title: 'Typed History Result',
      primary: {
        kind: 'math',
        value: { canonicalLatex: 'x=2', mathJson: ['Equal', 'x', 2] },
      },
      request: {
        kind: 'math',
        value: { canonicalLatex: 'x=2', mathJson: ['Equal', 'x', 2] },
      },
      supplements: [{
        role: 'exclusion',
        presentationLatex: 'x\\ne0',
        math: { canonicalLatex: 'x\\ne0', mathJson: ['NotEqual', 'x', 0] },
      }],
      warnings: [],
    },
    timestamp: '2026-07-14T00:00:00.000Z',
  };
  await page.addInitScript(({ key, historyEntry, settings }) => {
    window.localStorage.setItem(key, JSON.stringify({
      version: 1,
      currentMode: 'calculate',
      settings,
      history: [historyEntry],
      variableMemory: [],
    }));
  }, {
    key: APP_STATE_KEY,
    historyEntry: entry as unknown,
    settings: DEFAULT_SETTINGS as unknown,
  });

  await page.goto('/');
  await expect(page.getByTestId('main-editor')).toBeVisible();
  await page.getByTestId('history-toggle').click();
  await expect(page.getByTestId('history-entry')).toHaveCount(1);
  await expect(page.getByTestId('history-entry-result-preview').locator('[data-raw-latex]'))
    .toHaveAttribute('data-raw-latex', 'x=2');
  await page.getByTestId('history-entry-replay').click();
  await expect(page.getByTestId('display-outcome-success')).toBeVisible();
  await expect(page.getByTestId('display-outcome-title')).toHaveText('Typed History Result');
  await expect(page.locator('[data-testid="display-outcome-success"] [data-raw-latex]').first())
    .toHaveAttribute('data-raw-latex', 'x=2');
});

test('loads, renders, copies, and replays a current V3 gradian angle quantity', async ({ page }) => {
  const entry: HistoryEntry = {
    id: 'history.v3-angle-visible.1',
    mode: 'vector',
    inputLatex: 'angle(u,v)',
    resultDocument: {
      version: 3,
      outcomeKind: 'success',
      title: 'Angle',
      primary: {
        kind: 'angle-quantity',
        presentation: { primaryLatex: '100^{g}' },
        magnitude: { canonicalLatex: '100', mathJson: 100 },
        unit: 'grad',
      },
      warnings: [],
    },
    timestamp: '2026-07-15T00:00:00.000Z',
  };
  await page.addInitScript(({ key, historyEntry, settings }) => {
    window.localStorage.setItem(key, JSON.stringify({
      version: 1,
      currentMode: 'vector',
      settings,
      history: [historyEntry],
      variableMemory: [],
    }));
  }, {
    key: APP_STATE_KEY,
    historyEntry: entry as unknown,
    settings: DEFAULT_SETTINGS as unknown,
  });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

  await page.goto('/');
  await expect(page.getByTestId('main-editor')).toBeVisible();
  await page.getByTestId('history-toggle').click();
  await expect(page.getByTestId('history-entry')).toHaveCount(1);
  await expect(page.getByTestId('history-entry-result-preview').locator('[data-raw-latex]'))
    .toHaveAttribute('data-raw-latex', '100^{g}');
  await page.screenshot({
    path: '.task_tmp/canonical-result-v3-angle-quantity1/history-v3-grad-angle-entry.png',
    fullPage: true,
  });
  await page.getByTestId('history-entry-replay').click();
  await expect(page.getByTestId('display-outcome-title')).toHaveText('Angle');
  await expect(page.locator('[data-testid="display-outcome-success"] [data-raw-latex]').first())
    .toHaveAttribute('data-raw-latex', '100^{g}');
  await page.getByTestId('display-outcome-action-copy-result').click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain('100^{g}');
  await page.screenshot({
    path: '.task_tmp/canonical-result-v3-angle-quantity1/history-v3-grad-angle.png',
    fullPage: true,
  });
});

test('removes old and malformed rows while preserving future result versions verbatim', async ({ page }) => {
  const legacyEntry = {
    id: 'history.legacy-only.1',
    mode: 'calculate',
    inputLatex: '2+3',
    resultLatex: '5',
    timestamp: '2026-07-12T00:00:00.000Z',
  };
  const malformedV1 = {
    id: 'history.malformed-v1.1',
    mode: 'calculate',
    inputLatex: '3+3',
    resultDocument: { version: 1, title: 'Missing canonical fields' },
    timestamp: '2026-07-12T00:00:01.000Z',
  };
  const futureV4 = {
    id: 'history.future-v4.1',
    mode: 'calculate',
    inputLatex: 'future()',
    resultDocument: {
      version: 4,
      title: 'Future result',
      payload: ['kept', 'verbatim'],
    },
    timestamp: '2026-07-12T00:00:02.000Z',
  };
  await page.addInitScript(({ key, legacy, malformed, future, settings }) => {
    window.localStorage.setItem(key, JSON.stringify({
      version: 1,
      currentMode: 'calculate',
      settings,
      history: [legacy, malformed, future],
      variableMemory: [],
    }));
  }, {
    key: APP_STATE_KEY,
    legacy: legacyEntry,
    malformed: malformedV1,
    future: futureV4,
    settings: DEFAULT_SETTINGS as unknown,
  });

  await page.goto('/');
  await expect(page.getByTestId('main-editor')).toBeVisible();
  await expect(page.getByTestId('display-status')).toHaveText(
    '2 incompatible History records were removed.',
  );
  await page.getByTestId('history-toggle').click();
  await expect(page.getByTestId('history-entry')).toHaveCount(0);

  const persisted = await page.evaluate((key) => {
    const state = JSON.parse(window.localStorage.getItem(key) ?? '{}') as { history?: unknown[] };
    return state.history ?? [];
  }, APP_STATE_KEY);
  expect(persisted).toEqual([futureV4]);

  await page.reload();
  await expect(page.getByTestId('main-editor')).toBeVisible();
  const afterReload = await page.evaluate((key) => {
    const state = JSON.parse(window.localStorage.getItem(key) ?? '{}') as { history?: unknown[] };
    return state.history ?? [];
  }, APP_STATE_KEY);
  expect(afterReload).toEqual([futureV4]);
});
