import type { ResultProducerDraft, MatrixSystemForm } from '../../types/calculator';
import { buildExactScalarNode, type ExactScalar } from '../algebra/polynomial-core';
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
import { formatRowOperation } from './row-operation-readback';
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
import {
  attachLinearAlgebraCanonicalEvidence,
  canonicalLeafEvidence,
  equationMathJson,
  exactMatrixMathJson,
  exactVectorMathJson,
  rowOperationEvidence,
  textMathJson,
  type LinearAlgebraCanonicalEvidence,
} from './canonical-evidence';

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

function parameterMathJson(parameter: string) {
  const subscript = /^t_\{([1-9][0-9]*)\}$/u.exec(parameter);
  return subscript ? ['Subscript', 't', Number(subscript[1])] : parameter;
}

function parameterTermMathJson(coefficient: ExactScalar, parameter: string): unknown | null {
  if (scalarIsZero(coefficient)) return null;
  const symbol = parameterMathJson(parameter);
  if (coefficient.numerator === coefficient.denominator) return symbol;
  if (coefficient.numerator === -coefficient.denominator) return ['Negate', symbol];
  return ['Multiply', buildExactScalarNode(coefficient), symbol];
}

function parameterExpressionMathJson(constant: ExactScalar, terms: unknown[]) {
  const pieces = scalarIsZero(constant) ? [] : [buildExactScalarNode(constant)];
  pieces.push(...terms);
  if (pieces.length === 0) return 0;
  return pieces.length === 1 ? pieces[0] : ['Add', ...pieces];
}

function solutionFamilyCanonicalEvidence(
  rref: ExactMatrix,
  pivotColumns: number[],
  unknowns: number,
) {
  const coefficientPivots = pivotColumns.filter((column) => column < unknowns);
  const freeColumns = Array.from({ length: unknowns }, (_, index) => index)
    .filter((column) => !coefficientPivots.includes(column));
  if (freeColumns.length === 0) return null;

  const parameterByColumn = new Map<number, string>();
  freeColumns.forEach((column, index) => {
    parameterByColumn.set(column, parameterName(index, freeColumns.length));
  });
  const entries: unknown[] = Array.from({ length: unknowns }, () => 0);
  freeColumns.forEach((column) => {
    entries[column] = parameterMathJson(parameterByColumn.get(column) ?? 't');
  });
  coefficientPivots.forEach((pivotColumn, pivotRow) => {
    const row = rref[pivotRow];
    if (!row) return;
    entries[pivotColumn] = parameterExpressionMathJson(
      row[unknowns],
      freeColumns
        .map((freeColumn) => parameterTermMathJson(
          negateScalar(row[freeColumn]),
          parameterByColumn.get(freeColumn) ?? 't',
        ))
        .filter((term): term is unknown => term !== null),
    );
  });
  const vector = ['Matrix', ['List', ...entries.map((entry) => ['List', entry])], "'[]'"];
  const parameters = freeColumns.map((column) => parameterByColumn.get(column) ?? 't');
  const symbols = parameters.map(parameterMathJson);
  const domain = symbols.length === 1
    ? ['Element', symbols[0], 'RealNumbers']
    : ['Delimiter', ['Sequence', ...symbols.slice(0, -1), ['Element', symbols.at(-1), 'RealNumbers']], "','"];
  const spacedEquation = ['Equal', 'x', ['InvisibleOperator', vector, ['HorizontalSpacing', 18], symbols[0]]];
  const primary = symbols.length === 1
    ? ['Element', spacedEquation, 'RealNumbers']
    : ['Delimiter', ['Sequence', spacedEquation, ...symbols.slice(1, -1), ['Element', symbols.at(-1), 'RealNumbers']], "','"];
  return { vector, domain, primary };
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

export function runMatrixLinearSystemWithEvidence(input: MatrixSystemRunInput): {
  outcome: ResultProducerDraft;
  evidence: LinearAlgebraCanonicalEvidence;
} {
  const coefficients = exactMatrixFromWire(input.exactCoefficients) ?? exactMatrixFromNumeric(input.coefficients);
  const constants = exactVectorFromWire(input.exactConstants) ?? exactVectorFromNumeric(input.constants);
  if (!coefficients || !constants) {
    return { outcome: matrixSystemStop('Structured Matrix systems need exact Matrix entries in this move.'), evidence: {} };
  }

  if (coefficients.length === 0 || coefficients[0]?.length === 0) {
    return { outcome: matrixSystemStop('The coefficient matrix is empty.'), evidence: {} };
  }

  if (coefficients.length !== constants.length) {
    return { outcome: matrixSystemStop('The RHS vector length must match the coefficient matrix row count.'), evidence: {} };
  }

  const coefficientRref = rrefExactMatrix(coefficients);
  if (coefficientRref.kind === 'stop') {
    return { outcome: matrixSystemStop(exactStopReasonToMessage(coefficientRref.reason)), evidence: {} };
  }

  const augmentedRref = rrefExactMatrix(augmentedMatrix(coefficients, constants), {
    maxDimension: LINEAR_ALGEBRA_SINGLE_RHS_AUGMENTED_MAX_DIMENSION,
  });
  if (augmentedRref.kind === 'stop') {
    return { outcome: matrixSystemStop(exactStopReasonToMessage(augmentedRref.reason)), evidence: {} };
  }

  const rankA = coefficientRref.rank;
  const rankAugmented = augmentedRref.rank;
  const unknowns = coefficients[0].length;
  const title = input.editorExpressionLatex ?? systemTitle(input.form);
  if (rankA < rankAugmented) {
    const outcome: ResultProducerDraft = profileLinearAlgebraResult({
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
    const contradiction = inconsistentRowLatex(augmentedRref.matrix, unknowns);
    const contradictionValue = augmentedRref.matrix.find((row) =>
      row.slice(0, unknowns).every(scalarIsZero) && !scalarIsZero(row[unknowns]))?.[unknowns];
    const details = [
      canonicalLeafEvidence(`${rankA}`, rankA, 'matrix.linear-system.native-coefficient-rank'),
      canonicalLeafEvidence(`${rankAugmented}`, rankAugmented, 'matrix.linear-system.native-augmented-rank'),
      ...(contradiction && contradictionValue ? [canonicalLeafEvidence(
        contradiction,
        equationMathJson(0, buildExactScalarNode(contradictionValue)),
        'matrix.linear-system.native-contradiction',
      )] : []),
      canonicalLeafEvidence(`${rankA}`, rankA, 'matrix.linear-system.native-rank-facts-coefficient'),
      canonicalLeafEvidence(`${rankAugmented}`, rankAugmented, 'matrix.linear-system.native-rank-facts-augmented'),
      canonicalLeafEvidence(`${unknowns}`, unknowns, 'matrix.linear-system.native-unknown-count'),
      canonicalLeafEvidence(
        exactMatrixToLatex(augmentedRref.matrix),
        exactMatrixMathJson(augmentedRref.matrix),
        'matrix.linear-system.native-augmented-rref',
      ),
      ...augmentedRref.rowOperations.flatMap((operation, index) => {
        const presentation = formatRowOperation(operation);
        return presentation
          ? [rowOperationEvidence(presentation, operation, `matrix.linear-system.native-row-operation-${index}`)]
          : [];
      }),
    ].map((value) => 'kind' in value ? value : ({ kind: 'math' as const, value }));
    const evidence = {
      primary: canonicalLeafEvidence(
        '\\text{No solution}',
        textMathJson('No solution'),
        'matrix.linear-system.native-inconsistent-classification',
      ),
      details,
    } satisfies LinearAlgebraCanonicalEvidence;
    attachLinearAlgebraCanonicalEvidence(outcome, evidence);
    return { outcome, evidence };
  }

  if (rankA < unknowns) {
    const family = solutionFamilyFromRref(augmentedRref.matrix, augmentedRref.pivotColumns, unknowns);
    const outcome: ResultProducerDraft = profileLinearAlgebraResult({
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
    const familyCanonical = solutionFamilyCanonicalEvidence(
      augmentedRref.matrix,
      augmentedRref.pivotColumns,
      unknowns,
    );
    const freeCount = unknowns - rankA;
    const vectorLatex = family ? `x=${family.vectorLatex}` : undefined;
    const details = [
      ...(family && familyCanonical && vectorLatex ? [
        canonicalLeafEvidence(
          vectorLatex,
          equationMathJson('x', familyCanonical.vector),
          'matrix.linear-system.native-solution-family-vector',
        ),
        canonicalLeafEvidence(
          family.domain,
          familyCanonical.domain,
          'matrix.linear-system.native-solution-family-domain',
        ),
      ] : []),
      canonicalLeafEvidence(`${rankA}`, rankA, 'matrix.linear-system.native-coefficient-rank'),
      canonicalLeafEvidence(`${rankAugmented}`, rankAugmented, 'matrix.linear-system.native-augmented-rank'),
      canonicalLeafEvidence(`${unknowns}`, unknowns, 'matrix.linear-system.native-unknown-count'),
      canonicalLeafEvidence(`${freeCount}`, freeCount, 'matrix.linear-system.native-free-variable-count'),
      canonicalLeafEvidence(`${rankA}`, rankA, 'matrix.linear-system.native-rank-facts-coefficient'),
      canonicalLeafEvidence(`${rankAugmented}`, rankAugmented, 'matrix.linear-system.native-rank-facts-augmented'),
      canonicalLeafEvidence(`${unknowns}`, unknowns, 'matrix.linear-system.native-rank-facts-unknown-count'),
      canonicalLeafEvidence(
        exactMatrixToLatex(augmentedRref.matrix),
        exactMatrixMathJson(augmentedRref.matrix),
        'matrix.linear-system.native-augmented-rref',
      ),
      ...augmentedRref.rowOperations.flatMap((operation, index) => {
        const presentation = formatRowOperation(operation);
        return presentation
          ? [rowOperationEvidence(presentation, operation, `matrix.linear-system.native-row-operation-${index}`)]
          : [];
      }),
    ].map((value) => 'kind' in value ? value : ({ kind: 'math' as const, value }));
    const primary = family && familyCanonical
      ? canonicalLeafEvidence(
          family.exactLatex,
          familyCanonical.primary,
          'matrix.linear-system.native-solution-family',
        )
      : canonicalLeafEvidence(
          '\\text{Infinitely many solutions}',
          textMathJson('Infinitely many solutions'),
          'matrix.linear-system.native-infinite-classification',
        );
    const evidence = { primary, details } satisfies LinearAlgebraCanonicalEvidence;
    attachLinearAlgebraCanonicalEvidence(outcome, evidence);
    return { outcome, evidence };
  }

  const solved = solveExactLinearSystem(coefficients, constants);
  if (solved.kind === 'stop') {
    return { outcome: matrixSystemStop(exactStopReasonToMessage(solved.reason)), evidence: {} };
  }

  const outcome: ResultProducerDraft = profileLinearAlgebraResult({
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
  const solutionLatex = `x=${exactVectorToColumnLatex(solved.solution)}`;
  const details = [
    canonicalLeafEvidence(`${rankA}`, rankA, 'matrix.linear-system.native-coefficient-rank'),
    canonicalLeafEvidence(`${rankAugmented}`, rankAugmented, 'matrix.linear-system.native-augmented-rank'),
    canonicalLeafEvidence(`${unknowns}`, unknowns, 'matrix.linear-system.native-unknown-count'),
    canonicalLeafEvidence(`${rankA}`, rankA, 'matrix.linear-system.native-rank-facts-coefficient'),
    canonicalLeafEvidence(`${rankAugmented}`, rankAugmented, 'matrix.linear-system.native-rank-facts-augmented'),
    canonicalLeafEvidence(`${unknowns}`, unknowns, 'matrix.linear-system.native-rank-facts-unknown-count'),
    canonicalLeafEvidence(
      exactMatrixToLatex(augmentedRref.matrix),
      exactMatrixMathJson(augmentedRref.matrix),
      'matrix.linear-system.native-augmented-rref',
    ),
    ...augmentedRref.rowOperations.flatMap((operation, index) => {
      const presentation = formatRowOperation(operation);
      return presentation
        ? [rowOperationEvidence(presentation, operation, `matrix.linear-system.native-row-operation-${index}`)]
        : [];
    }),
  ].map((value) => 'kind' in value ? value : ({ kind: 'math' as const, value }));
  const evidence = {
    primary: canonicalLeafEvidence(
      solutionLatex,
      equationMathJson('x', exactVectorMathJson(solved.solution)),
      'matrix.linear-system.native-exact-solution',
    ),
    details,
  } satisfies LinearAlgebraCanonicalEvidence;
  attachLinearAlgebraCanonicalEvidence(outcome, evidence);
  return { outcome, evidence };
}

export function runMatrixLinearSystem(input: MatrixSystemRunInput): ResultProducerDraft {
  return runMatrixLinearSystemWithEvidence(input).outcome;
}
