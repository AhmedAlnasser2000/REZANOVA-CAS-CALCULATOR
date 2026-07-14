import type { DisplayDetailSection, ExactScalarWire, MatrixResponse } from '../../types/calculator';
import { determinantExactMatrix, rrefExactMatrix, type ExactMatrix } from './exact-matrix-core';
import {
  exactMatrixFromNumeric,
  exactMatrixFromWire,
  exactScalarToLatex,
} from './exact-matrix-format';
import { exactMatrixDimensionLimitMessage } from './dimension-contract';
import { profileLinearAlgebraResult } from '../display/printer';
import { buildExactScalarNode } from '../algebra/polynomial-core';
import {
  attachLinearAlgebraCanonicalEvidence,
  canonicalLeafEvidence,
  equationMathJson,
  exactMatrixMathJson,
  integerSetMathJson,
  labelMathJson,
  operatorMathJson,
  textMathJson,
} from './canonical-evidence';

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
      ? exactMatrixDimensionLimitMessage('invertibility facts')
      : 'Invertibility needs a complete rectangular Matrix.');
  }

  const rows = exactMatrix.length;
  const columns = exactMatrix[0]?.length ?? 0;
  const pivotColumns = reduced.pivotColumns.filter((column) => column < columns);
  const rank = pivotColumns.length;
  const nullity = columns - rank;
  const operand = labelMathJson(input.label, exactMatrixMathJson(exactMatrix));
  const pivots = pivotColumns.map((column) => column + 1);
  const math = (canonicalLatex: string, mathJson: unknown, source: string) => ({
    kind: 'math' as const,
    value: canonicalLeafEvidence(canonicalLatex, mathJson, source),
  });

  if (rows !== columns) {
    const response = profileLinearAlgebraResult({
      resultLatex: `\\text{Invertibility applies only to square matrices}`,
      approxText: `rank ${rank}, nullity ${nullity}`,
      detailSections: rankNullityGuidance(input.label, rank, nullity, columns, pivotColumns),
      warnings: [],
    });
    return attachLinearAlgebraCanonicalEvidence(response, {
      primary: canonicalLeafEvidence(
        '\\text{Invertibility applies only to square matrices}',
        textMathJson('Invertibility applies only to square matrices'),
        'matrix.invertibility.native-rectangular-classification',
      ),
      details: [
        math(`\\operatorname{rank}(${input.label})=${rank}`, equationMathJson(operatorMathJson('rank', operand), rank), 'matrix.invertibility.native-rank'),
        math(`\\operatorname{nullity}(${input.label})=${nullity}`, equationMathJson(operatorMathJson('nullity', operand), nullity), 'matrix.invertibility.native-nullity'),
        math(`\\operatorname{rank}(${input.label})+\\operatorname{nullity}(${input.label})=${columns}`, equationMathJson(['Add', operatorMathJson('rank', operand), operatorMathJson('nullity', operand)], columns), 'matrix.invertibility.native-rank-nullity'),
        math(`\\operatorname{pivot\\ columns}=\\{${pivotColumnsLatex(pivotColumns)}\\}`, equationMathJson(operatorMathJson('pivotColumns', operand), integerSetMathJson(pivots)), 'matrix.invertibility.native-pivots'),
      ],
    });
  }

  const determinant = determinantExactMatrix(exactMatrix);
  if (determinant.kind === 'stop') {
    return matrixStop('Invertibility could not compute the determinant for this Matrix.');
  }

  const determinantLatex = exactScalarToLatex(determinant.determinant);
  const invertible = !scalarIsZero(determinant.determinant);

  const response = profileLinearAlgebraResult({
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
  });
  const resultLatex = `\\operatorname{invertible}(${input.label})=\\text{${invertible ? 'Yes' : 'No'}}`;
  return attachLinearAlgebraCanonicalEvidence(response, {
    primary: canonicalLeafEvidence(
      resultLatex,
      equationMathJson(operatorMathJson('invertible', operand), invertible ? 'True' : 'False'),
      'matrix.invertibility.native-square-classification',
    ),
    details: [
      math(`\\det(${input.label})=${determinantLatex}`, equationMathJson(operatorMathJson('det', operand), buildExactScalarNode(determinant.determinant)), 'matrix.invertibility.native-determinant'),
      math(`\\operatorname{rank}(${input.label})=${rank}`, equationMathJson(operatorMathJson('rank', operand), rank), 'matrix.invertibility.native-rank'),
      math(`\\operatorname{nullity}(${input.label})=${nullity}`, equationMathJson(operatorMathJson('nullity', operand), nullity), 'matrix.invertibility.native-nullity'),
      math(`\\operatorname{pivot\\ columns}=\\{${pivotColumnsLatex(pivotColumns)}\\}`, equationMathJson(operatorMathJson('pivotColumns', operand), integerSetMathJson(pivots)), 'matrix.invertibility.native-pivots'),
      math(invertible ? `\\operatorname{rank}(${input.label})=${rows}` : `\\operatorname{rank}(${input.label})<${rows}`, invertible ? equationMathJson(operatorMathJson('rank', operand), rows) : ['Less', operatorMathJson('rank', operand), rows], 'matrix.invertibility.native-rank-theorem'),
      math(invertible ? `\\operatorname{nullity}(${input.label})=0` : `\\operatorname{nullity}(${input.label})=${nullity}`, equationMathJson(operatorMathJson('nullity', operand), invertible ? 0 : nullity), 'matrix.invertibility.native-nullity-theorem'),
    ],
  });
}
