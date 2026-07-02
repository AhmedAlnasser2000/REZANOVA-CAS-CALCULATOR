import type { DisplayDetailSection, ExactScalarWire, MatrixResponse } from '../../types/calculator';
import type { ExactScalar } from '../algebra/polynomial-core';
import {
  addExactScalars,
  exactScalarEquals,
  multiplyExactScalars,
  normalizeExactScalar,
} from '../algebra/polynomial-core';
import { inverseExactMatrix, scalar, type ExactMatrix, type ExactVector } from './exact-matrix-core';
import {
  exactMatrixToLatex,
  exactScalarToLatex,
  exactVectorToColumnLatex,
} from './exact-matrix-format';
import {
  analyzeMatrixEigen2x2,
  type MatrixEigenAnalysis,
  type MatrixEigenAnalysisRoot,
} from './matrix-eigen';

export type MatrixDiagonalizationInput = {
  label: string;
  matrix: number[][];
  exactMatrix?: ExactScalarWire[][];
};

export type MatrixSpectralPowerInput = MatrixDiagonalizationInput & {
  exponent: number;
};

type MatrixDiagonalizationFactors = {
  analysis: MatrixEigenAnalysis;
  p: ExactMatrix;
  d: ExactMatrix;
  pInverse: ExactMatrix;
  ap: ExactMatrix;
  pd: ExactMatrix;
};

const ZERO = scalar(0);

function matrixStop(message: string, detailSections?: DisplayDetailSection[]): MatrixResponse {
  return {
    warnings: [],
    error: message,
    ...(detailSections ? { detailSections } : {}),
  };
}

function diagonalizationStopFromEigen(response: MatrixResponse): MatrixResponse {
  const error = response.error === 'Eigen needs exact 2 by 2 Matrix entries in this move.'
    ? 'Diagonalization needs exact 2 by 2 Matrix entries in this move.'
    : response.error === 'Eigen V1 supports 2 by 2 matrices only.'
      ? 'Diagonalization V1 supports 2 by 2 matrices only.'
      : response.error === 'Complex eigenvalue and eigenvector readback is deferred for Matrix V1.'
        ? 'Diagonalization with complex eigenvalues is deferred for Matrix V1.'
        : response.error === 'Irrational eigenvalue vector readback is deferred for Matrix V1.'
          ? 'Diagonalization with irrational eigenvectors is deferred for Matrix V1.'
          : response.error;

  return {
    ...response,
    ...(error ? { error } : {}),
  };
}

function characteristicSection(analysis: MatrixEigenAnalysis): DisplayDetailSection {
  return {
    title: 'Characteristic Polynomial',
    lines: [
      `\\operatorname{tr}(${analysis.label})=${exactScalarToLatex(analysis.trace)}`,
      `\\det(${analysis.label})=${exactScalarToLatex(analysis.determinant)}`,
      analysis.equationLatex,
    ],
    lineKind: 'math',
  };
}

function rootsSummary(roots: readonly MatrixEigenAnalysisRoot[]) {
  return roots.map((root) => root.rootLatex).join(', ');
}

function vectorCountNeeded(roots: readonly MatrixEigenAnalysisRoot[]) {
  return roots.reduce((sum, root) => sum + root.multiplicity, 0);
}

function availableEigenvectorCount(roots: readonly MatrixEigenAnalysisRoot[]) {
  return roots.reduce((sum, root) => sum + root.basis.length, 0);
}

function eigenpairLines(analysis: MatrixEigenAnalysis): string[] {
  return analysis.roots.flatMap((root) => [
    `E_{${root.eigenvalueLatex}}=\\operatorname{Null}(${analysis.label}-${root.eigenvalueLatex}I)=${root.spaceLatex}`,
    `${analysis.label}-${root.eigenvalueLatex}I=${exactMatrixToLatex(root.shifted)}`,
  ]);
}

function matrixFromColumns(columns: ExactVector[]): ExactMatrix {
  return columns[0].map((_, rowIndex) => columns.map((column) => column[rowIndex]));
}

function diagonalMatrix(entries: ExactScalar[]): ExactMatrix {
  return entries.map((entry, rowIndex) =>
    entries.map((_, columnIndex) => (rowIndex === columnIndex ? entry : ZERO)));
}

function multiplyExactMatrices(left: ExactMatrix, right: ExactMatrix): ExactMatrix {
  return left.map((row) =>
    right[0].map((_, columnIndex) => row.reduce((sum, value, pivot) =>
      normalizeExactScalar(addExactScalars(
        sum,
        multiplyExactScalars(value, right[pivot][columnIndex]),
      )), ZERO)));
}

function exactScalarPower(value: ExactScalar, exponent: number): ExactScalar {
  let result = scalar(1);
  for (let index = 0; index < exponent; index += 1) {
    result = normalizeExactScalar(multiplyExactScalars(result, value));
  }
  return result;
}

function identityMatrix(size: number): ExactMatrix {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => (row === column ? scalar(1) : ZERO)));
}

function exactMatricesEqual(left: ExactMatrix, right: ExactMatrix) {
  return left.length === right.length
    && left.every((row, rowIndex) =>
      row.length === right[rowIndex]?.length
      && row.every((value, columnIndex) => exactScalarEquals(value, right[rowIndex][columnIndex])));
}

function selectDiagonalizationColumns(
  analysis: MatrixEigenAnalysis,
): { kind: 'success'; columns: ExactVector[]; eigenvalues: ExactScalar[] } | { kind: 'defective'; root: MatrixEigenAnalysisRoot } {
  const columns: ExactVector[] = [];
  const eigenvalues: ExactScalar[] = [];

  for (const root of analysis.roots) {
    const needed = root.multiplicity;
    if (root.basis.length < needed) {
      return { kind: 'defective', root };
    }
    for (let index = 0; index < needed; index += 1) {
      columns.push(root.basis[index]);
      eigenvalues.push(root.eigenvalue);
    }
  }

  return { kind: 'success', columns, eigenvalues };
}

function defectiveDetails(analysis: MatrixEigenAnalysis, root: MatrixEigenAnalysisRoot): DisplayDetailSection[] {
  const needed = vectorCountNeeded(analysis.roots);
  const available = availableEigenvectorCount(analysis.roots);
  return [
    characteristicSection(analysis),
    {
      title: 'Why It Cannot Diagonalize',
      lines: [
        `E_{${root.eigenvalueLatex}}=${root.spaceLatex}`,
        `\\dim E_{${root.eigenvalueLatex}}=${root.basis.length}`,
        `\\text{independent eigenvectors needed}=${needed}`,
        `\\text{independent eigenvectors found}=${available}`,
        'A 2 by 2 matrix diagonalizes only when it has two independent eigenvectors. This repeated-eigenvalue case does not, so it is defective.',
      ],
      lineKinds: ['math', 'math', 'math', 'math', 'text'],
    },
  ];
}

function diagonalizationDetails(input: {
  analysis: MatrixEigenAnalysis;
  p: ExactMatrix;
  d: ExactMatrix;
  pInverse: ExactMatrix;
  ap: ExactMatrix;
  pd: ExactMatrix;
}): DisplayDetailSection[] {
  const equalityLine = exactMatricesEqual(input.ap, input.pd)
    ? `(${input.analysis.label})P=PD=${exactMatrixToLatex(input.ap)}`
    : `(${input.analysis.label})P=${exactMatrixToLatex(input.ap)},\\ PD=${exactMatrixToLatex(input.pd)}`;

  return [
    characteristicSection(input.analysis),
    {
      title: 'Diagonalization Factors',
      lines: [
        `P=${exactMatrixToLatex(input.p)}`,
        `D=${exactMatrixToLatex(input.d)}`,
        `P^{-1}=${exactMatrixToLatex(input.pInverse)}`,
        `${input.analysis.label}=PDP^{-1}`,
      ],
      lineKind: 'math',
    },
    {
      title: 'Diagonalization Proof',
      lines: [
        equalityLine,
        'The columns of P are independent eigenvectors, so multiplying by the matrix matches multiplying by D in eigenvector coordinates.',
        'Since P is invertible, the equality AP=PD rearranges to A=PDP^{-1}.',
      ],
      lineKinds: ['math', 'text', 'text'],
    },
    {
      title: 'Eigenvector Columns',
      lines: input.analysis.roots.flatMap((root) =>
        root.basis.slice(0, root.multiplicity).map((vector) =>
          `\\lambda=${root.eigenvalueLatex}:\\ ${exactVectorToColumnLatex(vector)}`)),
      lineKind: 'math',
    },
    {
      title: 'Eigenspaces',
      lines: eigenpairLines(input.analysis),
      lineKind: 'math',
    },
  ];
}

function computeDiagonalizationFactors(
  input: MatrixDiagonalizationInput,
): { kind: 'success'; factors: MatrixDiagonalizationFactors } | { kind: 'stop'; response: MatrixResponse } {
  const analyzed = analyzeMatrixEigen2x2(input);
  if (analyzed.kind === 'stop') {
    return { kind: 'stop', response: diagonalizationStopFromEigen(analyzed.response) };
  }

  const { analysis } = analyzed;
  const selected = selectDiagonalizationColumns(analysis);
  if (selected.kind === 'defective') {
    return {
      kind: 'stop',
      response: matrixStop(
        'This matrix is not diagonalizable because it does not have enough independent eigenvectors.',
        defectiveDetails(analysis, selected.root),
      ),
    };
  }

  if (selected.columns.length !== 2 || selected.eigenvalues.length !== 2) {
    return { kind: 'stop', response: matrixStop('Diagonalization V1 needs exactly two eigenvector columns.') };
  }

  const p = matrixFromColumns(selected.columns);
  const d = diagonalMatrix(selected.eigenvalues);
  const pInverse = inverseExactMatrix(p);
  if (pInverse.kind === 'stop') {
    return {
      kind: 'stop',
      response: matrixStop(
        'This matrix is not diagonalizable because the eigenvector matrix is singular.',
        defectiveDetails(analysis, analysis.roots[0]),
      ),
    };
  }

  const ap = multiplyExactMatrices(analysis.exactMatrix, p);
  const pd = multiplyExactMatrices(p, d);

  return {
    kind: 'success',
    factors: {
      analysis,
      p,
      d,
      pInverse: pInverse.inverse,
      ap,
      pd,
    },
  };
}

export function runMatrixDiagonalization(input: MatrixDiagonalizationInput): MatrixResponse {
  const computed = computeDiagonalizationFactors(input);
  if (computed.kind === 'stop') {
    return computed.response;
  }
  const { factors } = computed;

  return {
    resultLatex: `\\operatorname{diag}(${factors.analysis.label})=${factors.analysis.label}=PDP^{-1}`,
    approxText: `diagonalizable; eigenvalues ${rootsSummary(factors.analysis.roots)}`,
    detailSections: diagonalizationDetails(factors),
    warnings: [],
  };
}

function spectralPowerDetails(input: {
  factors: MatrixDiagonalizationFactors;
  exponent: number;
  dPower: ExactMatrix;
  result: ExactMatrix;
}): DisplayDetailSection[] {
  const { factors, exponent, dPower, result } = input;
  const powerLabel = `${factors.analysis.label}^{${exponent}}`;
  return [
    characteristicSection(factors.analysis),
    {
      title: 'Power Factors',
      lines: [
        `P=${exactMatrixToLatex(factors.p)}`,
        `D=${exactMatrixToLatex(factors.d)}`,
        `P^{-1}=${exactMatrixToLatex(factors.pInverse)}`,
      ],
      lineKind: 'math',
    },
    {
      title: 'Power via Diagonalization',
      lines: [
        `D^{${exponent}}=${exactMatrixToLatex(dPower)}`,
        `${powerLabel}=PD^{${exponent}}P^{-1}=${exactMatrixToLatex(result)}`,
        'Because A=PDP^{-1}, repeated multiplication gives A^n=PD^nP^{-1}.',
      ],
      lineKinds: ['math', 'math', 'text'],
    },
    {
      title: 'Diagonalization Proof',
      lines: [
        `${factors.analysis.label}=PDP^{-1}`,
        `(${factors.analysis.label})P=PD=${exactMatrixToLatex(factors.ap)}`,
        'The same eigenvector coordinates that diagonalize the matrix make powers easy: only the diagonal entries of D need to be powered.',
      ],
      lineKinds: ['math', 'math', 'text'],
    },
  ];
}

export function runMatrixSpectralPower(input: MatrixSpectralPowerInput): MatrixResponse {
  if (!Number.isSafeInteger(input.exponent) || input.exponent < 0 || input.exponent > 12) {
    return matrixStop('Matrix power via diagonalization supports nonnegative integer exponents up to 12 in this move.');
  }

  const computed = computeDiagonalizationFactors(input);
  if (computed.kind === 'stop') {
    return computed.response;
  }

  const { factors } = computed;
  const dPower = input.exponent === 0
    ? identityMatrix(factors.d.length)
    : diagonalMatrix(factors.d.map((row, index) => exactScalarPower(row[index], input.exponent)));
  const result = multiplyExactMatrices(multiplyExactMatrices(factors.p, dPower), factors.pInverse);

  return {
    resultLatex: `${factors.analysis.label}^{${input.exponent}}=${exactMatrixToLatex(result)}`,
    approxText: `power via diagonalization; eigenvalues ${rootsSummary(factors.analysis.roots)}`,
    detailSections: spectralPowerDetails({
      factors,
      exponent: input.exponent,
      dPower,
      result,
    }),
    warnings: [],
  };
}
