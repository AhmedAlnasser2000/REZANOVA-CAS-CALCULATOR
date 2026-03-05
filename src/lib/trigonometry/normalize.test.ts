import { describe, expect, it } from 'vitest';
import { matchAffineVariableArgument, normalizeTrigLatex } from './normalize';

describe('normalizeTrigLatex', () => {
  it('compacts repeated trig factors into powers structurally', () => {
    const normalized = normalizeTrigLatex('\\cos\\left(x\\right)\\cos\\left(x\\right)');
    expect(normalized).toContain('\\cos');
    expect(normalized).toContain('^2');
  });

  it('keeps already-normalized trig powers stable', () => {
    const normalized = normalizeTrigLatex('\\sin^2\\left(x\\right)');
    expect(normalized).toContain('\\sin');
    expect(normalized).toContain('^2');
  });

  it('matches affine variable arguments with phase shifts', () => {
    const matched = matchAffineVariableArgument(['Add', ['Multiply', 2, 'x'], ['Negate', ['Divide', 'Pi', 3]]]);
    expect(matched).not.toBeNull();
    expect(matched?.coefficient).toBe(2);
    expect(matched?.offsetLatex.replaceAll(' ', '')).toContain('\\frac{\\pi}{3}');
  });
});
