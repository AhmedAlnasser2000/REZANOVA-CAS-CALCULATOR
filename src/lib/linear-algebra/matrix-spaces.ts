import type { DisplayDetailSection, ExactScalarWire, MatrixResponse } from '../../types/calculator';
import type { ExactScalar } from '../algebra/polynomial-core';
import type { ExactMatrix, ExactVector } from './exact-matrix-core';
import { rrefExactMatrix } from './exact-matrix-core';
import {
  exactMatrixFromNumeric,
  exactMatrixFromWire,
  exactMatrixToLatex,
  exactVectorToColumnLatex,
} from './exact-matrix-format';
import { exactMatrixDimensionLimitMessage } from './dimension-contract';

type MatrixSpaceKind = 'nullSpace' | 'columnSpace';

export type MatrixSpaceInput = {
  kind: MatrixSpaceKind;
  label: string;
  matrix: number[][];
  exactMatrix?: ExactScalarWire[][];
};

const ZERO: ExactScalar = { numerator: 0, denominator: 1 };
const ONE: ExactScalar = { numerator: 1, denominator: 1 };

function negateScalar(value: ExactScalar): ExactScalar {
  return { numerator: -value.numerator, denominator: value.denominator };
}

function basisLatex(basis: ExactVector[]) {
  if (basis.length === 0) {
    return '\\{0\\}';
  }

  return `\\operatorname{span}\\left\\{${basis.map(exactVectorToColumnLatex).join(',')}\\right\\}`;
}

function pivotColumnsLatex(pivotColumns: readonly number[]) {
  return pivotColumns.length > 0
    ? pivotColumns.map((column) => `${column + 1}`).join(', ')
    : '\\text{none}';
}

function nullSpaceBasis(rref: ExactMatrix, pivotColumns: number[], unknowns: number) {
  const pivotSet = new Set(pivotColumns);
  const freeColumns = Array.from({ length: unknowns }, (_, index) => index)
    .filter((column) => !pivotSet.has(column));

  return freeColumns.map((freeColumn) => {
    const vector = Array.from({ length: unknowns }, () => ZERO);
    vector[freeColumn] = ONE;
    pivotColumns.forEach((pivotColumn, pivotRow) => {
      vector[pivotColumn] = negateScalar(rref[pivotRow][freeColumn]);
    });
    return vector;
  });
}

function columnSpaceBasis(matrix: ExactMatrix, pivotColumns: number[]) {
  return pivotColumns.map((column) => matrix.map((row) => row[column]));
}

function nullSpaceDetails(
  label: string,
  rref: ExactMatrix,
  rank: number,
  pivotColumns: number[],
  nullity: number,
  unknowns: number,
): DisplayDetailSection[] {
  return [
    {
      title: 'Space Facts',
      lines: [
        `\\operatorname{rank}(${label})=${rank}`,
        `\\operatorname{nullity}(${label})=${nullity}`,
        `\\operatorname{rank}(${label})+\\operatorname{nullity}(${label})=${unknowns}`,
      ],
      lineKind: 'math',
    },
    {
      title: 'Null Space Proof',
      lines: [
        `\\operatorname{rref}(${label})=${exactMatrixToLatex(rref)}`,
        `\\operatorname{pivot\\ columns}=\\{${pivotColumnsLatex(pivotColumns)}\\}`,
        nullity === 0
          ? 'Every column is a pivot column, so the only homogeneous solution is the zero vector.'
          : 'Each free variable creates one basis vector for the homogeneous system.',
      ],
      lineKinds: ['math', 'math', 'text'],
    },
  ];
}

function columnSpaceDetails(
  label: string,
  rref: ExactMatrix,
  rank: number,
  pivotColumns: number[],
): DisplayDetailSection[] {
  return [
    {
      title: 'Space Facts',
      lines: [
        `\\dim\\operatorname{Col}(${label})=\\operatorname{rank}(${label})=${rank}`,
        `\\operatorname{pivot\\ columns}=\\{${pivotColumnsLatex(pivotColumns)}\\}`,
      ],
      lineKind: 'math',
    },
    {
      title: 'Column Space Proof',
      lines: [
        `\\operatorname{rref}(${label})=${exactMatrixToLatex(rref)}`,
        rank === 0
          ? 'There are no pivot columns, so every column is zero or dependent and the column space is the zero subspace.'
          : 'The pivot columns of the original matrix form a basis for its column space.',
      ],
      lineKinds: ['math', 'text'],
    },
  ];
}

function matrixSpaceStop(message: string): MatrixResponse {
  return {
    warnings: [],
    error: message,
  };
}

export function runMatrixSpaceOperation(input: MatrixSpaceInput): MatrixResponse {
  const exactMatrix = exactMatrixFromWire(input.exactMatrix) ?? exactMatrixFromNumeric(input.matrix);
  if (!exactMatrix) {
    return matrixSpaceStop('Matrix spaces need exact Matrix entries in this move.');
  }

  const reduced = rrefExactMatrix(exactMatrix);
  if (reduced.kind === 'stop') {
    return matrixSpaceStop(reduced.reason === 'dimension-limit'
      ? exactMatrixDimensionLimitMessage('null and column spaces')
      : 'Matrix spaces need a complete rectangular Matrix.');
  }

  const columns = exactMatrix[0]?.length ?? 0;
  const pivotColumns = reduced.pivotColumns.filter((column) => column < columns);
  const rank = pivotColumns.length;

  if (input.kind === 'nullSpace') {
    const basis = nullSpaceBasis(reduced.matrix, pivotColumns, columns);
    const nullity = columns - rank;
    return {
      resultLatex: `\\operatorname{Null}(${input.label})=${basisLatex(basis)}`,
      approxText: `dimension ${nullity}`,
      detailSections: nullSpaceDetails(input.label, reduced.matrix, rank, pivotColumns, nullity, columns),
      warnings: [],
    };
  }

  const basis = columnSpaceBasis(exactMatrix, pivotColumns);
  return {
    resultLatex: `\\operatorname{Col}(${input.label})=${basisLatex(basis)}`,
    approxText: `dimension ${rank}`,
    detailSections: columnSpaceDetails(input.label, reduced.matrix, rank, pivotColumns),
    warnings: [],
  };
}
