import type { DisplayDetailSection } from '../../../../types/calculator';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import {
  buildAlgebraicGenus1SecondKindCoefficientIdentitySystem,
  type AlgebraicGenus1SecondKindCoefficientIdentitySystem,
} from './second-kind-coefficient-identity-system';

export type AlgebraicGenus1SecondKindCoefficientMatrixUnknown = {
  symbolLatex: string;
  block: 'elliptic-basis' | 'rational-correction';
  role: string;
};

export type AlgebraicGenus1SecondKindCoefficientMatrix = {
  kind: 'success';
  variable: string;
  status: 'coefficient-matrix-ready';
  rootChartKind: AlgebraicGenus1SecondKindCoefficientIdentitySystem['rootChartKind'];
  coefficientFieldLatex: string;
  chartVariableLatex: string;
  rowLabelsLatex: string[];
  unknowns: AlgebraicGenus1SecondKindCoefficientMatrixUnknown[];
  matrixShape: {
    rows: number;
    columns: number;
  };
  unknownVectorLatex: string;
  rightHandSideLatex: string;
  matrixEquationLatex: string;
  canSolveDirectly: false;
  canAdoptLive: false;
  proofObligations: string[];
  detailSections: DisplayDetailSection[];
  readinessNotes: string[];
};

export type AlgebraicGenus1SecondKindCoefficientMatrixResult =
  | AlgebraicGenus1SecondKindCoefficientMatrix
  | {
      kind: 'stop';
      variable: string;
      reason: 'identity-system-stop';
      detail: string;
    };

function coefficientRows(
  rootChartKind: AlgebraicGenus1SecondKindCoefficientIdentitySystem['rootChartKind'],
  cap: number,
) {
  const rowCount = rootChartKind === 'cubic-three-real-roots'
    ? cap + 6
    : cap + 4;
  return Array.from({ length: rowCount }, (_, index) => `z^{${index}}`);
}

function unknownsFromIdentity(
  identity: AlgebraicGenus1SecondKindCoefficientIdentitySystem,
): AlgebraicGenus1SecondKindCoefficientMatrixUnknown[] {
  const basisUnknowns = identity.basisUnknownsLatex.map((symbolLatex) => ({
    symbolLatex,
    block: 'elliptic-basis' as const,
    role: symbolLatex === 'C_E'
      ? 'second-kind coefficient'
      : symbolLatex === 'C_F'
        ? 'first-kind residual coefficient'
        : 'third-kind pole-family coefficient placeholder',
  }));

  const correctionUnknowns = identity.correctionUnknownsLatex.map((symbolLatex) => ({
    symbolLatex,
    block: 'rational-correction' as const,
    role: 'rational correction polynomial coefficient',
  }));

  return [
    ...basisUnknowns,
    ...correctionUnknowns,
  ];
}

function vectorLatex(symbols: readonly string[]) {
  return `\\begin{bmatrix}${symbols.join('\\\\')}\\end{bmatrix}`;
}

function matrixEquation(input: {
  rows: number;
  columns: number;
  rootChartKind: string;
  unknownVectorLatex: string;
  rightHandSideLatex: string;
}) {
  return [
    `M_{${input.rootChartKind}}^{${input.rows}\\times${input.columns}}`,
    input.unknownVectorLatex,
    '=',
    input.rightHandSideLatex,
  ].join('');
}

function detailSection(input: AlgebraicGenus1SecondKindCoefficientMatrix) {
  return mixedDetailSection(
    'Genus-1 Second-Kind Coefficient Matrix',
    [
      [textPart('status: '), textPart(input.status)],
      [textPart('root chart: '), textPart(input.rootChartKind)],
      [textPart('coefficient field: '), mathPart(input.coefficientFieldLatex)],
      [textPart('chart variable: '), mathPart(input.chartVariableLatex)],
      [textPart('rows: '), mathPart(input.rowLabelsLatex.join(', '))],
      [textPart('unknown vector: '), mathPart(input.unknownVectorLatex)],
      [textPart('linear system: '), mathPart(input.matrixEquationLatex)],
    ],
  );
}

export function buildAlgebraicGenus1SecondKindCoefficientMatrix(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1SecondKindCoefficientMatrixResult {
  const identity = buildAlgebraicGenus1SecondKindCoefficientIdentitySystem(node, variable);
  if (identity.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'identity-system-stop',
      detail: identity.detail,
    };
  }

  const rowLabelsLatex = coefficientRows(identity.rootChartKind, identity.correctionDegreeCap);
  const unknowns = unknownsFromIdentity(identity);
  const unknownVectorLatex = vectorLatex(unknowns.map((unknown) => unknown.symbolLatex));
  const rightHandSideLatex = `\\vec b\\left(${identity.rationalCoefficientLatex}\\right)`;
  const matrixShape = {
    rows: rowLabelsLatex.length,
    columns: unknowns.length,
  };
  const matrixEquationLatex = matrixEquation({
    rows: matrixShape.rows,
    columns: matrixShape.columns,
    rootChartKind: identity.rootChartKind,
    unknownVectorLatex,
    rightHandSideLatex,
  });

  const result: AlgebraicGenus1SecondKindCoefficientMatrix = {
    kind: 'success',
    variable,
    status: 'coefficient-matrix-ready',
    rootChartKind: identity.rootChartKind,
    coefficientFieldLatex: identity.coefficientFieldLatex,
    chartVariableLatex: identity.chartVariableLatex,
    rowLabelsLatex,
    unknowns,
    matrixShape,
    unknownVectorLatex,
    rightHandSideLatex,
    matrixEquationLatex,
    canSolveDirectly: false,
    canAdoptLive: false,
    proofObligations: [
      'Populate the displayed matrix entries from the coefficient-comparison identity without expanding outside the named-root field caps.',
      'Solve the bounded linear system over the named-root coefficient field and collect nonzero pivot facts.',
      'Only after a solved coefficient vector exists may the second-kind live route build and proof-check an antiderivative.',
    ],
    detailSections: [],
    readinessNotes: [
      ...identity.readinessNotes,
      'The second-kind coefficient identity is now lowered to a bounded linear-system shape.',
      'Matrix entries are still proof obligations; live EllipticE adoption remains blocked until the matrix is populated and solved.',
    ],
  };

  return {
    ...result,
    detailSections: [
      ...identity.detailSections,
      detailSection(result),
    ],
  };
}
