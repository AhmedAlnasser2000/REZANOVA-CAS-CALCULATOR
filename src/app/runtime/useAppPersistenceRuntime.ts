import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  bootApp,
  clearCalculatorMemorySnapshot,
  isDesktopRuntime,
  loadCalculatorMemorySnapshot,
  loadHistoryEntries,
  persistSettings,
  persistVariableMemory,
} from '../../lib/app-state/persistence';
import {
  buildStoredVariableValue,
  removeStoredVariableValue,
  upsertStoredVariableValue,
} from '../../lib/algebra/variable-memory';
import {
  type CalculatorMemorySnapshot,
  type HistoryEntry,
  type ModeId,
  type Settings,
  type StoredVariableValue,
} from '../../types/calculator';
import { useCalculatorMemoryPersistence } from './useCalculatorMemoryPersistence';

const CALCULATOR_MEMORY_VERSION = 1 as const;

type HistoryDisplayMemoryFragment = Pick<
  CalculatorMemorySnapshot,
  'settings' | 'history' | 'variableMemory' | 'ansLatex' | 'displayOutcome'
>;

type UseAppPersistenceRuntimeOptions = {
  buildHistoryDisplayMemoryFragment: (
    settings: Settings,
    variableMemory: StoredVariableValue[],
  ) => HistoryDisplayMemoryFragment;
  labsEnabled: boolean;
  resetCalculateRuntime: () => void;
  resetCalculusRuntime: () => void;
  resetEquationRuntime: () => void;
  resetGeometryRuntime: () => void;
  resetGuideRuntime: () => void;
  resetHistoryDisplayMemory: () => void;
  resetLinearAlgebraTableRuntime: () => void;
  resetStatisticsRuntime: () => void;
  resetTrigonometryRuntime: () => void;
  restoreHistoryDisplayMemorySnapshot: (snapshot: CalculatorMemorySnapshot) => void;
  restoreLoadedHistory: (history: HistoryEntry[]) => void;
  setClipboardNotice: (notice: string | null) => void;
  setCurrentMode: Dispatch<SetStateAction<ModeId>>;
  setPreviousNonGuideMode: Dispatch<SetStateAction<Exclude<ModeId, 'guide'>>>;
  setSettings: Dispatch<SetStateAction<Settings>>;
  settings: Settings;
};

export function useAppPersistenceRuntime(options: UseAppPersistenceRuntimeOptions) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const [hydrated, setHydrated] = useState(false);
  const [runtimeLabel, setRuntimeLabel] = useState('Browser preview');
  const [variableMemory, setVariableMemory] = useState<StoredVariableValue[]>([]);
  const settingsReadyRef = useRef(false);

  const buildCalculatorMemorySnapshot = useCallback((): CalculatorMemorySnapshot => {
    const {
      buildHistoryDisplayMemoryFragment,
      settings,
    } = optionsRef.current;
    const historyDisplayMemory = buildHistoryDisplayMemoryFragment(settings, variableMemory);
    return {
      version: CALCULATOR_MEMORY_VERSION,
      savedAt: new Date().toISOString(),
      currentMode: 'calculate',
      previousNonGuideMode: 'calculate',
      settings: historyDisplayMemory.settings,
      history: historyDisplayMemory.history,
      variableMemory: historyDisplayMemory.variableMemory,
      ansLatex: historyDisplayMemory.ansLatex,
      displayOutcome: historyDisplayMemory.displayOutcome,
      session: {},
    };
  }, [variableMemory]);

  const restoreCalculatorMemorySnapshot = useCallback((snapshot: CalculatorMemorySnapshot) => {
    const {
      resetCalculateRuntime,
      resetEquationRuntime,
      restoreHistoryDisplayMemorySnapshot,
      setCurrentMode,
      setPreviousNonGuideMode,
      setSettings,
    } = optionsRef.current;

    setCurrentMode('calculate');
    setPreviousNonGuideMode('calculate');
    setSettings(snapshot.settings);
    restoreHistoryDisplayMemorySnapshot(snapshot);
    setVariableMemory(snapshot.variableMemory);
    resetCalculateRuntime();
    resetEquationRuntime();
  }, []);

  const {
    markDirty: markCalculatorMemoryDirty,
    restoreFromSnapshot: restoreCalculatorMemoryFromSnapshot,
    cancelScheduledSave: cancelScheduledCalculatorMemorySave,
    noteMemoryCleared: noteCalculatorMemoryCleared,
  } = useCalculatorMemoryPersistence({
    hydrated,
    settings: options.settings,
    buildSnapshot: buildCalculatorMemorySnapshot,
    restoreSnapshot: restoreCalculatorMemorySnapshot,
  });

  useEffect(() => {
    let cancelled = false;
    setRuntimeLabel(isDesktopRuntime() ? 'Desktop runtime' : 'Browser preview');

    void (async () => {
      try {
        const [bootstrap, loadedHistory, savedMemory] = await Promise.all([
          bootApp().catch(() => null),
          loadHistoryEntries().catch(() => [] as HistoryEntry[]),
          loadCalculatorMemorySnapshot().catch(() => null),
        ]);
        if (cancelled) {
          return;
        }

        if ((savedMemory?.settings.calculatorMemoryEnabled ?? bootstrap?.settings.calculatorMemoryEnabled) && savedMemory) {
          restoreCalculatorMemoryFromSnapshot(savedMemory);
        } else if (bootstrap) {
          const bootstrapMode = bootstrap.currentMode;
          const restoredPreviousMode =
            bootstrapMode === 'guide' ? 'calculate' : bootstrapMode;
          optionsRef.current.setCurrentMode(
            bootstrapMode === 'labs' && !optionsRef.current.labsEnabled
              ? 'calculate'
              : bootstrapMode,
          );
          optionsRef.current.setPreviousNonGuideMode(restoredPreviousMode);
          optionsRef.current.setSettings(bootstrap.settings);
          optionsRef.current.restoreLoadedHistory(loadedHistory);
          setVariableMemory(bootstrap.variableMemory);
        } else {
          optionsRef.current.restoreLoadedHistory(loadedHistory);
        }
      } catch {
        // Keep the default shell state if a non-critical bootstrap read fails.
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [restoreCalculatorMemoryFromSnapshot]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!settingsReadyRef.current) {
      settingsReadyRef.current = true;
      return;
    }

    void persistSettings(options.settings);
  }, [hydrated, options.settings]);

  const replaceVariableMemory = useCallback((nextEntries: StoredVariableValue[]) => {
    setVariableMemory(nextEntries);
    void persistVariableMemory(nextEntries);
  }, []);

  const setStoredVariable = useCallback((name: string, valueLatex: string) => {
    const entry = buildStoredVariableValue(name, valueLatex);
    if (!entry.ok) {
      return entry.error;
    }

    setVariableMemory((currentEntries) => {
      const nextEntries = upsertStoredVariableValue(currentEntries, entry.value);
      void persistVariableMemory(nextEntries);
      return nextEntries;
    });
    return null;
  }, []);

  const clearStoredVariable = useCallback((name: string) => {
    setVariableMemory((currentEntries) => {
      const nextEntries = removeStoredVariableValue(currentEntries, name);
      void persistVariableMemory(nextEntries);
      return nextEntries;
    });
  }, []);

  const clearAllStoredVariables = useCallback(() => {
    replaceVariableMemory([]);
  }, [replaceVariableMemory]);

  const resetCalculatorMemory = useCallback(() => {
    const {
      resetCalculateRuntime,
      resetCalculusRuntime,
      resetEquationRuntime,
      resetGeometryRuntime,
      resetGuideRuntime,
      resetHistoryDisplayMemory,
      resetLinearAlgebraTableRuntime,
      resetStatisticsRuntime,
      resetTrigonometryRuntime,
      setClipboardNotice,
      setCurrentMode,
      setPreviousNonGuideMode,
    } = optionsRef.current;

    cancelScheduledCalculatorMemorySave();
    setCurrentMode('calculate');
    setPreviousNonGuideMode('calculate');
    resetHistoryDisplayMemory();
    resetCalculateRuntime();
    resetEquationRuntime();
    resetLinearAlgebraTableRuntime();
    resetCalculusRuntime();
    resetTrigonometryRuntime();
    resetStatisticsRuntime();
    resetGeometryRuntime();
    resetGuideRuntime();
    replaceVariableMemory([]);
    void clearCalculatorMemorySnapshot();
    noteCalculatorMemoryCleared();
    setClipboardNotice('Calculator memory reset');
  }, [
    cancelScheduledCalculatorMemorySave,
    noteCalculatorMemoryCleared,
    replaceVariableMemory,
  ]);

  return {
    clearAllStoredVariables,
    clearStoredVariable,
    hydrated,
    markCalculatorMemoryDirty,
    resetCalculatorMemory,
    runtimeLabel,
    setStoredVariable,
    variableMemory,
  };
}

export function useAppPersistenceDirtySignal(options: {
  dirtySignal: unknown;
  hydrated: boolean;
  markDirty: () => void;
}) {
  useEffect(() => {
    if (!options.hydrated) {
      return;
    }

    options.markDirty();
  }, [options.dirtySignal, options.hydrated, options.markDirty]);
}
