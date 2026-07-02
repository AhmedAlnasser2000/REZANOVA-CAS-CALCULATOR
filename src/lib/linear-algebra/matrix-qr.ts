import type { DisplayDetailSection, ExactScalarWire, MatrixResponse } from '../../types/calculator';
import {
  addExactScalars,
  divideExactScalars,
  exactScalarIsZero,
  multiplyExactScalars,
  type ExactScalar,
} from '../algebra/polynomial-core';
import { scalar, validateExactMatrix, type ExactMatrix, type ExactMatrixStopReason, type ExactVector } from './exact-matrix-core';
import { exactMatrixFromNumeric, exactMatrixFromWire, exactMatrixToLatex, exactScalarToLatex, exactVectorToColumnLatex } from './exact-matrix-format';
import { exactDotVectors, exactScalarSquareRoot, exactScaleVector, exactSubtractVectors } from './exact-vector-core';

export type MatrixQrInput = {
  label: string;
  matrix: number[][];
  exactMatrix?: ExactScalarWire[][];
};

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
      return 'QR factorization currently supports matrices up to 6 by 6.';
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
  return {
    resultLatex: `${input.label}=QR`,
    approxText: `${columns} QR ${columns === 1 ? 'column' : 'columns'}`,
    detailSections: qrDetails(result),
    warnings: [],
  };
}
