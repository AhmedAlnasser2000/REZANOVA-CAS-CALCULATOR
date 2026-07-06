import type { ExactScalar } from '../algebra/polynomial-core';
import type { ExactScalarWire } from '../../types/calculator';
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

export function exactVectorToWire(vector: ExactVector): ExactScalarWire[] {
  return vector.map((value) => ({
    numerator: value.numerator,
    denominator: value.denominator,
  }));
}

function exactScalarFromNumber(value: number): ExactScalar | null {
  return Number.isSafeInteger(value) ? scalar(value) : null;
}

function exactScalarFromWire(value: ExactScalarWire): ExactScalar | null {
  if (
    !Number.isSafeInteger(value.numerator)
    || !Number.isSafeInteger(value.denominator)
    || value.denominator <= 0
  ) {
    return null;
  }
  return scalar(value.numerator, value.denominator);
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

export function exactMatrixFromWire(matrix: ExactScalarWire[][] | undefined): ExactMatrix | null {
  if (!matrix) {
    return null;
  }

  const exact: ExactMatrix = [];
  for (const row of matrix) {
    const exactRow: ExactScalar[] = [];
    for (const value of row) {
      const scalarValue = exactScalarFromWire(value);
      if (!scalarValue) {
        return null;
      }
      exactRow.push(scalarValue);
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

export function exactVectorFromWire(vector: ExactScalarWire[] | undefined): ExactVector | null {
  if (!vector) {
    return null;
  }

  const exact: ExactVector = [];
  for (const value of vector) {
    const scalarValue = exactScalarFromWire(value);
    if (!scalarValue) {
      return null;
    }
    exact.push(scalarValue);
  }
  return exact;
}
