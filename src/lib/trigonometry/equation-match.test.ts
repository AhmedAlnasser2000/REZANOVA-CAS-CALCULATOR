import { describe, expect, it } from 'vitest';
import {
  matchBoundedMixedLinearTrigEquation,
  matchBoundedTrigEquation,
} from './equation-match';

describe('matchBoundedTrigEquation', () => {
  it('matches bounded single-function trig equations structurally', () => {
    const matched = matchBoundedTrigEquation('\\sin\\left(2x\\right)=0');
    expect(matched?.kind).toBe('sin');
    expect(matched?.argument.coefficient).toBe(2);
    expect(matched?.argument.offsetLatex).toBe('0');
    expect(matched?.rhsValue).toBe(0);
  });

  it('matches affine-argument wrappers such as a*sin(kx+b)+d=c', () => {
    const matched = matchBoundedTrigEquation('3\\sin\\left(x+45\\right)-1=0');
    expect(matched?.kind).toBe('sin');
    expect(matched?.argument.coefficient).toBe(1);
    expect(matched?.argument.offsetLatex.replaceAll(' ', '')).toContain('45');
    expect(matched?.rhsValue).toBeCloseTo(1 / 3, 8);
  });

  it('does not guess broader multi-factor trig equations as bounded single-function forms', () => {
    const matched = matchBoundedTrigEquation('\\sin\\left(x\\right)\\cos\\left(x\\right)=\\frac{1}{2}');
    expect(matched).toBeNull();
  });
});

describe('matchBoundedMixedLinearTrigEquation', () => {
  it('matches same-argument mixed linear trig equations', () => {
    const matched = matchBoundedMixedLinearTrigEquation('2\\sin\\left(x+30\\right)+3\\cos\\left(x+30\\right)=1');
    expect(matched).not.toBeNull();
    expect(matched?.argument.coefficient).toBe(1);
    expect(matched?.sinCoefficient).toBe(2);
    expect(matched?.cosCoefficient).toBe(3);
    expect(matched?.rhsValue).toBe(1);
  });

  it('rejects mixed trig equations with mismatched arguments', () => {
    const matched = matchBoundedMixedLinearTrigEquation('2\\sin\\left(x\\right)+3\\cos\\left(2x\\right)=1');
    expect(matched).toBeNull();
  });
});
