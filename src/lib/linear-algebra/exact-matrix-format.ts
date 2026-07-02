import type { ExactScalar } from '../algebra/polynomial-core';
import type { ExactMatrix, ExactVector } from './exact-matrix-core';
import { scalar } from './exact-matrix-core';

export function exactScalarToLatex(value: ExactScalar): string {
  if (value.denominator === 1) {
    return `${value.numerator}`;
  }

  const sign = value.numerator < 0 ? '-' : '';
  return `${sign}\\frac{${Math.abs(value.numerator)}}{${value.denominator}}`;
}

export function exactMatrixToLatex(matrix: ExactMatrix): string {
  const body = matrix
    .map((row) => row.map(exactScalarToLatex).join(' & '))
    .join('\\\\');

  return `\\begin{bmatrix}${body}\\end{bmatrix}`;
}

export function exactVectorToColumnLatex(vector: ExactVector): string {
  return exactMatrixToLatex(vector.map((value) => [value]));
}

function exactScalarFromNumber(value: number): ExactScalar | null {
  return Number.isSafeInteger(value) ? scalar(value) : null;
}

export function exactMatrixFromNumeric(matrix: number[][]): ExactMatrix | null {
  const exact: ExactMatrix = [];
  for (const row of matrix) {
    const exactRow: ExactScalar[] = [];
    for (const value of row) {
      const exact = exactScalarFromNumber(value);
      if (!exact) {
        return null;
      }
      exactRow.push(exact);
    }
    exact.push(exactRow);
  }
  return exact;
}

export function exactVectorFromNumeric(vector: number[]): ExactVector | null {
  const exact: ExactVector = [];
  for (const value of vector) {
    const scalarValue = exactScalarFromNumber(value);
    if (!scalarValue) {
      return null;
    }
    exact.push(scalarValue);
  }
  return exact;
}
