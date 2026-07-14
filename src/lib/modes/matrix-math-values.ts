import type {
  DisplayDetailLinePart,
  DisplayDetailSection,
  ResultProducerDraft,
} from '../../types/calculator';
import { buildExactScalarNode } from '../algebra/polynomial-core';
import {
  determinantExactMatrix,
  inverseExactMatrix,
  rrefExactMatrix,
  solveExactLinearSystem,
  type ExactMatrix,
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
import {
  tryProvenCanonicalMathValue,
  type CanonicalResultProducerMathValuesV1,
  type ProvenCanonicalMathValue,
} from '../result-contract';
import type { MathJsonRouteId } from '../result-contract/mathjson-route-registry';
import type { RunMatrixModeRequest } from './matrix';

export type MatrixMathJsonRouteId = Extract<MathJsonRouteId, `matrix.${string}`>;

type MatrixOwnedMathJsonLeaf = {
  canonicalLatex: string;
  mathJson: unknown;
  source: string;
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

function linearSystemLeaves(request: RunMatrixModeRequest): MatrixOwnedMathJsonLeaf[] {
  const { matrixA, rhs } = exactInputs(request);
  if (!matrixA || !rhs || matrixA.length === 0 || matrixA.length !== rhs.length) return [];
  const coefficientRref = rrefExactMatrix(matrixA);
  const augmented = matrixA.map((row, rowIndex) => [...row, rhs[rowIndex]]);
  const augmentedRref = rrefExactMatrix(augmented, {
    maxDimension: LINEAR_ALGEBRA_SINGLE_RHS_AUGMENTED_MAX_DIMENSION,
  });
  if (coefficientRref.kind !== 'success' || augmentedRref.kind !== 'success') return [];

  const unknowns = matrixA[0]?.length ?? 0;
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
  ];

  if (coefficientRref.rank < augmentedRref.rank) {
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

function matrixOperator(name: string, operand: unknown) {
  return ['InvisibleOperator', name, ['Delimiter', operand]];
}

function profileOperandMathJson(label: string, matrix: ExactMatrix) {
  if (label.startsWith('\\begin{bmatrix}')) {
    return exactMatrixMathJson(matrix);
  }
  return /^[A-Za-z][A-Za-z0-9_]*$/u.test(label) ? label : undefined;
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
  const leaves = [
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
    leaf(
      `\\operatorname{rref}(${label})=${exactMatrixToLatex(analysis.rref)}`,
      ['Equal', matrixOperator('rref', operand), exactMatrixMathJson(analysis.rref)],
      'matrix.profile.native-rref',
    ),
  ];
  if (matrix.length === columns) {
    const determinant = determinantExactMatrix(matrix);
    if (determinant.kind === 'success') {
      leaves.push(leaf(
        `\\det(${label})=${exactScalarToLatex(determinant.determinant)}`,
        ['Equal', ['Determinant', operand], buildExactScalarNode(determinant.determinant)],
        'matrix.profile.native-determinant',
      ));
    }
  }
  return leaves;
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
