import type { createGraphComplexTraceEvaluator } from './complex-trace';

export type { GraphComplexTraceValue } from './complex-trace';

/** Complex trace evaluation is loaded on demand, like the Graph renderers. */
export async function loadGraphComplexTraceEvaluator(): Promise<typeof createGraphComplexTraceEvaluator> {
  const trace = await import('./complex-trace');
  return trace.createGraphComplexTraceEvaluator;
}

export type { GraphComplexRoot, GraphComplexRootsSolution } from './complex-roots';

/** The root solver the worker samples with, loaded on demand for the Complex pane's labels. */
export async function loadGraphComplexRootsSolver(): Promise<typeof import('./complex-roots').solveGraphComplexRoots> {
  const roots = await import('./complex-roots');
  return roots.solveGraphComplexRoots;
}
