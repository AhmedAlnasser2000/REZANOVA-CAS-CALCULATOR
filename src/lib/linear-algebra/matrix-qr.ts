import type { DisplayDetailSection, ExactScalarWire, MatrixResponse } from '../../types/calculator';
import {
  addExactScalars,
  divideExactScalars,
  exactScalarIsZero,
  multiplyExactScalars,
  type ExactScalar,
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
import { exactDotVectors, exactScalarSquareRoot, exactScaleVector, exactSubtractVectors } from './exact-vector-core';
import { exactMatrixDimensionLimitMessage } from './dimension-contract';
import { profileLinearAlgebraResult } from '../display/printer';

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
  | { kind: 'success'; q: ExactMatrix; r: ExactMatrix; product: ExactMatrix; qtq: ExactMatrix; steps: string[] }
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

  for (let column = 0; column < columns; column += 1) {
    const original = matrixColumn(validation.matrix, column);
    let residual = [...original];
    steps.push(`a_{${column + 1}}=${exactVectorToColumnLatex(original)}`);

    for (let previous = 0; previous < qColumns.length; previous += 1) {
      const coefficient = exactDotVectors(qColumns[previous], original);
      r[previous][column] = coefficient;
      residual = exactSubtractVectors(residual, exactScaleVector(qColumns[previous], coefficient));
      steps.push(`r_{${previous + 1}${column + 1}}=q_{${previous + 1}}^{T}a_{${column + 1}}=${exactScalarToLatex(coefficient)}`);
    }

    const normSquared = exactDotVectors(residual, residual);
    if (exactScalarIsZero(normSquared)) {
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
    steps.push(`r_{${column + 1}${column + 1}}=\\left\\|u_{${column + 1}}\\right\\|=${exactScalarToLatex(norm)}`);
    steps.push(`q_{${column + 1}}=${exactVectorToColumnLatex(qColumn)}`);
  }

  const q = matrixFromColumns(qColumns);
  const qtq = multiplyExactMatrices(transposeMatrix(q), q);
  const product = multiplyExactMatrices(q, r);
  return { kind: 'success', q, r, product, qtq, steps };
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
  return `\\operatorname{proj}_{\\operatorname{Col}(${input.label})}(${input.vectorLabel})`;
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
        `${label}=QQ^{T}${input.vectorLabel}`,
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
): DisplayDetailSection[] {
  const residualSquared = exactDotVectors(residual, residual);
  const residualNorm = exactScalarSquareRoot(residualSquared);
  const residualLines = [
    `\\hat{b}=${input.label}x_{\\mathrm{LS}}=${exactVectorToColumnLatex(fitted)}`,
    `r=${input.vectorLabel}-\\hat{b}=${exactVectorToColumnLatex(residual)}`,
    `\\left\\|r\\right\\|^{2}=${exactScalarToLatex(residualSquared)}`,
    ...(residualNorm ? [`\\left\\|r\\right\\|=${exactScalarToLatex(residualNorm)}`] : []),
  ];

  return [
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
      title: 'Residual Vector',
      lines: residualLines,
      lineKind: 'math',
    },
    {
      title: 'Least-Squares Proof',
      lines: [
        `Q^{T}(${input.vectorLabel}-${input.label}x_{\\mathrm{LS}})=${exactVectorToColumnLatex(multiplyMatrixVector(transposeMatrix(qr.q), residual))}`,
        'The residual is orthogonal to the column space, so this x minimizes the squared residual.',
      ],
      lineKinds: ['math', 'text'],
    },
  ];
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
  return profileLinearAlgebraResult({
    resultLatex: `${input.label}=QR`,
    approxText: `${columns} QR ${columns === 1 ? 'column' : 'columns'}`,
    detailSections: qrDetails(result),
    warnings: [],
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

  return profileLinearAlgebraResult({
    resultLatex: `${columnProjectionLabel(input)}=${exactVectorToColumnLatex(projected)}`,
    approxText: `projection in \\mathbb{R}^{${vector.length}}`,
    detailSections: columnProjectionDetails(input, qr, coordinates, projected, residual, residualCheck),
    warnings: [],
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

  return profileLinearAlgebraResult({
    resultLatex: `x_{\\mathrm{LS}}=${exactVectorToColumnLatex(solved.solution)}`,
    approxText: 'least-squares solution',
    detailSections: leastSquaresDetails(input, qr, coordinates, solved.solution, fitted, residual),
    warnings: [],
  });
}
