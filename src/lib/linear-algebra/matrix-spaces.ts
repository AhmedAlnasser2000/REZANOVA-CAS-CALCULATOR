import type { DisplayDetailSection, ExactScalarWire, MatrixResponse } from '../../types/calculator';
import type { ExactMatrix, ExactVector } from './exact-matrix-core';
import {
  exactMatrixFromNumeric,
  exactMatrixFromWire,
  exactMatrixToLatex,
  exactVectorToColumnLatex,
} from './exact-matrix-format';
import { exactMatrixDimensionLimitMessage } from './dimension-contract';
import { analyzeExactColumnFamily } from './matrix-column-family';
import { profileLinearAlgebraResult } from '../display/printer';
import {
  attachLinearAlgebraCanonicalEvidence,
  canonicalLeafEvidence,
  equationMathJson,
  exactMatrixMathJson,
  exactVectorSetMathJson,
  integerSetMathJson,
  labelMathJson,
  operatorMathJson,
} from './canonical-evidence';

type MatrixSpaceKind = 'nullSpace' | 'columnSpace';

export type MatrixSpaceInput = {
  kind: MatrixSpaceKind;
  label: string;
  matrix: number[][];
  exactMatrix?: ExactScalarWire[][];
};

function basisLatex(basis: ExactVector[], zeroVectorLength: number) {
  if (basis.length === 0) {
    const zeroVector = Array.from({ length: zeroVectorLength }, () => ({
      numerator: 0,
      denominator: 1,
    }));
    return `\\{${exactVectorToColumnLatex(zeroVector)}\\}`;
  }

  return `\\operatorname{span}\\left\\{${basis.map(exactVectorToColumnLatex).join(',')}\\right\\}`;
}

function pivotColumnsLatex(pivotColumns: readonly number[]) {
  return pivotColumns.length > 0
    ? pivotColumns.map((column) => `${column + 1}`).join(', ')
    : '\\text{none}';
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
        `\\operatorname{pivotColumns}(${label})=\\{${pivotColumnsLatex(pivotColumns)}\\}`,
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
        `\\operatorname{pivotColumns}(${label})=\\{${pivotColumnsLatex(pivotColumns)}\\}`,
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

  const analysis = analyzeExactColumnFamily(exactMatrix);
  if (analysis.kind === 'stop') {
    return matrixSpaceStop(analysis.reason === 'dimension-limit'
      ? exactMatrixDimensionLimitMessage('null and column spaces')
      : 'Matrix spaces need a complete rectangular Matrix.');
  }

  const columns = exactMatrix[0]?.length ?? 0;
  const { pivotColumns, rank } = analysis;
  const operand = labelMathJson(input.label, exactMatrixMathJson(exactMatrix));
  const pivotNumbers = pivotColumns.map((column) => column + 1);
  const math = (canonicalLatex: string, mathJson: unknown, source: string) => ({
    kind: 'math' as const,
    value: canonicalLeafEvidence(canonicalLatex, mathJson, source),
  });

  if (input.kind === 'nullSpace') {
    const basis = analysis.kernelBasis;
    const nullity = analysis.nullity;
    const zeroVector = Array.from({ length: columns }, () => ({
      numerator: 0,
      denominator: 1,
    }));
    const response = profileLinearAlgebraResult({
      resultLatex: `\\operatorname{Null}(${input.label})=${basisLatex(basis, columns)}`,
      approxText: `dimension ${nullity}`,
      detailSections: nullSpaceDetails(input.label, analysis.rref, rank, pivotColumns, nullity, columns),
      warnings: [],
    });
    const primaryLatex = `\\operatorname{Null}(${input.label})=${basisLatex(basis, columns)}`;
    return attachLinearAlgebraCanonicalEvidence(response, {
      primary: canonicalLeafEvidence(
        primaryLatex,
        equationMathJson(operatorMathJson('Null', operand), exactVectorSetMathJson(
          basis.length > 0 ? basis : [zeroVector],
        )),
        'matrix.spaces.native-null-space',
      ),
      details: [
        math(`\\operatorname{rank}(${input.label})=${rank}`, equationMathJson(operatorMathJson('rank', operand), rank), 'matrix.spaces.native-rank'),
        math(`\\operatorname{nullity}(${input.label})=${nullity}`, equationMathJson(operatorMathJson('nullity', operand), nullity), 'matrix.spaces.native-nullity'),
        math(`\\operatorname{rank}(${input.label})+\\operatorname{nullity}(${input.label})=${columns}`, equationMathJson(['Add', operatorMathJson('rank', operand), operatorMathJson('nullity', operand)], columns), 'matrix.spaces.native-rank-nullity'),
        math(`\\operatorname{rref}(${input.label})=${exactMatrixToLatex(analysis.rref)}`, equationMathJson(operatorMathJson('rref', operand), exactMatrixMathJson(analysis.rref)), 'matrix.spaces.native-rref'),
        math(`\\operatorname{pivotColumns}(${input.label})=\\{${pivotColumnsLatex(pivotColumns)}\\}`, equationMathJson(operatorMathJson('pivotColumns', operand), integerSetMathJson(pivotNumbers)), 'matrix.spaces.native-pivots'),
      ],
    });
  }

  const basis = analysis.imageBasis;
  const response = profileLinearAlgebraResult({
    resultLatex: `\\operatorname{Col}(${input.label})=${basisLatex(basis, columns)}`,
    approxText: `dimension ${rank}`,
    detailSections: columnSpaceDetails(input.label, analysis.rref, rank, pivotColumns),
    warnings: [],
  });
  const primaryLatex = `\\operatorname{Col}(${input.label})=${basisLatex(basis, columns)}`;
  return attachLinearAlgebraCanonicalEvidence(response, {
    primary: canonicalLeafEvidence(
      primaryLatex,
      equationMathJson(
        operatorMathJson('Col', operand),
        operatorMathJson('span', exactVectorSetMathJson(basis)),
      ),
      'matrix.spaces.native-column-space',
    ),
    details: [
      math(`\\dim\\operatorname{Col}(${input.label})=\\operatorname{rank}(${input.label})=${rank}`, ['Equal', operatorMathJson('dim', operatorMathJson('Col', operand)), operatorMathJson('rank', operand), rank], 'matrix.spaces.native-column-space-dimension'),
      math(`\\operatorname{pivotColumns}(${input.label})=\\{${pivotColumnsLatex(pivotColumns)}\\}`, equationMathJson(operatorMathJson('pivotColumns', operand), integerSetMathJson(pivotNumbers)), 'matrix.spaces.native-pivots'),
      math(`\\operatorname{rref}(${input.label})=${exactMatrixToLatex(analysis.rref)}`, equationMathJson(operatorMathJson('rref', operand), exactMatrixMathJson(analysis.rref)), 'matrix.spaces.native-rref'),
    ],
  });
}
