import type { DisplayDetailSection, ExactScalarWire, MatrixResponse } from '../../types/calculator';
import { exactScalarIsZero } from '../algebra/polynomial-core';
import { determinantExactMatrix, rrefExactMatrix, type ExactMatrix } from './exact-matrix-core';
import {
  exactMatrixFromNumeric,
  exactMatrixFromWire,
  exactMatrixToLatex,
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
} from './canonical-evidence';

export type MatrixBasisInput = {
  label: string;
  matrix: number[][];
  exactMatrix?: ExactScalarWire[][];
};

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

function basisDetails(input: {
  label: string;
  rref: ExactMatrix;
  rows: number;
  columns: number;
  rank: number;
  pivotColumns: readonly number[];
  determinantLatex?: string;
  isBasis: boolean;
}): DisplayDetailSection[] {
  const square = input.rows === input.columns;
  return [
    {
      title: 'Basis Facts',
      lines: [
        `\\operatorname{rank}(${input.label})=${input.rank}`,
        `\\operatorname{columns}(${input.label})=${input.columns}`,
        `\\text{column vectors live in }\\mathbb{R}^{${input.rows}}`,
        `\\operatorname{pivotColumns}(${input.label})=\\{${pivotColumnsLatex(input.pivotColumns)}\\}`,
        ...(input.determinantLatex ? [`\\det(${input.label})=${input.determinantLatex}`] : []),
      ],
      lineKind: 'math',
    },
    {
      title: 'Basis Proof',
      lines: [
        `\\operatorname{rref}(${input.label})=${exactMatrixToLatex(input.rref)}`,
        input.isBasis
          ? `The matrix is square and every column is a pivot, so its columns form a basis for \\mathbb{R}^{${input.rows}}.`
          : square
            ? 'The matrix is square, but at least one column is not a pivot, so the columns are dependent and do not form a basis.'
            : `A basis for \\mathbb{R}^{${input.rows}} needs exactly ${input.rows} independent vectors. This matrix has ${input.columns} column vectors and rank ${input.rank}.`,
      ],
      lineKinds: ['math', 'text'],
    },
  ];
}

function exactInputMatrix(input: MatrixBasisInput): ExactMatrix | null {
  return exactMatrixFromWire(input.exactMatrix) ?? exactMatrixFromNumeric(input.matrix);
}

export function runMatrixBasis(input: MatrixBasisInput): MatrixResponse {
  const exactMatrix = exactInputMatrix(input);
  if (!exactMatrix) {
    return matrixStop('Basis checks need exact Matrix entries in this move.');
  }

  const reduced = rrefExactMatrix(exactMatrix);
  if (reduced.kind === 'stop') {
    return matrixStop(reduced.reason === 'dimension-limit'
      ? exactMatrixDimensionLimitMessage('basis checks')
      : 'Basis checks need a complete rectangular Matrix.');
  }

  const rows = exactMatrix.length;
  const columns = exactMatrix[0]?.length ?? 0;
  const pivotColumns = reduced.pivotColumns.filter((column) => column < columns);
  const rank = pivotColumns.length;
  const square = rows === columns;
  const determinant = square ? determinantExactMatrix(exactMatrix) : null;
  const determinantLatex = determinant?.kind === 'success'
    ? exactScalarToLatex(determinant.determinant)
    : undefined;
  const isBasis = square
    && rank === rows
    && determinant?.kind === 'success'
    && !exactScalarIsZero(determinant.determinant);

  const response = profileLinearAlgebraResult({
    resultLatex: `\\operatorname{basis}(${input.label})=\\text{${isBasis ? 'Yes' : 'No'}}`,
    approxText: determinantLatex ? `det(${input.label}) = ${determinantLatex}` : `rank ${rank}, ${columns} column vectors in R^${rows}`,
    detailSections: basisDetails({
      label: input.label,
      rref: reduced.matrix,
      rows,
      columns,
      rank,
      pivotColumns,
      determinantLatex,
      isBasis,
    }),
    warnings: [],
  });
  const operand = labelMathJson(input.label, exactMatrixMathJson(exactMatrix));
  const pivotNumbers = pivotColumns.map((column) => column + 1);
  const math = (canonicalLatex: string, mathJson: unknown, source: string) => ({
    kind: 'math' as const,
    value: canonicalLeafEvidence(canonicalLatex, mathJson, source),
  });
  const resultLatex = `\\operatorname{basis}(${input.label})=\\text{${isBasis ? 'Yes' : 'No'}}`;
  return attachLinearAlgebraCanonicalEvidence(response, {
    primary: canonicalLeafEvidence(
      resultLatex,
      equationMathJson(operatorMathJson('basis', operand), isBasis ? 'True' : 'False'),
      'matrix.basis.native-classification',
    ),
    details: [
      math(`\\operatorname{rank}(${input.label})=${rank}`, equationMathJson(operatorMathJson('rank', operand), rank), 'matrix.basis.native-rank'),
      math(`\\operatorname{columns}(${input.label})=${columns}`, equationMathJson(operatorMathJson('columns', operand), columns), 'matrix.basis.native-column-count'),
      math(`\\text{column vectors live in }\\mathbb{R}^{${rows}}`, ['InvisibleOperator', "'column vectors live in '", ['Power', 'RealNumbers', rows]], 'matrix.basis.native-ambient-space'),
      math(`\\operatorname{pivotColumns}(${input.label})=\\{${pivotColumnsLatex(pivotColumns)}\\}`, equationMathJson(operatorMathJson('pivotColumns', operand), integerSetMathJson(pivotNumbers)), 'matrix.basis.native-pivots'),
      ...(determinant?.kind === 'success' && determinantLatex ? [math(
        `\\det(${input.label})=${determinantLatex}`,
        equationMathJson(operatorMathJson('det', operand), buildExactScalarNode(determinant.determinant)),
        'matrix.basis.native-determinant',
      )] : []),
      math(`\\operatorname{rref}(${input.label})=${exactMatrixToLatex(reduced.matrix)}`, equationMathJson(operatorMathJson('rref', operand), exactMatrixMathJson(reduced.matrix)), 'matrix.basis.native-rref'),
    ],
  });
}
