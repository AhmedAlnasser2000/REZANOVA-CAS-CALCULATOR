import type { DisplayDetailSection, ExactScalarWire, MatrixResponse } from '../../types/calculator';
import { determinantExactMatrix, rrefExactMatrix, type ExactMatrix } from './exact-matrix-core';
import {
  exactMatrixFromNumeric,
  exactMatrixFromWire,
  exactScalarToLatex,
} from './exact-matrix-format';

export type MatrixInvertibilityInput = {
  label: string;
  matrix: number[][];
  exactMatrix?: ExactScalarWire[][];
};

function scalarIsZero(value: { numerator: number }) {
  return value.numerator === 0;
}

function pivotColumnsLatex(pivotColumns: readonly number[]) {
  return pivotColumns.length > 0
    ? pivotColumns.map((column) => `${column + 1}`).join(', ')
    : '\\text{none}';
}

function matrixStop(message: string): MatrixResponse {
  return {
    warnings: [],
    error: message,
  };
}

function rankNullityGuidance(
  label: string,
  rank: number,
  nullity: number,
  columns: number,
  pivotColumns: readonly number[],
): DisplayDetailSection[] {
  return [
    {
      title: 'Rank/Nullity Guidance',
      lines: [
        `\\operatorname{rank}(${label})=${rank}`,
        `\\operatorname{nullity}(${label})=${nullity}`,
        `\\operatorname{rank}(${label})+\\operatorname{nullity}(${label})=${columns}`,
        `\\operatorname{pivot\\ columns}=\\{${pivotColumnsLatex(pivotColumns)}\\}`,
        'Invertibility is a square-matrix theorem. For rectangular matrices, use rank and nullity to understand the linear map instead.',
      ],
      lineKinds: ['math', 'math', 'math', 'math', 'text'],
    },
  ];
}

function theoremDetails(input: {
  label: string;
  determinantLatex: string;
  rank: number;
  size: number;
  pivotColumns: readonly number[];
  invertible: boolean;
}): DisplayDetailSection[] {
  const nullity = input.size - input.rank;
  return [
    {
      title: 'Invertibility Facts',
      lines: [
        `\\det(${input.label})=${input.determinantLatex}`,
        `\\operatorname{rank}(${input.label})=${input.rank}`,
        `\\operatorname{nullity}(${input.label})=${nullity}`,
        `\\operatorname{pivot\\ columns}=\\{${pivotColumnsLatex(input.pivotColumns)}\\}`,
      ],
      lineKind: 'math',
    },
    {
      title: 'Invertibility Theorem',
      lines: [
        input.invertible
          ? 'The matrix is square and its determinant is nonzero, so the inverse exists.'
          : 'The matrix is square but its determinant is zero, so the inverse does not exist.',
        input.invertible
          ? `\\operatorname{rank}(${input.label})=${input.size}`
          : `\\operatorname{rank}(${input.label})<${input.size}`,
        input.invertible
          ? `\\operatorname{nullity}(${input.label})=0`
          : `\\operatorname{nullity}(${input.label})=${nullity}`,
        input.invertible
          ? 'Every column is a pivot. For every RHS b, this matrix times x equals b has exactly one solution.'
          : 'At least one column is free, so this matrix cannot have exactly one solution for every RHS b.',
      ],
      lineKinds: ['text', 'math', 'math', 'text'],
    },
  ];
}

function exactInputMatrix(input: MatrixInvertibilityInput): ExactMatrix | null {
  return exactMatrixFromWire(input.exactMatrix) ?? exactMatrixFromNumeric(input.matrix);
}

export function runMatrixInvertibility(input: MatrixInvertibilityInput): MatrixResponse {
  const exactMatrix = exactInputMatrix(input);
  if (!exactMatrix) {
    return matrixStop('Invertibility needs exact Matrix entries in this move.');
  }

  const reduced = rrefExactMatrix(exactMatrix);
  if (reduced.kind === 'stop') {
    return matrixStop(reduced.reason === 'dimension-limit'
      ? 'Invertibility facts currently support matrices up to 6 by 6.'
      : 'Invertibility needs a complete rectangular Matrix.');
  }

  const rows = exactMatrix.length;
  const columns = exactMatrix[0]?.length ?? 0;
  const pivotColumns = reduced.pivotColumns.filter((column) => column < columns);
  const rank = pivotColumns.length;
  const nullity = columns - rank;

  if (rows !== columns) {
    return {
      resultLatex: `\\text{Invertibility applies only to square matrices}`,
      approxText: `rank ${rank}, nullity ${nullity}`,
      detailSections: rankNullityGuidance(input.label, rank, nullity, columns, pivotColumns),
      warnings: [],
    };
  }

  const determinant = determinantExactMatrix(exactMatrix);
  if (determinant.kind === 'stop') {
    return matrixStop('Invertibility could not compute the determinant for this Matrix.');
  }

  const determinantLatex = exactScalarToLatex(determinant.determinant);
  const invertible = !scalarIsZero(determinant.determinant);

  return {
    resultLatex: `\\operatorname{invertible}(${input.label})=\\text{${invertible ? 'Yes' : 'No'}}`,
    approxText: `det(${input.label}) = ${determinantLatex}`,
    detailSections: theoremDetails({
      label: input.label,
      determinantLatex,
      rank,
      size: rows,
      pivotColumns,
      invertible,
    }),
    warnings: [],
  };
}
