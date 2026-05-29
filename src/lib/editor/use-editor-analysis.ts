import { useEffect, useState } from 'react';
import {
  EditorAnalysisRuntime,
  type EditorAnalysisSnapshot,
} from './editor-analysis-runtime';
import {
  useEditorAnalysisControl,
  type EditorAnalysisControlState,
} from './editor-analysis-control';
import type { EditorAnalysisOoeConfig } from './editor-analysis-ooe';

type UseEditorAnalysisOptions<T> = {
  source: string;
  initialValue: T;
  analyze: (source: string) => T;
  analysisKey?: string;
  debounceMs?: number;
  maxLatexLength?: number;
  controlState?: EditorAnalysisControlState;
  ooe?: Omit<EditorAnalysisOoeConfig, 'generation'>;
};

export function useEditorAnalysis<T>({
  source,
  initialValue,
  analyze,
  analysisKey = '',
  debounceMs,
  maxLatexLength,
  controlState,
  ooe,
}: UseEditorAnalysisOptions<T>): EditorAnalysisSnapshot<T> {
  const contextControl = useEditorAnalysisControl();
  const analysisControl = controlState ?? contextControl;
  const ooeLane = ooe?.lane;
  const ooeContextKey = ooe?.contextKey;
  const [runtime] = useState(
    () =>
      new EditorAnalysisRuntime<T>({
        source,
        initialValue,
        debounceMs,
        maxLatexLength,
        analyze,
        ooe: ooeLane
          ? {
              lane: ooeLane,
              contextKey: ooeContextKey,
              generation: analysisControl.generation,
            }
          : undefined,
      }),
  );

  const [snapshot, setSnapshot] = useState(() => runtime.getSnapshot());

  useEffect(() => {
    return runtime.subscribe(setSnapshot);
  }, [runtime]);

  useEffect(() => {
    runtime.setAnalyzer(analyze);
    runtime.setOoeConfig(ooeLane
      ? {
          lane: ooeLane,
          contextKey: ooeContextKey,
          generation: analysisControl.generation,
        }
      : undefined);
    if (analysisControl.stopped) {
      runtime.updateSource(source, { force: true });
      runtime.stop();
      return;
    }

    runtime.restart(source);
  }, [
    analysisControl.generation,
    analysisControl.stopped,
    analysisKey,
    analyze,
    ooeContextKey,
    ooeLane,
    runtime,
    source,
  ]);

  useEffect(() => {
    return () => runtime.dispose();
  }, [runtime]);

  return snapshot;
}
