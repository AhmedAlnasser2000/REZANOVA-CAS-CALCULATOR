import type { AntiderivativeBackcheck } from '../../../calculus/engine/verification';
import { mergeExactSupplementLatex } from '../../../algebra/exact-supplements';
import type { DisplayDetailSection } from '../../../../types/calculator';
import { buildAlgebraicGenus1EllipticProofBackcheck } from './proof-backcheck';

export type AlgebraicGenus1EllipticKindsRule = {
  exactLatex: string;
  verification: AntiderivativeBackcheck;
  exactSupplementLatex: string[];
  detailSections: DisplayDetailSection[];
  kind: 'first-kind' | 'second-kind' | 'third-kind';
};

export function tryAlgebraicGenus1EllipticKindsRule(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1EllipticKindsRule | undefined {
  const proof = buildAlgebraicGenus1EllipticProofBackcheck(node, variable);
  if (
    proof.kind !== 'success'
    || proof.proofStatus !== 'template-proved'
    || proof.proofObligations.length !== 1
  ) {
    return undefined;
  }

  const obligation = proof.proofObligations[0];
  if (!obligation.prototypeAntiderivativeLatex) {
    return undefined;
  }

  return {
    exactLatex: obligation.prototypeAntiderivativeLatex,
    verification: {
      status: 'verified-exact',
      reason: 'verified by internal genus-1 elliptic template proof backcheck',
    },
    exactSupplementLatex: mergeExactSupplementLatex({
      entries: proof.exactSupplementEntries,
      source: 'candidate-validation',
    }),
    detailSections: proof.detailSections,
    kind: obligation.basisKind,
  };
}
