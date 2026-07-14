import { describe, expect, it } from 'vitest';
import type {
  CanonicalResultDetailPartV2,
  CanonicalResultDocumentV2,
} from '../../types/calculator';
import { runMatrixMode, type RunMatrixModeRequest } from '../modes/matrix';
import { runVectorMode, type RunVectorModeRequest } from '../modes/vector';
import { collectCanonicalMathLeaves } from './mathjson-coverage';

function matrixDocument(request: RunMatrixModeRequest) {
  const outcome = runMatrixMode(request);
  if (outcome.kind !== 'success' || outcome.canonicalResult?.version !== 2) {
    throw new Error(`Expected successful Matrix V2 output for ${request.operation}.`);
  }
  return outcome.canonicalResult as CanonicalResultDocumentV2;
}

function vectorDocument(request: RunVectorModeRequest) {
  const outcome = runVectorMode(request);
  if (outcome.kind !== 'success' || outcome.canonicalResult?.version !== 2) {
    throw new Error(`Expected successful Vector V2 output for ${request.operation}.`);
  }
  return outcome.canonicalResult as CanonicalResultDocumentV2;
}

function rowOperationParts(document: CanonicalResultDocumentV2) {
  const parts: CanonicalResultDetailPartV2[] = [];
  for (const section of document.details ?? []) {
    for (const line of section.lines) parts.push(...line);
  }
  return parts.filter((part) => part.kind === 'row-operation');
}

function linearSystemRequest(
  matrixA: number[][],
  systemRhs: number[],
): RunMatrixModeRequest {
  return {
    operation: 'linearSystem',
    matrixA,
    matrixB: [[1, 0], [0, 1]],
    systemRhs,
    systemForm: 'Ax=b',
  };
}

describe('Canonical Result V2 Linear Algebra semantics', () => {
  it.each([
    {
      label: 'swap',
      request: linearSystemRequest([[0, 1], [1, 0]], [1, 2]),
      expected: { kind: 'swap', firstRow: 1, secondRow: 2 },
    },
    {
      label: 'scale',
      request: linearSystemRequest([[2, 0], [0, 1]], [4, 3]),
      expected: { kind: 'scale', row: 1, factor: { canonicalLatex: '\\frac{1}{2}' } },
    },
    {
      label: 'signed elimination',
      request: linearSystemRequest([[1, 0], [-2, 1]], [1, 0]),
      expected: {
        kind: 'eliminate',
        targetRow: 2,
        sourceRow: 1,
        factor: { canonicalLatex: '-2' },
      },
    },
  ])('stores $label with one-based rows and exact factors', ({ request, expected }) => {
    const document = matrixDocument(request);
    const operation = rowOperationParts(document)
      .find((part) => part.kind === 'row-operation' && part.operation.kind === expected.kind);
    expect(operation?.kind === 'row-operation' ? operation.operation : undefined)
      .toMatchObject(expected);
    expect(collectCanonicalMathLeaves(document).every((leaf) => leaf.value.mathJson !== undefined))
      .toBe(true);
  });

  it('keeps the already-reduced no-operation detail as presentation text', () => {
    const document = matrixDocument(linearSystemRequest([[1, 0], [0, 1]], [2, 3]));
    expect(rowOperationParts(document)).toEqual([]);
    const section = document.details?.find((entry) => entry.title === 'Row Reduction Steps');
    expect(section?.lines).toEqual([[
      { kind: 'text', text: 'The matrix was already in reduced row echelon form.' },
    ]]);
  });

  it.each([
    {
      label: 'singular square',
      matrixA: [[1, 1], [2, 2]],
      matrixOperandLatexA: undefined,
      dimensions: { domainDimension: 2, codomainDimension: 2, rank: 1, nullity: 1 },
    },
    {
      label: 'tall rectangular',
      matrixA: [[1, 0], [0, 1], [0, 0]],
      matrixOperandLatexA: 'T',
      dimensions: { domainDimension: 2, codomainDimension: 3, rank: 2, nullity: 0 },
    },
  ])('stores the exact $label map profile separately from presentation', ({
    matrixA,
    matrixOperandLatexA,
    dimensions,
  }) => {
    const document = matrixDocument({
      operation: 'profileA',
      matrixA,
      matrixB: [[1, 0], [0, 1]],
      ...(matrixOperandLatexA ? { matrixOperandLatexA } : {}),
    });
    expect(document.primary).toMatchObject({
      kind: 'linear-map-profile',
      ...dimensions,
      presentation: { answerRows: { rows: expect.any(Array) } },
      operand: { mathJson: expect.anything() },
    });
    expect(document.answerRows).toBeUndefined();
    expect(collectCanonicalMathLeaves(document).every((leaf) => leaf.value.mathJson !== undefined))
      .toBe(true);
  });

  it.each([
    {
      label: 'dependent',
      vectors: [[1, 0], [0, 1], [1, 1]],
      independent: false,
    },
    {
      label: 'independent',
      vectors: [[1, 0], [0, 1]],
      independent: true,
    },
  ])('stores exact $label operand vectors and the Boolean verdict', ({ vectors, independent }) => {
    const document = vectorDocument({
      operation: 'independent',
      vectorA: vectors[0],
      vectorB: vectors[1],
      vectorOperands: vectors,
      vectorOperandLatexList: vectors.map((_vector, index) => `v_{${index + 1}}`),
      angleUnit: 'rad',
    });
    expect(document.primary).toMatchObject({
      kind: 'linear-independence',
      independent,
      operandVectors: vectors.map(() => ({ mathJson: expect.anything() })),
      presentation: { answerRows: { rows: expect.any(Array) } },
    });
    expect(document.answerRows).toBeUndefined();
    expect(collectCanonicalMathLeaves(document).every((leaf) => leaf.value.mathJson !== undefined))
      .toBe(true);
  });

  it('defaults the Vector span selector to canonical result V2', () => {
    const outcome = runVectorMode({
      operation: 'span',
      vectorA: [1, 0],
      vectorB: [0, 1],
      vectorOperands: [[1, 0], [0, 1]],
      angleUnit: 'rad',
    });
    expect(outcome.kind).toBe('success');
    expect(outcome.kind === 'success' ? outcome.canonicalResult?.version : undefined).toBe(2);
  });

  it('keeps variadic Gram-Schmidt residuals producer-proven in canonical V2', () => {
    const document = vectorDocument({
      operation: 'gramSchmidtUV',
      vectorA: [1, 0, 0],
      vectorB: [1, 1, 0],
      vectorOperands: [[1, 0, 0], [1, 1, 0], [1, 1, 1]],
      vectorOperandLatexList: ['p', 'q', 'r'],
      editorExpressionLatex: '\\operatorname{gram}\\left(p,q,r\\right)',
      angleUnit: 'rad',
    });

    expect(document.primary).toMatchObject({
      kind: 'math',
      value: {
        canonicalLatex: expect.stringContaining('\\operatorname{orthogonal\\ basis}'),
        mathJson: ['Equal', 'orthogonalbasis', ['Set', expect.anything(), expect.anything(), expect.anything()]],
      },
    });
    const proof = document.details?.find((section) => section.title === 'Gram-Schmidt Proof');
    expect(proof?.lines).toHaveLength(6);
    expect(collectCanonicalMathLeaves(document).every((leaf) => leaf.value.mathJson !== undefined))
      .toBe(true);
  });

  it('keeps exact geometric measures and 3D interpretation producer-proven in canonical V2', () => {
    const document = vectorDocument({
      operation: 'volume',
      vectorA: [1, 0, 0],
      vectorB: [0, 2, 0],
      vectorOperands: [[1, 0, 0], [0, 2, 0], [0, 0, 3]],
      vectorOperandLatexList: ['p', 'q', 'r'],
      editorExpressionLatex: '\\operatorname{volume}\\left(p,q,r\\right)',
      angleUnit: 'rad',
    });

    expect(document.version).toBe(2);
    expect(document.primary).toMatchObject({
      kind: 'math',
      value: { canonicalLatex: '6', mathJson: 6 },
    });
    expect(document.details?.find((section) => section.title === '3D Geometry')?.lines)
      .toHaveLength(3);
    expect(collectCanonicalMathLeaves(document).every((leaf) => leaf.value.mathJson !== undefined))
      .toBe(true);
  });

  it('keeps an exact projection primary while adding a precision-aware decimal readback', () => {
    const document = vectorDocument({
      operation: 'projectionUofV',
      vectorA: [1, 1],
      vectorB: [1, 0],
      angleUnit: 'rad',
      approxDigits: 4,
    });
    expect(document.primary).toMatchObject({
      kind: 'math',
      value: {
        canonicalLatex: '\\begin{bmatrix}\\frac{1}{2}\\\\\\frac{1}{2}\\end{bmatrix}',
        mathJson: ['Matrix', expect.any(Array), "'[]'"],
      },
    });
    expect(document.approximations?.primary).toContain('\\begin{bmatrix}0.5');
    expect(document.approximations?.primary).toContain('0.5\\end{bmatrix}');
  });

  it.each([
    {
      label: 'inconsistent',
      request: linearSystemRequest([[1, 1], [1, 1]], [1, 2]),
      primaryLatex: '\\text{No solution}',
    },
    {
      label: 'underdetermined',
      request: linearSystemRequest([[1, 1], [2, 2]], [1, 2]),
      primaryLatex: 'x=\\begin{bmatrix}1-t\\\\t\\end{bmatrix}\\quad t\\in\\mathbb{R}',
    },
    {
      label: 'multi-parameter underdetermined',
      request: linearSystemRequest([[1, 0, 0]], [1]),
      primaryLatex: 'x=\\begin{bmatrix}1\\\\t_{1}\\\\t_{2}\\end{bmatrix}\\quad t_{1},t_{2}\\in\\mathbb{R}',
    },
  ])('keeps $label system presentation on the fail-closed V2 route', ({
    request,
    primaryLatex,
  }) => {
    const document = matrixDocument(request);
    expect(document.primary).toMatchObject({
      kind: 'math',
      value: { canonicalLatex: primaryLatex, mathJson: expect.anything() },
    });
    expect(collectCanonicalMathLeaves(document).every((leaf) => leaf.value.mathJson !== undefined))
      .toBe(true);
  });
});
