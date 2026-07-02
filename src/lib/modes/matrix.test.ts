import { describe, expect, it } from 'vitest';
import { runMatrixMode } from './matrix';

describe('runMatrixMode', () => {
  it('adds an explicit Equation action for deferred eigen polynomial roots', () => {
    const result = runMatrixMode({
      operation: 'eigenA',
      matrixA: [[0, -1], [1, 0]],
      matrixB: [[1, 0], [0, 1]],
    });

    expect(result).toMatchObject({
      kind: 'error',
      title: 'eigen(A)',
      error: 'Complex eigenvalue and eigenvector readback is deferred for Matrix V1.',
      actions: [{ kind: 'send', target: 'equation', latex: '\\lambda^{2}+1=0' }],
    });
  });
});
