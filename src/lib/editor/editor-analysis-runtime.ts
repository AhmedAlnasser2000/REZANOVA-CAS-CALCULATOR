import {
  buildEditorAnalysisOoeSnapshot,
  runEditorAnalysisWithOoeBudget,
  shouldCommitEditorAnalysis,
  type EditorAnalysisOoeConfig,
} from './editor-analysis-ooe';

export const EDITOR_ANALYSIS_DEBOUNCE_MS = 180;
export const EDITOR_ANALYSIS_MAX_LATEX_LENGTH = 5000;

export type EditorAnalysisStatus =
  | 'idle'
  | 'analyzing'
  | 'ready'
  | 'stopped'
  | 'guarded'
  | 'error';

export type EditorAnalysisSnapshot<T> = {
  value: T;
  status: EditorAnalysisStatus;
  source: string;
  analyzedSource: string;
  stale: boolean;
  message?: string;
};

type TimerId = ReturnType<typeof setTimeout>;

type TimerApi = {
  setTimeout: (callback: () => void, delayMs: number) => TimerId;
  clearTimeout: (timer: TimerId) => void;
};

export type EditorAnalysisRuntimeOptions<T> = {
  source: string;
  initialValue: T;
  analyze: (source: string) => T;
  debounceMs?: number;
  maxLatexLength?: number;
  timers?: TimerApi;
  ooe?: EditorAnalysisOoeConfig;
};

export type EditorAnalysisRuntimeListener<T> = (
  snapshot: EditorAnalysisSnapshot<T>,
) => void;

const defaultTimers: TimerApi = {
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: (timer) => clearTimeout(timer),
};

function guardedMessage(maxLatexLength: number) {
  return `Editor analysis paused for inputs over ${maxLatexLength} characters.`;
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'Editor analysis failed.';
}

export class EditorAnalysisRuntime<T> {
  private analyze: (source: string) => T;

  private ooe?: EditorAnalysisOoeConfig;

  private readonly debounceMs: number;

  private readonly maxLatexLength: number;

  private readonly timers: TimerApi;

  private readonly initialValue: T;

  private timer: TimerId | null = null;

  private stopped = false;

  private snapshot: EditorAnalysisSnapshot<T>;

  private listeners = new Set<EditorAnalysisRuntimeListener<T>>();

  constructor(options: EditorAnalysisRuntimeOptions<T>) {
    this.analyze = options.analyze;
    this.ooe = options.ooe;
    this.initialValue = options.initialValue;
    this.debounceMs = options.debounceMs ?? EDITOR_ANALYSIS_DEBOUNCE_MS;
    this.maxLatexLength = options.maxLatexLength ?? EDITOR_ANALYSIS_MAX_LATEX_LENGTH;
    this.timers = options.timers ?? defaultTimers;
    this.snapshot = {
      value: options.initialValue,
      status: options.source ? 'analyzing' : 'idle',
      source: options.source,
      analyzedSource: '',
      stale: Boolean(options.source),
    };

    if (options.source) {
      this.schedule();
    }
  }

  getSnapshot() {
    return this.snapshot;
  }

  subscribe(listener: EditorAnalysisRuntimeListener<T>) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setAnalyzer(analyze: (source: string) => T) {
    this.analyze = analyze;
  }

  setOoeConfig(ooe?: EditorAnalysisOoeConfig) {
    this.ooe = ooe;
  }

  updateSource(source: string, options?: { force?: boolean }) {
    if (!options?.force && source === this.snapshot.source) {
      return;
    }

    this.snapshot = {
      ...this.snapshot,
      source,
      status: source ? 'analyzing' : 'idle',
      stale: Boolean(source && source !== this.snapshot.analyzedSource),
      message: undefined,
    };

    if (!source) {
      this.cancelTimer();
      this.snapshot = {
        ...this.snapshot,
        value: this.initialValue,
        status: 'idle',
        stale: false,
        analyzedSource: '',
      };
      this.emit();
      return;
    }

    if (this.stopped) {
      this.cancelTimer();
      this.snapshot = {
        ...this.snapshot,
        status: 'stopped',
        stale: source !== this.snapshot.analyzedSource,
        message: 'Editor analysis is stopped.',
      };
      this.emit();
      return;
    }

    if (source.length > this.maxLatexLength) {
      this.cancelTimer();
      this.snapshot = {
        ...this.snapshot,
        status: 'guarded',
        stale: source !== this.snapshot.analyzedSource,
        message: guardedMessage(this.maxLatexLength),
      };
      this.emit();
      return;
    }

    this.emit();
    this.schedule();
  }

  stop() {
    this.stopped = true;
    this.cancelTimer();
    this.snapshot = {
      ...this.snapshot,
      status: 'stopped',
      stale: this.snapshot.source !== this.snapshot.analyzedSource,
      message: 'Editor analysis is stopped.',
    };
    this.emit();
  }

  restart(source = this.snapshot.source) {
    this.stopped = false;
    this.updateSource(source, { force: true });
  }

  dispose() {
    this.cancelTimer();
    this.listeners.clear();
  }

  private schedule() {
    this.cancelTimer();
    this.timer = this.timers.setTimeout(() => {
      this.timer = null;
      this.runNow();
    }, this.debounceMs);
  }

  private runNow() {
    const source = this.snapshot.source;
    if (!source) {
      this.snapshot = {
        ...this.snapshot,
        value: this.initialValue,
        status: 'idle',
        analyzedSource: '',
        stale: false,
        message: undefined,
      };
      this.emit();
      return;
    }

    if (this.stopped) {
      this.snapshot = {
        ...this.snapshot,
        status: 'stopped',
        stale: source !== this.snapshot.analyzedSource,
        message: 'Editor analysis is stopped.',
      };
      this.emit();
      return;
    }

    if (source.length > this.maxLatexLength) {
      this.snapshot = {
        ...this.snapshot,
        status: 'guarded',
        stale: source !== this.snapshot.analyzedSource,
        message: guardedMessage(this.maxLatexLength),
      };
      this.emit();
      return;
    }

    if (this.ooe) {
      this.runOoeBudgetedAnalysis(source);
      return;
    }

    try {
      const value = this.analyze(source);
      this.snapshot = {
        value,
        status: 'ready',
        source,
        analyzedSource: source,
        stale: false,
        message: undefined,
      };
    } catch (error) {
      this.snapshot = {
        ...this.snapshot,
        status: 'error',
        stale: source !== this.snapshot.analyzedSource,
        message: errorMessage(error),
      };
    }

    this.emit();
  }

  private runOoeBudgetedAnalysis(source: string) {
    const ooe = this.ooe;
    if (!ooe) {
      return;
    }

    void runEditorAnalysisWithOoeBudget({
      ...ooe,
      source,
      analyze: this.analyze,
      getActiveSnapshot: () => {
        if (this.stopped || !this.ooe || !this.snapshot.source) {
          return null;
        }
        return buildEditorAnalysisOoeSnapshot({
          ...this.ooe,
          source: this.snapshot.source,
        });
      },
    })
      .then((envelope) => {
        if (!shouldCommitEditorAnalysis(envelope.ooe)) {
          return;
        }

        this.snapshot = {
          value: envelope.payload,
          status: 'ready',
          source,
          analyzedSource: source,
          stale: false,
          message: undefined,
        };
        this.emit();
      })
      .catch((error: unknown) => {
        if (this.stopped || this.snapshot.source !== source) {
          return;
        }

        this.snapshot = {
          ...this.snapshot,
          status: 'error',
          stale: source !== this.snapshot.analyzedSource,
          message: errorMessage(error),
        };
        this.emit();
      });
  }

  private cancelTimer() {
    if (this.timer !== null) {
      this.timers.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private emit() {
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }
}
