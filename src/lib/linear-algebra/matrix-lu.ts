import type { DisplayDetailSection, ExactScalarWire, MatrixResponse } from '../../types/calculator';
import {
  addExactScalars,
  divideExactScalars,
  exactScalarIsZero,
  multiplyExactScalars,
  negateExactScalar,
  subtractExactScalars,
  type ExactScalar,
  buildExactScalarNode,
} from '../algebra/polynomial-core';
import {
  validateExactMatrix,
  scalar,
  type ExactMatrix,
  type ExactMatrixStopReason,
  type ExactRowOperation,
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
import { formatRowOperation } from './row-operation-readback';
import { exactMatrixDimensionLimitMessage } from './dimension-contract';
import { profileLinearAlgebraResult } from '../display/printer';
import {
  attachLinearAlgebraCanonicalEvidence,
  canonicalLeafEvidence,
  equationMathJson,
  exactMatrixMathJson,
  exactVectorMathJson,
  labelMathJson,
  rowOperationEvidence,
  textMathJson,
  type LinearAlgebraCanonicalDetailEvidence,
} from './canonical-evidence';

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
  | { kind: 'success'; lower: ExactMatrix; upper: ExactMatrix; determinant: ExactScalar; rowOperations: ExactRowOperation[] }
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
      rowOperations: ExactRowOperation[];
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
      return exactMatrixDimensionLimitMessage('LU/PLU factorization');
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
  const rowOperations: ExactRowOperation[] = [];

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
      if (!exactScalarIsZero(divided)) {
        rowOperations.push({ kind: 'eliminate', targetRow: row, pivotRow: pivot, factor: divided });
      }
    }
  }

  return {
    kind: 'success',
    lower,
    upper,
    determinant: diagonalProduct(upper),
    rowOperations,
  };
}

function factorizationRowStepsSection(rowOperations: readonly ExactRowOperation[]): DisplayDetailSection {
  const lines = rowOperations
    .map(formatRowOperation)
    .filter((line): line is string => Boolean(line));
  return {
    title: 'Factorization Row Steps',
    lines: lines.length > 0
      ? lines
      : ['No row operations were needed to reach the upper factor.'],
    lineKind: lines.length > 0 ? 'math' : 'text',
  };
}

function luDetails(input: {
  label: string;
  lower: ExactMatrix;
  upper: ExactMatrix;
  product: ExactMatrix;
  determinant: ExactScalar;
  rowOperations: ExactRowOperation[];
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
    factorizationRowStepsSection(input.rowOperations),
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

function mathEvidence(canonicalLatex: string, mathJson: unknown, source: string) {
  return {
    kind: 'math' as const,
    value: canonicalLeafEvidence(canonicalLatex, mathJson, source),
  };
}

function factorRowEvidence(
  operations: readonly ExactRowOperation[],
  source: string,
): LinearAlgebraCanonicalDetailEvidence[] {
  return operations.flatMap((operation, index) => {
    const presentation = formatRowOperation(operation);
    return presentation ? [rowOperationEvidence(presentation, operation, `${source}-${index}`)] : [];
  });
}

function swapEvidence(
  swaps: readonly { rowA: number; rowB: number }[],
  source: string,
): LinearAlgebraCanonicalDetailEvidence[] {
  return swaps.length > 0
    ? swaps.map((swap, index) => rowOperationEvidence(
        formatSwap(swap.rowA, swap.rowB),
        { kind: 'swap', rowA: swap.rowA, rowB: swap.rowB },
        `${source}-${index}`,
      ))
    : [mathEvidence(
        '\\text{No row swaps were needed.}',
        textMathJson('No row swaps were needed.'),
        `${source}-none`,
      )];
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
  const rowOperations: ExactRowOperation[] = [];

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
      rowOperations.push({ kind: 'swap', rowA: pivot, rowB: pivotRow });
    }

    for (let row = pivot + 1; row < size; row += 1) {
      const divided = divideExactScalars(working[row][pivot], working[pivot][pivot]);
      if (!divided) {
        return { kind: 'needs-pivot', pivotIndex: pivot };
      }
      lower[row][pivot] = divided;
      if (!exactScalarIsZero(divided)) {
        rowOperations.push({ kind: 'eliminate', targetRow: row, pivotRow: pivot, factor: divided });
      }
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
    rowOperations,
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
  rowOperations: ExactRowOperation[];
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
    factorizationRowStepsSection(input.rowOperations),
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
        lineKind: 'text',
      }],
    };
  }

  const product = multiplyExactMatrices(factored.lower, factored.upper);
  const response = profileLinearAlgebraResult({
    resultLatex: `${input.label}=LU`,
    approxText: `det(${input.label}) = ${exactScalarToLatex(factored.determinant)}`,
    detailSections: luDetails({
      label: input.label,
      lower: factored.lower,
      upper: factored.upper,
      product,
      determinant: factored.determinant,
      rowOperations: factored.rowOperations,
    }),
    warnings: [],
  });
  const operand = labelMathJson(input.label, exactMatrixMathJson(exactMatrix));
  const lowerNode = exactMatrixMathJson(factored.lower);
  const upperNode = exactMatrixMathJson(factored.upper);
  const factorNode = ['Multiply', lowerNode, upperNode];
  const primaryLatex = `${input.label}=LU`;
  return attachLinearAlgebraCanonicalEvidence(response, {
    primary: canonicalLeafEvidence(primaryLatex, equationMathJson(operand, factorNode), 'matrix.lu.native-factorization'),
    details: [
      mathEvidence(`L=${exactMatrixToLatex(factored.lower)}`, equationMathJson('L', lowerNode), 'matrix.lu.native-lower'),
      mathEvidence(`U=${exactMatrixToLatex(factored.upper)}`, equationMathJson('U', upperNode), 'matrix.lu.native-upper'),
      ...factorRowEvidence(factored.rowOperations, 'matrix.lu.native-row-operation'),
      mathEvidence(primaryLatex, equationMathJson(operand, factorNode), 'matrix.lu.native-factorization-detail'),
      mathEvidence(`LU=${exactMatrixToLatex(product)}`, equationMathJson(factorNode, exactMatrixMathJson(product)), 'matrix.lu.native-product'),
      mathEvidence(`\\det(${input.label})=\\prod_i U_{ii}=${exactScalarToLatex(factored.determinant)}`, ['Equal', ['Determinant', operand], ['Equal', ['Product', 'U_ii', ['Tuple', 'i']], buildExactScalarNode(factored.determinant)]], 'matrix.lu.native-determinant'),
    ],
  });
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

  const response = profileLinearAlgebraResult({
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
      rowOperations: factored.rowOperations,
    }),
    warnings: [],
  });
  const operand = labelMathJson(input.label, exactMatrixMathJson(exactMatrix));
  const permutationNode = exactMatrixMathJson(factored.permutation);
  const lowerNode = exactMatrixMathJson(factored.lower);
  const upperNode = exactMatrixMathJson(factored.upper);
  const permutedNode = ['Multiply', permutationNode, operand];
  const factorNode = ['Multiply', lowerNode, upperNode];
  const permutedLatex = prefixedMatrixLabel('P', input.label);
  const primaryLatex = `${permutedLatex}=LU`;
  const permutedProduct = multiplyExactMatrices(factored.permutation, exactMatrix);
  const factorProduct = multiplyExactMatrices(factored.lower, factored.upper);
  return attachLinearAlgebraCanonicalEvidence(response, {
    primary: canonicalLeafEvidence(primaryLatex, equationMathJson(permutedNode, factorNode), 'matrix.plu.native-factorization'),
    details: [
      mathEvidence(`P=${exactMatrixToLatex(factored.permutation)}`, equationMathJson('P', permutationNode), 'matrix.plu.native-permutation'),
      mathEvidence(`L=${exactMatrixToLatex(factored.lower)}`, equationMathJson('L', lowerNode), 'matrix.plu.native-lower'),
      mathEvidence(`U=${exactMatrixToLatex(factored.upper)}`, equationMathJson('U', upperNode), 'matrix.plu.native-upper'),
      ...swapEvidence(factored.swaps, 'matrix.plu.native-swap'),
      ...factorRowEvidence(factored.rowOperations, 'matrix.plu.native-row-operation'),
      mathEvidence(primaryLatex, equationMathJson(permutedNode, factorNode), 'matrix.plu.native-factorization-detail'),
      mathEvidence(`${permutedLatex}=${exactMatrixToLatex(permutedProduct)}`, equationMathJson(permutedNode, exactMatrixMathJson(permutedProduct)), 'matrix.plu.native-permuted-product'),
      mathEvidence(`LU=${exactMatrixToLatex(factorProduct)}`, equationMathJson(factorNode, exactMatrixMathJson(factorProduct)), 'matrix.plu.native-factor-product'),
      mathEvidence(`\\det(${input.label})=(-1)^{${factored.swaps.length}}\\prod_i U_{ii}=${exactScalarToLatex(factored.determinant)}`, ['Equal', ['Determinant', operand], ['Equal', ['InvisibleOperator', ['Power', ['Delimiter', -1], factored.swaps.length], ['Product', 'U_ii', ['Tuple', 'i']]], buildExactScalarNode(factored.determinant)]], 'matrix.plu.native-determinant'),
    ],
  });
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
  rowOperations: ExactRowOperation[];
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
    factorizationRowStepsSection(input.rowOperations),
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
  rowOperations: ExactRowOperation[];
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
    factorizationRowStepsSection(input.rowOperations),
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

  const response = profileLinearAlgebraResult({
    resultLatex: `x=${exactVectorToColumnLatex(solution)}`,
    approxText: 'LU solve',
    detailSections: luSolveDetails({
      label: input.label,
      rhsLabel: input.rhsLabel,
      lower: factored.lower,
      upper: factored.upper,
      intermediate,
      solution,
      rowOperations: factored.rowOperations,
    }),
    warnings: [],
  });
  const operand = labelMathJson(input.label, exactMatrixMathJson(exactMatrix));
  const rhsNode = labelMathJson(input.rhsLabel, exactVectorMathJson(rhs));
  const lowerNode = exactMatrixMathJson(factored.lower);
  const upperNode = exactMatrixMathJson(factored.upper);
  const solutionNode = exactVectorMathJson(solution);
  const intermediateNode = exactVectorMathJson(intermediate);
  const primaryLatex = `x=${exactVectorToColumnLatex(solution)}`;
  return attachLinearAlgebraCanonicalEvidence(response, {
    primary: canonicalLeafEvidence(primaryLatex, equationMathJson('x', solutionNode), 'matrix.lu-solve.native-solution'),
    details: [
      mathEvidence(`L=${exactMatrixToLatex(factored.lower)}`, equationMathJson('L', lowerNode), 'matrix.lu-solve.native-lower'),
      mathEvidence(`U=${exactMatrixToLatex(factored.upper)}`, equationMathJson('U', upperNode), 'matrix.lu-solve.native-upper'),
      ...factorRowEvidence(factored.rowOperations, 'matrix.lu-solve.native-row-operation'),
      mathEvidence(`${input.label}=LU`, equationMathJson(operand, ['Multiply', lowerNode, upperNode]), 'matrix.lu-solve.native-factorization'),
      mathEvidence(`Ly=${input.rhsLabel}`, equationMathJson(['Multiply', lowerNode, 'y'], rhsNode), 'matrix.lu-solve.native-forward-system'),
      mathEvidence(`y=${exactVectorToColumnLatex(intermediate)}`, equationMathJson('y', intermediateNode), 'matrix.lu-solve.native-intermediate'),
      mathEvidence('Ux=y', equationMathJson(['Multiply', upperNode, 'x'], 'y'), 'matrix.lu-solve.native-back-system'),
      mathEvidence(primaryLatex, equationMathJson('x', solutionNode), 'matrix.lu-solve.native-solution-detail'),
    ],
  });
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

  const response = profileLinearAlgebraResult({
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
      rowOperations: factored.rowOperations,
    }),
    warnings: [],
  });
  const operand = labelMathJson(input.label, exactMatrixMathJson(exactMatrix));
  const rhsNode = labelMathJson(input.rhsLabel, exactVectorMathJson(rhs));
  const permutationNode = exactMatrixMathJson(factored.permutation);
  const lowerNode = exactMatrixMathJson(factored.lower);
  const upperNode = exactMatrixMathJson(factored.upper);
  const permutedRhsNode = exactVectorMathJson(permutedRhs);
  const intermediateNode = exactVectorMathJson(intermediate);
  const solutionNode = exactVectorMathJson(solution);
  const permutedMatrixLatex = prefixedMatrixLabel('P', input.label);
  const permutedRhsLatex = prefixedVectorLabel('P', input.rhsLabel);
  const primaryLatex = `x=${exactVectorToColumnLatex(solution)}`;
  return attachLinearAlgebraCanonicalEvidence(response, {
    primary: canonicalLeafEvidence(primaryLatex, equationMathJson('x', solutionNode), 'matrix.plu-solve.native-solution'),
    details: [
      mathEvidence(`P=${exactMatrixToLatex(factored.permutation)}`, equationMathJson('P', permutationNode), 'matrix.plu-solve.native-permutation'),
      mathEvidence(`L=${exactMatrixToLatex(factored.lower)}`, equationMathJson('L', lowerNode), 'matrix.plu-solve.native-lower'),
      mathEvidence(`U=${exactMatrixToLatex(factored.upper)}`, equationMathJson('U', upperNode), 'matrix.plu-solve.native-upper'),
      ...swapEvidence(factored.swaps, 'matrix.plu-solve.native-swap'),
      ...factorRowEvidence(factored.rowOperations, 'matrix.plu-solve.native-row-operation'),
      mathEvidence(`${permutedMatrixLatex}=LU`, equationMathJson(['Multiply', permutationNode, operand], ['Multiply', lowerNode, upperNode]), 'matrix.plu-solve.native-factorization'),
      mathEvidence(`${permutedRhsLatex}=${exactVectorToColumnLatex(permutedRhs)}`, equationMathJson(['Multiply', permutationNode, rhsNode], permutedRhsNode), 'matrix.plu-solve.native-permuted-rhs'),
      mathEvidence(`Ly=${permutedRhsLatex}`, equationMathJson(['Multiply', lowerNode, 'y'], ['Multiply', permutationNode, rhsNode]), 'matrix.plu-solve.native-forward-system'),
      mathEvidence(`y=${exactVectorToColumnLatex(intermediate)}`, equationMathJson('y', intermediateNode), 'matrix.plu-solve.native-intermediate'),
      mathEvidence('Ux=y', equationMathJson(['Multiply', upperNode, 'x'], 'y'), 'matrix.plu-solve.native-back-system'),
      mathEvidence(primaryLatex, equationMathJson('x', solutionNode), 'matrix.plu-solve.native-solution-detail'),
    ],
  });
}
