import type { ExactSupplementEntry } from '../../../../types/calculator/exact-supplement-types';
import type { EllipticFunctionHead } from './elliptic-functions';
import {
  buildAlgebraicGenus1NormalForm,
  type AlgebraicGenus1NormalFormKind,
  type AlgebraicGenus1NormalFormResult,
} from './normal-form';

export type AlgebraicGenus1EllipticBasisKind =
  | 'first-kind'
  | 'second-kind'
  | 'third-kind';

export type AlgebraicGenus1DifferentialReductionStatus =
  | 'legendre-template-reduced'
  | 'root-based-readiness'
  | 'symbolic-readiness';

export type AlgebraicGenus1EllipticBasisObligation = {
  kind: AlgebraicGenus1EllipticBasisKind;
  head?: EllipticFunctionHead;
  status: 'reduced' | 'pending-root-normalization' | 'pending-symbolic-branching';
  prototypeAntiderivativeLatex?: string;
  amplitudeLatex?: string;
  parameterLatex?: string;
  characteristicLatex?: string;
  note: string;
};

export type AlgebraicGenus1DifferentialBasisReductionResult =
  | {
      kind: 'success';
      variable: string;
      status: AlgebraicGenus1DifferentialReductionStatus;
      sourceNormalFormKind: AlgebraicGenus1NormalFormKind;
      basisObligations: AlgebraicGenus1EllipticBasisObligation[];
      rationalResidualsLatex: string[];
      logarithmicResidualsLatex: string[];
      exactSupplementEntries: ExactSupplementEntry[];
      detailSections: { title: string; lines: string[] }[];
      readinessNotes: string[];
    }
  | {
      kind: 'stop';
      variable: string;
      reason: 'normal-form-stop' | 'unsupported-basis-reduction';
      normalForm?: AlgebraicGenus1NormalFormResult;
      detail?: string;
    };

function basisKindForHead(head: EllipticFunctionHead): AlgebraicGenus1EllipticBasisKind {
  if (head === 'EllipticE') {
    return 'second-kind';
  }
  if (head === 'EllipticPi') {
    return 'third-kind';
  }
  return 'first-kind';
}

function legendreBasisNote(kind: AlgebraicGenus1EllipticBasisKind) {
  if (kind === 'first-kind') {
    return 'The differential is already in Legendre first-kind form.';
  }
  if (kind === 'second-kind') {
    return 'The differential is already in Legendre second-kind form.';
  }
  return 'The differential is already in Legendre third-kind form.';
}

function basisLine(obligation: AlgebraicGenus1EllipticBasisObligation) {
  const pieces = [
    `${obligation.kind}: ${obligation.status}`,
    obligation.prototypeAntiderivativeLatex ? `prototype ${obligation.prototypeAntiderivativeLatex}` : undefined,
  ].filter(Boolean);
  return pieces.join('\\quad ');
}

function legendreTemplateReduction(
  normalForm: Extract<AlgebraicGenus1NormalFormResult, { kind: 'success' }>,
) {
  if (!normalForm.legendreData) {
    return undefined;
  }
  const kind = basisKindForHead(normalForm.legendreData.head);
  const obligation: AlgebraicGenus1EllipticBasisObligation = {
    kind,
    head: normalForm.legendreData.head,
    status: 'reduced',
    prototypeAntiderivativeLatex: normalForm.legendreData.prototypeAntiderivativeLatex,
    amplitudeLatex: normalForm.legendreData.amplitudeLatex,
    parameterLatex: normalForm.legendreData.parameterLatex,
    characteristicLatex: normalForm.legendreData.characteristicLatex,
    note: legendreBasisNote(kind),
  };

  return {
    kind: 'success' as const,
    variable: normalForm.variable,
    status: 'legendre-template-reduced' as const,
    sourceNormalFormKind: normalForm.normalFormKind,
    basisObligations: [obligation],
    rationalResidualsLatex: [],
    logarithmicResidualsLatex: [],
    exactSupplementEntries: normalForm.exactSupplementEntries,
    detailSections: [
      ...normalForm.detailSections,
      {
        title: 'Genus-1 Differential Basis',
        lines: [
          basisLine(obligation),
          'No rational or logarithmic residual is produced for this canonical template.',
        ],
      },
    ],
    readinessNotes: [
      ...normalForm.readinessNotes,
      'Differential-basis evidence is behavior-invisible until elliptic proof/backcheck gates adopt it.',
    ],
  };
}

function rootBasedReadiness(
  normalForm: Extract<AlgebraicGenus1NormalFormResult, { kind: 'success' }>,
) {
  const basisObligations: AlgebraicGenus1EllipticBasisObligation[] = [
    {
      kind: 'first-kind',
      status: 'pending-root-normalization',
      note: 'Root-based first-kind basis coefficients wait for the Legendre root transformation.',
    },
    {
      kind: 'second-kind',
      status: 'pending-root-normalization',
      note: 'Root-based second-kind basis coefficients wait for the Legendre root transformation.',
    },
    {
      kind: 'third-kind',
      status: 'pending-root-normalization',
      note: 'Root-based third-kind basis coefficients wait for the Legendre root transformation.',
    },
  ];

  return {
    kind: 'success' as const,
    variable: normalForm.variable,
    status: 'root-based-readiness' as const,
    sourceNormalFormKind: normalForm.normalFormKind,
    basisObligations,
    rationalResidualsLatex: [],
    logarithmicResidualsLatex: [],
    exactSupplementEntries: normalForm.exactSupplementEntries,
    detailSections: [
      ...normalForm.detailSections,
      {
        title: 'Genus-1 Differential Basis',
        lines: basisObligations.map((obligation) => `${obligation.kind}: ${obligation.status}`),
      },
    ],
    readinessNotes: [
      ...normalForm.readinessNotes,
      'Generic exact-rational curves have named-root branch evidence, but basis coefficients wait for the elliptic root-normalization gate.',
    ],
  };
}

function symbolicReadiness(
  normalForm: Extract<AlgebraicGenus1NormalFormResult, { kind: 'success' }>,
) {
  const basisObligations: AlgebraicGenus1EllipticBasisObligation[] = [
    {
      kind: 'first-kind',
      status: 'pending-symbolic-branching',
      note: 'Symbolic first-kind basis readiness waits for capped branch formulas.',
    },
    {
      kind: 'second-kind',
      status: 'pending-symbolic-branching',
      note: 'Symbolic second-kind basis readiness waits for capped branch formulas.',
    },
    {
      kind: 'third-kind',
      status: 'pending-symbolic-branching',
      note: 'Symbolic third-kind basis readiness waits for capped branch formulas.',
    },
  ];

  return {
    kind: 'success' as const,
    variable: normalForm.variable,
    status: 'symbolic-readiness' as const,
    sourceNormalFormKind: normalForm.normalFormKind,
    basisObligations,
    rationalResidualsLatex: [],
    logarithmicResidualsLatex: [],
    exactSupplementEntries: normalForm.exactSupplementEntries,
    detailSections: [
      ...normalForm.detailSections,
      {
        title: 'Genus-1 Differential Basis',
        lines: basisObligations.map((obligation) => `${obligation.kind}: ${obligation.status}`),
      },
    ],
    readinessNotes: [
      ...normalForm.readinessNotes,
      'Symbolic differential-basis adoption waits for branch-count and fact-readback caps.',
    ],
  };
}

export function reduceAlgebraicGenus1DifferentialBasis(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1DifferentialBasisReductionResult {
  const normalForm = buildAlgebraicGenus1NormalForm(node, variable);
  if (normalForm.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'normal-form-stop',
      normalForm,
      detail: normalForm.detail,
    };
  }

  const legendre = legendreTemplateReduction(normalForm);
  if (legendre) {
    return legendre;
  }

  if (normalForm.normalFormKind === 'root-based-readiness') {
    return rootBasedReadiness(normalForm);
  }
  if (normalForm.normalFormKind === 'symbolic-generic-readiness') {
    return symbolicReadiness(normalForm);
  }

  return {
    kind: 'stop',
    variable,
    reason: 'unsupported-basis-reduction',
    normalForm,
    detail: 'This normal-form kind does not yet have differential-basis obligations.',
  };
}
