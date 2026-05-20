import { describe, expect, it } from 'vitest';
import {
  addVectors,
  angleBetweenVectors,
  crossVectors,
  dotVectors,
  getVectorShapeFacts,
  haveSameVectorDimension,
  normVector,
  runNumericVectorOperation,
  subtractVectors,
} from './vector-core';

describe('vector-core shape facts', () => {
  it('classifies vector dimensions and compatibility', () => {
    expect(getVectorShapeFacts([])).toEqual({ dimension: 0, isEmpty: true });
    expect(getVectorShapeFacts([1, 2, 3])).toEqual({ dimension: 3, isEmpty: false });
    expect(haveSameVectorDimension([1, 2], [3, 4])).toBe(true);
    expect(haveSameVectorDimension([1, 2], [3, 4, 5])).toBe(false);
  });
});

describe('vector-core operations', () => {
  it('runs reusable numeric vector scalar and vector operations', () => {
    expect(dotVectors([1, 2, 3], [4, 5, 6])).toBe(32);
    expect(crossVectors([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
    expect(addVectors([1, 2, 3], [4, 5, 6])).toEqual([5, 7, 9]);
    expect(subtractVectors([1, 2, 3], [4, 5, 6])).toEqual([-3, -3, -3]);
  });

  it('runs reusable numeric norm and angle operations', () => {
    expect(normVector([3, 4])).toBe(5);
    expect(angleBetweenVectors([1, 0], [0, 1], 'deg')).toBe(90);
    expect(angleBetweenVectors([1, 0], [0, 1], 'grad')).toBe(100);
    expect(angleBetweenVectors([1, 0], [0, 1], 'rad')).toBeCloseTo(Math.PI / 2);
  });

  it('returns typed vector/scalar results from the operation boundary', () => {
    expect(runNumericVectorOperation({
      operation: 'dot',
      vectorA: [1, 2, 3],
      vectorB: [4, 5, 6],
      angleUnit: 'deg',
    })).toEqual({
      kind: 'scalar',
      value: 32,
    });
    expect(runNumericVectorOperation({
      operation: 'cross',
      vectorA: [1, 0, 0],
      vectorB: [0, 1, 0],
      angleUnit: 'deg',
    })).toEqual({
      kind: 'vector',
      value: [0, 0, 1],
    });
  });

  it('returns typed stops for invalid numeric requests', () => {
    expect(runNumericVectorOperation({
      operation: 'normA',
      vectorA: [],
      vectorB: [],
      angleUnit: 'deg',
    })).toEqual({
      kind: 'error',
      reason: 'vector-a-incomplete',
    });
    expect(runNumericVectorOperation({
      operation: 'dot',
      vectorA: [1, 2],
      angleUnit: 'deg',
    })).toEqual({
      kind: 'error',
      reason: 'vector-b-required',
    });
    expect(runNumericVectorOperation({
      operation: 'dot',
      vectorA: [1, 2],
      vectorB: [1, 2, 3],
      angleUnit: 'deg',
    })).toEqual({
      kind: 'error',
      reason: 'dimension-mismatch',
    });
    expect(runNumericVectorOperation({
      operation: 'cross',
      vectorA: [1, 2],
      vectorB: [3, 4],
      angleUnit: 'deg',
    })).toEqual({
      kind: 'error',
      reason: 'cross-requires-3d',
    });
    expect(runNumericVectorOperation({
      operation: 'angle',
      vectorA: [0, 0],
      vectorB: [1, 0],
      angleUnit: 'deg',
    })).toEqual({
      kind: 'error',
      reason: 'angle-zero-vector',
    });
  });
});
