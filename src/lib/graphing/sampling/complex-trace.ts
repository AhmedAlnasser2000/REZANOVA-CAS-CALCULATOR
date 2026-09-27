import { createComplexNumericEvaluator } from '../../equation/complex-domain-public';

export type GraphComplexTraceValue = { re: number; im: number; magnitude: number; phase: number };

/**
 * Exact-point readback for complex mapping traces through the reviewed public
 * complex evaluator. Trace never reads GPU pixels or coarse tile samples.
 */
export function createGraphComplexTraceEvaluator(
  mathJson: unknown,
  parameters: Readonly<Record<string, number>>,
): (z: { re: number; im: number }) => GraphComplexTraceValue | null {
  const evaluator = createComplexNumericEvaluator({ expressionMathJson: mathJson, target: 'z', parameters: { ...parameters } });
  return (z) => {
    const result = evaluator.evaluateAt(z);
    if (result.status !== 'finite' || !result.value) return null;
    const { re, im } = result.value;
    return { re, im, magnitude: Math.hypot(re, im), phase: re === 0 && im === 0 ? 0 : Math.atan2(im, re) };
  };
}
