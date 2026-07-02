import type { DisplayDetailSection } from '../../../../types/calculator';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import {
  buildAlgebraicGenus1RootPullbackRationalForm,
  type AlgebraicGenus1RootPullbackRationalForm,
} from './root-pullback-rational-form';
import type { AlgebraicGenus1RootPullbackBasisKind } from './root-pullback-basis-profile';

export type AlgebraicGenus1RootBasisCoefficientSolverStatus =
  | 'solved-first-kind'
  | 'elliptic-basis-reduction-required'
  | 'hermite-reduction-required';

export type AlgebraicGenus1RootBasisCoefficientSolve = {
  kind: 'success';
  variable: string;
  status: AlgebraicGenus1RootBasisCoefficientSolverStatus;
  canAdoptLive: boolean;
  solvedBasisCoefficients: Array<{
    basisKind: AlgebraicGenus1RootPullbackBasisKind;
    coefficientLatex: string;
  }>;
  unresolvedBasisKinds: AlgebraicGenus1RootPullbackBasisKind[];
  rationalCoefficientLatex: string;
  coefficientFieldLatex: string;
  proofObligations: string[];
  detailSections: DisplayDetailSection[];
  readinessNotes: string[];
};

export type AlgebraicGenus1RootBasisCoefficientSolveResult =
  | AlgebraicGenus1RootBasisCoefficientSolve
  | {
      kind: 'stop';
      variable: string;
      reason: 'pullback-rational-form-stop';
      detail: string;
    };

function statusForPullback(
  pullback: AlgebraicGenus1RootPullbackRationalForm,
): AlgebraicGenus1RootBasisCoefficientSolverStatus {
  if (pullback.status === 'constant-first-kind-rational-form') {
    return 'solved-first-kind';
  }
  if (pullback.status === 'basis-coefficient-rational-form') {
    return 'elliptic-basis-reduction-required';
  }
  return 'hermite-reduction-required';
}

function solvedCoefficients(input: {
  status: AlgebraicGenus1RootBasisCoefficientSolverStatus;
  coefficientLatex: string;
}) {
  if (input.status !== 'solved-first-kind') {
    return [];
  }
  return [{
    basisKind: 'first-kind' as const,
    coefficientLatex: input.coefficientLatex,
  }];
}

function unresolvedKinds(
  status: AlgebraicGenus1RootBasisCoefficientSolverStatus,
): AlgebraicGenus1RootPullbackBasisKind[] {
  if (status === 'solved-first-kind') {
    return [];
  }
  if (status === 'elliptic-basis-reduction-required') {
    return ['first-kind', 'second-kind', 'third-kind'];
  }
  return ['rational-log-residual', 'first-kind', 'second-kind', 'third-kind'];
}

function proofObligations(input: {
  status: AlgebraicGenus1RootBasisCoefficientSolverStatus;
  coefficientLatex: string;
  fieldLatex: string;
}) {
  if (input.status === 'solved-first-kind') {
    return [
      'The pullback coefficient is constant in the Legendre chart, so the first-kind basis coefficient is solved directly.',
    ];
  }

  if (input.status === 'elliptic-basis-reduction-required') {
    return [
      `Reduce the rational coefficient ${input.coefficientLatex} over ${input.fieldLatex} against the first-, second-, and third-kind elliptic basis.`,
      'Adoption remains blocked until the coefficient identity is solved and proof-checked.',
    ];
  }

  return [
    `Hermite-reduce the rational coefficient ${input.coefficientLatex} over ${input.fieldLatex}.`,
    'Split the result into a rational derivative correction, logarithmic residual, and elliptic basis coefficients before live adoption.',
  ];
}

function detailSection(input: AlgebraicGenus1RootBasisCoefficientSolve) {
  return mixedDetailSection(
    'Genus-1 Root Basis Coefficient Solver',
    [
      [textPart('status: '), textPart(input.status)],
      [textPart('live-adoptable: '), textPart(input.canAdoptLive ? 'yes' : 'no')],
      [textPart('coefficient field: '), mathPart(input.coefficientFieldLatex)],
      [textPart('rational coefficient: '), mathPart(input.rationalCoefficientLatex)],
      [
        textPart('solved basis: '),
        textPart(input.solvedBasisCoefficients.map((entry) => entry.basisKind).join(', ') || 'none'),
      ],
      [
        textPart('unresolved basis: '),
        textPart(input.unresolvedBasisKinds.join(', ') || 'none'),
      ],
    ],
  );
}

export function solveAlgebraicGenus1RootBasisCoefficients(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1RootBasisCoefficientSolveResult {
  const pullback = buildAlgebraicGenus1RootPullbackRationalForm(node, variable);
  if (pullback.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'pullback-rational-form-stop',
      detail: pullback.detail,
    };
  }

  const status = statusForPullback(pullback);
  const solvedBasisCoefficients = solvedCoefficients({
    status,
    coefficientLatex: pullback.rationalCoefficientLatex,
  });
  const result: AlgebraicGenus1RootBasisCoefficientSolve = {
    kind: 'success',
    variable,
    status,
    canAdoptLive: status === 'solved-first-kind',
    solvedBasisCoefficients,
    unresolvedBasisKinds: unresolvedKinds(status),
    rationalCoefficientLatex: pullback.rationalCoefficientLatex,
    coefficientFieldLatex: pullback.coefficientFieldLatex,
    proofObligations: proofObligations({
      status,
      coefficientLatex: pullback.rationalCoefficientLatex,
      fieldLatex: pullback.coefficientFieldLatex,
    }),
    detailSections: [],
    readinessNotes: [
      ...pullback.readinessNotes,
      status === 'solved-first-kind'
        ? 'The existing generic first-kind live route may adopt this solved coefficient.'
        : 'Generic second-kind, third-kind, or rational-in-radical adoption must wait for the displayed proof obligations.',
    ],
  };

  return {
    ...result,
    detailSections: [
      ...pullback.detailSections,
      detailSection(result),
    ],
  };
}
