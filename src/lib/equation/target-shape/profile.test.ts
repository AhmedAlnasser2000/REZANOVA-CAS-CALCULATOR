import { describe, expect, it } from 'vitest';

import { profileEquationTargetShape } from './profile';

function expectOk(latex: string, target: string) {
  const profile = profileEquationTargetShape(latex, target, {
    allowGeneratedImplicitProducts: true,
  });
  expect(profile.status).toBe('ok');
  if (profile.status !== 'ok') {
    throw new Error(`Expected ok profile, got ${profile.status}: ${profile.message}`);
  }
  return profile;
}

describe('profileEquationTargetShape', () => {
  it('classifies linear and polynomial target shapes', () => {
    const linear = expectOk('a x+b=c', 'x');
    expect(linear.flags.linearLike).toBe(true);
    expect(linear.flags.polynomialLike).toBe(true);
    expect(linear.polynomialDegree).toBe(1);
    expect(linear.routeHints).toContain('linear');

    const polynomial = expectOk('x^2+a=0', 'x');
    expect(polynomial.flags.linearLike).toBe(false);
    expect(polynomial.flags.polynomialLike).toBe(true);
    expect(polynomial.flags.targetAsPowerBase).toBe(true);
    expect(polynomial.polynomialDegree).toBe(2);
    expect(polynomial.routeHints).toContain('polynomial');
  });

  it('classifies target-in-exponent shapes including the reference family', () => {
    const profile = expectOk(
      '\\sqrt{c v}\\cdot\\frac{11}{d^{3+s^2}}=4x+y^{j-8o}+t^{3+p^2}',
      's',
    );

    expect(profile.targetSide).toBe('left');
    expect(profile.flags.targetInExponent).toBe(true);
    expect(profile.flags.polynomialLike).toBe(false);
    expect(profile.routeHints).toContain('exp-log');
    expect(profile.routeHints).toContain('selected-target-isolation');
  });

  it('classifies denominator and radical target positions', () => {
    const denominator = expectOk('\\frac{1}{x+1}=a', 'x');
    expect(denominator.flags.targetInDenominator).toBe(true);
    expect(denominator.routeHints).toContain('rational');

    const radical = expectOk('\\sqrt{x+a}=b', 'x');
    expect(radical.flags.targetUnderRadical).toBe(true);
    expect(radical.routeHints).toContain('algebraic-isolation');
  });

  it('classifies trig, log, and exp argument positions', () => {
    const trig = expectOk('\\sin{x}=0', 'x');
    expect(trig.flags.targetInTrigArgument).toBe(true);
    expect(trig.routeHints).toContain('trig');

    const log = expectOk('\\ln{x}=a', 'x');
    expect(log.flags.targetInLogArgument).toBe(true);
    expect(log.routeHints).toContain('exp-log');

    const exp = expectOk('e^x=a', 'x');
    expect(exp.flags.targetInExponent).toBe(true);
    expect(exp.flags.targetInExpArgument).toBe(true);
    expect(exp.routeHints).toContain('exp-log');
  });

  it('records target side and independent additive target islands', () => {
    const both = expectOk('x+1=x^2', 'x');
    expect(both.targetSide).toBe('both');
    expect(both.topLevelTargetIslandCount).toBe(2);
    expect(both.routeHints).toContain('mixed-or-unknown');

    const multiple = expectOk('z+e^z=a', 'z');
    expect(multiple.targetSide).toBe('left');
    expect(multiple.topLevelTargetIslandCount).toBe(2);
    expect(multiple.routeHints).toContain('mixed-or-unknown');
  });

  it('profiles explicit named targets through normalized latex', () => {
    const profile = expectOk('@mass+1=2', 'mass');

    expect(profile.normalizedLatex).toBe('\\mathrm{mass}+1=2');
    expect(profile.targetOccurrenceCount).toBe(1);
    expect(profile.flags.linearLike).toBe(true);
  });

  it('guards ambiguous adjacent products unless generated products are allowed', () => {
    const guarded = profileEquationTargetShape('az+1=3', 'z');
    expect(guarded.status).toBe('ambiguous-adjacent-product');

    const allowed = profileEquationTargetShape('az+1=3', 'z', {
      allowGeneratedImplicitProducts: true,
    });
    expect(allowed.status).toBe('ok');
    if (allowed.status !== 'ok') {
      throw new Error(`Expected expanded implicit product, got ${allowed.status}`);
    }
    expect(allowed.normalizedLatex).toBe('a z+1=3');
    expect(allowed.flags.linearLike).toBe(true);
    expect(allowed.parameterNames).toContain('a');
  });

  it('returns parse, non-equation, and target-not-found statuses', () => {
    const parseError = profileEquationTargetShape('\\frac{1}{', 'x', {
      allowGeneratedImplicitProducts: true,
    });
    expect(parseError.status).toBe('parse-error');

    const nonEquation = profileEquationTargetShape('x+1', 'x', {
      allowGeneratedImplicitProducts: true,
    });
    expect(nonEquation.status).toBe('non-equation');

    const missing = profileEquationTargetShape('a+1=2', 'x', {
      allowGeneratedImplicitProducts: true,
    });
    expect(missing.status).toBe('target-not-found');
  });
});
