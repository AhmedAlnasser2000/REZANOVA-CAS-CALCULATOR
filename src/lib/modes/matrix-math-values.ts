import type {
  DisplayDetailLinePart,
  DisplayDetailSection,
  ResultProducerDraft,
} from '../../types/calculator';
import {
  buildExactScalarNode,
  type ExactScalar,
} from '../algebra/polynomial-core';
import {
  determinantExactMatrix,
  inverseExactMatrix,
  rrefExactMatrix,
  solveExactLinearSystem,
  type ExactMatrix,
  type ExactRowOperation,
  type ExactVector,
} from '../linear-algebra/exact-matrix-core';
import {
  exactMatrixFromNumeric,
  exactMatrixFromWire,
  exactMatrixToLatex,
  exactScalarToLatex,
  exactVectorFromNumeric,
  exactVectorFromWire,
  exactVectorToColumnLatex,
} from '../linear-algebra/exact-matrix-format';
import {
  exactAddMatrices,
  exactMultiplyMatrices,
  exactSubtractMatrices,
  exactTransposeMatrix,
} from '../linear-algebra/matrix-exact-ops';
import { analyzeExactColumnFamily } from '../linear-algebra/matrix-column-family';
import { LINEAR_ALGEBRA_SINGLE_RHS_AUGMENTED_MAX_DIMENSION } from '../linear-algebra/dimension-contract';
import { formatRowOperation } from '../linear-algebra/row-operation-readback';
import {
  requireProvenCanonicalMathValueV2,
  tryProvenCanonicalMathValue,
  type CanonicalResultProducerMathValuesV1,
  type CanonicalResultV2MathResolver,
  type ProvenCanonicalMathValue,
  type ProvenCanonicalMathValueV2,
} from '../result-contract';
import type { MathJsonRouteId } from '../result-contract/mathjson-route-registry';
import type { RunMatrixModeRequest } from './matrix';

export type MatrixMathJsonRouteId = Extract<MathJsonRouteId, `matrix.${string}`>;

type MatrixOwnedMathJsonLeaf = {
  canonicalLatex: string;
  mathJson: unknown;
  source: string;
};

export type MatrixProfileV2Evidence = {
  operandLatex: string;
  domainDimension: number;
  codomainDimension: number;
  rank: number;
  nullity: number;
};

export type MatrixRowOperationV2Evidence = {
  presentationLatex: string;
  operation: ExactRowOperation;
};

function unproven(canonicalLatex: string) {
  return { canonicalLatex };
}

function exactMatrixMathJson(matrix: ExactMatrix) {
  return ['Matrix', ['List', ...matrix.map((row) => [
    'List',
    ...row.map(buildExactScalarNode),
  ])], "'[]'"];
}

function exactVectorMathJson(vector: ExactVector) {
  return exactMatrixMathJson(vector.map((value) => [value]));
}

function leaf(canonicalLatex: string, mathJson: unknown, source: string) {
  return { canonicalLatex, mathJson, source } satisfies MatrixOwnedMathJsonLeaf;
}

function exactInputs(request: RunMatrixModeRequest) {
  return {
    matrixA: exactMatrixFromWire(request.exactMatrixA)
      ?? exactMatrixFromNumeric(request.matrixA),
    matrixB: exactMatrixFromWire(request.exactMatrixB)
      ?? exactMatrixFromNumeric(request.matrixB),
    rhs: exactVectorFromWire(request.exactSystemRhs)
      ?? exactVectorFromNumeric(request.systemRhs ?? []),
  };
}

function arithmeticLeaves(request: RunMatrixModeRequest): MatrixOwnedMathJsonLeaf[] {
  if (!['add', 'subtract', 'multiply', 'transposeA', 'transposeB'].includes(request.operation)) {
    return [];
  }
  const { matrixA, matrixB } = exactInputs(request);
  if (!matrixA) return [];

  let result: ExactMatrix | null = null;
  if (request.operation === 'add' && matrixB) result = exactAddMatrices(matrixA, matrixB);
  if (request.operation === 'subtract' && matrixB) result = exactSubtractMatrices(matrixA, matrixB);
  if (request.operation === 'multiply' && matrixB) result = exactMultiplyMatrices(matrixA, matrixB);
  if (request.operation === 'transposeA') result = exactTransposeMatrix(matrixA);
  if (request.operation === 'transposeB' && matrixB) result = exactTransposeMatrix(matrixB);
  return result
    ? [leaf(
        exactMatrixToLatex(result),
        exactMatrixMathJson(result),
        'matrix.arithmetic.native-exact-matrix',
      )]
    : [];
}

function determinantLeaves(request: RunMatrixModeRequest): MatrixOwnedMathJsonLeaf[] {
  const { matrixA, matrixB } = exactInputs(request);
  const matrix = request.operation === 'detA' ? matrixA : matrixB;
  if (!matrix) return [];
  const result = determinantExactMatrix(matrix);
  return result.kind === 'success'
    ? [leaf(
        exactScalarToLatex(result.determinant),
        buildExactScalarNode(result.determinant),
        'matrix.determinant.native-exact-elimination',
      )]
    : [];
}

function inverseLeaves(request: RunMatrixModeRequest): MatrixOwnedMathJsonLeaf[] {
  const { matrixA, matrixB } = exactInputs(request);
  const matrix = request.operation === 'inverseA' ? matrixA : matrixB;
  if (!matrix) return [];
  const result = inverseExactMatrix(matrix);
  return result.kind === 'success'
    ? [leaf(
        exactMatrixToLatex(result.inverse),
        exactMatrixMathJson(result.inverse),
        'matrix.inverse.native-exact-rref',
      )]
    : [];
}

function rankLeaves(request: RunMatrixModeRequest): MatrixOwnedMathJsonLeaf[] {
  const { matrixA, matrixB } = exactInputs(request);
  const matrix = request.operation.endsWith('A') ? matrixA : matrixB;
  if (!matrix) return [];
  const result = rrefExactMatrix(matrix);
  if (result.kind !== 'success') return [];
  return request.operation.startsWith('rank')
    ? [leaf(`${result.rank}`, result.rank, 'matrix.rank.native-exact-rref')]
    : [leaf(
        exactMatrixToLatex(result.matrix),
        exactMatrixMathJson(result.matrix),
        'matrix.rref.native-exact-rref',
      )];
}

function linearSystemAnalysis(request: RunMatrixModeRequest) {
  const { matrixA, rhs } = exactInputs(request);
  if (!matrixA || !rhs || matrixA.length === 0 || matrixA.length !== rhs.length) return null;
  const coefficientRref = rrefExactMatrix(matrixA);
  const augmented = matrixA.map((row, rowIndex) => [...row, rhs[rowIndex]]);
  const augmentedRref = rrefExactMatrix(augmented, {
    maxDimension: LINEAR_ALGEBRA_SINGLE_RHS_AUGMENTED_MAX_DIMENSION,
  });
  if (coefficientRref.kind !== 'success' || augmentedRref.kind !== 'success') return null;
  return {
    matrixA,
    rhs,
    coefficientRref,
    augmentedRref,
    unknowns: matrixA[0]?.length ?? 0,
  };
}

function visibleRowOperations(
  operations: readonly ExactRowOperation[],
): MatrixRowOperationV2Evidence[] {
  return operations.flatMap((operation) => {
    const presentationLatex = formatRowOperation(operation);
    return presentationLatex ? [{ presentationLatex, operation }] : [];
  });
}

function parameterName(index: number, total: number) {
  return total === 1 ? 't' : `t_{${index + 1}}`;
}

function parameterMathJson(parameter: string) {
  const subscript = /^t_\{([1-9][0-9]*)\}$/u.exec(parameter);
  return subscript ? `t_${subscript[1]}` : parameter;
}

function negateScalar(value: ExactScalar): ExactScalar {
  return { numerator: -value.numerator, denominator: value.denominator };
}

function parameterTermLatex(coefficient: ExactScalar, parameter: string) {
  if (coefficient.numerator === 0) return null;
  if (coefficient.numerator === coefficient.denominator) return parameter;
  if (coefficient.numerator === -coefficient.denominator) return `-${parameter}`;
  return `${exactScalarToLatex(coefficient)}${parameter}`;
}

function parameterExpressionLatex(constant: ExactScalar, terms: string[]) {
  const pieces = constant.numerator === 0 ? [] : [exactScalarToLatex(constant)];
  for (const term of terms) {
    pieces.push(pieces.length > 0 && !term.startsWith('-') ? `+${term}` : term);
  }
  return pieces.length > 0 ? pieces.join('') : '0';
}

function parameterTermMathJson(coefficient: ExactScalar, parameter: string) {
  if (coefficient.numerator === 0) return null;
  const symbol = parameterMathJson(parameter);
  if (coefficient.numerator === coefficient.denominator) return symbol;
  if (coefficient.numerator === -coefficient.denominator) return ['Negate', symbol];
  return ['Multiply', buildExactScalarNode(coefficient), symbol];
}

function parameterExpressionMathJson(constant: ExactScalar, terms: unknown[]) {
  const pieces = constant.numerator === 0 ? [] : [buildExactScalarNode(constant)];
  pieces.push(...terms);
  if (pieces.length === 0) return 0;
  return pieces.length === 1 ? pieces[0] : ['Add', ...pieces];
}

function expressionColumnLatex(entries: readonly string[]) {
  return `\\begin{bmatrix}${entries.join('\\\\')}\\end{bmatrix}`;
}

function expressionColumnMathJson(entries: readonly unknown[]) {
  return ['Matrix', ['List', ...entries.map((entry) => ['List', entry])], "'[]'"];
}

function parameterDomainMathJson(parameters: readonly string[]) {
  const symbols = parameters.map(parameterMathJson);
  const last = symbols.at(-1);
  if (!last) return undefined;
  if (symbols.length === 1) return ['Element', last, 'RealNumbers'];
  return [
    'Delimiter',
    ['Sequence', ...symbols.slice(0, -1), ['Element', last, 'RealNumbers']],
    "','",
  ];
}

function solutionFamilyEvidence(
  rref: ExactMatrix,
  pivotColumns: readonly number[],
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
  const latexEntries = Array.from({ length: unknowns }, () => '0');
  const mathJsonEntries: unknown[] = Array.from({ length: unknowns }, () => 0);
  freeColumns.forEach((column) => {
    const parameter = parameterByColumn.get(column) ?? 't';
    latexEntries[column] = parameter;
    mathJsonEntries[column] = parameterMathJson(parameter);
  });
  coefficientPivots.forEach((pivotColumn, pivotRow) => {
    const row = rref[pivotRow];
    if (!row) return;
    const constant = row[unknowns];
    const terms = freeColumns.map((freeColumn) => ({
      coefficient: negateScalar(row[freeColumn]),
      parameter: parameterByColumn.get(freeColumn) ?? 't',
    }));
    latexEntries[pivotColumn] = parameterExpressionLatex(
      constant,
      terms.map(({ coefficient, parameter }) => parameterTermLatex(coefficient, parameter))
        .filter((term): term is string => Boolean(term)),
    );
    mathJsonEntries[pivotColumn] = parameterExpressionMathJson(
      constant,
      terms.map(({ coefficient, parameter }) => parameterTermMathJson(coefficient, parameter))
        .filter((term) => term !== null),
    );
  });

  const parameters = freeColumns.map((column) => parameterByColumn.get(column) ?? 't');
  const domain = parameters.length === 1
    ? `${parameters[0]}\\in\\mathbb{R}`
    : `${parameters.join(',')}\\in\\mathbb{R}`;
  const domainMathJson = parameterDomainMathJson(parameters);
  if (!domainMathJson) return null;
  const vectorLatex = expressionColumnLatex(latexEntries);
  const vectorMathJson = expressionColumnMathJson(mathJsonEntries);
  const vectorEquation = ['Equal', 'x', vectorMathJson];
  const firstParameter = parameterMathJson(parameters[0]);
  const spacedEquation = [
    'Equal',
    'x',
    ['InvisibleOperator', vectorMathJson, ['HorizontalSpacing', 18], firstParameter],
  ];
  const primaryMathJson = parameters.length === 1
    ? ['Element', spacedEquation, 'RealNumbers']
    : [
        'Delimiter',
        [
          'Sequence',
          spacedEquation,
          ...parameters.slice(1, -1).map(parameterMathJson),
          ['Element', parameterMathJson(parameters.at(-1) ?? 't'), 'RealNumbers'],
        ],
        "','",
      ];
  return {
    exactLatex: `x=${vectorLatex}\\quad ${domain}`,
    vectorEquationLatex: `x=${vectorLatex}`,
    domain,
    primaryMathJson,
    vectorEquation,
    domainMathJson,
  };
}

function linearSystemLeaves(request: RunMatrixModeRequest): MatrixOwnedMathJsonLeaf[] {
  const analysis = linearSystemAnalysis(request);
  if (!analysis) return [];
  const {
    matrixA,
    rhs,
    coefficientRref,
    augmentedRref,
    unknowns,
  } = analysis;

  const leaves: MatrixOwnedMathJsonLeaf[] = [
    leaf(
      `${coefficientRref.rank}`,
      coefficientRref.rank,
      'matrix.linear-system.native-coefficient-rank',
    ),
    leaf(
      `${augmentedRref.rank}`,
      augmentedRref.rank,
      'matrix.linear-system.native-augmented-rank',
    ),
    leaf(`${unknowns}`, unknowns, 'matrix.linear-system.native-unknown-count'),
    leaf(
      exactMatrixToLatex(augmentedRref.matrix),
      exactMatrixMathJson(augmentedRref.matrix),
      'matrix.linear-system.native-augmented-rref',
    ),
    ...visibleRowOperations(augmentedRref.rowOperations).flatMap(({ operation }) => (
      operation.kind === 'swap'
        ? []
        : [leaf(
            exactScalarToLatex(operation.factor),
            buildExactScalarNode(operation.factor),
            `matrix.linear-system.native-${operation.kind}-factor`,
          )]
    )),
  ];

  if (coefficientRref.rank < augmentedRref.rank) {
    leaves.push(leaf(
      '\\text{No solution}',
      "'No solution'",
      'matrix.linear-system.native-inconsistent-classification',
    ));
    const contradictionRow = augmentedRref.matrix.find((row) =>
      row.slice(0, unknowns).every((value) => value.numerator === 0)
      && row[unknowns]?.numerator !== 0);
    const contradiction = contradictionRow?.[unknowns];
    if (contradiction) {
      leaves.push(leaf(
        `0=${exactScalarToLatex(contradiction)}`,
        ['Equal', 0, buildExactScalarNode(contradiction)],
        'matrix.linear-system.native-contradiction',
      ));
    }
    return leaves;
  }

  if (coefficientRref.rank < unknowns) {
    const freeVariables = unknowns - coefficientRref.rank;
    leaves.push(leaf(
      `${freeVariables}`,
      freeVariables,
      'matrix.linear-system.native-free-variable-count',
    ));
    const family = solutionFamilyEvidence(
      augmentedRref.matrix,
      augmentedRref.pivotColumns,
      unknowns,
    );
    if (family) {
      leaves.push(
        leaf(
          family.exactLatex,
          family.primaryMathJson,
          'matrix.linear-system.native-solution-family',
        ),
        leaf(
          family.vectorEquationLatex,
          family.vectorEquation,
          'matrix.linear-system.native-solution-family-vector',
        ),
        leaf(
          family.domain,
          family.domainMathJson,
          'matrix.linear-system.native-solution-family-domain',
        ),
      );
    }
    return leaves;
  }

  const solved = solveExactLinearSystem(matrixA, rhs);
  if (solved.kind === 'success') {
    leaves.push(leaf(
      `x=${exactVectorToColumnLatex(solved.solution)}`,
      ['Equal', 'x', exactVectorMathJson(solved.solution)],
      'matrix.linear-system.native-exact-solution',
    ));
  }
  return leaves;
}

export function matrixLinearSystemRowOperationsV2(
  request: RunMatrixModeRequest,
): readonly MatrixRowOperationV2Evidence[] {
  const analysis = linearSystemAnalysis(request);
  return analysis ? visibleRowOperations(analysis.augmentedRref.rowOperations) : [];
}

function matrixOperator(name: string, operand: unknown) {
  return ['InvisibleOperator', name, ['Delimiter', structuredClone(operand)]];
}

function profileOperandMathJson(label: string, matrix: ExactMatrix) {
  if (label.startsWith('\\begin{bmatrix}')) {
    return exactMatrixMathJson(matrix);
  }
  return /^[A-Za-z][A-Za-z0-9_]*$/u.test(label) ? label : undefined;
}

function exactVectorSetLatex(vectors: readonly ExactVector[]) {
  return vectors.length > 0
    ? `\\left\\{${vectors.map(exactVectorToColumnLatex).join(',')}\\right\\}`
    : '\\varnothing';
}

function exactVectorSetMathJson(vectors: readonly ExactVector[]) {
  return vectors.length > 0
    ? ['Set', ...vectors.map(exactVectorMathJson)]
    : 'EmptySet';
}

function indexSetLatex(indices: readonly number[]) {
  return indices.length > 0
    ? `\\left\\{${indices.join(',')}\\right\\}`
    : '\\varnothing';
}

function indexSetMathJson(indices: readonly number[]) {
  return indices.length > 0 ? ['Set', ...indices] : 'EmptySet';
}

function profileLeaves(request: RunMatrixModeRequest): MatrixOwnedMathJsonLeaf[] {
  if (request.operation !== 'profileA' && request.operation !== 'profileB') return [];
  const { matrixA, matrixB } = exactInputs(request);
  const matrix = request.operation === 'profileA' ? matrixA : matrixB;
  if (!matrix) return [];
  const analysis = analyzeExactColumnFamily(matrix);
  if (analysis.kind === 'stop') return [];
  const label = request.operation === 'profileA'
    ? request.matrixOperandLatexA ?? 'A'
    : request.matrixOperandLatexB ?? 'B';
  const operand = profileOperandMathJson(label, matrix);
  if (operand === undefined) return [];
  const columns = matrix[0]?.length ?? 0;
  const pivotColumns = analysis.pivotColumns.map((column) => column + 1);
  const leaves = [
    leaf(
      exactMatrixToLatex(matrix),
      exactMatrixMathJson(matrix),
      'matrix.profile.native-exact-operand',
    ),
    leaf(
      `\\operatorname{rank}(${label})=${analysis.rank}`,
      ['Equal', matrixOperator('rank', operand), analysis.rank],
      'matrix.profile.native-rank',
    ),
    leaf(
      `\\operatorname{nullity}(${label})=${analysis.nullity}`,
      ['Equal', matrixOperator('nullity', operand), analysis.nullity],
      'matrix.profile.native-nullity',
    ),
    leaf(
      `\\operatorname{rank}(${label})+\\operatorname{nullity}(${label})=${columns}`,
      ['Equal', ['Add',
        matrixOperator('rank', operand),
        matrixOperator('nullity', operand),
      ], columns],
      'matrix.profile.native-rank-nullity',
    ),
    leaf(`${analysis.rank}`, analysis.rank, 'matrix.profile.native-rank-value'),
    leaf(`${analysis.nullity}`, analysis.nullity, 'matrix.profile.native-nullity-value'),
    leaf(
      `${analysis.rank}+${analysis.nullity}=${columns}`,
      ['Equal', ['Add', analysis.rank, analysis.nullity], columns],
      'matrix.profile.native-rank-nullity-values',
    ),
    leaf(
      indexSetLatex(pivotColumns),
      indexSetMathJson(pivotColumns),
      'matrix.profile.native-pivot-column-set',
    ),
    leaf(
      exactVectorSetLatex(analysis.kernelBasis),
      exactVectorSetMathJson(analysis.kernelBasis),
      'matrix.profile.native-kernel-spanning-set',
    ),
    leaf(
      exactVectorSetLatex(analysis.imageBasis),
      exactVectorSetMathJson(analysis.imageBasis),
      'matrix.profile.native-image-spanning-set',
    ),
    leaf(
      exactMatrixToLatex(analysis.rref),
      exactMatrixMathJson(analysis.rref),
      'matrix.profile.native-rref',
    ),
  ];
  if (matrix.length === columns) {
    const determinant = determinantExactMatrix(matrix);
    if (determinant.kind === 'success') {
      leaves.push(leaf(
        exactScalarToLatex(determinant.determinant),
        buildExactScalarNode(determinant.determinant),
        'matrix.profile.native-determinant',
      ));
    }
  }
  return leaves;
}

export function matrixProfileV2EvidenceForRequest(
  request: RunMatrixModeRequest,
): MatrixProfileV2Evidence | undefined {
  if (request.operation !== 'profileA' && request.operation !== 'profileB') return undefined;
  const { matrixA, matrixB } = exactInputs(request);
  const matrix = request.operation === 'profileA' ? matrixA : matrixB;
  if (!matrix) return undefined;
  const analysis = analyzeExactColumnFamily(matrix);
  if (analysis.kind === 'stop') return undefined;
  return {
    operandLatex: exactMatrixToLatex(matrix),
    domainDimension: matrix[0]?.length ?? 0,
    codomainDimension: matrix.length,
    rank: analysis.rank,
    nullity: analysis.nullity,
  };
}

export function matrixOwnedMathJsonLeaves(
  request: RunMatrixModeRequest,
): readonly MatrixOwnedMathJsonLeaf[] {
  if (request.operation === 'detA' || request.operation === 'detB') {
    return determinantLeaves(request);
  }
  if (request.operation === 'inverseA' || request.operation === 'inverseB') {
    return inverseLeaves(request);
  }
  if (request.operation === 'rankA' || request.operation === 'rankB'
    || request.operation === 'rrefA' || request.operation === 'rrefB') {
    return rankLeaves(request);
  }
  if (request.operation === 'linearSystem') return linearSystemLeaves(request);
  if (request.operation === 'profileA' || request.operation === 'profileB') {
    return profileLeaves(request);
  }
  return arithmeticLeaves(request);
}

function detailPart(
  part: DisplayDetailLinePart,
  proven: ReadonlyMap<string, ProvenCanonicalMathValue>,
) {
  return part.kind === 'math'
    ? { kind: 'math' as const, math: proven.get(part.latex) ?? unproven(part.latex) }
    : { kind: 'text' as const, text: part.text };
}

function details(
  sections: readonly DisplayDetailSection[] | undefined,
  proven: ReadonlyMap<string, ProvenCanonicalMathValue>,
) {
  return sections?.map((section, sectionIndex) => ({
    title: section.title,
    lines: section.lines.map((line, lineIndex) => {
      const parts = section.lineParts?.[lineIndex];
      if (parts?.length) return parts.map((part) => detailPart(part, proven));
      const kind = section.lineKinds?.[lineIndex] ?? section.lineKind;
      if (kind === 'math') {
        return [{ kind: 'math' as const, math: proven.get(line) ?? unproven(line) }];
      }
      if (kind === 'text') return [{ kind: 'text' as const, text: line }];
      throw new Error(`Matrix producer detail ${sectionIndex}:${lineIndex} has no typed intent.`);
    }),
  }));
}

export function matrixMathValuesFromOwnedLeaves(input: {
  outcome: Exclude<ResultProducerDraft, { kind: 'prompt' }>;
  routeId: MatrixMathJsonRouteId;
  leaves: readonly MatrixOwnedMathJsonLeaf[];
}): CanonicalResultProducerMathValuesV1 {
  const proven = new Map<string, ProvenCanonicalMathValue>();
  for (const candidate of input.leaves) {
    const value = tryProvenCanonicalMathValue({
      canonicalLatex: candidate.canonicalLatex,
      mathJson: candidate.mathJson,
      owner: 'matrix',
      routeId: input.routeId,
      source: candidate.source,
    });
    if (value) proven.set(candidate.canonicalLatex, value);
  }

  const values: CanonicalResultProducerMathValuesV1 = {};
  if (input.outcome.exactLatex) {
    values.primaryMath = proven.get(input.outcome.exactLatex)
      ?? unproven(input.outcome.exactLatex);
  }
  if (input.outcome.kind === 'success' && input.outcome.answerRows) {
    values.answerRows = {
      ...(input.outcome.answerRows.label ? { label: input.outcome.answerRows.label } : {}),
      rows: input.outcome.answerRows.rows.map((row) => ({
        math: proven.get(row.latex) ?? unproven(row.latex),
        ...(row.label ? { label: row.label } : {}),
      })),
    };
  }
  const detailValues = details(input.outcome.detailSections, proven);
  if (detailValues?.length) values.details = detailValues;
  return values;
}

export function matrixV2MathResolverFromOwnedLeaves(input: {
  routeId: MatrixMathJsonRouteId;
  leaves: readonly MatrixOwnedMathJsonLeaf[];
}): CanonicalResultV2MathResolver {
  const proven = new Map<string, ProvenCanonicalMathValueV2>();
  for (const candidate of input.leaves) {
    let value: ProvenCanonicalMathValueV2;
    try {
      value = requireProvenCanonicalMathValueV2({
        canonicalLatex: candidate.canonicalLatex,
        mathJson: candidate.mathJson,
        owner: 'matrix',
        routeId: input.routeId,
        source: candidate.source,
      });
    } catch (error) {
      throw new Error(
        `Matrix V2 proof failed for ${candidate.source} (${candidate.canonicalLatex}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const existing = proven.get(candidate.canonicalLatex);
    if (existing && JSON.stringify(existing.mathJson) !== JSON.stringify(value.mathJson)) {
      throw new Error(`Matrix V2 producer supplied conflicting trees for ${candidate.canonicalLatex}.`);
    }
    proven.set(candidate.canonicalLatex, value);
  }
  return (canonicalLatex, path) => {
    const value = proven.get(canonicalLatex);
    if (!value) {
      throw new Error(`Matrix V2 producer is missing MathJSON proof at ${path}.`);
    }
    return value;
  };
}

export function matrixMathJsonRouteForRequest(
  request: RunMatrixModeRequest,
): MatrixMathJsonRouteId {
  if (request.operation === 'detA' || request.operation === 'detB') return 'matrix.determinant';
  if (request.operation === 'inverseA' || request.operation === 'inverseB') return 'matrix.inverse';
  if (request.operation === 'rankA' || request.operation === 'rankB'
    || request.operation === 'rrefA' || request.operation === 'rrefB') return 'matrix.rank';
  if (request.operation === 'linearSystem') return 'matrix.linear-system';
  if (request.operation === 'profileA' || request.operation === 'profileB') return 'matrix.profile';
  return 'matrix.matrix-arithmetic';
}
