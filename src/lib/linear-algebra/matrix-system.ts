import type { DisplayOutcome, MatrixSystemForm } from '../../types/calculator';
import {
  rrefExactMatrix,
  solveExactLinearSystem,
  type ExactMatrix,
  type ExactMatrixStopReason,
  type ExactVector,
} from './exact-matrix-core';
import {
  exactMatrixFromNumeric,
  exactMatrixToLatex,
  exactVectorFromNumeric,
  exactVectorToColumnLatex,
} from './exact-matrix-format';

export type MatrixSystemRunInput = {
  coefficients: number[][];
  constants: number[];
  form: MatrixSystemForm;
};

function matrixSystemStop(reason: string): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Matrix system',
    error: reason,
    warnings: [],
  };
}
function exactStopReasonToMessage(reason: ExactMatrixStopReason): string {
  switch (reason) {
    case 'empty-matrix':
      return 'The coefficient matrix is empty.';
    case 'ragged-matrix':
      return 'The coefficient matrix rows must have a consistent length.';
    case 'dimension-limit':
      return 'Structured Matrix systems currently support matrices up to 6 by 6.';
    case 'rhs-dimension-mismatch':
      return 'The RHS vector length must match the coefficient matrix row count.';
    case 'invalid-scalar':
      return 'Structured Matrix systems need exact integer entries in this move.';
    case 'scalar-growth-limit':
      return 'This structured system exceeded the exact Matrix arithmetic limit.';
    case 'non-square-matrix':
    case 'singular-matrix':
    case 'inconsistent-system':
    case 'underdetermined-system':
      return 'This structured system could not be classified by the Matrix rank/RREF path.';
    default:
      return 'This structured system could not be classified.';
  }
}

function augmentedMatrix(coefficients: ExactMatrix, constants: ExactVector): ExactMatrix {
  return coefficients.map((row, rowIndex) => [...row, constants[rowIndex]]);
}

function rankFacts(rankA: number, rankAugmented: number, unknowns: number, rref: ExactMatrix) {
  return [
    {
      title: 'Rank facts',
      lines: [
        `rank(A) = ${rankA}`,
        `rank([A|b]) = ${rankAugmented}`,
        `unknowns = ${unknowns}`,
      ],
    },
    {
      title: 'Augmented RREF',
      lineKind: 'math' as const,
      lines: [
        `\\operatorname{rref}\\left([A|b]\\right)=${exactMatrixToLatex(rref)}`,
      ],
    },
  ];
}

function systemTitle(form: MatrixSystemForm) {
  return form === 'Ax+b=0' ? 'Ax+b=0' : 'Ax=b';
}

export function runMatrixLinearSystem(input: MatrixSystemRunInput): DisplayOutcome {
  const coefficients = exactMatrixFromNumeric(input.coefficients);
  const constants = exactVectorFromNumeric(input.constants);
  if (!coefficients || !constants) {
    return matrixSystemStop('Structured Matrix systems need exact integer entries in this move.');
  }

  if (coefficients.length === 0 || coefficients[0]?.length === 0) {
    return matrixSystemStop('The coefficient matrix is empty.');
  }

  if (coefficients.length !== constants.length) {
    return matrixSystemStop('The RHS vector length must match the coefficient matrix row count.');
  }

  const coefficientRref = rrefExactMatrix(coefficients);
  if (coefficientRref.kind === 'stop') {
    return matrixSystemStop(exactStopReasonToMessage(coefficientRref.reason));
  }

  const augmentedRref = rrefExactMatrix(augmentedMatrix(coefficients, constants), { maxDimension: 7 });
  if (augmentedRref.kind === 'stop') {
    return matrixSystemStop(exactStopReasonToMessage(augmentedRref.reason));
  }

  const rankA = coefficientRref.rank;
  const rankAugmented = augmentedRref.rank;
  const unknowns = coefficients[0].length;
  const details = rankFacts(rankA, rankAugmented, unknowns, augmentedRref.matrix);
  const title = systemTitle(input.form);

  if (rankA < rankAugmented) {
    return {
      kind: 'success',
      title,
      exactLatex: '\\text{No solution}',
      solveSummaryText: 'No solution.',
      detailSections: details,
      warnings: [],
    };
  }

  if (rankA < unknowns) {
    return {
      kind: 'success',
      title,
      exactLatex: '\\text{Infinitely many solutions}',
      solveSummaryText: 'Infinitely many solutions.',
      detailSections: details,
      warnings: [],
    };
  }

  const solved = solveExactLinearSystem(coefficients, constants);
  if (solved.kind === 'stop') {
    return matrixSystemStop(exactStopReasonToMessage(solved.reason));
  }

  return {
    kind: 'success',
    title,
    exactLatex: `x=${exactVectorToColumnLatex(solved.solution)}`,
    solveSummaryText: 'Unique solution.',
    detailSections: details,
    warnings: [],
  };
}
