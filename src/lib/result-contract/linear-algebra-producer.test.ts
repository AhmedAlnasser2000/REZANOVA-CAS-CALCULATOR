import { describe, expect, it } from 'vitest';
import { runMatrixMode } from '../modes/matrix';
import { runVectorMode } from '../modes/vector';
import { collectCanonicalMathLeaves } from './mathjson-coverage';
import { requireCanonicalResultAuthority } from './native-result';

describe('Linear Algebra canonical result producers', () => {
  it('stores Matrix profile truth through the Matrix owner boundary', () => {
    const outcome = runMatrixMode({
      operation: 'profileA',
      matrixA: [[1, 1], [2, 2]],
      matrixB: [[1, 0], [0, 1]],
    });

    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') throw new Error('Expected Matrix success.');
    expect(requireCanonicalResultAuthority(outcome, 'Matrix profile test').canonicalResult)
      .toBeDefined();
    expect(outcome.canonicalResult?.metadata?.sourceMode).toBe('matrix');
  });

  it('keeps Matrix Equation-transfer actions transient', () => {
    const outcome = runMatrixMode({
      operation: 'eigenA',
      matrixA: [[0, -1], [1, 0]],
      matrixB: [[1, 0], [0, 1]],
    });

    expect(outcome.kind).toBe('error');
    if (outcome.kind === 'prompt') throw new Error('Expected Matrix result.');
    expect(outcome.actions?.[0]).toMatchObject({ kind: 'send', target: 'equation' });
    expect(requireCanonicalResultAuthority(outcome, 'Matrix action test').canonicalResult)
      .toBeDefined();
    expect(JSON.stringify(outcome.canonicalResult)).not.toContain('actions');
  });

  it('stores Vector Gram-Schmidt truth through the Vector owner boundary', () => {
    const outcome = runVectorMode({
      operation: 'gramSchmidtUV',
      vectorA: [1, 0],
      vectorB: [1, 1],
      angleUnit: 'rad',
    });

    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') throw new Error('Expected Vector success.');
    expect(requireCanonicalResultAuthority(outcome, 'Vector test').canonicalResult)
      .toBeDefined();
    expect(outcome.canonicalResult?.metadata?.sourceMode).toBe('vector');
  });

  it.each([
    ['matrix-arithmetic', { operation: 'add' as const, matrixA: [[1, 2], [3, 4]], matrixB: [[4, 3], [2, 1]] }],
    ['determinant', { operation: 'detA' as const, matrixA: [[1, 2], [3, 4]], matrixB: [[1, 0], [0, 1]] }],
    ['inverse', { operation: 'inverseA' as const, matrixA: [[2, 1], [1, 1]], matrixB: [[1, 0], [0, 1]] }],
    ['rank', { operation: 'rankA' as const, matrixA: [[1, 2], [2, 4]], matrixB: [[1, 0], [0, 1]] }],
  ])('attaches producer-proven Matrix MathJSON for %s', (_family, request) => {
    const outcome = runMatrixMode(request);
    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') throw new Error('Expected Matrix success.');
    expect(outcome.canonicalResult?.version).toBe(2);
    expect(outcome.canonicalResult
      ? collectCanonicalMathLeaves(outcome.canonicalResult)
        .find((entry) => entry.path === 'primary.value')?.value.mathJson
      : undefined).toBeDefined();
  });

  it('stores Matrix-system row operations as typed V2 semantics with proven factors', () => {
    const outcome = runMatrixMode({
      operation: 'linearSystem',
      matrixA: [[2, 1], [1, -1]],
      matrixB: [[1, 0], [0, 1]],
      systemRhs: [5, 1],
      systemForm: 'Ax=b',
    });
    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success' || !outcome.canonicalResult) {
      throw new Error('Expected Matrix-system canonical result.');
    }
    const leaves = collectCanonicalMathLeaves(outcome.canonicalResult);
    expect(outcome.canonicalResult.version).toBe(2);
    expect(leaves).toHaveLength(12);
    expect(leaves.every((entry) => entry.value.mathJson !== undefined)).toBe(true);
    expect(leaves.find((entry) => entry.path === 'primary.value')?.value.mathJson).toBeDefined();
    expect(leaves.filter((entry) => entry.path.endsWith('.operation.factor'))).toHaveLength(4);
    expect(outcome.canonicalResult.version === 2
      ? outcome.canonicalResult.details?.[3]?.lines[0]?.[0]
      : undefined).toMatchObject({
      kind: 'row-operation',
      operation: { kind: 'scale', row: 1 },
    });
  });

  it.each([
    ['dot-product', { operation: 'dot' as const, vectorA: [1, 2, 3], vectorB: [4, 5, 6], angleUnit: 'rad' as const }],
    ['cross-product', { operation: 'cross' as const, vectorA: [1, 0, 0], vectorB: [0, 1, 0], angleUnit: 'rad' as const }],
    ['norm', { operation: 'normA' as const, vectorA: [3, 4], vectorB: [0, 1], angleUnit: 'rad' as const }],
    ['angle', { operation: 'angle' as const, vectorA: [1, 0], vectorB: [0, 1], angleUnit: 'deg' as const }],
  ])('attaches producer-proven Vector MathJSON for %s', (_family, request) => {
    const outcome = runVectorMode(request);
    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') throw new Error('Expected Vector success.');
    expect(outcome.canonicalResult?.version).toBe(2);
    expect(outcome.canonicalResult
      ? collectCanonicalMathLeaves(outcome.canonicalResult)
        .find((entry) => entry.path === 'primary.value')?.value.mathJson
      : undefined).toBeDefined();
  });

  it('attaches producer-proven V2 MathJSON to geometric measure details', () => {
    const outcome = runVectorMode({
      operation: 'parallelogramArea',
      vectorA: [1, 0, 0],
      vectorB: [0, 2, 0],
      vectorOperandLatexA: 'p',
      vectorOperandLatexB: 'q',
      angleUnit: 'rad',
    });
    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success' || !outcome.canonicalResult) {
      throw new Error('Expected geometric Vector canonical result.');
    }
    expect(outcome.canonicalResult.version).toBe(2);
    expect(collectCanonicalMathLeaves(outcome.canonicalResult).every((entry) => (
      entry.value.mathJson !== undefined
    ))).toBe(true);
  });

  it('attaches producer-proven V2 MathJSON to exact definiteness evidence', () => {
    const outcome = runMatrixMode({
      operation: 'definiteA',
      matrixA: [[2, -1], [-1, 2]],
      matrixB: [[1, 0], [0, 1]],
    });
    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success' || !outcome.canonicalResult) {
      throw new Error('Expected definiteness canonical result.');
    }
    expect(outcome.canonicalResult.version).toBe(2);
    expect(collectCanonicalMathLeaves(outcome.canonicalResult)).toHaveLength(4);
    expect(collectCanonicalMathLeaves(outcome.canonicalResult).every((entry) => (
      entry.value.mathJson !== undefined
    ))).toBe(true);
  });

  it('attaches producer-proven V2 MathJSON to numerical decomposition evidence', () => {
    const outcome = runMatrixMode({
      operation: 'pinvA',
      matrixA: [[3, 0], [4, 0]],
      matrixB: [[1, 0], [0, 1]],
    });
    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success' || !outcome.canonicalResult) {
      throw new Error('Expected numerical decomposition canonical result.');
    }
    expect(outcome.canonicalResult.version).toBe(2);
    expect(collectCanonicalMathLeaves(outcome.canonicalResult)).toHaveLength(7);
    expect(collectCanonicalMathLeaves(outcome.canonicalResult).every((entry) => (
      entry.value.mathJson !== undefined
    ))).toBe(true);
  });

  it('proves every Gram-Schmidt replay leaf from exact Vector evidence', () => {
    const outcome = runVectorMode({
      operation: 'gramSchmidtUV',
      vectorA: [1, 0],
      vectorB: [1, 1],
      angleUnit: 'rad',
    });
    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success' || !outcome.canonicalResult) {
      throw new Error('Expected Vector canonical result.');
    }
    const leaves = collectCanonicalMathLeaves(outcome.canonicalResult);
    expect(leaves).toHaveLength(7);
    expect(leaves.every((entry) => entry.value.mathJson !== undefined)).toBe(true);
  });

  it('does not misrepresent a gradian angle marker as an exponent tree', () => {
    const outcome = runVectorMode({
      operation: 'angle',
      vectorA: [1, 0],
      vectorB: [0, 1],
      angleUnit: 'grad',
    });
    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') throw new Error('Expected Vector angle success.');
    expect(outcome.exactLatex).toBe('100^{g}');
    expect(outcome.canonicalResult).toMatchObject({
      version: 3,
      primary: {
        kind: 'angle-quantity',
        presentation: { primaryLatex: '100^{g}' },
        magnitude: { canonicalLatex: '100', mathJson: 100 },
        unit: 'grad',
      },
    });
  });
});
