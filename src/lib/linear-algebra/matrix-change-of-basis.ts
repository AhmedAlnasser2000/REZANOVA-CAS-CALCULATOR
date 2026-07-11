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
} from './exact-matrix-format';
import { exactMatrixDimensionLimitMessage } from './dimension-contract';
import { profileLinearAlgebraResult } from '../display/printer';

export type MatrixChangeOfBasisInput = {
  sourceLabel: string;
  targetLabel: string;
  sourceMatrix: number[][];
  targetMatrix: number[][];
  exactSourceMatrix?: ExactScalarWire[][];
  exactTargetMatrix?: ExactScalarWire[][];
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
      return exactMatrixDimensionLimitMessage('change-of-basis readback');
    case 'scalar-growth-limit':
      return 'This change-of-basis request exceeded the exact Matrix arithmetic limit.';
    case 'empty-matrix':
    case 'ragged-matrix':
      return 'Change of basis needs complete rectangular matrices.';
    default:
      return 'Change of basis needs two square full-rank basis matrices with the same dimension.';
  }
}

function exactInputSource(input: MatrixChangeOfBasisInput): ExactMatrix | null {
  return exactMatrixFromWire(input.exactSourceMatrix) ?? exactMatrixFromNumeric(input.sourceMatrix);
}

function exactInputTarget(input: MatrixChangeOfBasisInput): ExactMatrix | null {
  return exactMatrixFromWire(input.exactTargetMatrix) ?? exactMatrixFromNumeric(input.targetMatrix);
}

function matrixColumn(matrix: ExactMatrix, column: number): ExactVector {
  return matrix.map((row) => row[column]);
}

function matrixFromColumns(columns: ExactVector[]): ExactMatrix {
  const rows = columns[0]?.length ?? 0;
  return Array.from({ length: rows }, (_, row) => columns.map((column) => column[row]));
}

function pivotColumnsLatex(pivotColumns: readonly number[]) {
  return pivotColumns.length > 0
    ? pivotColumns.map((column) => `${column + 1}`).join(', ')
    : '\\text{none}';
}

function basisFacts(input: {
  sourceLabel: string;
  targetLabel: string;
  dimension: number;
  sourceDeterminant: string;
  targetDeterminant: string;
  sourcePivots: readonly number[];
  targetPivots: readonly number[];
}): DisplayDetailSection {
  return {
    title: 'Change-of-Basis Facts',
    lines: [
      `\\det(${input.sourceLabel})=${input.sourceDeterminant}`,
      `\\det(${input.targetLabel})=${input.targetDeterminant}`,
      `\\operatorname{dimension}=${input.dimension}`,
      `\\operatorname{pivot\\ columns}(${input.sourceLabel})=\\{${pivotColumnsLatex(input.sourcePivots)}\\}`,
      `\\operatorname{pivot\\ columns}(${input.targetLabel})=\\{${pivotColumnsLatex(input.targetPivots)}\\}`,
    ],
    lineKind: 'math',
  };
}

function proofCard(input: {
  sourceLabel: string;
  targetLabel: string;
  changeMatrix: ExactMatrix;
}): DisplayDetailSection {
  const conversionLabel = `P_{${input.targetLabel}\\leftarrow ${input.sourceLabel}}`;
  return {
    title: 'Change-of-Basis Proof',
    lines: [
      `${conversionLabel}=${input.targetLabel}^{-1}${input.sourceLabel}`,
      `${conversionLabel}=${exactMatrixToLatex(input.changeMatrix)}`,
      `\\text{If }[v]_{${input.sourceLabel}}\\text{ is known, then }[v]_{${input.targetLabel}}=${conversionLabel}[v]_{${input.sourceLabel}}.`,
      `Each column solves ${input.targetLabel}c=a_i, so the columns are the ${input.sourceLabel} basis vectors written in the ${input.targetLabel} basis.`,
    ],
    lineKinds: ['math', 'math', 'math', 'text'],
  };
}

function notBasisDetails(input: {
  label: string;
  rref: ExactMatrix;
  rows: number;
  columns: number;
  rank: number;
  pivotColumns: readonly number[];
}): DisplayDetailSection[] {
  return [
    {
      title: 'Change-of-Basis Facts',
      lines: [
        `\\operatorname{rank}(${input.label})=${input.rank}`,
        `\\operatorname{columns}(${input.label})=${input.columns}`,
        `\\operatorname{pivot\\ columns}=\\{${pivotColumnsLatex(input.pivotColumns)}\\}`,
      ],
      lineKind: 'math',
    },
    {
      title: 'Change-of-Basis Proof',
      lines: [
        `\\operatorname{rref}(${input.label})=${exactMatrixToLatex(input.rref)}`,
        input.rows === input.columns
          ? 'At least one column is not a pivot, so this matrix is not a basis and cannot define unique coordinate conversion.'
          : `This matrix has ${input.columns} column vectors in \\mathbb{R}^{${input.rows}}. Change of basis expects square basis matrices.`,
      ],
      lineKinds: ['math', 'text'],
    },
  ];
}

function basisCheck(label: string, matrix: ExactMatrix) {
  const reduced = rrefExactMatrix(matrix);
  if (reduced.kind === 'stop') {
    return reduced;
  }
  const rows = matrix.length;
  const columns = matrix[0]?.length ?? 0;
  const rank = reduced.pivotColumns.filter((column) => column < columns).length;
  const isBasis = rows === columns && rank === columns;
  return {
    kind: 'success' as const,
    label,
    rows,
    columns,
    rank,
    isBasis,
    rref: reduced.matrix,
    pivotColumns: reduced.pivotColumns.filter((column) => column < columns),
  };
}

export function runMatrixChangeOfBasis(input: MatrixChangeOfBasisInput): MatrixResponse {
  const source = exactInputSource(input);
  const target = exactInputTarget(input);
  if (!source || !target) {
    return matrixStop('Change of basis needs exact Matrix entries in this move.');
  }

  const sourceCheck = basisCheck(input.sourceLabel, source);
  if (sourceCheck.kind === 'stop') {
    return matrixStop(exactStopReasonToMessage(sourceCheck.reason));
  }
  if (!sourceCheck.isBasis) {
    return matrixStop(
      'Change of basis needs two square full-rank basis matrices. Run basis(...) to inspect the source matrix.',
      notBasisDetails(sourceCheck),
    );
  }

  const targetCheck = basisCheck(input.targetLabel, target);
  if (targetCheck.kind === 'stop') {
    return matrixStop(exactStopReasonToMessage(targetCheck.reason));
  }
  if (!targetCheck.isBasis) {
    return matrixStop(
      'Change of basis needs two square full-rank basis matrices. Run basis(...) to inspect the target matrix.',
      notBasisDetails(targetCheck),
    );
  }

  if (sourceCheck.rows !== targetCheck.rows) {
    return matrixStop('Change of basis needs source and target bases in the same dimension.');
  }

  const columns: ExactVector[] = [];
  for (let column = 0; column < sourceCheck.columns; column += 1) {
    const solved = solveExactLinearSystem(target, matrixColumn(source, column));
    if (solved.kind === 'stop') {
      return matrixStop(exactStopReasonToMessage(solved.reason));
    }
    columns.push(solved.solution);
  }

  const sourceDeterminant = determinantExactMatrix(source);
  if (sourceDeterminant.kind === 'stop') {
    return matrixStop(exactStopReasonToMessage(sourceDeterminant.reason));
  }
  const targetDeterminant = determinantExactMatrix(target);
  if (targetDeterminant.kind === 'stop') {
    return matrixStop(exactStopReasonToMessage(targetDeterminant.reason));
  }

  const changeMatrix = matrixFromColumns(columns);
  const conversionLabel = `P_{${input.targetLabel}\\leftarrow ${input.sourceLabel}}`;
  return profileLinearAlgebraResult({
    resultLatex: `${conversionLabel}=${exactMatrixToLatex(changeMatrix)}`,
    approxText: `${sourceCheck.rows} by ${sourceCheck.columns} coordinate conversion`,
    detailSections: [
      basisFacts({
        sourceLabel: input.sourceLabel,
        targetLabel: input.targetLabel,
        dimension: sourceCheck.rows,
        sourceDeterminant: exactScalarToLatex(sourceDeterminant.determinant),
        targetDeterminant: exactScalarToLatex(targetDeterminant.determinant),
        sourcePivots: sourceCheck.pivotColumns,
        targetPivots: targetCheck.pivotColumns,
      }),
      proofCard({
        sourceLabel: input.sourceLabel,
        targetLabel: input.targetLabel,
        changeMatrix,
      }),
    ],
    warnings: [],
  });
}
