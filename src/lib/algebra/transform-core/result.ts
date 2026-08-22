import { mergeExactSupplementLatex } from '../exact-supplements';
import { boxLatex } from '../../symbolic-engine/patterns';
import type { TransformBadge } from '../../../types/calculator';
import type { AlgebraTransformResult, TransformSideResult } from './types';
import { profileSharedAlgebraResult } from '../../display/printer';
import { mergeSolveDomainConstraints } from '../radical-core';
import type { SerializableMathJson } from '../../../types/calculator';

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
    exactMathJson: [
      'Equal',
      leftResult?.node ?? left,
      rightResult?.node ?? right,
    ] as SerializableMathJson,
    exactSupplementLatex: mergeExactSupplementLatex(
      { latex: leftResult?.supplement, source: 'legacy' },
      { latex: rightResult?.supplement, source: 'legacy' },
    ),
    domainConstraints: mergeSolveDomainConstraints(
      leftResult?.constraints,
      rightResult?.constraints,
    ),
    transformBadges,
    transformSummaryText,
    transformSummaryLatex,
  });
}
