import type { ResultProducerDraft, MatrixSystemForm } from '../../types/calculator';
import type { ExactScalar } from '../algebra/polynomial-core';
import {
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
  exactVectorFromNumeric,
  exactVectorFromWire,
  exactVectorToColumnLatex,
} from './exact-matrix-format';
import type { ExactScalarWire } from '../../types/calculator';
import { rowOperationDetailSection } from './row-operation-readback';
import {
  exactMatrixDimensionLimitMessage,
  LINEAR_ALGEBRA_SINGLE_RHS_AUGMENTED_MAX_DIMENSION,
} from './dimension-contract';
import { profileLinearAlgebraResult } from '../display/printer';
import {
  mathPart,
  mixedDetailSection,
  proseSolveSummary,
  textPart,
} from '../display/result-detail-lines';

export type MatrixSystemRunInput = {
  coefficients: number[][];
  constants: number[];
  form: MatrixSystemForm;
  exactCoefficients?: ExactScalarWire[][];
  exactConstants?: ExactScalarWire[];
  editorExpressionLatex?: string;
  coefficientMatrixLatex?: string;
  rhsVectorLatex?: string;
};

function matrixSystemStop(reason: string): ResultProducerDraft {
  return {
    kind: 'error',
    title: 'Matrix system',
    error: reason,
    warnings: [],
    sourceMode: 'matrix',
  };
}
function exactStopReasonToMessage(reason: ExactMatrixStopReason): string {
  switch (reason) {
    case 'empty-matrix':
      return 'The coefficient matrix is empty.';
    case 'ragged-matrix':
      return 'The coefficient matrix rows must have a consistent length.';
    case 'dimension-limit':
      return exactMatrixDimensionLimitMessage('structured Matrix systems');
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

function rankFacts(
  rankA: number,
  rankAugmented: number,
  unknowns: number,
  rref: ExactMatrix,
) {
  return [
    mixedDetailSection('Rank Facts', [
      [textPart('Coefficient rank: '), mathPart(`${rankA}`), textPart('.')],
      [textPart('Augmented rank: '), mathPart(`${rankAugmented}`), textPart('.')],
      [textPart('Unknowns: '), mathPart(`${unknowns}`), textPart('.')],
    ]),
    mixedDetailSection('Augmented RREF', [[
      textPart('RREF of augmented system: '),
      mathPart(exactMatrixToLatex(rref)),
      textPart('.'),
    ]]),
  ];
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return count === 1 ? singular : pluralLabel;
}

function scalarIsZero(value: ExactScalar) {
  return value.numerator === 0;
}

function negateScalar(value: ExactScalar): ExactScalar {
  return { numerator: -value.numerator, denominator: value.denominator };
}

function parameterName(index: number, total: number) {
  return total === 1 ? 't' : `t_{${index + 1}}`;
}

function formatParameterTerm(coefficient: ExactScalar, parameter: string) {
  if (scalarIsZero(coefficient)) {
    return null;
  }

  if (coefficient.denominator === 1 && coefficient.numerator === 1) {
    return parameter;
  }
  if (coefficient.denominator === 1 && coefficient.numerator === -1) {
    return `-${parameter}`;
  }

  return `${exactScalarToLatex(coefficient)}${parameter}`;
}

function joinExpressionTerms(constant: ExactScalar, terms: string[]) {
  const pieces = scalarIsZero(constant) ? [] : [exactScalarToLatex(constant)];
  for (const term of terms) {
    pieces.push(pieces.length > 0 && !term.startsWith('-') ? `+${term}` : term);
  }
  return pieces.length > 0 ? pieces.join('') : '0';
}

function expressionColumnLatex(entries: string[]) {
  return `\\begin{bmatrix}${entries.join('\\\\')}\\end{bmatrix}`;
}

function solutionFamilyFromRref(
  rref: ExactMatrix,
  pivotColumns: number[],
  unknowns: number,
) {
  const coefficientPivots = pivotColumns.filter((column) => column < unknowns);
  const freeColumns = Array.from({ length: unknowns }, (_, index) => index)
    .filter((column) => !coefficientPivots.includes(column));
  if (freeColumns.length === 0) {
    return null;
  }

  const parameterByColumn = new Map<number, string>();
  freeColumns.forEach((column, index) => {
    parameterByColumn.set(column, parameterName(index, freeColumns.length));
  });

  const entries = Array.from({ length: unknowns }, () => '0');
  freeColumns.forEach((column) => {
    entries[column] = parameterByColumn.get(column) ?? 't';
  });

  coefficientPivots.forEach((pivotColumn, pivotRow) => {
    const row = rref[pivotRow];
    if (!row) {
      return;
    }

    const constant = row[unknowns];
    const terms = freeColumns
      .map((freeColumn) => {
        const parameter = parameterByColumn.get(freeColumn) ?? 't';
        return formatParameterTerm(negateScalar(row[freeColumn]), parameter);
      })
      .filter((term): term is string => Boolean(term));
    entries[pivotColumn] = joinExpressionTerms(constant, terms);
  });

  const parameters = freeColumns.map((column) => parameterByColumn.get(column) ?? 't');
  const domain = parameters.length === 1
    ? `${parameters[0]}\\in\\mathbb{R}`
    : `${parameters.join(',')}\\in\\mathbb{R}`;
  const vectorLatex = expressionColumnLatex(entries);
  return profileLinearAlgebraResult({
    domain,
    exactLatex: `x=${vectorLatex}\\quad ${domain}`,
    vectorLatex,
  });
}

function inconsistentRowLatex(rref: ExactMatrix, coefficientColumns: number) {
  const row = rref.find((candidate) =>
    candidate
      .slice(0, coefficientColumns)
      .every((value) => value.numerator === 0)
    && candidate[coefficientColumns]?.numerator !== 0);
  if (!row) {
    return null;
  }

  return `0=${exactScalarToLatex(row[coefficientColumns])}`;
}

function systemProofDetails(
  kind: 'unique' | 'none' | 'infinite',
  rankA: number,
  rankAugmented: number,
  unknowns: number,
  rref: ExactMatrix,
) {
  if (kind === 'unique') {
    return mixedDetailSection('System Proof', [
      [textPart('Coefficient rank: '), mathPart(`${rankA}`), textPart('.')],
      [textPart('Augmented rank: '), mathPart(`${rankAugmented}`), textPart('.')],
      [textPart('Unknowns: '), mathPart(`${unknowns}`), textPart('.')],
      [textPart('The ranks match, so the system is consistent. Because the shared rank equals the number of unknowns, every unknown is fixed by a pivot. Only this vector x satisfies the system.')],
    ]);
  }

  if (kind === 'none') {
    const contradiction = inconsistentRowLatex(rref, unknowns);
    return mixedDetailSection('System Proof', [
      [textPart('Coefficient rank: '), mathPart(`${rankA}`), textPart('.')],
      [textPart('Augmented rank: '), mathPart(`${rankAugmented}`), textPart('.')],
      ...(contradiction
        ? [[textPart('Contradiction: '), mathPart(contradiction), textPart('.')]]
        : [[textPart('The augmented rank is greater than the coefficient rank.')]]),
      [textPart('The augmented matrix has more pivots than the coefficient matrix, so the RHS column creates a contradiction. No vector x can satisfy the system.')],
    ]);
  }

  const freeCount = unknowns - rankA;
  return mixedDetailSection('System Proof', [
    [textPart('Coefficient rank: '), mathPart(`${rankA}`), textPart('.')],
    [textPart('Augmented rank: '), mathPart(`${rankAugmented}`), textPart('.')],
    [textPart('Unknowns: '), mathPart(`${unknowns}`), textPart('.')],
    [textPart('Free variables: '), mathPart(`${freeCount}`), textPart('.')],
    [textPart(`The ranks match, so the system is consistent. Because the shared rank is smaller than the number of unknowns, ${freeCount} ${plural(freeCount, 'variable')} can vary freely. That creates infinitely many solution vectors.`)],
  ]);
}

function solutionFamilyDetails(family: NonNullable<ReturnType<typeof solutionFamilyFromRref>>) {
  return {
    title: 'Solution Family',
    lines: [
      `x=${family.vectorLatex}`,
      family.domain,
    ],
    lineKind: 'math' as const,
  };
}

function systemTitle(form: MatrixSystemForm) {
  return form === 'Ax+b=0' ? 'Ax+b=0' : 'Ax=b';
}

export function runMatrixLinearSystem(input: MatrixSystemRunInput): ResultProducerDraft {
  const coefficients = exactMatrixFromWire(input.exactCoefficients) ?? exactMatrixFromNumeric(input.coefficients);
  const constants = exactVectorFromWire(input.exactConstants) ?? exactVectorFromNumeric(input.constants);
  if (!coefficients || !constants) {
    return matrixSystemStop('Structured Matrix systems need exact Matrix entries in this move.');
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

  const augmentedRref = rrefExactMatrix(augmentedMatrix(coefficients, constants), {
    maxDimension: LINEAR_ALGEBRA_SINGLE_RHS_AUGMENTED_MAX_DIMENSION,
  });
  if (augmentedRref.kind === 'stop') {
    return matrixSystemStop(exactStopReasonToMessage(augmentedRref.reason));
  }

  const rankA = coefficientRref.rank;
  const rankAugmented = augmentedRref.rank;
  const unknowns = coefficients[0].length;
  const title = input.editorExpressionLatex ?? systemTitle(input.form);
  if (rankA < rankAugmented) {
    return profileLinearAlgebraResult({
      kind: 'success',
      title,
      exactLatex: '\\text{No solution}',
      ...proseSolveSummary('No solution.'),
      detailSections: [
        systemProofDetails('none', rankA, rankAugmented, unknowns, augmentedRref.matrix),
        ...rankFacts(rankA, rankAugmented, unknowns, augmentedRref.matrix),
        rowOperationDetailSection(augmentedRref.rowOperations),
      ],
      warnings: [],
      sourceMode: 'matrix',
    });
  }

  if (rankA < unknowns) {
    const family = solutionFamilyFromRref(augmentedRref.matrix, augmentedRref.pivotColumns, unknowns);
    return profileLinearAlgebraResult({
      kind: 'success',
      title,
      exactLatex: family?.exactLatex ?? '\\text{Infinitely many solutions}',
      ...proseSolveSummary(family
        ? 'Infinitely many solutions. The parameterized vector describes all solution vectors.'
        : 'Infinitely many solutions.'),
      detailSections: [
        ...(family ? [solutionFamilyDetails(family)] : []),
        systemProofDetails('infinite', rankA, rankAugmented, unknowns, augmentedRref.matrix),
        ...rankFacts(rankA, rankAugmented, unknowns, augmentedRref.matrix),
        rowOperationDetailSection(augmentedRref.rowOperations),
      ],
      warnings: [],
      sourceMode: 'matrix',
    });
  }

  const solved = solveExactLinearSystem(coefficients, constants);
  if (solved.kind === 'stop') {
    return matrixSystemStop(exactStopReasonToMessage(solved.reason));
  }

  return profileLinearAlgebraResult({
    kind: 'success',
    title,
    exactLatex: `x=${exactVectorToColumnLatex(solved.solution)}`,
    ...proseSolveSummary('Exactly one solution. Only this vector x satisfies the system.'),
    detailSections: [
      systemProofDetails('unique', rankA, rankAugmented, unknowns, augmentedRref.matrix),
      ...rankFacts(rankA, rankAugmented, unknowns, augmentedRref.matrix),
      rowOperationDetailSection(augmentedRref.rowOperations),
    ],
    warnings: [],
    sourceMode: 'matrix',
  });
}
