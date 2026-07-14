import type {
  DisplayDetailLinePart,
  DisplayDetailSection,
  ResultProducerDraft,
} from '../../types/calculator';
import {
  buildExactScalarNode,
  exactScalarIsZero,
  type ExactScalar,
} from '../algebra/polynomial-core';
import { scalarToLatex } from '../display/format';
import type { ExactMatrix, ExactVector } from '../linear-algebra/exact-matrix-core';
import {
  exactMatrixToLatex,
  exactVectorFromNumeric,
  exactVectorFromWire,
  exactVectorToColumnLatex,
  exactScalarToLatex,
} from '../linear-algebra/exact-matrix-format';
import {
  exactCrossVectors,
  exactDotVectors,
  exactGramSchmidtTwoVectors,
  exactScalarSquareRoot,
} from '../linear-algebra/exact-vector-core';
import {
  analyzeExactColumnFamily,
  exactMatrixFromColumnVectors,
} from '../linear-algebra/matrix-column-family';
import { runNumericVectorOperation } from '../linear-algebra/vector-core';
import {
  requireProvenCanonicalMathValueV2,
  tryProvenCanonicalMathValue,
  type CanonicalResultProducerMathValuesV1,
  type CanonicalResultV2MathResolver,
  type ProvenCanonicalMathValue,
  type ProvenCanonicalMathValueV2,
} from '../result-contract';
import type { MathJsonRouteId } from '../result-contract/mathjson-route-registry';
import type { RunVectorModeRequest } from './vector';

export type VectorMathJsonRouteId = Extract<MathJsonRouteId, `vector.${string}`>;

type VectorOwnedMathJsonLeaf = {
  canonicalLatex: string;
  mathJson: unknown;
  source: string;
};

export type VectorIndependenceV2Evidence = {
  operandVectorLatex: string[];
  independent: boolean;
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

function exactVectorSetLatex(label: string, vectors: readonly ExactVector[]) {
  return `${label}=\\left\\{${vectors.map(exactVectorToColumnLatex).join(',')}\\right\\}`;
}

function exactVectorSetMathJson(label: string, vectors: readonly ExactVector[]) {
  return ['Equal', label, ['Set', ...vectors.map(exactVectorMathJson)]];
}

function leaf(canonicalLatex: string, mathJson: unknown, source: string) {
  return { canonicalLatex, mathJson, source } satisfies VectorOwnedMathJsonLeaf;
}

function exactInputs(request: RunVectorModeRequest) {
  return {
    vectorA: exactVectorFromWire(request.exactVectorA)
      ?? exactVectorFromNumeric(request.vectorA),
    vectorB: exactVectorFromWire(request.exactVectorB)
      ?? exactVectorFromNumeric(request.vectorB),
  };
}

function exactOperationLeaves(request: RunVectorModeRequest): VectorOwnedMathJsonLeaf[] {
  if (!['dot', 'cross', 'normA', 'normB'].includes(request.operation)) return [];
  const { vectorA, vectorB } = exactInputs(request);
  if (request.operation === 'dot' && vectorA && vectorB) {
    const value = exactDotVectors(vectorA, vectorB);
    return [leaf(
      exactScalarToLatex(value),
      buildExactScalarNode(value),
      'vector.dot.native-exact-vectors',
    )];
  }
  if (request.operation === 'cross' && vectorA && vectorB) {
    const value = exactCrossVectors(vectorA, vectorB);
    return value
      ? [leaf(
          exactVectorToColumnLatex(value),
          exactVectorMathJson(value),
          'vector.cross.native-exact-vectors',
        )]
      : [];
  }
  if ((request.operation === 'normA' || request.operation === 'normB')) {
    const vector = request.operation === 'normA' ? vectorA : vectorB;
    const value = vector ? exactScalarSquareRoot(exactDotVectors(vector, vector)) : null;
    if (!value) return [];
    return [leaf(
      exactScalarToLatex(value),
      buildExactScalarNode(value),
      'vector.norm.native-exact-vectors',
    )];
  }
  return [];
}

function angleLeaves(request: RunVectorModeRequest): VectorOwnedMathJsonLeaf[] {
  const result = runNumericVectorOperation({ ...request, operation: 'angle' });
  if (result.kind !== 'scalar') return [];
  if (result.angleUnit === 'grad') return [];
  const roundedValue = Number(scalarToLatex(result.value));
  const suffix = result.angleUnit === 'deg' ? '^{\\circ}' : '';
  const mathJson = result.angleUnit === 'deg'
    ? ['Degrees', roundedValue]
    : roundedValue;
  return [leaf(
    `${scalarToLatex(result.value)}${suffix}`,
    mathJson,
    'vector.angle.native-dot-and-norm-evaluation',
  )];
}

function gramSchmidtLeaves(request: RunVectorModeRequest): VectorOwnedMathJsonLeaf[] {
  const { vectorA, vectorB } = exactInputs(request);
  if (!vectorA || !vectorB) return [];
  const result = exactGramSchmidtTwoVectors(vectorA, vectorB);
  if (!result) return [];

  const leaves: VectorOwnedMathJsonLeaf[] = [
    leaf(
      exactVectorSetLatex('\\operatorname{orthogonal\\ basis}', result.orthogonalBasis),
      exactVectorSetMathJson('orthogonalbasis', result.orthogonalBasis),
      'vector.gram-schmidt.native-exact-orthogonal-basis',
    ),
    ...result.orthogonalBasis.map((vector, index) => leaf(
      `w_{${index + 1}}=${exactVectorToColumnLatex(vector)}`,
      ['Equal', `w_${index + 1}`, exactVectorMathJson(vector)],
      'vector.gram-schmidt.native-exact-orthogonal-vector',
    )),
  ];

  if (result.orthonormalBasis?.length === result.orthogonalBasis.length) {
    leaves.push(leaf(
      exactVectorSetLatex('\\operatorname{orthonormal\\ basis}', result.orthonormalBasis),
      exactVectorSetMathJson('orthonormalbasis', result.orthonormalBasis),
      'vector.gram-schmidt.native-exact-orthonormal-basis',
    ));
  }

  if (result.orthogonalBasis[1]
    && (request.vectorOperandLatexB === undefined || request.vectorOperandLatexB === 'v')) {
    leaves.push(leaf(
      `w_{2}=v-\\operatorname{proj}_{w_{1}}(v)=${exactVectorToColumnLatex(result.orthogonalBasis[1])}`,
      ['Equal', 'w_2', ['Equal',
        ['Subtract', 'v', ['InvisibleOperator', ['Subscript', 'proj', 'w_1'], ['Delimiter', 'v']]],
        exactVectorMathJson(result.orthogonalBasis[1]),
      ]],
      'vector.gram-schmidt.native-exact-projection-step',
    ));
    const dot = exactDotVectors(result.orthogonalBasis[0], result.orthogonalBasis[1]);
    leaves.push(leaf(
      `w_{1}\\cdot w_{2}=${exactScalarToLatex(dot)}`,
      ['Equal', ['Multiply', 'w_1', 'w_2'], buildExactScalarNode(dot)],
      'vector.gram-schmidt.native-exact-orthogonality-check',
    ));
  }
  return leaves;
}

function familyLabels(request: RunVectorModeRequest, count: number) {
  return Array.from({ length: count }, (_, index) => (
    request.vectorOperandLatexList?.[index]
    ?? (index === 0
      ? request.vectorOperandLatexA
      : index === 1
        ? request.vectorOperandLatexB
        : undefined)
    ?? `v_{${index + 1}}`
  ));
}

function negateRelation(relation: ExactVector): ExactVector {
  return relation.map((value) => ({
    numerator: -value.numerator,
    denominator: value.denominator,
  }));
}

function canonicalRelation(relation: ExactVector): ExactVector {
  const last = [...relation].reverse().find((value) => !exactScalarIsZero(value));
  return last && last.numerator > 0 ? negateRelation(relation) : relation;
}

function relationNode(relation: ExactVector, labels: readonly string[]) {
  const terms = relation.flatMap((value, index): unknown[] => {
    if (exactScalarIsZero(value)) return [];
    if (value.numerator === value.denominator) return [labels[index]];
    if (value.numerator === -value.denominator) return [['Negate', labels[index]]];
    return [['Multiply', buildExactScalarNode(value), labels[index]]];
  });
  return terms.length === 1 ? terms[0] : ['Add', ...terms];
}

function relationTerm(value: ExactScalar, label: string) {
  const magnitude = {
    numerator: Math.abs(value.numerator),
    denominator: value.denominator,
  };
  const coefficient = magnitude.numerator === magnitude.denominator
    ? ''
    : exactScalarToLatex(magnitude);
  return `${coefficient}${label}`;
}

function relationLatex(relation: ExactVector, labels: readonly string[]) {
  const terms = relation.flatMap((value, index) => {
    if (exactScalarIsZero(value)) return [];
    return [{ negative: value.numerator < 0, term: relationTerm(value, labels[index]) }];
  });
  return terms.map(({ negative, term }, index) => (
    index === 0 ? `${negative ? '-' : ''}${term}` : `${negative ? '-' : '+'}${term}`
  )).join('') || '0';
}

function setLatex(values: readonly string[]) {
  return values.length > 0
    ? `\\left\\{${values.join(',')}\\right\\}`
    : '\\varnothing';
}

function setMathJson(values: readonly unknown[]) {
  return values.length > 0 ? ['Set', ...values] : 'EmptySet';
}

function familyOperandMathJson(label: string, vector: ExactVector) {
  if (label.startsWith('\\begin{bmatrix}')) return exactVectorMathJson(vector);
  if (/^[A-Za-z][A-Za-z0-9_]*$/u.test(label)) return label;
  const subscript = /^([A-Za-z])_\{([1-9][0-9]*)\}$/u.exec(label);
  return subscript ? ['Subscript', subscript[1], Number(subscript[2])] : undefined;
}

function familyLeaves(request: RunVectorModeRequest): VectorOwnedMathJsonLeaf[] {
  if (request.operation !== 'span' && request.operation !== 'independent') return [];
  const operands = request.vectorOperands ?? [];
  const exactVectors = operands.map((vector, index) => (
    exactVectorFromWire(request.exactVectorOperands?.[index])
    ?? exactVectorFromNumeric(vector)
  ));
  if (!exactVectors.every((vector): vector is ExactVector => vector !== null)) return [];
  const matrix = exactMatrixFromColumnVectors(exactVectors);
  if (!matrix) return [];
  const analysis = analyzeExactColumnFamily(matrix);
  if (analysis.kind === 'stop') return [];
  const labels = familyLabels(request, exactVectors.length);
  const pivotColumns = analysis.pivotColumns.map((column) => column + 1);
  const selectedLabels = analysis.pivotColumns.map((column) => labels[column]);
  const selectedOperands = analysis.pivotColumns.map((column) => (
    familyOperandMathJson(labels[column], exactVectors[column])
  ));
  const leaves: VectorOwnedMathJsonLeaf[] = [
    ...exactVectors.map((vector) => leaf(
      exactVectorToColumnLatex(vector),
      exactVectorMathJson(vector),
      'vector.span-independence.native-exact-operand-vector',
    )),
    leaf(`${analysis.rank}`, analysis.rank, 'vector.span-independence.native-span-dimension'),
    leaf(
      setLatex(pivotColumns.map(String)),
      setMathJson(pivotColumns),
      'vector.span-independence.native-pivot-column-set',
    ),
    ...(selectedOperands.every((operand) => operand !== undefined)
      ? [leaf(
          setLatex(selectedLabels),
          setMathJson(selectedOperands),
          'vector.span-independence.native-selected-basis-set',
        )]
      : []),
    leaf(
      exactMatrixToLatex(analysis.rref),
      exactMatrixMathJson(analysis.rref),
      'vector.span-independence.native-rref',
    ),
    ...analysis.pivotColumns.map((column, index) => leaf(
    `b_{${index + 1}}=${labels[column]}=${exactVectorToColumnLatex(analysis.imageBasis[index])}`,
    ['Equal', `b_${index + 1}`, ['Equal', labels[column], exactVectorMathJson(analysis.imageBasis[index])]],
    'vector.span-independence.native-selected-basis',
    )),
  ];
  const witness = analysis.kernelBasis[0];
  if (!witness) return leaves;
  const relation = canonicalRelation(witness);
  leaves.push(leaf(
    `${relationLatex(relation, labels)}=0`,
    ['Equal', relationNode(relation, labels), 0],
    'vector.span-independence.native-dependence-relation',
  ));
  let target = relation.length - 1;
  while (target >= 0 && exactScalarIsZero(relation[target])) target -= 1;
  if (
    target >= 0
    && relation[target].numerator === -1
    && relation[target].denominator === 1
  ) {
    const right = relation.map((value, index) => index === target
      ? { numerator: 0, denominator: 1 }
      : value);
    leaves.push(leaf(
      `${labels[target]}=${relationLatex(right, labels)}`,
      ['Equal', labels[target], relationNode(right, labels)],
      'vector.span-independence.native-solved-relation',
    ));
  }
  return leaves;
}

export function vectorIndependenceV2EvidenceForRequest(
  request: RunVectorModeRequest,
): VectorIndependenceV2Evidence | undefined {
  if (request.operation !== 'independent') return undefined;
  const operands = request.vectorOperands ?? [];
  const exactVectors = operands.map((vector, index) => (
    exactVectorFromWire(request.exactVectorOperands?.[index])
    ?? exactVectorFromNumeric(vector)
  ));
  if (!exactVectors.every((vector): vector is ExactVector => vector !== null)) return undefined;
  const matrix = exactMatrixFromColumnVectors(exactVectors);
  if (!matrix) return undefined;
  const analysis = analyzeExactColumnFamily(matrix);
  if (analysis.kind === 'stop') return undefined;
  return {
    operandVectorLatex: exactVectors.map(exactVectorToColumnLatex),
    independent: analysis.nullity === 0,
  };
}

export function vectorOwnedMathJsonLeaves(
  request: RunVectorModeRequest,
): readonly VectorOwnedMathJsonLeaf[] {
  if (request.operation === 'angle') return angleLeaves(request);
  if (request.operation === 'gramSchmidtUV') return gramSchmidtLeaves(request);
  if (request.operation === 'span' || request.operation === 'independent') {
    return familyLeaves(request);
  }
  return exactOperationLeaves(request);
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
      throw new Error(`Vector producer detail ${sectionIndex}:${lineIndex} has no typed intent.`);
    }),
  }));
}

export function vectorMathValuesFromOwnedLeaves(input: {
  outcome: Exclude<ResultProducerDraft, { kind: 'prompt' }>;
  routeId: VectorMathJsonRouteId;
  leaves: readonly VectorOwnedMathJsonLeaf[];
}): CanonicalResultProducerMathValuesV1 {
  const proven = new Map<string, ProvenCanonicalMathValue>();
  for (const candidate of input.leaves) {
    const value = tryProvenCanonicalMathValue({
      canonicalLatex: candidate.canonicalLatex,
      mathJson: candidate.mathJson,
      owner: 'vector',
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

export function vectorV2MathResolverFromOwnedLeaves(input: {
  routeId: VectorMathJsonRouteId;
  leaves: readonly VectorOwnedMathJsonLeaf[];
}): CanonicalResultV2MathResolver {
  const proven = new Map<string, ProvenCanonicalMathValueV2>();
  for (const candidate of input.leaves) {
    let value: ProvenCanonicalMathValueV2;
    try {
      value = requireProvenCanonicalMathValueV2({
        canonicalLatex: candidate.canonicalLatex,
        mathJson: candidate.mathJson,
        owner: 'vector',
        routeId: input.routeId,
        source: candidate.source,
      });
    } catch (error) {
      throw new Error(
        `Vector V2 proof failed for ${candidate.source} (${candidate.canonicalLatex}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const existing = proven.get(candidate.canonicalLatex);
    if (existing && JSON.stringify(existing.mathJson) !== JSON.stringify(value.mathJson)) {
      throw new Error(`Vector V2 producer supplied conflicting trees for ${candidate.canonicalLatex}.`);
    }
    proven.set(candidate.canonicalLatex, value);
  }
  return (canonicalLatex, path) => {
    const value = proven.get(canonicalLatex);
    if (!value) {
      throw new Error(`Vector V2 producer is missing MathJSON proof at ${path}.`);
    }
    return value;
  };
}

export function vectorMathJsonRouteForRequest(
  request: RunVectorModeRequest,
): VectorMathJsonRouteId {
  if (request.operation === 'dot') return 'vector.dot-product';
  if (request.operation === 'cross') return 'vector.cross-product';
  if (request.operation === 'normA' || request.operation === 'normB') return 'vector.norm';
  if (request.operation === 'angle') return 'vector.angle';
  if (request.operation === 'span' || request.operation === 'independent') {
    return 'vector.span-independence';
  }
  return 'vector.orthogonalization';
}
