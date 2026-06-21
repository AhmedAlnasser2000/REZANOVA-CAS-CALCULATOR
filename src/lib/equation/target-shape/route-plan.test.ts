import { describe, expect, it } from 'vitest';

import { profileEquationTargetShape } from './profile';
import {
  planSelectedTargetRouteFamilies,
  type EquationSelectedTargetRouteFamily,
} from './route-plan';

function plan(latex: string, target: string) {
  const profile = profileEquationTargetShape(latex, target, {
    allowGeneratedImplicitProducts: true,
  });
  expect(profile.status).toBe('ok');
  return planSelectedTargetRouteFamilies(profile);
}

function expectFamilies(
  families: EquationSelectedTargetRouteFamily[],
  expected: EquationSelectedTargetRouteFamily[],
) {
  expect(families).toEqual(expected);
}

describe('planSelectedTargetRouteFamilies', () => {
  it('keeps linear and polynomial shapes on algebraic route families', () => {
    const linear = plan('a x+b=c', 'x');
    expectFamilies(linear.families, [
      'linear',
      'polynomial',
      'factorable-polynomial',
      'special-form-roots',
      'algebraic-isolation',
    ]);
    expect(linear.skippedFamilies).toContain('trig');
    expect(linear.skippedFamilies).toContain('exp-log');

    const polynomial = plan('x^3+a=0', 'x');
    expectFamilies(polynomial.families, [
      'linear',
      'polynomial',
      'factorable-polynomial',
      'special-form-roots',
      'algebraic-isolation',
    ]);
  });

  it('routes target-denominator shapes to rational solving without forcing isolation', () => {
    const rational = plan('\\frac{1}{z-a}=b', 'z');

    expectFamilies(rational.families, ['rational']);
    expect(rational.skippedFamilies).toContain('selected-target-isolation');
    expect(rational.skippedFamilies).toContain('polynomial');
  });

  it('routes radical and algebraic shapes through algebraic/composition families', () => {
    const radical = plan('\\sqrt{z+a}=b', 'z');

    expectFamilies(radical.families, [
      'polynomial',
      'factorable-polynomial',
      'special-form-roots',
      'algebraic-isolation',
      'composition',
      'mixed-algebraic',
      'selected-target-isolation',
    ]);
    expect(radical.skippedFamilies).toContain('trig');
    expect(radical.skippedFamilies).toContain('exp-log');
  });

  it('routes exp-log and trig shapes through their carrier families plus safe handoff', () => {
    const expLog = plan('\\ln(z+a)+b=c', 'z');
    expectFamilies(expLog.families, [
      'exp-log',
      'composition',
      'selected-target-isolation',
    ]);

    const trig = plan('\\frac{\\sin(z+a)}{b}+c=d', 'z');
    expectFamilies(trig.families, [
      'trig',
      'composition',
      'selected-target-isolation',
    ]);
  });

  it('falls back to current order for mixed, multi-island, and unknown carrier shapes', () => {
    const mixed = plan('z+e^z=a', 'z');
    expect(mixed.families).toContain('linear');
    expect(mixed.families).toContain('mixed-algebraic');
    expect(mixed.families).toContain('special-form-roots');
    expect(mixed.skippedFamilies).toEqual([]);

    const unknownCarrier = plan('\\left|z-a\\right|=b', 'z');
    expect(unknownCarrier.families).toContain('carrier');
    expect(unknownCarrier.skippedFamilies).toEqual([]);
  });

  it('removes selected-target isolation from generated-handoff plans', () => {
    const profile = profileEquationTargetShape('\\sin(z+a)=b', 'z', {
      allowGeneratedImplicitProducts: true,
    });
    expect(profile.status).toBe('ok');

    const generated = planSelectedTargetRouteFamilies(profile, {
      phase: 'generated-handoff',
    });
    expect(generated.families).toEqual(['trig', 'composition']);
    expect(generated.skippedFamilies).not.toContain('selected-target-isolation');
  });
});
