import {
  act,
  renderHook,
  waitFor,
} from '@testing-library/react';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  DEFAULT_SETTINGS,
  type AppBootstrap,
  type CalculatorMemorySnapshot,
  type HistoryEntry,
  type Settings,
  type StoredVariableValue,
} from '../../types/calculator';
import {
  bootApp,
  clearCalculatorMemorySnapshot,
  isDesktopRuntime,
  loadCalculatorMemorySnapshot,
  loadHistoryEntriesWithCleanup,
  persistCalculatorMemorySnapshot,
  persistMode,
  persistSettings,
  persistVariableMemory,
} from '../../lib/app-state/persistence';
import {
  useAppPersistenceDirtySignal,
  useAppPersistenceRuntime,
} from './useAppPersistenceRuntime';
import { historyEntryFixture } from '../../test-utils/history-result-document';

vi.mock('../../lib/app-state/persistence', () => ({
  HISTORY_CANONICAL_CLEANUP_NOTICE: (count: number) =>
    `${count} incompatible History ${count === 1 ? 'record was' : 'records were'} removed.`,
  bootApp: vi.fn(),
  clearCalculatorMemorySnapshot: vi.fn(),
  isDesktopRuntime: vi.fn(),
  loadCalculatorMemorySnapshot: vi.fn(),
  loadHistoryEntriesWithCleanup: vi.fn(),
  persistCalculatorMemorySnapshot: vi.fn(),
  persistMode: vi.fn(),
  persistSettings: vi.fn(),
  persistVariableMemory: vi.fn(),
}));

type Delegates = ReturnType<typeof createDelegates>;

function createHistoryEntry(id = 'history.1'): HistoryEntry {
  return historyEntryFixture({
    id,
    inputLatex: '2+2',
    mode: 'calculate',
    resultLatex: '4',
    timestamp: '2026-06-15T00:00:00.000Z',
  });
}

function createBootstrap(overrides: Partial<AppBootstrap> = {}): AppBootstrap {
  return {
    currentMode: 'calculate',
    historyCount: 0,
    modeTree: [],
    settings: DEFAULT_SETTINGS,
    variableMemory: [],
    version: 'test',
    ...overrides,
  };
}

function createSnapshot(overrides: Partial<CalculatorMemorySnapshot> = {}): CalculatorMemorySnapshot {
  return {
    ansLatex: '4',
    currentMode: 'calculate',
    displayOutcome: null,
    history: [],
    previousNonGuideMode: 'calculate',
    savedAt: '2026-06-15T00:00:00.000Z',
    session: {},
    settings: {
      ...DEFAULT_SETTINGS,
      calculatorMemoryEnabled: true,
    },
    variableMemory: [],
    version: 1,
    ...overrides,
  };
}

function createDelegates() {
  return {
    buildHistoryDisplayMemoryFragment: vi.fn((
      settings: Settings,
      variableMemory: StoredVariableValue[],
    ) => ({
      ansLatex: '8',
      displayOutcome: null,
      history: [createHistoryEntry('history.snapshot')],
      settings,
      variableMemory,
    })),
    resetCalculateRuntime: vi.fn(),
    resetCalculusRuntime: vi.fn(),
    resetEquationRuntime: vi.fn(),
    resetGeometryRuntime: vi.fn(),
    resetGuideRuntime: vi.fn(),
    resetHistoryDisplayMemory: vi.fn(),
    resetLinearAlgebraTableRuntime: vi.fn(),
    resetStatisticsRuntime: vi.fn(),
    resetTrigonometryRuntime: vi.fn(),
    restoreHistoryDisplayMemorySnapshot: vi.fn(),
    restoreLoadedHistory: vi.fn(),
    setClipboardNotice: vi.fn(),
    setCurrentMode: vi.fn(),
    setPreviousNonGuideMode: vi.fn(),
    setSettings: vi.fn(),
  };
}

function renderAppPersistenceRuntime(options: {
  delegates?: Delegates;
  labsEnabled?: boolean;
  settings?: Settings;
} = {}) {
  const delegates = options.delegates ?? createDelegates();
  const hook = renderHook(
    (props: { labsEnabled: boolean; settings: Settings }) =>
      useAppPersistenceRuntime({
        buildHistoryDisplayMemoryFragment: delegates.buildHistoryDisplayMemoryFragment,
        labsEnabled: props.labsEnabled,
        resetCalculateRuntime: delegates.resetCalculateRuntime,
        resetCalculusRuntime: delegates.resetCalculusRuntime,
        resetEquationRuntime: delegates.resetEquationRuntime,
        resetGeometryRuntime: delegates.resetGeometryRuntime,
        resetGuideRuntime: delegates.resetGuideRuntime,
        resetHistoryDisplayMemory: delegates.resetHistoryDisplayMemory,
        resetLinearAlgebraTableRuntime: delegates.resetLinearAlgebraTableRuntime,
        resetStatisticsRuntime: delegates.resetStatisticsRuntime,
        resetTrigonometryRuntime: delegates.resetTrigonometryRuntime,
        restoreHistoryDisplayMemorySnapshot: delegates.restoreHistoryDisplayMemorySnapshot,
        restoreLoadedHistory: delegates.restoreLoadedHistory,
        setClipboardNotice: delegates.setClipboardNotice,
        setCurrentMode: delegates.setCurrentMode,
        setPreviousNonGuideMode: delegates.setPreviousNonGuideMode,
        setSettings: delegates.setSettings,
        settings: props.settings,
      }),
    {
      initialProps: {
        labsEnabled: options.labsEnabled ?? false,
        settings: options.settings ?? DEFAULT_SETTINGS,
      },
    },
  );

  return {
    delegates,
    hook,
  };
}

describe('useAppPersistenceRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isDesktopRuntime).mockReturnValue(false);
    vi.mocked(bootApp).mockResolvedValue(null as unknown as AppBootstrap);
    vi.mocked(loadHistoryEntriesWithCleanup).mockResolvedValue({ entries: [], removedCount: 0 });
    vi.mocked(loadCalculatorMemorySnapshot).mockResolvedValue(null);
    vi.mocked(persistCalculatorMemorySnapshot).mockImplementation(async (snapshot) => snapshot);
    vi.mocked(persistMode).mockResolvedValue({
      activeMode: 'calculate',
      menu: [],
    });
    vi.mocked(persistSettings).mockResolvedValue(DEFAULT_SETTINGS);
    vi.mocked(persistVariableMemory).mockImplementation(async (entries) => entries);
    vi.mocked(clearCalculatorMemorySnapshot).mockResolvedValue(undefined);
  });

  it('restores calculator memory before bootstrap state when saved memory is enabled', async () => {
    const savedVariable = {
      name: 'a',
      numericValue: 5,
      updatedAt: '2026-06-15T00:00:00.000Z',
      valueLatex: '5',
    };
    const snapshot = createSnapshot({
      variableMemory: [savedVariable],
    });
    const delegates = createDelegates();
    vi.mocked(bootApp).mockResolvedValue(createBootstrap({
      currentMode: 'equation',
      settings: {
        ...DEFAULT_SETTINGS,
        calculatorMemoryEnabled: true,
      },
    }));
    vi.mocked(loadCalculatorMemorySnapshot).mockResolvedValue(snapshot);

    const { hook } = renderAppPersistenceRuntime({ delegates });

    await waitFor(() => expect(hook.result.current.hydrated).toBe(true));

    expect(hook.result.current.runtimeLabel).toBe('Browser preview');
    expect(delegates.setCurrentMode).toHaveBeenCalledWith('calculate');
    expect(delegates.setPreviousNonGuideMode).toHaveBeenCalledWith('calculate');
    expect(delegates.setSettings).toHaveBeenCalledWith(snapshot.settings);
    expect(delegates.restoreHistoryDisplayMemorySnapshot).toHaveBeenCalledWith(snapshot);
    expect(delegates.resetCalculateRuntime).toHaveBeenCalledTimes(1);
    expect(delegates.resetEquationRuntime).toHaveBeenCalledTimes(1);
    expect(delegates.restoreLoadedHistory).not.toHaveBeenCalled();
    expect(hook.result.current.variableMemory).toEqual([savedVariable]);
  });

  it('falls back to bootstrap state and loaded history when no saved memory is active', async () => {
    const loadedHistory = [createHistoryEntry()];
    const bootstrapVariable = {
      name: 'b',
      numericValue: 9,
      updatedAt: '2026-06-15T00:00:00.000Z',
      valueLatex: '9',
    };
    const delegates = createDelegates();
    vi.mocked(bootApp).mockResolvedValue(createBootstrap({
      currentMode: 'labs',
      variableMemory: [bootstrapVariable],
    }));
    vi.mocked(loadHistoryEntriesWithCleanup).mockResolvedValue({
      entries: loadedHistory,
      removedCount: 0,
    });

    const { hook } = renderAppPersistenceRuntime({ delegates, labsEnabled: false });

    await waitFor(() => expect(hook.result.current.hydrated).toBe(true));

    expect(delegates.setCurrentMode).toHaveBeenCalledWith('calculate');
    expect(delegates.setPreviousNonGuideMode).toHaveBeenCalledWith('labs');
    expect(delegates.setSettings).toHaveBeenCalledWith(DEFAULT_SETTINGS);
    expect(delegates.restoreLoadedHistory).toHaveBeenCalledWith(loadedHistory);
    expect(hook.result.current.variableMemory).toEqual([bootstrapVariable]);
  });

  it('notifies once when incompatible persisted History rows are cleaned', async () => {
    const delegates = createDelegates();
    vi.mocked(bootApp).mockResolvedValue(createBootstrap());
    vi.mocked(loadHistoryEntriesWithCleanup).mockResolvedValue({
      entries: [createHistoryEntry()],
      removedCount: 2,
    });

    const { hook } = renderAppPersistenceRuntime({ delegates });
    await waitFor(() => expect(hook.result.current.hydrated).toBe(true));

    expect(delegates.setClipboardNotice).toHaveBeenCalledWith(
      '2 incompatible History records were removed.',
    );
  });

  it('persists settings only after the hydrated settings baseline is established', async () => {
    const { hook } = renderAppPersistenceRuntime();

    await waitFor(() => expect(hook.result.current.hydrated).toBe(true));
    expect(persistSettings).not.toHaveBeenCalled();

    hook.rerender({
      labsEnabled: false,
      settings: {
        ...DEFAULT_SETTINGS,
        angleUnit: 'deg',
      },
    });

    await waitFor(() =>
      expect(persistSettings).toHaveBeenCalledWith({
        ...DEFAULT_SETTINGS,
        angleUnit: 'deg',
      }),
    );
  });

  it('updates variable memory through the public variable-memory policy helpers', async () => {
    const { hook } = renderAppPersistenceRuntime();
    await waitFor(() => expect(hook.result.current.hydrated).toBe(true));

    let error: string | null = 'unset';
    act(() => {
      error = hook.result.current.setStoredVariable('a', '5');
    });

    expect(error).toBeNull();
    expect(hook.result.current.variableMemory).toMatchObject([
      {
        name: 'a',
        numericValue: 5,
        valueLatex: '5',
      },
    ]);
    expect(persistVariableMemory).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'a',
          numericValue: 5,
          valueLatex: '5',
        }),
      ]),
    );

    act(() => {
      hook.result.current.clearStoredVariable('a');
    });

    expect(hook.result.current.variableMemory).toEqual([]);
    expect(persistVariableMemory).toHaveBeenLastCalledWith([]);

    act(() => {
      error = hook.result.current.setStoredVariable('alpha', '5');
    });

    expect(error).toBe('Use @name or var(name) to store a multi-character named variable.');
  });

  it('resets app persistence state and delegates mode resets', async () => {
    const delegates = createDelegates();
    const { hook } = renderAppPersistenceRuntime({ delegates });
    await waitFor(() => expect(hook.result.current.hydrated).toBe(true));

    act(() => {
      hook.result.current.setStoredVariable('a', '5');
      hook.result.current.resetCalculatorMemory();
    });

    expect(delegates.setCurrentMode).toHaveBeenCalledWith('calculate');
    expect(delegates.setPreviousNonGuideMode).toHaveBeenCalledWith('calculate');
    expect(delegates.resetHistoryDisplayMemory).toHaveBeenCalledTimes(1);
    expect(delegates.resetCalculateRuntime).toHaveBeenCalledTimes(1);
    expect(delegates.resetEquationRuntime).toHaveBeenCalledTimes(1);
    expect(delegates.resetLinearAlgebraTableRuntime).toHaveBeenCalledTimes(1);
    expect(delegates.resetCalculusRuntime).toHaveBeenCalledTimes(1);
    expect(delegates.resetTrigonometryRuntime).toHaveBeenCalledTimes(1);
    expect(delegates.resetStatisticsRuntime).toHaveBeenCalledTimes(1);
    expect(delegates.resetGeometryRuntime).toHaveBeenCalledTimes(1);
    expect(delegates.resetGuideRuntime).toHaveBeenCalledTimes(1);
    expect(clearCalculatorMemorySnapshot).toHaveBeenCalledTimes(1);
    expect(delegates.setClipboardNotice).toHaveBeenCalledWith('Calculator memory reset');
    expect(hook.result.current.variableMemory).toEqual([]);
  });
});

describe('useAppPersistenceDirtySignal', () => {
  it('marks memory dirty only after hydration', () => {
    const markDirty = vi.fn();
    const hook = renderHook(
      (props: { dirtySignal: object; hydrated: boolean }) =>
        useAppPersistenceDirtySignal({
          dirtySignal: props.dirtySignal,
          hydrated: props.hydrated,
          markDirty,
        }),
      {
        initialProps: {
          dirtySignal: {},
          hydrated: false,
        },
      },
    );

    expect(markDirty).not.toHaveBeenCalled();

    hook.rerender({
      dirtySignal: {},
      hydrated: true,
    });

    expect(markDirty).toHaveBeenCalledTimes(1);
  });
});
