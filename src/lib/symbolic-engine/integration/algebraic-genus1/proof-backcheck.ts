import { boxLatex } from '../../patterns';
import type { DisplayDetailSection } from '../../../../types/calculator';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import {
  certificateProofNodeLatex,
  differentiateForCertificateProof,
  type CertificateDifferentiationResult,
} from '../transcendental-certificate/proof-diff';
import {
  reduceAlgebraicGenus1DifferentialBasis,
  type AlgebraicGenus1DifferentialBasisReductionResult,
  type AlgebraicGenus1EllipticBasisObligation,
} from './differential-basis';

export type AlgebraicGenus1EllipticProofStatus =
  | 'template-proved'
  | 'readiness-only';

export type AlgebraicGenus1EllipticProofBackcheckResult =
  | {
      kind: 'success';
      variable: string;
      proofStatus: AlgebraicGenus1EllipticProofStatus;
      basisReduction: Extract<AlgebraicGenus1DifferentialBasisReductionResult, { kind: 'success' }>;
      proofObligations: AlgebraicGenus1EllipticProofObligation[];
      exactSupplementEntries: Extract<
        AlgebraicGenus1DifferentialBasisReductionResult,
        { kind: 'success' }
      >['exactSupplementEntries'];
      detailSections: DisplayDetailSection[];
      readinessNotes: string[];
    }
  | {
      kind: 'stop';
      variable: string;
      reason:
        | 'basis-reduction-stop'
        | 'missing-prototype-antiderivative'
        | 'proof-differentiation-stop'
        | 'unsupported-proof-template';
      basisReduction: AlgebraicGenus1DifferentialBasisReductionResult;
      detail: string;
      proofDifferentiation?: CertificateDifferentiationResult;
    };

export type AlgebraicGenus1EllipticProofObligation = {
  basisKind: AlgebraicGenus1EllipticBasisObligation['kind'];
  head?: AlgebraicGenus1EllipticBasisObligation['head'];
  proofStatus: AlgebraicGenus1EllipticProofStatus;
  prototypeAntiderivativeLatex?: string;
  derivativeLatex?: string;
  expectedIntegrandLatex?: string;
  proofReason: string;
  proofDifferentiation?: CertificateDifferentiationResult;
};

function templateMatches(
  sourceNormalFormKind: string,
  obligation: AlgebraicGenus1EllipticBasisObligation,
) {
  return (
    (sourceNormalFormKind === 'legendre-first-kind'
      && obligation.kind === 'first-kind'
      && obligation.head === 'EllipticF')
    || (sourceNormalFormKind === 'legendre-second-kind'
      && obligation.kind === 'second-kind'
      && obligation.head === 'EllipticE')
    || (sourceNormalFormKind === 'legendre-third-kind'
      && obligation.kind === 'third-kind'
      && obligation.head === 'EllipticPi')
  );
}

function proofLineParts(obligation: AlgebraicGenus1EllipticProofObligation) {
  return [
    textPart(`${obligation.basisKind}: ${obligation.proofStatus}`),
    ...(obligation.prototypeAntiderivativeLatex
      ? [
          textPart('; prototype '),
          mathPart(obligation.prototypeAntiderivativeLatex),
        ]
      : []),
    ...(obligation.derivativeLatex
      ? [
          textPart('; derivative '),
          mathPart(obligation.derivativeLatex),
        ]
      : []),
  ];
}

export function buildAlgebraicGenus1EllipticProofBackcheck(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1EllipticProofBackcheckResult {
  const basisReduction = reduceAlgebraicGenus1DifferentialBasis(node, variable);
  if (basisReduction.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'basis-reduction-stop',
      basisReduction,
      detail: basisReduction.detail ?? 'Genus-1 differential-basis reduction stopped.',
    };
  }

  if (basisReduction.status !== 'legendre-template-reduced') {
    const proofObligations = basisReduction.basisObligations.map((obligation) => ({
      basisKind: obligation.kind,
      head: obligation.head,
      proofStatus: 'readiness-only' as const,
      proofReason: obligation.note,
    }));

    return {
      kind: 'success',
      variable,
      proofStatus: 'readiness-only',
      basisReduction,
      proofObligations,
      exactSupplementEntries: basisReduction.exactSupplementEntries,
      detailSections: [
        ...basisReduction.detailSections,
        {
          title: 'Genus-1 Elliptic Proof Backcheck',
          lines: [
            'Generic exact/symbolic genus-1 curves remain proof-readiness only until root normalization and branch formulas are live.',
          ],
        },
      ],
      readinessNotes: [
        ...basisReduction.readinessNotes,
        'Elliptic proof backcheck is readiness-only for this non-template curve.',
      ],
    };
  }

  const proofObligations: AlgebraicGenus1EllipticProofObligation[] = [];
  for (const obligation of basisReduction.basisObligations) {
    if (!templateMatches(basisReduction.sourceNormalFormKind, obligation)) {
      return {
        kind: 'stop',
        variable,
        reason: 'unsupported-proof-template',
        basisReduction,
        detail: `No exact proof template is registered for ${basisReduction.sourceNormalFormKind}.`,
      };
    }

    if (obligation.prototypeAntiderivativeNode === undefined) {
      return {
        kind: 'stop',
        variable,
        reason: 'missing-prototype-antiderivative',
        basisReduction,
        detail: 'The reduced elliptic obligation did not carry a prototype antiderivative node.',
      };
    }

    const proofDifferentiation = differentiateForCertificateProof(
      obligation.prototypeAntiderivativeNode,
      variable,
    );
    if (proofDifferentiation.kind === 'stop') {
      return {
        kind: 'stop',
        variable,
        reason: 'proof-differentiation-stop',
        basisReduction,
        detail: proofDifferentiation.detail,
        proofDifferentiation,
      };
    }

    proofObligations.push({
      basisKind: obligation.kind,
      head: obligation.head,
      proofStatus: 'template-proved',
      prototypeAntiderivativeLatex: obligation.prototypeAntiderivativeLatex,
      derivativeLatex: certificateProofNodeLatex(proofDifferentiation.derivativeNode),
      expectedIntegrandLatex: boxLatex(node),
      proofReason:
        'The canonical Legendre template differentiates exactly to the input integrand with Compute Engine fallback denied.',
      proofDifferentiation,
    });
  }

  return {
    kind: 'success',
    variable,
    proofStatus: 'template-proved',
    basisReduction,
    proofObligations,
    exactSupplementEntries: basisReduction.exactSupplementEntries,
    detailSections: [
      ...basisReduction.detailSections,
      mixedDetailSection(
        'Genus-1 Elliptic Proof Backcheck',
        [
          ...proofObligations.map(proofLineParts),
          [textPart('Proof-local differentiation used the internal elliptic derivative rules with Compute Engine fallback denied.')],
        ],
      ),
    ],
    readinessNotes: [
      ...basisReduction.readinessNotes,
      'Canonical Legendre elliptic obligations now carry proof-local backcheck evidence.',
    ],
  };
}
