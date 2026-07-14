import { describe, expect, it } from 'vitest';
import { scalar, type ExactVector } from './exact-matrix-core';
import { orthogonalizeExactVectors } from './exact-orthogonalization';

function exactVector(values: number[]): ExactVector {
  return values.map((value) => scalar(value));
}

describe('exact orthogonalization core', () => {
  it('orthogonalizes a variadic family and records the accepted residuals', () => {
    const result = orthogonalizeExactVectors([
      exactVector([1, 0, 0]),
      exactVector([1, 1, 0]),
      exactVector([1, 1, 1]),
    ]);

    expect(result.orthogonalBasis).toEqual([
      exactVector([1, 0, 0]),
      exactVector([0, 1, 0]),
      exactVector([0, 0, 1]),
    ]);
    expect(result.steps.map((step) => ({
      inputIndex: step.inputIndex,
      basisIndex: step.basisIndex,
      projections: step.projections.length,
    }))).toEqual([
      { inputIndex: 0, basisIndex: 0, projections: 0 },
      { inputIndex: 1, basisIndex: 1, projections: 1 },
      { inputIndex: 2, basisIndex: 2, projections: 2 },
    ]);
  });

  it('records zero residuals as discarded inputs without adding a basis vector', () => {
    const result = orthogonalizeExactVectors([
      exactVector([1, 1]),
      exactVector([2, 2]),
      exactVector([0, 1]),
    ]);

    expect(result.discardedInputIndices).toEqual([1]);
    expect(result.steps[1]).toMatchObject({ discarded: true, inputIndex: 1 });
    expect(result.orthogonalBasis).toEqual([
      exactVector([1, 1]),
      [scalar(-1, 2), scalar(1, 2)],
    ]);
  });
});
