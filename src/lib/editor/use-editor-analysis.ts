import { useEffect, useState } from 'react';
import {
  EditorAnalysisRuntime,
  type EditorAnalysisSnapshot,
} from './editor-analysis-runtime';
import {
  useEditorAnalysisControl,
  type EditorAnalysisControlState,
} from './editor-analysis-control';

type UseEditorAnalysisOptions<T> = {
  source: string;
  initialValue: T;
  analyze: (source: string) => T;
  analysisKey?: string;
  debounceMs?: number;
  maxLatexLength?: number;
  controlState?: EditorAnalysisControlState;
};

export function useEditorAnalysis<T>({
  source,
  initialValue,
  analyze,
  analysisKey = '',
  debounceMs,
  maxLatexLength,
  controlState,
}: UseEditorAnalysisOptions<T>): EditorAnalysisSnapshot<T> {
  const contextControl = useEditorAnalysisControl();
  const analysisControl = controlState ?? contextControl;
  const [runtime] = useState(
    () =>
      new EditorAnalysisRuntime<T>({
        source,
        initialValue,
        debounceMs,
        maxLatexLength,
        analyze,
      }),
  );

  const [snapshot, setSnapshot] = useState(() => runtime.getSnapshot());

  useEffect(() => {
    return runtime.subscribe(setSnapshot);
  }, [runtime]);

  useEffect(() => {
    runtime.setAnalyzer(analyze);
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
    runtime,
    source,
  ]);

  useEffect(() => {
    return () => runtime.dispose();
  }, [runtime]);

  return snapshot;
}
