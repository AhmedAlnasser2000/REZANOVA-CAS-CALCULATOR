import { describe, expect, it } from 'vitest';
import { runMatrixMode } from '../modes/matrix';
import { runVectorMode } from '../modes/vector';
import { resolveCanonicalResultForStorage } from './storage';

describe('Linear Algebra canonical result producers', () => {
  it('stores Matrix profile truth through the Matrix owner boundary', () => {
    const outcome = runMatrixMode({
      operation: 'profileA',
      matrixA: [[1, 1], [2, 2]],
      matrixB: [[1, 0], [0, 1]],
    });

    expect(outcome.kind).toBe('success');
    if (outcome.kind !== 'success') throw new Error('Expected Matrix success.');
    expect(resolveCanonicalResultForStorage(outcome))
      .toMatchObject({ ok: true, source: 'native' });
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
    expect(resolveCanonicalResultForStorage(outcome))
      .toMatchObject({ ok: true, source: 'native' });
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
    expect(resolveCanonicalResultForStorage(outcome))
      .toMatchObject({ ok: true, source: 'native' });
    expect(outcome.canonicalResult?.metadata?.sourceMode).toBe('vector');
  });
});
