import { useEffect, useRef, useState } from 'react';
import {
  EDITOR_ANALYSIS_DEBOUNCE_MS,
  EDITOR_ANALYSIS_MAX_LATEX_LENGTH,
  type EditorAnalysisSnapshot,
} from './editor-analysis-runtime';
import type { EditorAnalysisControlState } from './editor-analysis-control';
import {
  buildEditorAnalysisOoeSnapshot,
  runEditorAnalysisWithOoeBudget,
  shouldCommitEditorAnalysis,
  type EditorAnalysisOoeConfig,
} from './editor-analysis-ooe';

type UseAsyncEditorAnalysisOptions<T> = {
  source: string;
  initialValue: T;
  analyze: (source: string) => Promise<T>;
  analysisKey?: string;
  debounceMs?: number;
  maxLatexLength?: number;
  controlState?: EditorAnalysisControlState;
  ooe?: Omit<EditorAnalysisOoeConfig, 'generation'>;
};

function guardedMessage(maxLatexLength: number) {
  return `Editor analysis paused for inputs over ${maxLatexLength} characters.`;
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'Editor analysis failed.';
}

export function useAsyncEditorAnalysis<T>({
  source,
  initialValue,
  analyze,
  analysisKey = '',
  debounceMs = EDITOR_ANALYSIS_DEBOUNCE_MS,
  maxLatexLength = EDITOR_ANALYSIS_MAX_LATEX_LENGTH,
  controlState,
  ooe,
}: UseAsyncEditorAnalysisOptions<T>): EditorAnalysisSnapshot<T> {
  const initialValueRef = useRef(initialValue);
  const ooeLane = ooe?.lane;
  const ooeContextKey = ooe?.contextKey;
  const activeRef = useRef({
    source,
    analysisKey,
    generation: controlState?.generation ?? 0,
    stopped: Boolean(controlState?.stopped),
  });
  const [snapshot, setSnapshot] = useState<EditorAnalysisSnapshot<T>>({
    value: initialValue,
    status: source ? 'analyzing' : 'idle',
    source,
    analyzedSource: '',
    stale: Boolean(source),
  });

  useEffect(() => {
    activeRef.current = {
      source,
      analysisKey,
      generation: controlState?.generation ?? 0,
      stopped: Boolean(controlState?.stopped),
    };
  }, [analysisKey, controlState?.generation, controlState?.stopped, source]);

  useEffect(() => {
    let cancelled = false;
    const generation = controlState?.generation ?? 0;

    if (!source) {
      setSnapshot({
        value: initialValueRef.current,
        status: 'idle',
        source,
        analyzedSource: '',
        stale: false,
      });
      return () => {
        cancelled = true;
      };
    }

    if (controlState?.stopped) {
      setSnapshot((previous) => ({
        ...previous,
        source,
        status: 'stopped',
        stale: source !== previous.analyzedSource,
        message: 'Editor analysis is stopped.',
      }));
      return () => {
        cancelled = true;
      };
    }

    if (source.length > maxLatexLength) {
      setSnapshot((previous) => ({
        ...previous,
        source,
        status: 'guarded',
        stale: source !== previous.analyzedSource,
        message: guardedMessage(maxLatexLength),
      }));
      return () => {
        cancelled = true;
      };
    }

    setSnapshot((previous) => ({
      ...previous,
      source,
      status: 'analyzing',
      stale: source !== previous.analyzedSource,
      message: undefined,
    }));

    const timer = setTimeout(() => {
      const runAnalysis = ooeLane
        ? runEditorAnalysisWithOoeBudget<T>({
            lane: ooeLane,
            contextKey: ooeContextKey,
            generation,
            source,
            analyze,
            getActiveSnapshot: () => {
              const active = activeRef.current;
              if (active.stopped || !active.source) {
                return null;
              }
              return buildEditorAnalysisOoeSnapshot({
                lane: ooeLane,
                contextKey: ooeContextKey,
                generation: active.generation,
                source: active.source,
              });
            },
          })
        : analyze(source).then((value) => ({
            payload: value,
            ooe: null,
          }));

      void runAnalysis
        .then((envelope) => {
          if (cancelled) {
            return;
          }

          if (envelope.ooe && !shouldCommitEditorAnalysis(envelope.ooe)) {
            return;
          }

          setSnapshot({
            value: envelope.payload,
            status: 'ready',
            source,
            analyzedSource: source,
            stale: false,
          });
        })
        .catch((error: unknown) => {
          if (cancelled) {
            return;
          }

          setSnapshot((previous) => ({
            ...previous,
            source,
            status: 'error',
            stale: true,
            message: errorMessage(error),
          }));
        });
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    analysisKey,
    analyze,
    controlState?.generation,
    controlState?.stopped,
    debounceMs,
    maxLatexLength,
    ooeContextKey,
    ooeLane,
    source,
  ]);

  return snapshot;
}
