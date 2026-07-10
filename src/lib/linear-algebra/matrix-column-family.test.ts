import { describe, expect, it } from 'vitest';
import { scalar } from './exact-matrix-core';
import {
  analyzeExactColumnFamily,
  exactMatrixFromColumnVectors,
} from './matrix-column-family';

describe('exact Matrix-owned column-family analysis', () => {
  it('selects original pivot columns and returns a null-space witness', () => {
    const matrix = exactMatrixFromColumnVectors([
      [scalar(1), scalar(0)],
      [scalar(0), scalar(1)],
      [scalar(1), scalar(1)],
    ]);
    expect(matrix).not.toBeNull();
    const analysis = analyzeExactColumnFamily(matrix!);
    expect(analysis).toMatchObject({
      kind: 'success',
      rank: 2,
      nullity: 1,
      pivotColumns: [0, 1],
      imageBasis: [
        [scalar(1), scalar(0)],
        [scalar(0), scalar(1)],
      ],
      kernelBasis: [[scalar(-1), scalar(-1), scalar(1)]],
    });
  });
});
