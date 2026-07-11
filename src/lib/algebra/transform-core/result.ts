import { mergeExactSupplementLatex } from '../exact-supplements';
import { boxLatex } from '../../symbolic-engine/patterns';
import type { TransformBadge } from '../../../types/calculator';
import type { AlgebraTransformResult, TransformSideResult } from './types';
import { profileSharedAlgebraResult } from '../../display/printer';

export function buildTwoSideEquationResult(
  left: unknown,
  right: unknown,
  leftResult: TransformSideResult | null,
  rightResult: TransformSideResult | null,
  transformBadges: TransformBadge[],
  transformSummaryText: string,
  transformSummaryLatex?: string,
): AlgebraTransformResult | null {
  if (!leftResult && !rightResult) {
    return null;
  }

  return profileSharedAlgebraResult({
    exactLatex: `${leftResult?.latex ?? boxLatex(left)}=${rightResult?.latex ?? boxLatex(right)}`,
    exactSupplementLatex: mergeExactSupplementLatex(
      { latex: leftResult?.supplement, source: 'legacy' },
      { latex: rightResult?.supplement, source: 'legacy' },
    ),
    transformBadges,
    transformSummaryText,
    transformSummaryLatex,
  });
}
