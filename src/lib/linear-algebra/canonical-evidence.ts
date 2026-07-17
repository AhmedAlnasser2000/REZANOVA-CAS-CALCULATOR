import { buildExactScalarNode, type ExactScalar } from '../algebra/polynomial-core';
import type { ExactMatrix, ExactRowOperation, ExactVector } from './exact-matrix-core';
import { exactScalarToLatex } from './exact-matrix-format';

export type LinearAlgebraCanonicalLeafEvidence = {
  canonicalLatex: string;
  mathJson: unknown;
  source: string;
};

export type LinearAlgebraCanonicalDetailEvidence =
  | {
      kind: 'math';
      value: LinearAlgebraCanonicalLeafEvidence;
    }
  | {
      kind: 'row-operation';
      presentationLatex: string;
      operation: ExactRowOperation;
      factor?: LinearAlgebraCanonicalLeafEvidence;
      source: string;
    };

export type LinearAlgebraCanonicalSemanticPrimaryEvidence =
  | {
      kind: 'linear-map-profile';
      operand: LinearAlgebraCanonicalLeafEvidence;
      domainDimension: number;
      codomainDimension: number;
      rank: number;
      nullity: number;
    }
  | {
      kind: 'linear-independence';
      operandVectors: LinearAlgebraCanonicalLeafEvidence[];
      independent: boolean;
    }
  | {
      kind: 'angle-quantity';
      magnitude: LinearAlgebraCanonicalLeafEvidence;
      unit: 'grad';
    };

export type LinearAlgebraCanonicalEvidence = {
  primary?: LinearAlgebraCanonicalLeafEvidence;
  answerRows?: LinearAlgebraCanonicalLeafEvidence[];
  supplements?: LinearAlgebraCanonicalLeafEvidence[];
  details?: LinearAlgebraCanonicalDetailEvidence[];
  semanticPrimary?: LinearAlgebraCanonicalSemanticPrimaryEvidence;
  runtimeActions?: LinearAlgebraCanonicalLeafEvidence[];
};

const canonicalEvidenceByResponse = new WeakMap<object, LinearAlgebraCanonicalEvidence>();

export function attachLinearAlgebraCanonicalEvidence<Response extends object>(
  response: Response,
  evidence: LinearAlgebraCanonicalEvidence,
): Response {
  canonicalEvidenceByResponse.set(response, evidence);
  return response;
}

export function linearAlgebraCanonicalEvidenceForResponse(
  response: object,
): LinearAlgebraCanonicalEvidence {
  return canonicalEvidenceByResponse.get(response) ?? {};
}

export function canonicalLeafEvidence(
  canonicalLatex: string,
  mathJson: unknown,
  source: string,
): LinearAlgebraCanonicalLeafEvidence {
  const active = new WeakSet<object>();
  const copy = (value: unknown): unknown => {
    if (!value || typeof value !== 'object') return value;
    if (active.has(value)) {
      throw new Error(`Linear Algebra producer emitted cyclic MathJSON from ${source}.`);
    }
    active.add(value);
    const result = Array.isArray(value)
      ? value.map(copy)
      : Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, copy(entry)]));
    active.delete(value);
    return result;
  };
  return { canonicalLatex, mathJson: copy(mathJson), source };
}

export function proofLatexForLinearAlgebraPresentation(canonicalLatex: string) {
  if (!canonicalLatex.includes('\\begin{cases}')) return canonicalLatex;
  // Compute Engine treats a visual comma in a cases value cell as a Sequence,
  // but the comma is only a presentation separator before the condition column.
  return canonicalLatex.replace(/,\s*&/gu, '&');
}

export function exactScalarMathJson(value: ExactScalar) {
  const node = buildExactScalarNode(value);
  if (typeof node === 'number' && node < 0) return ['Negate', -node];
  if (Array.isArray(node) && node[0] === 'Rational' && typeof node[1] === 'number' && node[1] < 0) {
    return ['Negate', ['Rational', -node[1], node[2]]];
  }
  return node;
}

function numericScalarMathJson(value: number) {
  return value < 0 ? ['Negate', -value] : value;
}

function structuralScalarMathJson(value: unknown) {
  if (typeof value === 'number') return numericScalarMathJson(value);
  if (Array.isArray(value) && value[0] === 'Rational' && typeof value[1] === 'number' && value[1] < 0) {
    return ['Negate', ['Rational', -value[1], value[2]]];
  }
  return structuredClone(value);
}

export function exactMatrixMathJson(matrix: ExactMatrix) {
  return ['Matrix', ['List', ...matrix.map((row) => [
    'List',
    ...row.map(exactScalarMathJson),
  ])], "'[]'"];
}

export function exactVectorMathJson(vector: ExactVector) {
  return exactMatrixMathJson(vector.map((value) => [value]));
}

export function numericMatrixMathJson(matrix: readonly (readonly number[])[]) {
  return ['Matrix', ['List', ...matrix.map((row) => [
    'List',
    ...row.map(numericScalarMathJson),
  ])], "'[]'"];
}

export function numericVectorMathJson(vector: readonly number[]) {
  return numericMatrixMathJson(vector.map((value) => [value]));
}

export function numericVectorSetMathJson(vectors: readonly (readonly number[])[]) {
  return vectors.length > 0
    ? ['Set', ...vectors.map(numericVectorMathJson)]
    : 'EmptySet';
}

export function exactVectorSetMathJson(vectors: readonly ExactVector[]) {
  return vectors.length > 0
    ? ['Set', ...vectors.map(exactVectorMathJson)]
    : 'EmptySet';
}

export function integerSetMathJson(values: readonly number[]) {
  return values.length > 0 ? ['Set', ...values] : 'EmptySet';
}

export function textMathJson(value: string) {
  return `'${value}'`;
}

export function labelMathJson(label: string, fallback: unknown): unknown {
  if (/^[A-Za-z][A-Za-z0-9_]*$/u.test(label)) return label;
  const subscript = /^([A-Za-z])_\{([1-9][0-9]*)\}$/u.exec(label);
  return subscript ? ['Subscript', subscript[1], Number(subscript[2])] : fallback;
}

export function operatorMathJson(name: string, operand: unknown) {
  if (name === 'tr') return ['Trace', structuredClone(operand)];
  if (name === 'det') return ['Determinant', structuredClone(operand)];
  return ['InvisibleOperator', name, ['Delimiter', structuredClone(operand)]];
}

export function equationMathJson(left: unknown, right: unknown) {
  return ['Equal', structuralScalarMathJson(left), structuralScalarMathJson(right)];
}

export function rowOperationEvidence(
  presentationLatex: string,
  operation: ExactRowOperation,
  source: string,
): LinearAlgebraCanonicalDetailEvidence {
  const factor = operation.kind === 'swap'
    ? undefined
    : canonicalLeafEvidence(
        exactScalarToLatex(operation.factor),
        exactScalarMathJson(operation.factor),
        `${source}.factor`,
      );
  return {
    kind: 'row-operation',
    presentationLatex,
    operation,
    ...(factor ? { factor } : {}),
    source,
  };
}
