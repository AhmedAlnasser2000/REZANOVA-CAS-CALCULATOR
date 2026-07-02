import type { DisplayDetailSection, ExactScalarWire, MatrixResponse } from '../../types/calculator';
import {
  addExactScalars,
  divideExactScalars,
  exactScalarIsZero,
  multiplyExactScalars,
  negateExactScalar,
  subtractExactScalars,
  type ExactScalar,
} from '../algebra/polynomial-core';
import {
  validateExactMatrix,
  scalar,
  type ExactMatrix,
  type ExactMatrixStopReason,
  type ExactVector,
} from './exact-matrix-core';
import {
  exactMatrixFromNumeric,
  exactMatrixFromWire,
  exactMatrixToLatex,
  exactScalarToLatex,
  exactVectorFromNumeric,
  exactVectorFromWire,
  exactVectorToColumnLatex,
} from './exact-matrix-format';

export type MatrixLuInput = {
  label: string;
  matrix: number[][];
  exactMatrix?: ExactScalarWire[][];
};

export type MatrixPluInput = MatrixLuInput;

export type MatrixFactorSolveInput = MatrixLuInput & {
  rhs: number[];
  exactRhs?: ExactScalarWire[];
  rhsLabel: string;
};

type LuResult =
  | { kind: 'success'; lower: ExactMatrix; upper: ExactMatrix; determinant: ExactScalar }
  | { kind: 'needs-pivot'; pivotIndex: number }
  | { kind: 'stop'; reason: ExactMatrixStopReason | 'non-square-matrix' };
type LuStopReason = Extract<LuResult, { kind: 'stop' }>['reason'];
type PluResult =
  | {
      kind: 'success';
      permutation: ExactMatrix;
      lower: ExactMatrix;
      upper: ExactMatrix;
      determinant: ExactScalar;
      swaps: Array<{ rowA: number; rowB: number }>;
    }
  | { kind: 'needs-pivot'; pivotIndex: number }
  | { kind: 'stop'; reason: ExactMatrixStopReason | 'non-square-matrix' };

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

function cloneExactMatrix(matrix: ExactMatrix): ExactMatrix {
  return matrix.map((row) => [...row]);
}

function swapRows(matrix: ExactMatrix, left: number, right: number) {
  [matrix[left], matrix[right]] = [matrix[right], matrix[left]];
}

function exactInputMatrix(input: MatrixLuInput): ExactMatrix | null {
  return exactMatrixFromWire(input.exactMatrix) ?? exactMatrixFromNumeric(input.matrix);
}

function exactInputVector(input: MatrixFactorSolveInput): ExactVector | null {
  return exactVectorFromWire(input.exactRhs) ?? exactVectorFromNumeric(input.rhs);
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

function multiplyMatrixVector(matrix: ExactMatrix, vector: ExactVector): ExactVector {
  return matrix.map((row) =>
    row.reduce(
      (sum, value, index) => addExactScalars(sum, multiplyExactScalars(value, vector[index])),
      scalar(0),
    ));
}

function diagonalProduct(matrix: ExactMatrix): ExactScalar {
  return matrix.reduce((product, row, index) => multiplyExactScalars(product, row[index]), scalar(1));
}

function determinantFromUpper(upper: ExactMatrix, swapCount: number): ExactScalar {
  const product = diagonalProduct(upper);
  return swapCount % 2 === 1 ? negateExactScalar(product) : product;
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

function formatSwap(rowA: number, rowB: number) {
  return `R_{${rowA + 1}}\\leftrightarrow R_{${rowB + 1}}`;
}

function pluFactorization(matrix: ExactMatrix): PluResult {
  const validated = validateExactMatrix(matrix);
  if (validated.kind === 'stop') {
    return validated;
  }
  if (!validated.shape.isSquare) {
    return { kind: 'stop', reason: 'non-square-matrix' };
  }

  const size = validated.shape.rows;
  const working = cloneExactMatrix(validated.matrix);
  const permutation = identityMatrix(size);
  const lower = identityMatrix(size);
  const swaps: Array<{ rowA: number; rowB: number }> = [];

  for (let pivot = 0; pivot < size; pivot += 1) {
    let pivotRow = pivot;
    while (pivotRow < size && exactScalarIsZero(working[pivotRow][pivot])) {
      pivotRow += 1;
    }
    if (pivotRow === size) {
      return { kind: 'needs-pivot', pivotIndex: pivot };
    }

    if (pivotRow !== pivot) {
      swapRows(working, pivot, pivotRow);
      swapRows(permutation, pivot, pivotRow);
      for (let column = 0; column < pivot; column += 1) {
        [lower[pivot][column], lower[pivotRow][column]] = [lower[pivotRow][column], lower[pivot][column]];
      }
      swaps.push({ rowA: pivot, rowB: pivotRow });
    }

    for (let row = pivot + 1; row < size; row += 1) {
      const divided = divideExactScalars(working[row][pivot], working[pivot][pivot]);
      if (!divided) {
        return { kind: 'needs-pivot', pivotIndex: pivot };
      }
      lower[row][pivot] = divided;
      for (let column = pivot; column < size; column += 1) {
        working[row][column] = subtractExactScalars(
          working[row][column],
          multiplyExactScalars(divided, working[pivot][column]),
        );
      }
    }
  }

  const upper = working.map((row, rowIndex) =>
    row.map((value, columnIndex) => (columnIndex < rowIndex ? scalar(0) : value)));
  return {
    kind: 'success',
    permutation,
    lower,
    upper,
    determinant: determinantFromUpper(upper, swaps.length),
    swaps,
  };
}

function prefixedMatrixLabel(prefix: string, label: string) {
  return /^[A-Z]$/.test(label) ? `${prefix}${label}` : `${prefix}\\left(${label}\\right)`;
}

function prefixedVectorLabel(prefix: string, label: string) {
  return /^[a-z]$/.test(label) ? `${prefix}${label}` : `${prefix}\\left(${label}\\right)`;
}

function pluDetails(input: {
  label: string;
  original: ExactMatrix;
  permutation: ExactMatrix;
  lower: ExactMatrix;
  upper: ExactMatrix;
  determinant: ExactScalar;
  swaps: Array<{ rowA: number; rowB: number }>;
}): DisplayDetailSection[] {
  const permutedLabel = prefixedMatrixLabel('P', input.label);
  return [
    {
      title: 'PLU Factors',
      lines: [
        `P=${exactMatrixToLatex(input.permutation)}`,
        `L=${exactMatrixToLatex(input.lower)}`,
        `U=${exactMatrixToLatex(input.upper)}`,
      ],
      lineKind: 'math',
    },
    {
      title: 'PLU Row Swaps',
      lines: input.swaps.length > 0
        ? input.swaps.map((swap) => formatSwap(swap.rowA, swap.rowB))
        : ['\\text{No row swaps were needed.}'],
      lineKind: 'math',
    },
    {
      title: 'PLU Proof',
      lines: [
        `${permutedLabel}=LU`,
        `${permutedLabel}=${exactMatrixToLatex(multiplyExactMatrices(input.permutation, input.original))}`,
        `LU=${exactMatrixToLatex(multiplyExactMatrices(input.lower, input.upper))}`,
        `\\det(${input.label})=(-1)^{${input.swaps.length}}\\prod_i U_{ii}=${exactScalarToLatex(input.determinant)}`,
        'The permutation matrix P records the row swaps, so the factorization keeps pivoting visible.',
      ],
      lineKinds: ['math', 'math', 'math', 'math', 'text'],
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

export function runMatrixPlu(input: MatrixPluInput): MatrixResponse {
  const exactMatrix = exactInputMatrix(input);
  if (!exactMatrix) {
    return {
      warnings: [],
      error: 'PLU factorization needs exact Matrix entries in this move.',
    };
  }

  const factored = pluFactorization(exactMatrix);
  if (factored.kind === 'stop') {
    return {
      warnings: [],
      error: exactStopReasonToMessage(factored.reason),
    };
  }
  if (factored.kind === 'needs-pivot') {
    return {
      warnings: [],
      error: `PLU stopped at pivot ${factored.pivotIndex + 1} because no nonzero pivot was available in that column.`,
    };
  }

  return {
    resultLatex: `${prefixedMatrixLabel('P', input.label)}=LU`,
    approxText: `det(${input.label}) = ${exactScalarToLatex(factored.determinant)}`,
    detailSections: pluDetails({
      label: input.label,
      original: exactMatrix,
      permutation: factored.permutation,
      lower: factored.lower,
      upper: factored.upper,
      determinant: factored.determinant,
      swaps: factored.swaps,
    }),
    warnings: [],
  };
}

function forwardSubstitute(lower: ExactMatrix, rhs: ExactVector): ExactVector | null {
  const solution: ExactVector = [];
  for (let row = 0; row < lower.length; row += 1) {
    let total = scalar(0);
    for (let column = 0; column < row; column += 1) {
      total = addExactScalars(total, multiplyExactScalars(lower[row][column], solution[column]));
    }
    const numerator = subtractExactScalars(rhs[row], total);
    const value = divideExactScalars(numerator, lower[row][row]);
    if (!value) {
      return null;
    }
    solution.push(value);
  }
  return solution;
}

function backSubstitute(upper: ExactMatrix, rhs: ExactVector): ExactVector | null {
  const solution = Array.from({ length: upper.length }, () => scalar(0));
  for (let row = upper.length - 1; row >= 0; row -= 1) {
    let total = scalar(0);
    for (let column = row + 1; column < upper.length; column += 1) {
      total = addExactScalars(total, multiplyExactScalars(upper[row][column], solution[column]));
    }
    const numerator = subtractExactScalars(rhs[row], total);
    const value = divideExactScalars(numerator, upper[row][row]);
    if (!value) {
      return null;
    }
    solution[row] = value;
  }
  return solution;
}

function factorSolveStop(message: string): MatrixResponse {
  return {
    warnings: [],
    error: message,
  };
}

function luSolveDetails(input: {
  label: string;
  rhsLabel: string;
  lower: ExactMatrix;
  upper: ExactMatrix;
  intermediate: ExactVector;
  solution: ExactVector;
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
      title: 'Factor Solve Proof',
      lines: [
        `${input.label}=LU`,
        `Ly=${input.rhsLabel}`,
        `y=${exactVectorToColumnLatex(input.intermediate)}`,
        'Ux=y',
        `x=${exactVectorToColumnLatex(input.solution)}`,
      ],
      lineKinds: ['math', 'math', 'math', 'math', 'math'],
    },
  ];
}

function pluSolveDetails(input: {
  label: string;
  rhsLabel: string;
  permutation: ExactMatrix;
  lower: ExactMatrix;
  upper: ExactMatrix;
  permutedRhs: ExactVector;
  intermediate: ExactVector;
  solution: ExactVector;
  swaps: Array<{ rowA: number; rowB: number }>;
}): DisplayDetailSection[] {
  return [
    {
      title: 'PLU Factors',
      lines: [
        `P=${exactMatrixToLatex(input.permutation)}`,
        `L=${exactMatrixToLatex(input.lower)}`,
        `U=${exactMatrixToLatex(input.upper)}`,
      ],
      lineKind: 'math',
    },
    {
      title: 'PLU Row Swaps',
      lines: input.swaps.length > 0
        ? input.swaps.map((swap) => formatSwap(swap.rowA, swap.rowB))
        : ['\\text{No row swaps were needed.}'],
      lineKind: 'math',
    },
    {
      title: 'Factor Solve Proof',
      lines: [
        `${prefixedMatrixLabel('P', input.label)}=LU`,
        `${prefixedVectorLabel('P', input.rhsLabel)}=${exactVectorToColumnLatex(input.permutedRhs)}`,
        `Ly=${prefixedVectorLabel('P', input.rhsLabel)}`,
        `y=${exactVectorToColumnLatex(input.intermediate)}`,
        'Ux=y',
        `x=${exactVectorToColumnLatex(input.solution)}`,
      ],
      lineKinds: ['math', 'math', 'math', 'math', 'math', 'math'],
    },
  ];
}

export function runMatrixLuSolve(input: MatrixFactorSolveInput): MatrixResponse {
  const exactMatrix = exactInputMatrix(input);
  const rhs = exactInputVector(input);
  if (!exactMatrix || !rhs) {
    return factorSolveStop('LU solve needs exact Matrix and RHS vector entries in this move.');
  }
  if (rhs.length !== exactMatrix.length) {
    return factorSolveStop('The RHS vector length must match the matrix row count.');
  }

  const factored = factorLuNoPivot(exactMatrix);
  if (factored.kind === 'stop') {
    return factorSolveStop(exactStopReasonToMessage(factored.reason));
  }
  if (factored.kind === 'needs-pivot') {
    return factorSolveStop(`LU solve stopped at pivot ${factored.pivotIndex + 1}. Use plusolve(...) to keep the row swap visible.`);
  }

  const intermediate = forwardSubstitute(factored.lower, rhs);
  const solution = intermediate ? backSubstitute(factored.upper, intermediate) : null;
  if (!intermediate || !solution) {
    return factorSolveStop('LU solve stopped because the factorization has a zero pivot.');
  }

  return {
    resultLatex: `x=${exactVectorToColumnLatex(solution)}`,
    approxText: 'LU solve',
    detailSections: luSolveDetails({
      label: input.label,
      rhsLabel: input.rhsLabel,
      lower: factored.lower,
      upper: factored.upper,
      intermediate,
      solution,
    }),
    warnings: [],
  };
}

export function runMatrixPluSolve(input: MatrixFactorSolveInput): MatrixResponse {
  const exactMatrix = exactInputMatrix(input);
  const rhs = exactInputVector(input);
  if (!exactMatrix || !rhs) {
    return factorSolveStop('PLU solve needs exact Matrix and RHS vector entries in this move.');
  }
  if (rhs.length !== exactMatrix.length) {
    return factorSolveStop('The RHS vector length must match the matrix row count.');
  }

  const factored = pluFactorization(exactMatrix);
  if (factored.kind === 'stop') {
    return factorSolveStop(exactStopReasonToMessage(factored.reason));
  }
  if (factored.kind === 'needs-pivot') {
    return factorSolveStop(`PLU solve stopped at pivot ${factored.pivotIndex + 1} because no nonzero pivot was available in that column.`);
  }

  const permutedRhs = multiplyMatrixVector(factored.permutation, rhs);
  const intermediate = forwardSubstitute(factored.lower, permutedRhs);
  const solution = intermediate ? backSubstitute(factored.upper, intermediate) : null;
  if (!intermediate || !solution) {
    return factorSolveStop('PLU solve stopped because the factorization has a zero pivot.');
  }

  return {
    resultLatex: `x=${exactVectorToColumnLatex(solution)}`,
    approxText: 'PLU solve',
    detailSections: pluSolveDetails({
      label: input.label,
      rhsLabel: input.rhsLabel,
      permutation: factored.permutation,
      lower: factored.lower,
      upper: factored.upper,
      permutedRhs,
      intermediate,
      solution,
      swaps: factored.swaps,
    }),
    warnings: [],
  };
}
