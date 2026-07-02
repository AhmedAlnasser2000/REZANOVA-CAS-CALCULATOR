import { describe, expect, it } from 'vitest';
import { runVectorMode } from './vector';

describe('runVectorMode', () => {
  it('keeps vector operation ids working with u/v readback labels', () => {
    expect(runVectorMode({
      operation: 'dot',
      vectorA: [1, 2, 3],
      vectorB: [4, 5, 6],
      angleUnit: 'deg',
    }).title).toBe('u·v');
    expect(runVectorMode({
      operation: 'normA',
      vectorA: [3, 4],
      vectorB: [0, 0],
      angleUnit: 'deg',
    }).title).toBe('‖u‖');
    expect(runVectorMode({
      operation: 'add',
      vectorA: [1, 2],
      vectorB: [3, 4],
      angleUnit: 'deg',
    }).title).toBe('u+v');
    expect(runVectorMode({
      operation: 'projectionUofV',
      vectorA: [1, 0],
      vectorB: [2, 3],
      angleUnit: 'deg',
    }).title).toBe('proj_u(v)');
    const orthogonality = runVectorMode({
      operation: 'orthogonalCheck',
      vectorA: [1, 0],
      vectorB: [0, 3],
      angleUnit: 'deg',
    });
    expect(orthogonality.kind).toBe('success');
    if (orthogonality.kind === 'success') {
      expect(orthogonality.exactLatex).toBe('\\text{Orthogonal}');
    }
  });
});
