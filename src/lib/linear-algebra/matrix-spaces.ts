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

type MatrixSpaceKind = 'nullSpace' | 'columnSpace';

export type MatrixSpaceInput = {
  kind: MatrixSpaceKind;
  label: string;
  matrix: number[][];
  exactMatrix?: ExactScalarWire[][];
};

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

  const analysis = analyzeExactColumnFamily(exactMatrix);
  if (analysis.kind === 'stop') {
    return matrixSpaceStop(analysis.reason === 'dimension-limit'
      ? exactMatrixDimensionLimitMessage('null and column spaces')
      : 'Matrix spaces need a complete rectangular Matrix.');
  }

  const columns = exactMatrix[0]?.length ?? 0;
  const { pivotColumns, rank } = analysis;

  if (input.kind === 'nullSpace') {
    const basis = analysis.kernelBasis;
    const nullity = analysis.nullity;
    return profileLinearAlgebraResult({
      resultLatex: `\\operatorname{Null}(${input.label})=${basisLatex(basis)}`,
      approxText: `dimension ${nullity}`,
      detailSections: nullSpaceDetails(input.label, analysis.rref, rank, pivotColumns, nullity, columns),
      warnings: [],
    });
  }

  const basis = analysis.imageBasis;
  return profileLinearAlgebraResult({
    resultLatex: `\\operatorname{Col}(${input.label})=${basisLatex(basis)}`,
    approxText: `dimension ${rank}`,
    detailSections: columnSpaceDetails(input.label, analysis.rref, rank, pivotColumns),
    warnings: [],
  });
}
