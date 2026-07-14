import { describe, expect, it } from 'vitest';
import { canonicalLeafEvidence } from './canonical-evidence';
import { linearAlgebraDecimalReadback } from './decimal-readback';

describe('Linear Algebra decimal readback', () => {
  it('formats producer-owned rational matrix evidence at the requested precision', () => {
    const readback = linearAlgebraDecimalReadback(canonicalLeafEvidence(
      '\\begin{bmatrix}\\frac{2}{3} & -\\frac{1}{3}\\end{bmatrix}',
      [
        'Matrix',
        ['List', ['List', ['Rational', 2, 3], ['Negate', ['Rational', 1, 3]]]],
        "'[]'",
      ],
      'test.native-rational-matrix',
    ), 4);

    expect(readback).toContain('0.666\\,7');
    expect(readback).toContain('-0.333\\,3');
  });

  it('does not turn exact integer counts or prose into approximations', () => {
    expect(linearAlgebraDecimalReadback(
      canonicalLeafEvidence('2', 2, 'test.native-rank'),
      4,
    )).toBeUndefined();
    expect(linearAlgebraDecimalReadback(
      canonicalLeafEvidence('\\text{Orthogonal}', "'Orthogonal'", 'test.native-verdict'),
      4,
    )).toBeUndefined();
  });
});
