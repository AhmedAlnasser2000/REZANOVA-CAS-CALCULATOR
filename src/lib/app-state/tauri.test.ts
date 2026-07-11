import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type CalculatorMemorySnapshot, type HistoryEntry } from '../../types/calculator';
import {
  HISTORY_ENTRY_MAX_SERIALIZED_BYTES,
  WEB_PREVIEW_APP_STATE_STORAGE_KEY,
  appendHistoryEntry,
  bootApp,
  clearCalculatorMemorySnapshot,
  clearHistoryEntries,
  deleteHistoryEntry,
  loadCalculatorMemorySnapshot,
  loadHistoryEntries,
  persistCalculatorMemorySnapshot,
  persistMode,
  persistSettings,
  persistVariableMemory,
} from './tauri';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

function createHistoryEntry(id: string): HistoryEntry {
  return {
    id,
    mode: 'calculate',
    inputLatex: `${id}+1`,
    resultLatex: `${id}+1`,
    timestamp: `2026-05-25T00:00:${id.padStart(2, '0')}Z`,
  };
}

function createRichHistoryEntry(): HistoryEntry & {
  futureHistoryExtension: { version: number; payload: string[] };
} {
  return {
    id: 'history.rich.1',
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
      rows: [{ valuesLatex: ['1', '2'], approxText: '(1.0, 2.0)' }],
      label: 'Solution',
      source: 'linear-system',
    },
    calculateScreen: 'limit',
    calculateSeed: {
      bodyLatex: '1/x',
      target: '0',
      direction: 'left',
      targetKind: 'finite',
    },
    calculusScreen: 'odeNumericIvp',
    calculusSeed: {
      rhsLatex: 'x+y',
      x0: '0',
      y0: '1',
      xEnd: '2',
      step: '0.1',
      method: 'rk4',
    },
    geometryScreen: 'rectangle',
    geometrySeed: {
      screen: 'rectangle',
      request: { kind: 'rectangle', widthLatex: '3', heightLatex: '4' },
    },
    trigScreen: 'periodPhase',
    trigSeed: {
      screen: 'periodPhase',
      request: {
        kind: 'periodPhase',
        expressionLatex: '\\sin(x)',
        variable: 'x',
        angleUnit: 'rad',
      },
    },
    statisticsScreen: 'regression',
    statisticsSeed: {
      screen: 'regression',
      request: {
        kind: 'regression',
        points: [{ x: '1', y: '2' }, { x: '2', y: '4' }],
      },
      workingSource: 'dataset',
    },
    matrixSeed: {
      operation: 'rankA',
      matrixA: [[1, 2], [2, 4]],
      editorExpressionLatex: '\\operatorname{rank}(A)',
    },
    vectorSeed: {
      operation: 'normA',
      vectorA: [3, 4],
      angleUnit: 'rad',
      editorExpressionLatex: '\\operatorname{norm}(u)',
    },
    equationScreen: 'symbolic',
    equationSeed: {
      screen: 'symbolic',
      equationLatex: 'x+y=3, x-y=-1',
      equationSolveTarget: 'x',
      numericInterval: { start: '-10', end: '10', subdivisions: 40 },
      complexRegion: { reMin: '-2', reMax: '2', imMin: '-2', imMax: '2' },
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
    futureHistoryExtension: {
      version: 2,
      payload: ['kept', 'verbatim'],
    },
  };
}

describe('web-preview app-state persistence', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('window', {
      localStorage: storage,
    });
  });

  it('persists mode, settings, history, variables, and calculator memory', async () => {
    await persistMode('equation');
    const settings = await persistSettings({
      languageCode: 'en',
      angleUnit: 'rad',
      equationDomainIntent: 'complex',
      complexExactForm: 'cis',
      calculatorMemoryAutosaveMode: 'interval',
      calculatorMemoryAutosaveIntervalSeconds: 5,
    });
    await appendHistoryEntry(createHistoryEntry('1'));
    await persistVariableMemory([{ name: 'a', valueLatex: '5', numericValue: 5 }]);

    const snapshot: CalculatorMemorySnapshot = {
      version: 1,
      savedAt: '2026-05-25T00:00:00Z',
      currentMode: 'equation',
      previousNonGuideMode: 'equation',
      settings,
      history: [createHistoryEntry('1')],
      variableMemory: [{ name: 'a', valueLatex: '5', numericValue: 5 }],
      ansLatex: '6',
      displayOutcome: { kind: 'success', title: 'Result', warnings: [], exactLatex: '6' },
      session: { equation: { latex: 'x+1=2', screen: 'symbolic' } },
    };
    await persistCalculatorMemorySnapshot(snapshot);

    expect(await bootApp()).toMatchObject({
      currentMode: 'equation',
      historyCount: 1,
      variableMemory: [{ name: 'a', valueLatex: '5', numericValue: 5 }],
    });
    expect((await bootApp()).settings.calculatorMemoryAutosaveIntervalSeconds).toBe(20);
    expect((await bootApp()).settings.languageCode).toBe('en');
    expect((await bootApp()).settings.equationDomainIntent).toBe('complex');
    expect((await bootApp()).settings.complexExactForm).toBe('cis');
    expect(await loadHistoryEntries()).toHaveLength(1);
    expect(await loadCalculatorMemorySnapshot()).toMatchObject({
      ansLatex: '6',
      currentMode: 'calculate',
      displayOutcome: null,
      session: {},
    });
  });

  it('preserves every HistoryEntry field and unknown extensions across browser reload and Calculator Memory', async () => {
    const entry = createRichHistoryEntry();
    expect(await appendHistoryEntry(entry)).toEqual({ ok: true });
    expect(await loadHistoryEntries()).toEqual([entry]);

    const reloadedState = JSON.parse(
      storage.getItem(WEB_PREVIEW_APP_STATE_STORAGE_KEY) ?? '{}',
    ) as { history?: unknown[] };
    expect(reloadedState.history).toEqual([entry]);
    expect(await loadHistoryEntries()).toEqual([entry]);

    await persistCalculatorMemorySnapshot({
      version: 1,
      savedAt: '2026-07-11T00:01:00.000Z',
      currentMode: 'equation',
      previousNonGuideMode: 'equation',
      settings: DEFAULT_SETTINGS,
      history: [entry],
      variableMemory: [],
      ansLatex: '1',
      displayOutcome: null,
      session: {},
    });

    expect((await loadCalculatorMemorySnapshot())?.history).toEqual([entry]);
  });

  it('reports invalid, oversized, and unavailable History persistence without discarding session ownership', async () => {
    expect(await appendHistoryEntry({
      id: 'invalid',
      mode: 'calculate',
      inputLatex: '1+1',
    } as HistoryEntry)).toEqual({ ok: false, reason: 'invalid' });

    expect(await appendHistoryEntry({
      ...createHistoryEntry('oversized'),
      resultLatex: 'x'.repeat(HISTORY_ENTRY_MAX_SERIALIZED_BYTES),
    })).toEqual({ ok: false, reason: 'over-size' });

    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    expect(await appendHistoryEntry(createHistoryEntry('unavailable'))).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('trims and clears persisted history', async () => {
    for (let index = 0; index < 85; index += 1) {
      await appendHistoryEntry(createHistoryEntry(`${index}`));
    }

    const entries = await loadHistoryEntries();
    expect(entries).toHaveLength(80);
    expect(entries[0].id).toBe('5');

    await clearHistoryEntries();
    expect(await loadHistoryEntries()).toEqual([]);
  });

  it('deletes one persisted history entry by id', async () => {
    await appendHistoryEntry(createHistoryEntry('1'));
    await appendHistoryEntry(createHistoryEntry('2'));

    await deleteHistoryEntry('1');

    expect(await loadHistoryEntries()).toEqual([createHistoryEntry('2')]);
  });

  it('drops invalid history rows and survives corrupt state', async () => {
    storage.setItem(WEB_PREVIEW_APP_STATE_STORAGE_KEY, JSON.stringify({
      currentMode: 'calculate',
      settings: DEFAULT_SETTINGS,
      history: [createHistoryEntry('1'), { id: 'bad' }],
      variableMemory: [],
      calculatorMemory: {
        version: 1,
        savedAt: '2026-05-25T00:00:00Z',
        currentMode: 'calculate',
        settings: DEFAULT_SETTINGS,
        history: [
          createHistoryEntry('1'),
          { id: 'legacy-null-optionals', mode: 'calculate', inputLatex: '2+2', resultLatex: null },
        ],
        variableMemory: [],
        ansLatex: '4',
        session: { calculate: { latex: '2+2' } },
      },
    }));

    expect(await loadHistoryEntries()).toEqual([createHistoryEntry('1')]);
    expect(await loadCalculatorMemorySnapshot()).toMatchObject({
      ansLatex: '4',
      history: [createHistoryEntry('1')],
      displayOutcome: null,
      session: {},
    });

    storage.setItem(WEB_PREVIEW_APP_STATE_STORAGE_KEY, '{bad json');
    expect(await bootApp()).toMatchObject({
      currentMode: 'calculate',
      historyCount: 0,
      variableMemory: [],
    });
  });

  it('clears calculator memory without clearing settings or history', async () => {
    await persistSettings({ angleUnit: 'grad' });
    await appendHistoryEntry(createHistoryEntry('1'));
    await persistCalculatorMemorySnapshot({
      version: 1,
      savedAt: '2026-05-25T00:00:00Z',
      currentMode: 'calculate',
      settings: { ...DEFAULT_SETTINGS, angleUnit: 'grad' },
      history: [createHistoryEntry('1')],
      variableMemory: [],
      ansLatex: '2',
      session: { calculate: { latex: '1+1' } },
    });

    await clearCalculatorMemorySnapshot();

    expect(await loadCalculatorMemorySnapshot()).toBeNull();
    expect((await bootApp()).settings.angleUnit).toBe('grad');
    expect(await loadHistoryEntries()).toHaveLength(1);
  });
});
