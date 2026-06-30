import { describe, expect, it } from 'vitest';
import { refineBracketRoot } from './sampling';

describe('numeric interval sampling refinement', () => {
  it('refines a bracketed nonlinear root with Brent-Dekker style interpolation', () => {
    const root = refineBracketRoot('x^3-x-2', 1, 2, 'rad');

    expect(root).not.toBeNull();
    expect(root ?? 0).toBeCloseTo(1.5213797068, 8);
  });

  it('does not turn a discontinuity sign change into a root', () => {
    const root = refineBracketRoot('\\frac{1}{x-2}', 1, 3, 'rad');

    expect(root).toBeNull();
  });

  it('keeps refinement target-aware instead of assuming x', () => {
    const root = refineBracketRoot('z^2-2', 1, 2, 'rad', 'z');

    expect(root).not.toBeNull();
    expect(root ?? 0).toBeCloseTo(Math.SQRT2, 8);
  });
});
