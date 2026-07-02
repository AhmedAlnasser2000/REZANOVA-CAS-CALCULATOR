import type { DisplayDetailSection, ExactScalarWire, MatrixResponse } from '../../types/calculator';
import {
  addExactScalars,
  divideExactScalars,
  exactScalarIsZero,
  multiplyExactScalars,
  subtractExactScalars,
  type ExactScalar,
} from '../algebra/polynomial-core';
import {
  validateExactMatrix,
  scalar,
  type ExactMatrix,
  type ExactMatrixStopReason,
} from './exact-matrix-core';
import {
  exactMatrixFromNumeric,
  exactMatrixFromWire,
  exactMatrixToLatex,
  exactScalarToLatex,
} from './exact-matrix-format';

export type MatrixLuInput = {
  label: string;
  matrix: number[][];
  exactMatrix?: ExactScalarWire[][];
};

type LuResult =
  | { kind: 'success'; lower: ExactMatrix; upper: ExactMatrix; determinant: ExactScalar }
  | { kind: 'needs-pivot'; pivotIndex: number }
  | { kind: 'stop'; reason: ExactMatrixStopReason | 'non-square-matrix' };
type LuStopReason = Extract<LuResult, { kind: 'stop' }>['reason'];

function zeroMatrix(size: number): ExactMatrix {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => scalar(0)));
}

function identityMatrix(size: number): ExactMatrix {
  const matrix = zeroMatrix(size);
  for (let index = 0; index < size; index += 1) {
    matrix[index][index] = scalar(1);
  }
  return matrix;
}

function exactInputMatrix(input: MatrixLuInput): ExactMatrix | null {
  return exactMatrixFromWire(input.exactMatrix) ?? exactMatrixFromNumeric(input.matrix);
}

function exactStopReasonToMessage(reason: LuStopReason): string {
  switch (reason) {
    case 'dimension-limit':
      return 'LU factorization currently supports matrices up to 6 by 6.';
    case 'non-square-matrix':
      return 'LU factorization needs a square matrix.';
    case 'scalar-growth-limit':
      return 'This LU factorization exceeded the exact Matrix arithmetic limit.';
    case 'empty-matrix':
    case 'ragged-matrix':
      return 'LU factorization needs a complete square matrix.';
    default:
      return 'LU factorization could not read this Matrix exactly.';
  }
}

function scalarSumProduct(row: ExactScalar[], column: ExactScalar[], through: number): ExactScalar {
  let total = scalar(0);
  for (let index = 0; index < through; index += 1) {
    total = addExactScalars(total, multiplyExactScalars(row[index], column[index]));
  }
  return total;
}

function upperColumn(upper: ExactMatrix, column: number): ExactScalar[] {
  return upper.map((row) => row[column]);
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

function diagonalProduct(matrix: ExactMatrix): ExactScalar {
  return matrix.reduce((product, row, index) => multiplyExactScalars(product, row[index]), scalar(1));
}

function factorLuNoPivot(matrix: ExactMatrix): LuResult {
  const validated = validateExactMatrix(matrix);
  if (validated.kind === 'stop') {
    return validated;
  }
  if (!validated.shape.isSquare) {
    return { kind: 'stop', reason: 'non-square-matrix' };
  }

  const size = validated.shape.rows;
  const lower = identityMatrix(size);
  const upper = zeroMatrix(size);

  for (let pivot = 0; pivot < size; pivot += 1) {
    for (let column = pivot; column < size; column += 1) {
      upper[pivot][column] = subtractExactScalars(
        validated.matrix[pivot][column],
        scalarSumProduct(lower[pivot], upperColumn(upper, column), pivot),
      );
    }

    if (exactScalarIsZero(upper[pivot][pivot])) {
      return { kind: 'needs-pivot', pivotIndex: pivot };
    }

    for (let row = pivot + 1; row < size; row += 1) {
      const numerator = subtractExactScalars(
        validated.matrix[row][pivot],
        scalarSumProduct(lower[row], upperColumn(upper, pivot), pivot),
      );
      const divided = divideExactScalars(numerator, upper[pivot][pivot]);
      if (!divided) {
        return { kind: 'needs-pivot', pivotIndex: pivot };
      }
      lower[row][pivot] = divided;
    }
  }

  return {
    kind: 'success',
    lower,
    upper,
    determinant: diagonalProduct(upper),
  };
}

function luDetails(input: {
  label: string;
  lower: ExactMatrix;
  upper: ExactMatrix;
  product: ExactMatrix;
  determinant: ExactScalar;
}): DisplayDetailSection[] {
  return [
    {
      title: 'LU Factors',
      lines: [
        `L=${exactMatrixToLatex(input.lower)}`,
        `U=${exactMatrixToLatex(input.upper)}`,
      ],
      lineKind: 'math',
    },
    {
      title: 'LU Proof',
      lines: [
        `${input.label}=LU`,
        `LU=${exactMatrixToLatex(input.product)}`,
        `\\det(${input.label})=\\prod_i U_{ii}=${exactScalarToLatex(input.determinant)}`,
        'No row swaps were needed, so this is an LU factorization. If a pivot is zero, use PLU so the permutation is visible.',
      ],
      lineKinds: ['math', 'math', 'math', 'text'],
    },
  ];
}

export function runMatrixLu(input: MatrixLuInput): MatrixResponse {
  const exactMatrix = exactInputMatrix(input);
  if (!exactMatrix) {
    return {
      warnings: [],
      error: 'LU factorization needs exact Matrix entries in this move.',
    };
  }

  const factored = factorLuNoPivot(exactMatrix);
  if (factored.kind === 'stop') {
    return {
      warnings: [],
      error: exactStopReasonToMessage(factored.reason),
    };
  }
  if (factored.kind === 'needs-pivot') {
    return {
      warnings: [],
      error: `LU without row swaps stopped at pivot ${factored.pivotIndex + 1}. Use plu(...) to keep the row swap visible.`,
      detailSections: [{
        title: 'LU Proof',
        lines: [
          `pivot ${factored.pivotIndex + 1} is zero before elimination.`,
          'Plain LU does not swap rows. PLU is the row-swap-aware factorization.',
        ],
      }],
    };
  }

  const product = multiplyExactMatrices(factored.lower, factored.upper);
  return {
    resultLatex: `${input.label}=LU`,
    approxText: `det(${input.label}) = ${exactScalarToLatex(factored.determinant)}`,
    detailSections: luDetails({
      label: input.label,
      lower: factored.lower,
      upper: factored.upper,
      product,
      determinant: factored.determinant,
    }),
    warnings: [],
  };
}
