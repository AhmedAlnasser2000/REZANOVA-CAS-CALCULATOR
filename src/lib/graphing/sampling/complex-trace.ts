import { createComplexNumericEvaluator } from '../../equation/complex-domain-public';
import { graphRealLogConvention } from './real-log-convention';

export type GraphComplexTraceValue = { re: number; im: number; magnitude: number; phase: number };

/**
 * Exact-point readback for complex traces through the reviewed public complex
 * evaluator. Trace never reads GPU pixels or coarse tile samples. `target: 'x'`
 * evaluates a real curve y = f(x) at complex points with the real curve's
 * conventions (log is base 10), for its opt-in Re/Im values.
 */
export function createGraphComplexTraceEvaluator(
  mathJson: unknown,
  parameters: Readonly<Record<string, number>>,
  options: { target?: 'z' | 'x' } = {},
): (z: { re: number; im: number }) => GraphComplexTraceValue | null {
  const realCurve = options.target === 'x';
  const evaluator = createComplexNumericEvaluator({
    expressionMathJson: realCurve ? graphRealLogConvention(mathJson) : mathJson,
    target: options.target ?? 'z',
    parameters: { ...parameters },
  });
  return (z) => {
    const result = evaluator.evaluateAt(z);
    if (result.status !== 'finite' || !result.value) return null;
    const { re, im } = result.value;
    return { re, im, magnitude: Math.hypot(re, im), phase: re === 0 && im === 0 ? 0 : Math.atan2(im, re) };
  };
}
