import { describe, expect, it } from 'vitest';
import { runVectorOperation } from './vector';

describe('runVectorOperation', () => {
  it('runs shipped numeric vector scalar and vector operations', () => {
    expect(runVectorOperation({
      operation: 'dot',
      vectorA: [1, 2, 3],
      vectorB: [4, 5, 6],
      angleUnit: 'deg',
    }).resultLatex).toBe('32');
    expect(runVectorOperation({
      operation: 'cross',
      vectorA: [1, 0, 0],
      vectorB: [0, 1, 0],
      angleUnit: 'deg',
    }).resultLatex).toBe('\\begin{bmatrix}0\\\\0\\\\1\\end{bmatrix}');
    expect(runVectorOperation({
      operation: 'add',
      vectorA: [1, 2, 3],
      vectorB: [4, 5, 6],
      angleUnit: 'deg',
    }).resultLatex).toBe('\\begin{bmatrix}5\\\\7\\\\9\\end{bmatrix}');
    expect(runVectorOperation({
      operation: 'subtract',
      vectorA: [1, 2, 3],
      vectorB: [4, 5, 6],
      angleUnit: 'deg',
    }).resultLatex).toBe('\\begin{bmatrix}-3\\\\-3\\\\-3\\end{bmatrix}');
  });

  it('runs shipped numeric norm and angle operations', () => {
    const norm = runVectorOperation({
      operation: 'normA',
      vectorA: [3, 4],
      angleUnit: 'deg',
    });
    const angle = runVectorOperation({
      operation: 'angle',
      vectorA: [1, 0],
      vectorB: [0, 1],
      angleUnit: 'deg',
    });

    expect(norm.resultLatex).toBe('5');
    expect(norm.approxText).toBe('5');
    expect(angle.resultLatex).toBe('90^{\\circ}');
    expect(angle.approxText).toBe('90');
  });

  it('runs projection, orthogonal component, unit vector, and orthogonality readback', () => {
    expect(runVectorOperation({
      operation: 'projectionUofV',
      vectorA: [1, 0],
      vectorB: [2, 3],
      angleUnit: 'deg',
    }).resultLatex).toBe('\\begin{bmatrix}2\\\\0\\end{bmatrix}');
    expect(runVectorOperation({
      operation: 'orthogonalToU',
      vectorA: [1, 0],
      vectorB: [2, 3],
      angleUnit: 'deg',
    }).resultLatex).toBe('\\begin{bmatrix}0\\\\3\\end{bmatrix}');
    expect(runVectorOperation({
      operation: 'unitA',
      vectorA: [3, 4],
      angleUnit: 'deg',
    }).resultLatex).toBe('\\begin{bmatrix}0.6\\\\0.8\\end{bmatrix}');
    const orthogonal = runVectorOperation({
      operation: 'orthogonalCheck',
      vectorA: [1, 0],
      vectorB: [0, 3],
      angleUnit: 'deg',
    });
    expect(orthogonal.resultLatex).toBe('\\text{Orthogonal}');
    expect(orthogonal.approxText).toBe('dot = 0');
  });

  it('stops on incomplete, mismatched, non-3D cross, and zero-vector angle requests', () => {
    expect(runVectorOperation({
      operation: 'normA',
      vectorA: [],
      vectorB: [],
      angleUnit: 'deg',
    }).error).toBe('Vector u is incomplete.');
    expect(runVectorOperation({
      operation: 'dot',
      vectorA: [1, 2],
      angleUnit: 'deg',
    }).error).toBe('Vector v is required for this operation.');
    expect(runVectorOperation({
      operation: 'dot',
      vectorA: [1, 2],
      vectorB: [1, 2, 3],
      angleUnit: 'deg',
    }).error).toBe('Vector dimensions must match.');
    expect(runVectorOperation({
      operation: 'cross',
      vectorA: [1, 2],
      vectorB: [3, 4],
      angleUnit: 'deg',
    }).error).toBe('Cross product requires 3D vectors.');
    expect(runVectorOperation({
      operation: 'angle',
      vectorA: [0, 0],
      vectorB: [1, 0],
      angleUnit: 'deg',
    }).error).toBe('Angle is undefined when one vector has zero length.');
    expect(runVectorOperation({
      operation: 'projectionUofV',
      vectorA: [0, 0],
      vectorB: [1, 0],
      angleUnit: 'deg',
    }).error).toBe('Projection needs a nonzero vector to project onto.');
    expect(runVectorOperation({
      operation: 'unitA',
      vectorA: [0, 0],
      angleUnit: 'deg',
    }).error).toBe('Unit vector is undefined for the zero vector.');
  });
});
