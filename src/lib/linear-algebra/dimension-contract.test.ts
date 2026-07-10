import { describe, expect, it } from 'vitest';
import {
  clampLinearAlgebraEditingDimension,
  exactMatrixDimensionLimitMessage,
  LINEAR_ALGEBRA_DIMENSION_PROFILES,
  matrixEditingDimensionError,
  vectorEditingDimensionError,
} from './dimension-contract';

describe('Linear Algebra dimension contract', () => {
  it('separates editing, exact-elimination, and augmented execution limits', () => {
    expect(LINEAR_ALGEBRA_DIMENSION_PROFILES['editor-matrix']).toMatchObject({
      maxRows: 8,
      maxColumns: 8,
      fallback: 'stop',
    });
    expect(LINEAR_ALGEBRA_DIMENSION_PROFILES['exact-elimination']).toMatchObject({
      maxRows: 6,
      maxColumns: 6,
      maxScalarAbs: 1_000_000_000,
      execution: 'exact',
    });
    expect(LINEAR_ALGEBRA_DIMENSION_PROFILES['exact-single-rhs-augmented'].maxColumns).toBe(7);
    expect(LINEAR_ALGEBRA_DIMENSION_PROFILES['exact-multi-rhs-augmented'].maxColumns).toBe(12);
    expect(LINEAR_ALGEBRA_DIMENSION_PROFILES['exact-matrix-power']).toMatchObject({
      maxAbsExponent: 12,
      fallback: 'stop',
    });
  });

  it('clamps visual editing dimensions to the supported range', () => {
    expect(clampLinearAlgebraEditingDimension(0)).toBe(1);
    expect(clampLinearAlgebraEditingDimension(3.9)).toBe(3);
    expect(clampLinearAlgebraEditingDimension(12)).toBe(8);
    expect(clampLinearAlgebraEditingDimension(Number.NaN)).toBe(1);
  });

  it('returns controlled Matrix and Vector input errors above the editing cap', () => {
    expect(matrixEditingDimensionError(Array.from({ length: 8 }, () => Array(8).fill(0)))).toBeNull();
    expect(matrixEditingDimensionError(Array.from({ length: 9 }, () => [0]))).toBe(
      'Matrix inputs support up to 8 by 8; received 9 by 1. Resize the matrix before running.',
    );
    expect(vectorEditingDimensionError(Array(8).fill(0))).toBeNull();
    expect(vectorEditingDimensionError(Array(9).fill(0))).toBe(
      'Vector inputs support up to 8 entries; received 9. Resize the vector before running.',
    );
  });

  it('keeps exact-operation limit wording consistent', () => {
    expect(exactMatrixDimensionLimitMessage('rank and RREF')).toBe(
      'The exact matrix limit for rank and RREF is 6 by 6.',
    );
  });
});
