import type { DisplayDetailSection, ExactScalarWire, MatrixResponse } from '../../types/calculator';
import type { ExactScalar } from '../algebra/polynomial-core';
import {
  addExactScalars,
  buildExactScalarNode,
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
  matrixEigenspaceLabelLatex,
  matrixEigenspaceMathJson,
  type MatrixEigenAnalysis,
  type MatrixEigenAnalysisRoot,
} from './matrix-eigen';
import { profileLinearAlgebraResult } from '../display/printer';
import { mathPart, mixedDetailSection, textPart } from '../display/result-detail-lines';
import {
  attachLinearAlgebraCanonicalEvidence,
  canonicalLeafEvidence,
  equationMathJson,
  exactMatrixMathJson,
  exactVectorMathJson,
  exactVectorSetMathJson,
  labelMathJson,
  linearAlgebraCanonicalEvidenceForResponse,
  operatorMathJson,
} from './canonical-evidence';

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

  const next = {
    ...response,
    ...(error ? { error } : {}),
  };
  return attachLinearAlgebraCanonicalEvidence(
    next,
    linearAlgebraCanonicalEvidenceForResponse(response),
  );
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
    `${matrixEigenspaceLabelLatex(root)}=\\operatorname{Null}(${analysis.label}-${root.eigenvalueLatex}I)=${root.spaceLatex}`,
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
        `${matrixEigenspaceLabelLatex(root)}=${root.spaceLatex}`,
        `\\dim ${matrixEigenspaceLabelLatex(root)}=${root.basis.length}`,
        `\\text{independent eigenvectors needed}=${needed}`,
        `\\text{independent eigenvectors found}=${available}`,
        'A 2 by 2 matrix diagonalizes only when it has two independent eigenvectors. This repeated-eigenvalue case does not, so it is defective.',
      ],
      lineKinds: ['math', 'math', 'math', 'math', 'text'],
    },
  ];
}

function spectralMathEvidence(canonicalLatex: string, mathJson: unknown, source: string) {
  return { kind: 'math' as const, value: canonicalLeafEvidence(canonicalLatex, mathJson, source) };
}

function characteristicMathJson(analysis: MatrixEigenAnalysis) {
  return equationMathJson([
    'Add',
    ['Power', 'lambda', 2],
    ['Multiply', ['Negate', buildExactScalarNode(analysis.trace)], 'lambda'],
    buildExactScalarNode(analysis.determinant),
  ], 0);
}

function characteristicCanonicalEvidence(analysis: MatrixEigenAnalysis) {
  const operand = labelMathJson(analysis.label, exactMatrixMathJson(analysis.exactMatrix));
  return [
    spectralMathEvidence(`\\operatorname{tr}(${analysis.label})=${exactScalarToLatex(analysis.trace)}`, equationMathJson(operatorMathJson('tr', operand), buildExactScalarNode(analysis.trace)), 'matrix.spectral.native-trace'),
    spectralMathEvidence(`\\det(${analysis.label})=${exactScalarToLatex(analysis.determinant)}`, equationMathJson(operatorMathJson('det', operand), buildExactScalarNode(analysis.determinant)), 'matrix.spectral.native-determinant'),
    spectralMathEvidence(analysis.equationLatex, characteristicMathJson(analysis), 'matrix.spectral.native-characteristic-polynomial'),
  ];
}

function defectiveCanonicalEvidence(analysis: MatrixEigenAnalysis, root: MatrixEigenAnalysisRoot) {
  const needed = vectorCountNeeded(analysis.roots);
  const available = availableEigenvectorCount(analysis.roots);
  return [
    ...characteristicCanonicalEvidence(analysis),
    spectralMathEvidence(`${matrixEigenspaceLabelLatex(root)}=${root.spaceLatex}`, equationMathJson(matrixEigenspaceMathJson(root), ['InvisibleOperator', 'span', exactVectorSetMathJson(root.basis)]), 'matrix.diagonalization.native-defective-eigenspace'),
    spectralMathEvidence(`\\dim ${matrixEigenspaceLabelLatex(root)}=${root.basis.length}`, equationMathJson(operatorMathJson('dim', matrixEigenspaceMathJson(root)), root.basis.length), 'matrix.diagonalization.native-defective-eigenspace-dimension'),
    spectralMathEvidence(`\\text{independent eigenvectors needed}=${needed}`, equationMathJson('eigenvectorsNeeded', needed), 'matrix.diagonalization.native-needed-eigenvectors'),
    spectralMathEvidence(`\\text{independent eigenvectors found}=${available}`, equationMathJson('eigenvectorsFound', available), 'matrix.diagonalization.native-found-eigenvectors'),
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
    mixedDetailSection('Eigenvector Columns', input.analysis.roots.flatMap((root) =>
      root.basis.slice(0, root.multiplicity).map((vector) => [
        mathPart(`\\lambda=${root.eigenvalueLatex}`),
        textPart(': '),
        mathPart(exactVectorToColumnLatex(vector)),
      ]))),
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
    const response = matrixStop(
      'This matrix is not diagonalizable because it does not have enough independent eigenvectors.',
      defectiveDetails(analysis, selected.root),
    );
    attachLinearAlgebraCanonicalEvidence(response, {
      details: defectiveCanonicalEvidence(analysis, selected.root),
    });
    return {
      kind: 'stop',
      response,
    };
  }

  if (selected.columns.length !== 2 || selected.eigenvalues.length !== 2) {
    return { kind: 'stop', response: matrixStop('Diagonalization V1 needs exactly two eigenvector columns.') };
  }

  const p = matrixFromColumns(selected.columns);
  const d = diagonalMatrix(selected.eigenvalues);
  const pInverse = inverseExactMatrix(p);
  if (pInverse.kind === 'stop') {
    const response = matrixStop(
      'This matrix is not diagonalizable because the eigenvector matrix is singular.',
      defectiveDetails(analysis, analysis.roots[0]),
    );
    attachLinearAlgebraCanonicalEvidence(response, {
      details: defectiveCanonicalEvidence(analysis, analysis.roots[0]),
    });
    return {
      kind: 'stop',
      response,
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

  const response = profileLinearAlgebraResult({
    resultLatex: `\\operatorname{diag}(${factors.analysis.label})=${factors.analysis.label}=PDP^{-1}`,
    approxText: `diagonalizable; eigenvalues ${rootsSummary(factors.analysis.roots)}`,
    detailSections: diagonalizationDetails(factors),
    warnings: [],
  });
  const analysis = factors.analysis;
  const operand = labelMathJson(analysis.label, exactMatrixMathJson(analysis.exactMatrix));
  const pNode = exactMatrixMathJson(factors.p);
  const dNode = exactMatrixMathJson(factors.d);
  const inverseNode = exactMatrixMathJson(factors.pInverse);
  const decomposition = ['Multiply', pNode, dNode, inverseNode];
  const primaryLatex = `\\operatorname{diag}(${analysis.label})=${analysis.label}=PDP^{-1}`;
  const equality = exactMatricesEqual(factors.ap, factors.pd)
    ? `(${analysis.label})P=PD=${exactMatrixToLatex(factors.ap)}`
    : `(${analysis.label})P=${exactMatrixToLatex(factors.ap)},\\ PD=${exactMatrixToLatex(factors.pd)}`;
  const eigenvectorDetails = analysis.roots.flatMap((root) =>
    root.basis.slice(0, root.multiplicity).flatMap((vector) => [
      spectralMathEvidence(
        `\\lambda=${root.eigenvalueLatex}`,
        equationMathJson('lambda', buildExactScalarNode(root.eigenvalue)),
        'matrix.diagonalization.native-eigenvalue-column',
      ),
      spectralMathEvidence(
        exactVectorToColumnLatex(vector),
        exactVectorMathJson(vector),
        'matrix.diagonalization.native-eigenvector-column',
      ),
    ]));
  const eigenspaceDetails = analysis.roots.flatMap((root) => [
    spectralMathEvidence(`${matrixEigenspaceLabelLatex(root)}=\\operatorname{Null}(${analysis.label}-${root.eigenvalueLatex}I)=${root.spaceLatex}`, equationMathJson(matrixEigenspaceMathJson(root), equationMathJson(operatorMathJson('Null', ['Subtract', operand, ['InvisibleOperator', buildExactScalarNode(root.eigenvalue), 'I']]), ['InvisibleOperator', 'span', exactVectorSetMathJson(root.basis)])), 'matrix.diagonalization.native-eigenspace'),
    spectralMathEvidence(`${analysis.label}-${root.eigenvalueLatex}I=${exactMatrixToLatex(root.shifted)}`, equationMathJson(['Subtract', operand, ['Multiply', buildExactScalarNode(root.eigenvalue), 'IdentityMatrix']], exactMatrixMathJson(root.shifted)), 'matrix.diagonalization.native-shifted-matrix'),
  ]);
  return attachLinearAlgebraCanonicalEvidence(response, {
    primary: canonicalLeafEvidence(primaryLatex, ['Equal', operatorMathJson('diag', operand), operand, decomposition], 'matrix.diagonalization.native-decomposition'),
    details: [
      ...characteristicCanonicalEvidence(analysis),
      spectralMathEvidence(`P=${exactMatrixToLatex(factors.p)}`, equationMathJson('P', pNode), 'matrix.diagonalization.native-p'),
      spectralMathEvidence(`D=${exactMatrixToLatex(factors.d)}`, equationMathJson('D', dNode), 'matrix.diagonalization.native-d'),
      spectralMathEvidence(`P^{-1}=${exactMatrixToLatex(factors.pInverse)}`, equationMathJson(['Power', 'P', -1], inverseNode), 'matrix.diagonalization.native-p-inverse'),
      spectralMathEvidence(`${analysis.label}=PDP^{-1}`, equationMathJson(operand, decomposition), 'matrix.diagonalization.native-formula'),
      spectralMathEvidence(equality, equationMathJson(['Multiply', operand, pNode], exactMatrixMathJson(factors.ap)), 'matrix.diagonalization.native-proof-product'),
      ...eigenvectorDetails,
      ...eigenspaceDetails,
    ],
  });
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

  const response = profileLinearAlgebraResult({
    resultLatex: `${factors.analysis.label}^{${input.exponent}}=${exactMatrixToLatex(result)}`,
    approxText: `power via diagonalization; eigenvalues ${rootsSummary(factors.analysis.roots)}`,
    detailSections: spectralPowerDetails({
      factors,
      exponent: input.exponent,
      dPower,
      result,
    }),
    warnings: [],
  });
  const analysis = factors.analysis;
  const operand = labelMathJson(analysis.label, exactMatrixMathJson(analysis.exactMatrix));
  const pNode = exactMatrixMathJson(factors.p);
  const dNode = exactMatrixMathJson(factors.d);
  const inverseNode = exactMatrixMathJson(factors.pInverse);
  const dPowerNode = exactMatrixMathJson(dPower);
  const resultNode = exactMatrixMathJson(result);
  const powerNode = ['Power', operand, input.exponent];
  const primaryLatex = `${analysis.label}^{${input.exponent}}=${exactMatrixToLatex(result)}`;
  return attachLinearAlgebraCanonicalEvidence(response, {
    primary: canonicalLeafEvidence(primaryLatex, equationMathJson(powerNode, resultNode), 'matrix.spectral-power.native-result'),
    details: [
      ...characteristicCanonicalEvidence(analysis),
      spectralMathEvidence(`P=${exactMatrixToLatex(factors.p)}`, equationMathJson('P', pNode), 'matrix.spectral-power.native-p'),
      spectralMathEvidence(`D=${exactMatrixToLatex(factors.d)}`, equationMathJson('D', dNode), 'matrix.spectral-power.native-d'),
      spectralMathEvidence(`P^{-1}=${exactMatrixToLatex(factors.pInverse)}`, equationMathJson(['Power', 'P', -1], inverseNode), 'matrix.spectral-power.native-p-inverse'),
      spectralMathEvidence(`D^{${input.exponent}}=${exactMatrixToLatex(dPower)}`, equationMathJson(['Power', dNode, input.exponent], dPowerNode), 'matrix.spectral-power.native-d-power'),
      spectralMathEvidence(`${analysis.label}^{${input.exponent}}=PD^{${input.exponent}}P^{-1}=${exactMatrixToLatex(result)}`, ['Equal', powerNode, ['Multiply', pNode, dPowerNode, inverseNode], resultNode], 'matrix.spectral-power.native-formula'),
      spectralMathEvidence(`${analysis.label}=PDP^{-1}`, equationMathJson(operand, ['Multiply', pNode, dNode, inverseNode]), 'matrix.spectral-power.native-decomposition'),
      spectralMathEvidence(`(${analysis.label})P=PD=${exactMatrixToLatex(factors.ap)}`, ['Equal', ['Multiply', operand, pNode], ['Multiply', pNode, dNode], exactMatrixMathJson(factors.ap)], 'matrix.spectral-power.native-proof-product'),
    ],
  });
}
