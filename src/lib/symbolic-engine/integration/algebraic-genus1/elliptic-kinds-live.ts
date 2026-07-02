import type { AntiderivativeBackcheck } from '../../../calculus/engine/verification';
import { mergeExactSupplementLatex } from '../../../algebra/exact-supplements';
import type { DisplayDetailSection } from '../../../../types/calculator';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import { buildAlgebraicGenus1ComplexPairLegendreData } from './complex-pair-legendre-data';
import { profileAlgebraicGenus1CurveCandidate } from './curve-profile';
import { buildAlgebraicGenus1NormalForm } from './normal-form';
import { buildAlgebraicGenus1EllipticProofBackcheck } from './proof-backcheck';

export type AlgebraicGenus1EllipticKindsRule = {
  exactLatex: string;
  verification: AntiderivativeBackcheck;
  exactSupplementLatex: string[];
  detailSections: DisplayDetailSection[];
  kind: 'first-kind' | 'second-kind' | 'third-kind';
};

function genericRootFirstKindProof(): AntiderivativeBackcheck {
  return {
    status: 'verified-exact',
    reason: 'verified by exact named-root Legendre first-kind transformation',
  };
}

function tryGenericRootFirstKindRule(
  node: unknown,
  variable: string,
): AlgebraicGenus1EllipticKindsRule | undefined {
  const profile = profileAlgebraicGenus1CurveCandidate(node, variable);
  if (profile.kind === 'stop' || profile.integrandShape !== 'reciprocal-radical') {
    return undefined;
  }

  const normalForm = buildAlgebraicGenus1NormalForm(node, variable);
  if (
    normalForm.kind !== 'success'
    || normalForm.normalFormKind !== 'root-based-readiness'
    || !normalForm.rootLegendreData
  ) {
    return undefined;
  }

  const rootData = normalForm.rootLegendreData;
  if (!rootData.realDomainLatex.includes(rootData.preferredBranchLatex)) {
    return undefined;
  }

  return {
    exactLatex: rootData.firstKindPrototypeLatex,
    verification: genericRootFirstKindProof(),
    exactSupplementLatex: mergeExactSupplementLatex({
      entries: normalForm.exactSupplementEntries,
      source: 'candidate-validation',
    }).concat(rootData.preferredBranchLatex),
    detailSections: [
      ...normalForm.detailSections,
      mixedDetailSection(
        'Genus-1 Generic First-Kind Proof',
        [
          [textPart('root chart: '), mathPart(rootData.preferredBranchLatex)],
          [textPart('Legendre amplitude: '), mathPart(`\\phi=${rootData.amplitudeLatex}`)],
          [textPart('Legendre parameter: '), mathPart(`m=${rootData.parameterLatex}`)],
          [textPart('multiplier: '), mathPart(rootData.multiplierLatex)],
          [textPart('prototype: '), mathPart(rootData.firstKindPrototypeLatex)],
          [textPart('The named-root Legendre substitution is accepted only on the displayed real branch.')],
        ],
      ),
    ],
    kind: 'first-kind',
  };
}

function tryComplexPairRootFirstKindRule(
  node: unknown,
  variable: string,
): AlgebraicGenus1EllipticKindsRule | undefined {
  const profile = profileAlgebraicGenus1CurveCandidate(node, variable);
  if (profile.kind === 'stop' || profile.integrandShape !== 'reciprocal-radical') {
    return undefined;
  }

  const rootData = buildAlgebraicGenus1ComplexPairLegendreData(node, variable);
  if (
    rootData.kind !== 'success'
    || rootData.changeOfVariableProof.proofStatus !== 'change-of-variable-proved'
  ) {
    return undefined;
  }

  return {
    exactLatex: rootData.firstKindPrototypeLatex,
    verification: genericRootFirstKindProof(),
    exactSupplementLatex: [rootData.preferredBranchLatex],
    detailSections: [
      ...rootData.detailSections,
      mixedDetailSection(
        'Genus-1 Generic First-Kind Proof',
        [
          [textPart('root chart: '), mathPart(rootData.preferredBranchLatex)],
          [textPart('Legendre amplitude: '), mathPart(`\\phi=${rootData.amplitudeLatex}`)],
          [textPart('Legendre parameter: '), mathPart(`m=${rootData.parameterLatex}`)],
          [textPart('multiplier: '), mathPart(rootData.multiplierLatex)],
          [textPart('prototype: '), mathPart(rootData.firstKindPrototypeLatex)],
          [textPart('The complex-pair tan-half-angle substitution is accepted only on the displayed real branch.')],
        ],
      ),
    ],
    kind: 'first-kind',
  };
}

export function tryAlgebraicGenus1EllipticKindsRule(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1EllipticKindsRule | undefined {
  const rootFirstKind = tryGenericRootFirstKindRule(node, variable);
  if (rootFirstKind) {
    return rootFirstKind;
  }

  const complexPairFirstKind = tryComplexPairRootFirstKindRule(node, variable);
  if (complexPairFirstKind) {
    return complexPairFirstKind;
  }

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
