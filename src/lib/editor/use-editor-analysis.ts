import { useEffect, useState } from 'react';
import {
  EditorAnalysisRuntime,
  type EditorAnalysisSnapshot,
} from './editor-analysis-runtime';

type UseEditorAnalysisOptions<T> = {
  source: string;
  initialValue: T;
  analyze: (source: string) => T;
  analysisKey?: string;
  debounceMs?: number;
  maxLatexLength?: number;
};

export function useEditorAnalysis<T>({
  source,
  initialValue,
  analyze,
  analysisKey = '',
  debounceMs,
  maxLatexLength,
}: UseEditorAnalysisOptions<T>): EditorAnalysisSnapshot<T> {
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
    runtime.updateSource(source, { force: true });
  }, [analysisKey, analyze, runtime, source]);

  useEffect(() => {
    return () => runtime.dispose();
  }, [runtime]);

  return snapshot;
}
