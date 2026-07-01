import { describe, expect, it } from 'vitest';
import { refineBracketRoot, refineBracketRootKernel } from './sampling';

describe('numeric interval sampling refinement', () => {
  it('returns kernel diagnostics for a bracketed nonlinear root', () => {
    const result = refineBracketRootKernel('x^2-2', 1, 2, 'rad');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected kernel success');
    }
    expect(result.methodId).toBe('brent-dekker');
    expect(result.root).toBeCloseTo(Math.SQRT2, 8);
    expect(result.residual).toBeLessThan(1e-8);
    expect(result.evaluations).toBeGreaterThan(0);
  });

  it('refines a bracketed nonlinear root with Brent-Dekker style interpolation', () => {
    const root = refineBracketRoot('x^3-x-2', 1, 2, 'rad');

    expect(root).not.toBeNull();
    expect(root ?? 0).toBeCloseTo(1.5213797068, 8);
  });

  it('does not turn a discontinuity sign change into a root', () => {
    const result = refineBracketRootKernel('\\frac{1}{x-2}', 1, 3, 'rad');

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected kernel error');
    }
    expect(result.reason).toBe('unsafe-evaluation');
    expect(refineBracketRoot('\\frac{1}{x-2}', 1, 3, 'rad')).toBeNull();
  });

  it('keeps refinement target-aware instead of assuming x', () => {
    const root = refineBracketRoot('z^2-2', 1, 2, 'rad', 'z');

    expect(root).not.toBeNull();
    expect(root ?? 0).toBeCloseTo(Math.SQRT2, 8);
  });
});
