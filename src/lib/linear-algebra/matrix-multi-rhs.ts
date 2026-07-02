import type { DisplayDetailSection, ExactScalarWire, MatrixResponse } from '../../types/calculator';
import { rrefExactMatrix, type ExactMatrix, type ExactMatrixStopReason } from './exact-matrix-core';
import {
  exactMatrixFromNumeric,
  exactMatrixFromWire,
  exactMatrixToLatex,
} from './exact-matrix-format';
import { rowOperationDetailSection } from './row-operation-readback';

export type MatrixMultiRhsInput = {
  coefficientLabel: string;
  rhsLabel: string;
  coefficients: number[][];
  rhs: number[][];
  exactCoefficients?: ExactScalarWire[][];
  exactRhs?: ExactScalarWire[][];
};

function augmentedMatrix(coefficients: ExactMatrix, rhs: ExactMatrix): ExactMatrix {
  return coefficients.map((row, rowIndex) => [...row, ...rhs[rowIndex]]);
}

function augmentedLabel(coefficientLabel: string, rhsLabel: string) {
  return `[${coefficientLabel}|${rhsLabel}]`;
}

function exactStopReasonToMessage(reason: ExactMatrixStopReason): string {
  switch (reason) {
    case 'empty-matrix':
      return 'Multi-RHS solve needs complete Matrix entries.';
    case 'ragged-matrix':
      return 'Multi-RHS solve needs rectangular Matrix entries.';
    case 'dimension-limit':
      return 'Multi-RHS solve currently supports coefficient and RHS matrices up to 6 by 6.';
    case 'invalid-scalar':
      return 'Multi-RHS solve needs exact Matrix entries in this move.';
    case 'scalar-growth-limit':
      return 'This multi-RHS solve exceeded the exact Matrix arithmetic limit.';
    default:
      return 'This multi-RHS solve could not be classified by the Matrix rank/RREF path.';
  }
}

function rankFacts(input: {
  coefficientLabel: string;
  rhsLabel: string;
  rankA: number;
  rankAugmented: number;
  unknowns: number;
  rhsColumns: number;
  rref: ExactMatrix;
}): DisplayDetailSection[] {
  const augmented = augmentedLabel(input.coefficientLabel, input.rhsLabel);
  return [
    {
      title: 'Rank Facts',
      lines: [
        `\\operatorname{rank}(${input.coefficientLabel})=${input.rankA}`,
        `\\operatorname{rank}(${augmented})=${input.rankAugmented}`,
        `\\operatorname{unknowns}=${input.unknowns}`,
        `\\operatorname{RHS\\ columns}=${input.rhsColumns}`,
      ],
      lineKinds: ['math', 'math', 'math', 'math'],
    },
    {
      title: 'Augmented RREF',
      lines: [
        `\\operatorname{rref}\\left(${augmented}\\right)=${exactMatrixToLatex(input.rref)}`,
      ],
      lineKind: 'math',
    },
  ];
}

function multiRhsProof(input: {
  kind: 'unique' | 'none' | 'nonUnique';
  coefficientLabel: string;
  rhsLabel: string;
  rankA: number;
  rankAugmented: number;
  unknowns: number;
  rhsColumns: number;
}): DisplayDetailSection {
  const augmented = augmentedLabel(input.coefficientLabel, input.rhsLabel);
  if (input.kind === 'unique') {
    return {
      title: 'Multi-RHS Proof',
      lines: [
        `\\operatorname{rank}(${input.coefficientLabel})=\\operatorname{rank}(${augmented})=${input.rankA}`,
        `\\operatorname{unknowns}=${input.unknowns}`,
        `\\operatorname{RHS\\ columns}=${input.rhsColumns}`,
        'Each RHS column has exactly one solution vector. Those solution vectors are collected as the columns of X.',
      ],
      lineKinds: ['math', 'math', 'math', 'text'],
    };
  }

  if (input.kind === 'none') {
    return {
      title: 'Multi-RHS Proof',
      lines: [
        `\\operatorname{rank}(${input.coefficientLabel})=${input.rankA}`,
        `\\operatorname{rank}(${augmented})=${input.rankAugmented}`,
        'At least one RHS column creates a contradiction, so no single matrix X satisfies all RHS columns.',
      ],
      lineKinds: ['math', 'math', 'text'],
    };
  }

  return {
    title: 'Multi-RHS Proof',
    lines: [
      `\\operatorname{rank}(${input.coefficientLabel})=\\operatorname{rank}(${augmented})=${input.rankA}`,
      `\\operatorname{unknowns}=${input.unknowns}`,
      'The ranks match, but the coefficient matrix has fewer pivots than unknowns. The solution matrix is not unique.',
    ],
    lineKinds: ['math', 'math', 'text'],
  };
}

function uniqueSolutionMatrix(
  augmentedRref: ExactMatrix,
  pivotColumns: number[],
  unknowns: number,
  rhsColumns: number,
): ExactMatrix | null {
  const solution: ExactMatrix = Array.from({ length: unknowns }, () => []);
  for (let column = 0; column < unknowns; column += 1) {
    const pivotRow = pivotColumns.indexOf(column);
    if (pivotRow < 0) {
      return null;
    }
    solution[column] = augmentedRref[pivotRow].slice(unknowns, unknowns + rhsColumns);
  }
  return solution;
}

export function runMatrixMultiRhsSolve(input: MatrixMultiRhsInput): MatrixResponse {
  const coefficients = exactMatrixFromWire(input.exactCoefficients) ?? exactMatrixFromNumeric(input.coefficients);
  const rhs = exactMatrixFromWire(input.exactRhs) ?? exactMatrixFromNumeric(input.rhs);
  if (!coefficients || !rhs) {
    return {
      warnings: [],
      error: 'Multi-RHS solve needs exact Matrix entries in this move.',
    };
  }

  if (coefficients.length === 0 || coefficients[0]?.length === 0 || rhs.length === 0 || rhs[0]?.length === 0) {
    return {
      warnings: [],
      error: 'Multi-RHS solve needs complete coefficient and RHS matrices.',
    };
  }

  if (coefficients.length !== rhs.length) {
    return {
      warnings: [],
      error: 'The RHS matrix row count must match the coefficient matrix row count.',
    };
  }

  const coefficientRref = rrefExactMatrix(coefficients);
  if (coefficientRref.kind === 'stop') {
    return {
      warnings: [],
      error: exactStopReasonToMessage(coefficientRref.reason),
    };
  }

  const augmentedRref = rrefExactMatrix(augmentedMatrix(coefficients, rhs), { maxDimension: 12 });
  if (augmentedRref.kind === 'stop') {
    return {
      warnings: [],
      error: exactStopReasonToMessage(augmentedRref.reason),
    };
  }

  const unknowns = coefficients[0].length;
  const rhsColumns = rhs[0].length;
  const rankA = coefficientRref.rank;
  const rankAugmented = augmentedRref.rank;
  const facts = rankFacts({
    coefficientLabel: input.coefficientLabel,
    rhsLabel: input.rhsLabel,
    rankA,
    rankAugmented,
    unknowns,
    rhsColumns,
    rref: augmentedRref.matrix,
  });

  if (rankA < rankAugmented) {
    return {
      resultLatex: '\\text{No solution matrix}',
      approxText: 'no solution matrix',
      detailSections: [
        multiRhsProof({
          kind: 'none',
          coefficientLabel: input.coefficientLabel,
          rhsLabel: input.rhsLabel,
          rankA,
          rankAugmented,
          unknowns,
          rhsColumns,
        }),
        ...facts,
        rowOperationDetailSection(augmentedRref.rowOperations),
      ],
      warnings: [],
    };
  }

  if (rankA < unknowns) {
    return {
      resultLatex: '\\text{Infinitely many solution matrices}',
      approxText: 'not unique',
      detailSections: [
        multiRhsProof({
          kind: 'nonUnique',
          coefficientLabel: input.coefficientLabel,
          rhsLabel: input.rhsLabel,
          rankA,
          rankAugmented,
          unknowns,
          rhsColumns,
        }),
        ...facts,
        rowOperationDetailSection(augmentedRref.rowOperations),
      ],
      warnings: [],
    };
  }

  const solution = uniqueSolutionMatrix(augmentedRref.matrix, augmentedRref.pivotColumns, unknowns, rhsColumns);
  if (!solution) {
    return {
      warnings: [],
      error: 'This multi-RHS solve could not extract a unique solution matrix from RREF.',
    };
  }

  return {
    resultLatex: `X=${exactMatrixToLatex(solution)}`,
    approxText: `unique ${rhsColumns}-column solution`,
    detailSections: [
      multiRhsProof({
        kind: 'unique',
        coefficientLabel: input.coefficientLabel,
        rhsLabel: input.rhsLabel,
        rankA,
        rankAugmented,
        unknowns,
        rhsColumns,
      }),
      ...facts,
      rowOperationDetailSection(augmentedRref.rowOperations),
    ],
    warnings: [],
  };
}
