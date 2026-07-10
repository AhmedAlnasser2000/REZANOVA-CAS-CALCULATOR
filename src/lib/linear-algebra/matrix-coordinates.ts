import type { DisplayDetailSection, ExactScalarWire, MatrixResponse } from '../../types/calculator';
import {
  determinantExactMatrix,
  rrefExactMatrix,
  solveExactLinearSystem,
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
import {
  exactMatrixDimensionLimitMessage,
  LINEAR_ALGEBRA_SINGLE_RHS_AUGMENTED_MAX_DIMENSION,
} from './dimension-contract';

export type MatrixCoordinatesInput = {
  basisLabel: string;
  vectorLabel: string;
  basisMatrix: number[][];
  vector: number[];
  exactBasisMatrix?: ExactScalarWire[][];
  exactVector?: ExactScalarWire[];
};

function matrixStop(message: string, detailSections?: DisplayDetailSection[]): MatrixResponse {
  return {
    warnings: [],
    error: message,
    detailSections,
  };
}

function exactStopReasonToMessage(reason: ExactMatrixStopReason): string {
  switch (reason) {
    case 'dimension-limit':
      return exactMatrixDimensionLimitMessage('coordinate readback');
    case 'rhs-dimension-mismatch':
      return 'The vector length must match the basis row count.';
    case 'scalar-growth-limit':
      return 'This coordinate request exceeded the exact Matrix arithmetic limit.';
    case 'empty-matrix':
    case 'ragged-matrix':
      return 'Coordinates need a complete rectangular Matrix.';
    default:
      return 'Coordinates need a square full-rank basis matrix and a matching vector.';
  }
}

function augmentedMatrix(coefficients: ExactMatrix, constants: ExactVector): ExactMatrix {
  return coefficients.map((row, rowIndex) => [...row, constants[rowIndex]]);
}

function pivotColumnsLatex(pivotColumns: readonly number[]) {
  return pivotColumns.length > 0
    ? pivotColumns.map((column) => `${column + 1}`).join(', ')
    : '\\text{none}';
}

function exactInputMatrix(input: MatrixCoordinatesInput): ExactMatrix | null {
  return exactMatrixFromWire(input.exactBasisMatrix) ?? exactMatrixFromNumeric(input.basisMatrix);
}

function exactInputVector(input: MatrixCoordinatesInput): ExactVector | null {
  return exactVectorFromWire(input.exactVector) ?? exactVectorFromNumeric(input.vector);
}

function notBasisDetails(input: {
  basisLabel: string;
  rref: ExactMatrix;
  rows: number;
  columns: number;
  rank: number;
  pivotColumns: readonly number[];
}): DisplayDetailSection[] {
  return [
    {
      title: 'Coordinate Facts',
      lines: [
        `\\operatorname{rank}(${input.basisLabel})=${input.rank}`,
        `\\operatorname{columns}(${input.basisLabel})=${input.columns}`,
        `\\operatorname{pivot\\ columns}=\\{${pivotColumnsLatex(input.pivotColumns)}\\}`,
      ],
      lineKind: 'math',
    },
    {
      title: 'Coordinate Proof',
      lines: [
        `\\operatorname{rref}(${input.basisLabel})=${exactMatrixToLatex(input.rref)}`,
        input.rows === input.columns
          ? 'At least one column is not a pivot, so the columns do not form a basis. Coordinates are only unique when the basis matrix has one pivot in every column.'
          : `This matrix has ${input.columns} column vectors in \\mathbb{R}^{${input.rows}}. This coordinate readback expects a square basis matrix.`,
      ],
      lineKinds: ['math', 'text'],
    },
  ];
}

function coordinateDetails(input: {
  basisLabel: string;
  vectorLabel: string;
  determinantLatex: string;
  solution: ExactVector;
  rref: ExactMatrix;
  pivotColumns: readonly number[];
}): DisplayDetailSection[] {
  return [
    {
      title: 'Coordinate Facts',
      lines: [
        `\\det(${input.basisLabel})=${input.determinantLatex}`,
        `\\operatorname{rank}(${input.basisLabel})=${input.solution.length}`,
        `\\operatorname{pivot\\ columns}=\\{${pivotColumnsLatex(input.pivotColumns)}\\}`,
      ],
      lineKind: 'math',
    },
    {
      title: 'Coordinate Proof',
      lines: [
        `${input.basisLabel}c=${input.vectorLabel}`,
        `\\operatorname{rref}\\left([${input.basisLabel}|${input.vectorLabel}]\\right)=${exactMatrixToLatex(input.rref)}`,
        `c=${exactVectorToColumnLatex(input.solution)}`,
        'The basis matrix has one pivot in every column, so the coordinate vector is unique.',
      ],
      lineKinds: ['math', 'math', 'math', 'text'],
    },
  ];
}

export function runMatrixCoordinates(input: MatrixCoordinatesInput): MatrixResponse {
  const basis = exactInputMatrix(input);
  const vector = exactInputVector(input);
  if (!basis || !vector) {
    return matrixStop('Coordinates need exact Matrix and vector entries in this move.');
  }

  const reducedBasis = rrefExactMatrix(basis);
  if (reducedBasis.kind === 'stop') {
    return matrixStop(exactStopReasonToMessage(reducedBasis.reason));
  }

  const rows = basis.length;
  const columns = basis[0]?.length ?? 0;
  if (vector.length !== rows) {
    return matrixStop('The vector length must match the basis row count.');
  }

  const square = rows === columns;
  const pivotColumns = reducedBasis.pivotColumns.filter((column) => column < columns);
  const rank = pivotColumns.length;
  const isBasis = square && rank === columns;
  if (!isBasis) {
    return matrixStop(
      'Coordinates need a square full-rank basis matrix. Run basis(...) to inspect this matrix.',
      notBasisDetails({
        basisLabel: input.basisLabel,
        rref: reducedBasis.matrix,
        rows,
        columns,
        rank,
        pivotColumns,
      }),
    );
  }

  const determinant = determinantExactMatrix(basis);
  if (determinant.kind === 'stop') {
    return matrixStop(exactStopReasonToMessage(determinant.reason));
  }

  const solved = solveExactLinearSystem(basis, vector);
  if (solved.kind === 'stop') {
    return matrixStop(exactStopReasonToMessage(solved.reason));
  }

  const augmented = rrefExactMatrix(augmentedMatrix(basis, vector), {
    maxDimension: LINEAR_ALGEBRA_SINGLE_RHS_AUGMENTED_MAX_DIMENSION,
  });
  if (augmented.kind === 'stop') {
    return matrixStop(exactStopReasonToMessage(augmented.reason));
  }

  const coordinateLatex = exactVectorToColumnLatex(solved.solution);
  return {
    resultLatex: `[${input.vectorLabel}]_{${input.basisLabel}}=${coordinateLatex}`,
    approxText: `${solved.solution.length} coordinates`,
    detailSections: coordinateDetails({
      basisLabel: input.basisLabel,
      vectorLabel: input.vectorLabel,
      determinantLatex: exactScalarToLatex(determinant.determinant),
      solution: solved.solution,
      rref: augmented.matrix,
      pivotColumns: solved.pivotColumns,
    }),
    warnings: [],
  };
}
