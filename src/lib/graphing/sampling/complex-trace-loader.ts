import type { createGraphComplexTraceEvaluator } from './complex-trace';

export type { GraphComplexTraceValue } from './complex-trace';

/** Complex trace evaluation is loaded on demand, like the Graph renderers. */
export async function loadGraphComplexTraceEvaluator(): Promise<typeof createGraphComplexTraceEvaluator> {
  const trace = await import('./complex-trace');
  return trace.createGraphComplexTraceEvaluator;
}
