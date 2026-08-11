import type { DisplayDetailSection, ExactScalarWire, MatrixResponse } from '../../types/calculator';
import {
  addExactScalars,
  divideExactScalars,
  exactScalarIsZero,
  multiplyExactScalars,
  type ExactScalar,
  buildExactScalarNode,
} from '../algebra/polynomial-core';
import { scalar, validateExactMatrix, type ExactMatrix, type ExactMatrixStopReason, type ExactVector } from './exact-matrix-core';
import { solveExactLinearSystem } from './exact-matrix-core';
import {
  exactMatrixFromNumeric,
  exactMatrixFromWire,
  exactMatrixToLatex,
  exactScalarToLatex,
  exactVectorFromNumeric,
  exactVectorFromWire,
  exactVectorToColumnLatex,
} from './exact-matrix-format';
import { exactDotVectors, exactScalarSquareRoot, exactSubtractVectors } from './exact-vector-core';
import { orthogonalizeExactVectors } from './exact-orthogonalization';
import { exactMatrixDimensionLimitMessage } from './dimension-contract';
import { profileLinearAlgebraResult } from '../display/printer';
import { mathPart, mixedDetailSection, textPart } from '../display/result-detail-lines';
import {
  attachLinearAlgebraCanonicalEvidence,
  canonicalLeafEvidence,
  equationMathJson,
  exactMatrixMathJson,
  exactVectorMathJson,
  labelMathJson,
  operatorMathJson,
  type LinearAlgebraCanonicalLeafEvidence,
} from './canonical-evidence';

export type MatrixQrInput = {
  label: string;
  matrix: number[][];
  exactMatrix?: ExactScalarWire[][];
};

export type MatrixColumnProjectionInput = MatrixQrInput & {
  vector: number[];
  exactVector?: ExactScalarWire[];
  vectorLabel: string;
};

export type MatrixLeastSquaresInput = MatrixColumnProjectionInput;

type QrResult =
  | { kind: 'success'; q: ExactMatrix; r: ExactMatrix; product: ExactMatrix; qtq: ExactMatrix; steps: string[]; stepEvidence: LinearAlgebraCanonicalLeafEvidence[] }
  | { kind: 'stop'; reason: ExactMatrixStopReason | 'wide-matrix' | 'dependent-columns' | 'irrational-norm'; column?: number };

function stop(message: string): MatrixResponse {
  return { warnings: [], error: message };
}

function exactInputMatrix(input: MatrixQrInput): ExactMatrix | null {
  return exactMatrixFromWire(input.exactMatrix) ?? exactMatrixFromNumeric(input.matrix);
}

function zeroMatrix(rows: number, columns: number): ExactMatrix {
  return Array.from({ length: rows }, () => Array.from({ length: columns }, () => scalar(0)));
}

function matrixColumn(matrix: ExactMatrix, column: number): ExactVector {
  return matrix.map((row) => row[column]);
}

function matrixFromColumns(columns: ExactVector[]): ExactMatrix {
  const rows = columns[0]?.length ?? 0;
  return Array.from({ length: rows }, (_, row) => columns.map((column) => column[row]));
}

function transposeMatrix(matrix: ExactMatrix): ExactMatrix {
  return matrix[0].map((_, column) => matrix.map((row) => row[column]));
}

function multiplyExactMatrices(left: ExactMatrix, right: ExactMatrix): ExactMatrix {
  return left.map((row) =>
    right[0].map((_, column) =>
      row.reduce(
        (sum, value, pivot) => addExactScalars(sum, multiplyExactScalars(value, right[pivot][column])),
        scalar(0),
      ),
    ));
}

function multiplyMatrixVector(matrix: ExactMatrix, vector: ExactVector): ExactVector {
  return matrix.map((row) =>
    row.reduce(
      (sum, value, index) => addExactScalars(sum, multiplyExactScalars(value, vector[index])),
      scalar(0),
    ));
}

function divideVector(vector: ExactVector, divisor: ExactScalar): ExactVector | null {
  const divided: ExactVector = [];
  for (const value of vector) {
    const next = divideExactScalars(value, divisor);
    if (!next) {
      return null;
    }
    divided.push(next);
  }
  return divided;
}

function exactQr(matrix: ExactMatrix): QrResult {
  const validation = validateExactMatrix(matrix);
  if (validation.kind === 'stop') {
    return validation;
  }

  const { rows, columns } = validation.shape;
  if (rows < columns) {
    return { kind: 'stop', reason: 'wide-matrix' };
  }

  const qColumns: ExactVector[] = [];
  const r = zeroMatrix(columns, columns);
  const steps: string[] = [];
  const stepEvidence: LinearAlgebraCanonicalLeafEvidence[] = [];
  const originals = Array.from({ length: columns }, (_, column) => matrixColumn(validation.matrix, column));
  const orthogonalization = orthogonalizeExactVectors(originals);

  for (let column = 0; column < columns; column += 1) {
    const original = originals[column];
    const orthogonalizationStep = orthogonalization.steps[column];
    const residual = orthogonalizationStep.residual;
    const originalLatex = `a_{${column + 1}}=${exactVectorToColumnLatex(original)}`;
    steps.push(originalLatex);
    stepEvidence.push(canonicalLeafEvidence(originalLatex, equationMathJson(['Subscript', 'a', column + 1], exactVectorMathJson(original)), `matrix.qr.native-column-${column + 1}`));

    for (let previous = 0; previous < qColumns.length; previous += 1) {
      const coefficient = exactDotVectors(qColumns[previous], original);
      r[previous][column] = coefficient;
      const coefficientLatex = `r_{${previous + 1}${column + 1}}=${exactVectorToColumnLatex(qColumns[previous])}^{T}${exactVectorToColumnLatex(original)}=${exactScalarToLatex(coefficient)}`;
      steps.push(coefficientLatex);
      stepEvidence.push(canonicalLeafEvidence(
        coefficientLatex,
        ['Equal', ['Subscript', 'r', Number(`${previous + 1}${column + 1}`)], ['Multiply', ['Transpose', exactVectorMathJson(qColumns[previous])], exactVectorMathJson(original)], buildExactScalarNode(coefficient)],
        `matrix.qr.native-projection-coefficient-${previous + 1}-${column + 1}`,
      ));
    }

    const normSquared = exactDotVectors(residual, residual);
    if (orthogonalizationStep.discarded || exactScalarIsZero(normSquared)) {
      return { kind: 'stop', reason: 'dependent-columns', column };
    }

    const norm = exactScalarSquareRoot(normSquared);
    if (!norm) {
      return { kind: 'stop', reason: 'irrational-norm', column };
    }

    const qColumn = divideVector(residual, norm);
    if (!qColumn) {
      return { kind: 'stop', reason: 'scalar-growth-limit', column };
    }
    r[column][column] = norm;
    qColumns.push(qColumn);
    const normLatex = `r_{${column + 1}${column + 1}}=\\Vert u_{${column + 1}}\\Vert=${exactScalarToLatex(norm)}`;
    const qLatex = `q_{${column + 1}}=${exactVectorToColumnLatex(qColumn)}`;
    steps.push(normLatex);
    steps.push(qLatex);
    stepEvidence.push(
      canonicalLeafEvidence(normLatex, ['Equal', `r_${column + 1}${column + 1}`, ['Equal', ['Norm', `u_${column + 1}`], buildExactScalarNode(norm)]], `matrix.qr.native-norm-${column + 1}`),
      canonicalLeafEvidence(qLatex, equationMathJson(['Subscript', 'q', column + 1], exactVectorMathJson(qColumn)), `matrix.qr.native-orthonormal-column-${column + 1}`),
    );
  }

  const q = matrixFromColumns(qColumns);
  const qtq = multiplyExactMatrices(transposeMatrix(q), q);
  const product = multiplyExactMatrices(q, r);
  return { kind: 'success', q, r, product, qtq, steps, stepEvidence };
}

function qrStopMessage(result: Extract<QrResult, { kind: 'stop' }>): string {
  switch (result.reason) {
    case 'dimension-limit':
      return exactMatrixDimensionLimitMessage('QR factorization');
    case 'wide-matrix':
      return 'QR factorization in this move expects at least as many rows as columns.';
    case 'dependent-columns':
      return `QR factorization needs independent columns here; column ${(result.column ?? 0) + 1} has zero residual after projection.`;
    case 'irrational-norm':
      return `Exact QR readback needs rational Gram-Schmidt lengths here; column ${(result.column ?? 0) + 1} has a non-rational norm.`;
    case 'scalar-growth-limit':
      return 'This QR factorization exceeded the exact Matrix arithmetic limit.';
    case 'empty-matrix':
    case 'ragged-matrix':
      return 'QR factorization needs a complete rectangular Matrix.';
    default:
      return 'QR factorization could not read this Matrix exactly.';
  }
}

function qrDetails(result: Extract<QrResult, { kind: 'success' }>): DisplayDetailSection[] {
  return [
    {
      title: 'QR Factors',
      lines: [`Q=${exactMatrixToLatex(result.q)}`, `R=${exactMatrixToLatex(result.r)}`],
      lineKind: 'math',
    },
    {
      title: 'QR Proof',
      lines: [
        `Q^{T}Q=${exactMatrixToLatex(result.qtq)}`,
        `QR=${exactMatrixToLatex(result.product)}`,
        'The columns of Q are orthonormal, and R is upper triangular.',
      ],
      lineKinds: ['math', 'math', 'text'],
    },
    {
      title: 'QR Column Steps',
      lines: result.steps,
      lineKind: 'math',
    },
  ];
}

function columnProjectionLabel(input: MatrixColumnProjectionInput) {
  return `\\operatorname{projection}(${input.label},${input.vectorLabel})`;
}

function columnProjectionDetails(
  input: MatrixColumnProjectionInput,
  result: Extract<QrResult, { kind: 'success' }>,
  coordinates: ExactVector,
  projected: ExactVector,
  residual: ExactVector,
  residualCheck: ExactVector,
): DisplayDetailSection[] {
  const label = columnProjectionLabel(input);
  const explicitFormula = `\\operatorname{projection}(${input.label},${input.vectorLabel})=${exactMatrixToLatex(result.q)}\\cdot ${exactMatrixToLatex(result.q)}^{T}\\cdot ${input.vectorLabel}`;
  return [
    {
      title: 'Column Projection Facts',
      lines: [
        `Q=${exactMatrixToLatex(result.q)}`,
        `Q^{T}Q=${exactMatrixToLatex(result.qtq)}`,
        `Q^{T}${input.vectorLabel}=${exactVectorToColumnLatex(coordinates)}`,
      ],
      lineKind: 'math',
    },
    {
      title: 'Column Projection Proof',
      lines: [
        explicitFormula,
        `${label}=${exactVectorToColumnLatex(projected)}`,
        `${input.vectorLabel}-${label}=${exactVectorToColumnLatex(residual)}`,
        `Q^{T}(${input.vectorLabel}-${label})=${exactVectorToColumnLatex(residualCheck)}`,
        'The residual is orthogonal to every column of Q, so the projection lies in the column space.',
      ],
      lineKinds: ['math', 'math', 'math', 'math', 'text'],
    },
  ];
}

function leastSquaresDetails(
  input: MatrixLeastSquaresInput,
  qr: Extract<QrResult, { kind: 'success' }>,
  coordinates: ExactVector,
  solution: ExactVector,
  fitted: ExactVector,
  residual: ExactVector,
): {
  sections: DisplayDetailSection[];
  residualSquared: ExactScalar;
  residualNorm: ExactScalar | null;
  residualCheck: ExactVector;
} {
  const residualSquared = exactDotVectors(residual, residual);
  const residualNorm = exactScalarSquareRoot(residualSquared);
  const residualCheck = multiplyMatrixVector(transposeMatrix(qr.q), residual);
  return { residualSquared, residualNorm, residualCheck, sections: [
    {
      title: 'Least-Squares Solution',
      lines: [
        `${input.label}=QR`,
        `R x=Q^{T}${input.vectorLabel}`,
        `Q^{T}${input.vectorLabel}=${exactVectorToColumnLatex(coordinates)}`,
        `x_{\\mathrm{LS}}=${exactVectorToColumnLatex(solution)}`,
      ],
      lineKind: 'math',
    },
    {
      ...mixedDetailSection('Residual Vector', [
      [textPart('b̂='), mathPart(`${input.label}x_{\\mathrm{LS}}=${exactVectorToColumnLatex(fitted)}`)],
      [mathPart('r'), textPart('='), mathPart(input.vectorLabel), textPart('-b̂='), mathPart(exactVectorToColumnLatex(residual))],
      [mathPart(`\\Vert r\\Vert^{2}=${exactScalarToLatex(residualSquared)}`)],
      ...(residualNorm ? [[mathPart(`\\Vert r\\Vert=${exactScalarToLatex(residualNorm)}`)]] : []),
      ]),
      lines: [
        `\\hat{b}=${input.label}x_{\\mathrm{LS}}=${exactVectorToColumnLatex(fitted)}`,
        `r=${input.vectorLabel}-\\hat{b}=${exactVectorToColumnLatex(residual)}`,
        `\\left\\|r\\right\\|^{2}=${exactScalarToLatex(residualSquared)}`,
        ...(residualNorm ? [`\\left\\|r\\right\\|=${exactScalarToLatex(residualNorm)}`] : []),
      ],
    },
    {
      title: 'Least-Squares Proof',
      lines: [
        `Q^{T}(${input.vectorLabel}-${input.label}x_{\\mathrm{LS}})=${exactVectorToColumnLatex(residualCheck)}`,
        'The residual is orthogonal to the column space, so this x minimizes the squared residual.',
      ],
      lineKinds: ['math', 'text'],
    },
  ] };
}

function mathEvidence(value: LinearAlgebraCanonicalLeafEvidence) {
  return { kind: 'math' as const, value };
}

function leaf(canonicalLatex: string, mathJson: unknown, source: string) {
  return canonicalLeafEvidence(canonicalLatex, mathJson, source);
}

export function runMatrixQr(input: MatrixQrInput): MatrixResponse {
  const exactMatrix = exactInputMatrix(input);
  if (!exactMatrix) {
    return stop('QR factorization needs exact Matrix entries in this move.');
  }

  const result = exactQr(exactMatrix);
  if (result.kind === 'stop') {
    return stop(qrStopMessage(result));
  }

  const columns = result.r.length;
  const response = profileLinearAlgebraResult({
    resultLatex: `${input.label}=QR`,
    approxText: `${columns} QR ${columns === 1 ? 'column' : 'columns'}`,
    detailSections: qrDetails(result),
    warnings: [],
  });
  const operand = labelMathJson(input.label, exactMatrixMathJson(exactMatrix));
  const qNode = exactMatrixMathJson(result.q);
  const rNode = exactMatrixMathJson(result.r);
  const primaryLatex = `${input.label}=QR`;
  return attachLinearAlgebraCanonicalEvidence(response, {
    primary: leaf(primaryLatex, equationMathJson(operand, ['Multiply', qNode, rNode]), 'matrix.qr.native-factorization'),
    details: [
      mathEvidence(leaf(`Q=${exactMatrixToLatex(result.q)}`, equationMathJson('Q', qNode), 'matrix.qr.native-q')),
      mathEvidence(leaf(`R=${exactMatrixToLatex(result.r)}`, equationMathJson('R', rNode), 'matrix.qr.native-r')),
      mathEvidence(leaf(`Q^{T}Q=${exactMatrixToLatex(result.qtq)}`, equationMathJson(['Multiply', ['Transpose', qNode], qNode], exactMatrixMathJson(result.qtq)), 'matrix.qr.native-orthonormal-check')),
      mathEvidence(leaf(`QR=${exactMatrixToLatex(result.product)}`, equationMathJson(['Multiply', qNode, rNode], exactMatrixMathJson(result.product)), 'matrix.qr.native-product')),
      ...result.stepEvidence.map(mathEvidence),
    ],
  });
}

export function runMatrixColumnProjection(input: MatrixColumnProjectionInput): MatrixResponse {
  const exactMatrix = exactInputMatrix(input);
  const vector = exactVectorFromWire(input.exactVector) ?? exactVectorFromNumeric(input.vector);
  if (!exactMatrix || !vector) {
    return stop('Column projection needs exact Matrix and vector entries in this move.');
  }

  if (exactMatrix.length !== vector.length) {
    return stop('Column projection needs the vector length to match the Matrix row count.');
  }

  const qr = exactQr(exactMatrix);
  if (qr.kind === 'stop') {
    return stop(qrStopMessage(qr));
  }

  const qTranspose = transposeMatrix(qr.q);
  const coordinates = multiplyMatrixVector(qTranspose, vector);
  const projected = multiplyMatrixVector(qr.q, coordinates);
  const residual = exactSubtractVectors(vector, projected);
  const residualCheck = multiplyMatrixVector(qTranspose, residual);

  const response = profileLinearAlgebraResult({
    resultLatex: `${columnProjectionLabel(input)}=${exactVectorToColumnLatex(projected)}`,
    approxText: `projection in \\mathbb{R}^{${vector.length}}`,
    detailSections: columnProjectionDetails(input, qr, coordinates, projected, residual, residualCheck),
    warnings: [],
  });
  const matrixNode = labelMathJson(input.label, exactMatrixMathJson(exactMatrix));
  const vectorNode = labelMathJson(input.vectorLabel, exactVectorMathJson(vector));
  const qNode = exactMatrixMathJson(qr.q);
  const coordinatesNode = exactVectorMathJson(coordinates);
  const projectedNode = exactVectorMathJson(projected);
  const residualNode = exactVectorMathJson(residual);
  const labelLatex = columnProjectionLabel(input);
  const explicitFormula = `\\operatorname{projection}(${input.label},${input.vectorLabel})=${exactMatrixToLatex(qr.q)}\\cdot ${exactMatrixToLatex(qr.q)}^{T}\\cdot ${input.vectorLabel}`;
  const projectionNode = operatorMathJson('projection', ['List', matrixNode, vectorNode]);
  const primaryLatex = `${labelLatex}=${exactVectorToColumnLatex(projected)}`;
  return attachLinearAlgebraCanonicalEvidence(response, {
    primary: leaf(primaryLatex, equationMathJson(projectionNode, projectedNode), 'matrix.column-projection.native-projected-vector'),
    details: [
      mathEvidence(leaf(`Q=${exactMatrixToLatex(qr.q)}`, equationMathJson('Q', qNode), 'matrix.column-projection.native-q')),
      mathEvidence(leaf(`Q^{T}Q=${exactMatrixToLatex(qr.qtq)}`, equationMathJson(['Multiply', ['Transpose', qNode], qNode], exactMatrixMathJson(qr.qtq)), 'matrix.column-projection.native-orthonormal-check')),
      mathEvidence(leaf(`Q^{T}${input.vectorLabel}=${exactVectorToColumnLatex(coordinates)}`, equationMathJson(['Multiply', ['Transpose', qNode], vectorNode], coordinatesNode), 'matrix.column-projection.native-coordinates')),
      mathEvidence(leaf(explicitFormula, equationMathJson(projectionNode, ['Multiply', qNode, ['Transpose', qNode], vectorNode]), 'matrix.column-projection.native-formula')),
      mathEvidence(leaf(primaryLatex, equationMathJson(projectionNode, projectedNode), 'matrix.column-projection.native-projected-vector-detail')),
      mathEvidence(leaf(`${input.vectorLabel}-${labelLatex}=${exactVectorToColumnLatex(residual)}`, equationMathJson(['Subtract', vectorNode, projectionNode], residualNode), 'matrix.column-projection.native-residual')),
      mathEvidence(leaf(`Q^{T}(${input.vectorLabel}-${labelLatex})=${exactVectorToColumnLatex(residualCheck)}`, equationMathJson(['Multiply', ['Transpose', qNode], residualNode], exactVectorMathJson(residualCheck)), 'matrix.column-projection.native-residual-check')),
    ],
  });
}

export function runMatrixLeastSquares(input: MatrixLeastSquaresInput): MatrixResponse {
  const exactMatrix = exactInputMatrix(input);
  const vector = exactVectorFromWire(input.exactVector) ?? exactVectorFromNumeric(input.vector);
  if (!exactMatrix || !vector) {
    return stop('Least squares needs exact Matrix and vector entries in this move.');
  }

  if (exactMatrix.length !== vector.length) {
    return stop('Least squares needs the vector length to match the Matrix row count.');
  }

  const qr = exactQr(exactMatrix);
  if (qr.kind === 'stop') {
    return stop(qrStopMessage(qr));
  }

  const coordinates = multiplyMatrixVector(transposeMatrix(qr.q), vector);
  const solved = solveExactLinearSystem(qr.r, coordinates);
  if (solved.kind === 'stop') {
    return stop('Least squares could not solve the triangular QR system exactly.');
  }

  const fitted = multiplyMatrixVector(exactMatrix, solved.solution);
  const residual = exactSubtractVectors(vector, fitted);

  const readback = leastSquaresDetails(input, qr, coordinates, solved.solution, fitted, residual);
  const response = profileLinearAlgebraResult({
    resultLatex: `x_{\\mathrm{LS}}=${exactVectorToColumnLatex(solved.solution)}`,
    approxText: 'least-squares solution',
    detailSections: readback.sections,
    warnings: [],
  });
  const matrixNode = labelMathJson(input.label, exactMatrixMathJson(exactMatrix));
  const vectorNode = labelMathJson(input.vectorLabel, exactVectorMathJson(vector));
  const qNode = exactMatrixMathJson(qr.q);
  const rNode = exactMatrixMathJson(qr.r);
  const coordinatesNode = exactVectorMathJson(coordinates);
  const solutionNode = exactVectorMathJson(solved.solution);
  const fittedNode = exactVectorMathJson(fitted);
  const residualNode = exactVectorMathJson(residual);
  const lsNode = ['Subscript', 'x', 'LS'];
  const primaryLatex = `x_{\\mathrm{LS}}=${exactVectorToColumnLatex(solved.solution)}`;
  return attachLinearAlgebraCanonicalEvidence(response, {
    primary: leaf(primaryLatex, equationMathJson(lsNode, solutionNode), 'matrix.least-squares.native-solution'),
    details: [
      mathEvidence(leaf(`${input.label}=QR`, equationMathJson(matrixNode, ['Multiply', qNode, rNode]), 'matrix.least-squares.native-factorization')),
      mathEvidence(leaf(`R x=Q^{T}${input.vectorLabel}`, equationMathJson(['Multiply', rNode, 'x'], ['Multiply', ['Transpose', qNode], vectorNode]), 'matrix.least-squares.native-triangular-system')),
      mathEvidence(leaf(`Q^{T}${input.vectorLabel}=${exactVectorToColumnLatex(coordinates)}`, equationMathJson(['Multiply', ['Transpose', qNode], vectorNode], coordinatesNode), 'matrix.least-squares.native-coordinates')),
      mathEvidence(leaf(primaryLatex, equationMathJson(lsNode, solutionNode), 'matrix.least-squares.native-solution-detail')),
      mathEvidence(leaf(`${input.label}x_{\\mathrm{LS}}=${exactVectorToColumnLatex(fitted)}`, equationMathJson(['InvisibleOperator', matrixNode, lsNode], fittedNode), 'matrix.least-squares.native-fitted')),
      mathEvidence(leaf('r', 'r', 'matrix.least-squares.native-residual-symbol')),
      mathEvidence(leaf(input.vectorLabel, vectorNode, 'matrix.least-squares.native-rhs-symbol')),
      mathEvidence(leaf(exactVectorToColumnLatex(residual), residualNode, 'matrix.least-squares.native-residual-vector')),
      mathEvidence(leaf(`\\Vert r\\Vert^{2}=${exactScalarToLatex(readback.residualSquared)}`, equationMathJson(['Power', ['Norm', 'r'], 2], buildExactScalarNode(readback.residualSquared)), 'matrix.least-squares.native-residual-squared')),
      ...(readback.residualNorm ? [mathEvidence(leaf(`\\Vert r\\Vert=${exactScalarToLatex(readback.residualNorm)}`, equationMathJson(['Norm', 'r'], buildExactScalarNode(readback.residualNorm)), 'matrix.least-squares.native-residual-norm'))] : []),
      mathEvidence(leaf(`Q^{T}(${input.vectorLabel}-${input.label}x_{\\mathrm{LS}})=${exactVectorToColumnLatex(readback.residualCheck)}`, equationMathJson(['Multiply', ['Transpose', qNode], residualNode], exactVectorMathJson(readback.residualCheck)), 'matrix.least-squares.native-residual-check')),
    ],
  });
}
