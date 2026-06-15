import { useCallback, useEffect, useRef } from 'react';
import { persistCalculatorMemorySnapshot } from '../../lib/app-state/persistence';
import type { CalculatorMemorySnapshot, Settings } from '../../types/calculator';

const CALCULATOR_MEMORY_SETTLED_DELAY_MS = 1000;
const CALCULATOR_MEMORY_MIN_WRITE_INTERVAL_MS = 20_000;
const CALCULATOR_MEMORY_MAX_JSON_LENGTH = 200_000;

type UseCalculatorMemoryPersistenceOptions = {
  hydrated: boolean;
  settings: Settings;
  buildSnapshot: () => CalculatorMemorySnapshot;
  restoreSnapshot: (snapshot: CalculatorMemorySnapshot) => void;
};

function boundedCalculatorMemorySnapshot(snapshot: CalculatorMemorySnapshot) {
  try {
    if (JSON.stringify(snapshot).length <= CALCULATOR_MEMORY_MAX_JSON_LENGTH) {
      return snapshot;
    }
  } catch {
    return {
      ...snapshot,
      displayOutcome: null,
      session: {},
    };
  }

  const withoutResult = {
    ...snapshot,
    displayOutcome: null,
  };
  try {
    if (JSON.stringify(withoutResult).length <= CALCULATOR_MEMORY_MAX_JSON_LENGTH) {
      return withoutResult;
    }
  } catch {
    return {
      ...snapshot,
      displayOutcome: null,
      session: {},
    };
  }

  return {
    ...snapshot,
    displayOutcome: null,
    session: {},
  };
}

/**
 * Owns the calculator-memory autosave lifecycle: dirty tracking, settled-mode
 * debounce, interval-mode timer, write throttling, size bounding, and
 * beforeunload/unmount flushes. Snapshot building and restoring stay with the
 * caller because they touch caller-owned state. All returned functions are
 * referentially stable and read the latest options through a ref.
 */
export function useCalculatorMemoryPersistence(options: UseCalculatorMemoryPersistenceOptions) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const calculatorMemoryReadyRef = useRef(false);
  const calculatorMemoryDirtyRef = useRef(false);
  const calculatorMemorySaveTimerRef = useRef<number | null>(null);
  const calculatorMemoryLastSavedAtRef = useRef(0);

  const flush = useCallback((force = false) => {
    const { hydrated, settings, buildSnapshot } = optionsRef.current;
    if (!hydrated || !settings.calculatorMemoryEnabled) {
      return;
    }

    if (!force && !calculatorMemoryDirtyRef.current) {
      return;
    }

    calculatorMemoryDirtyRef.current = false;
    calculatorMemoryLastSavedAtRef.current = Date.now();
    void persistCalculatorMemorySnapshot(
      boundedCalculatorMemorySnapshot(buildSnapshot()),
    );
  }, []);

  const scheduleSave = useCallback(() => {
    const { hydrated, settings } = optionsRef.current;
    if (!hydrated || !settings.calculatorMemoryEnabled) {
      return;
    }

    if (settings.calculatorMemoryAutosaveMode !== 'settled') {
      return;
    }

    if (calculatorMemorySaveTimerRef.current !== null) {
      window.clearTimeout(calculatorMemorySaveTimerRef.current);
    }

    const elapsed = Date.now() - calculatorMemoryLastSavedAtRef.current;
    const delay = Math.max(
      CALCULATOR_MEMORY_SETTLED_DELAY_MS,
      CALCULATOR_MEMORY_MIN_WRITE_INTERVAL_MS - elapsed,
    );
    calculatorMemorySaveTimerRef.current = window.setTimeout(() => {
      calculatorMemorySaveTimerRef.current = null;
      flush();
    }, delay);
  }, [flush]);

  const markDirty = useCallback(() => {
    if (!optionsRef.current.hydrated) {
      return;
    }

    if (!calculatorMemoryReadyRef.current) {
      calculatorMemoryReadyRef.current = true;
      return;
    }

    calculatorMemoryDirtyRef.current = true;
    scheduleSave();
  }, [scheduleSave]);

  const restoreFromSnapshot = useCallback((snapshot: CalculatorMemorySnapshot) => {
    optionsRef.current.restoreSnapshot(snapshot);
    calculatorMemoryLastSavedAtRef.current = Date.now();
  }, []);

  const cancelScheduledSave = useCallback(() => {
    if (calculatorMemorySaveTimerRef.current !== null) {
      window.clearTimeout(calculatorMemorySaveTimerRef.current);
      calculatorMemorySaveTimerRef.current = null;
    }
  }, []);

  const noteMemoryCleared = useCallback(() => {
    calculatorMemoryDirtyRef.current = true;
    calculatorMemoryLastSavedAtRef.current = 0;
  }, []);

  useEffect(() => {
    if (
      !options.hydrated
      || !options.settings.calculatorMemoryEnabled
      || options.settings.calculatorMemoryAutosaveMode !== 'interval'
    ) {
      return;
    }

    const intervalMs = Math.max(
      options.settings.calculatorMemoryAutosaveIntervalSeconds * 1000,
      CALCULATOR_MEMORY_MIN_WRITE_INTERVAL_MS,
    );
    const timer = window.setInterval(() => {
      flush();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [
    flush,
    options.hydrated,
    options.settings.calculatorMemoryAutosaveIntervalSeconds,
    options.settings.calculatorMemoryAutosaveMode,
    options.settings.calculatorMemoryEnabled,
  ]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      flush(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (calculatorMemorySaveTimerRef.current !== null) {
        window.clearTimeout(calculatorMemorySaveTimerRef.current);
        calculatorMemorySaveTimerRef.current = null;
      }
      flush(true);
    };
  }, [flush]);

  return {
    markDirty,
    flush,
    restoreFromSnapshot,
    cancelScheduledSave,
    noteMemoryCleared,
  };
}
