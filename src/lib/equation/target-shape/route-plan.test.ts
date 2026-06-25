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
      'carrier-elimination',
      'carrier',
      'algebraic-isolation',
      'cubic-cardano',
      'quartic-ferrari',
    ]);
    expect(linear.skippedFamilies).toContain('trig');
    expect(linear.skippedFamilies).toContain('exp-log');

    const polynomial = plan('x^3+a=0', 'x');
    expectFamilies(polynomial.families, [
      'linear',
      'polynomial',
      'factorable-polynomial',
      'special-form-roots',
      'carrier-elimination',
      'carrier',
      'algebraic-isolation',
      'cubic-cardano',
      'quartic-ferrari',
    ]);
  });

  it('lets large polynomial power-base wrappers attempt composition after formula routes', () => {
    const squarePower = plan('\\left(z^3+z+1\\right)^2=b', 'z');
    const oddPower = plan('\\left(z^3+z+1\\right)^3=b', 'z');

    expectFamilies(squarePower.families, [
      'linear',
      'polynomial',
      'factorable-polynomial',
      'special-form-roots',
      'carrier-elimination',
      'carrier',
      'algebraic-isolation',
      'cubic-cardano',
      'quartic-ferrari',
      'composition',
    ]);
    expectFamilies(oddPower.families, squarePower.families);

    const directPower = plan('z^6=0', 'z');
    expect(directPower.families).not.toContain('composition');
  });

  it('routes target-denominator shapes to rational solving without forcing isolation', () => {
    const rational = plan('\\frac{1}{z-a}=b', 'z');

    expectFamilies(rational.families, ['rational', 'cubic-cardano', 'quartic-ferrari']);
    expect(rational.skippedFamilies).toContain('selected-target-isolation');
    expect(rational.skippedFamilies).toContain('polynomial');

    const radicalRational = plan('\\sqrt{\\frac{z^4+z+1}{z-m}}=b', 'z');
    expectFamilies(radicalRational.families, [
      'rational',
      'cubic-cardano',
      'quartic-ferrari',
      'composition',
    ]);

    const absoluteValueRational = plan('\\left|\\frac{z^4+z+1}{z-m}\\right|=b', 'z');
    expectFamilies(absoluteValueRational.families, [
      'rational',
      'cubic-cardano',
      'quartic-ferrari',
      'composition',
    ]);

    const squarePowerRational = plan('\\left(\\frac{z^4+z+1}{z-m}\\right)^2=b', 'z');
    expectFamilies(squarePowerRational.families, [
      'rational',
      'cubic-cardano',
      'quartic-ferrari',
      'composition',
    ]);

    const oddPowerRational = plan('\\left(\\frac{z^4+z+1}{z-m}\\right)^3=b', 'z');
    expectFamilies(oddPowerRational.families, squarePowerRational.families);
  });

  it('routes radical and algebraic shapes through algebraic/composition families', () => {
    const radical = plan('\\sqrt{z+a}=b', 'z');

    expectFamilies(radical.families, [
      'polynomial',
      'factorable-polynomial',
      'special-form-roots',
      'carrier-elimination',
      'carrier',
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
    expect(mixed.families).toContain('cubic-cardano');
    expect(mixed.families).toContain('quartic-ferrari');
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
    expect(generated.families).not.toContain('cubic-cardano');
    expect(generated.families).not.toContain('quartic-ferrari');
  });

  it('keeps cubic Cardano out of generated-handoff polynomial plans', () => {
    const profile = profileEquationTargetShape('z^3+z+1=b', 'z', {
      allowGeneratedImplicitProducts: true,
    });
    expect(profile.status).toBe('ok');

    const generated = planSelectedTargetRouteFamilies(profile, {
      phase: 'generated-handoff',
    });

    expect(generated.families).toContain('polynomial');
    expect(generated.families).not.toContain('cubic-cardano');
    expect(generated.families).not.toContain('quartic-ferrari');
  });

  it('keeps quartic Ferrari out of generated-handoff polynomial plans', () => {
    const profile = profileEquationTargetShape('z^4+z+1=b', 'z', {
      allowGeneratedImplicitProducts: true,
    });
    expect(profile.status).toBe('ok');

    const generated = planSelectedTargetRouteFamilies(profile, {
      phase: 'generated-handoff',
    });

    expect(generated.families).toContain('polynomial');
    expect(generated.families).not.toContain('quartic-ferrari');
  });

  it('keeps formula normalization out of generated-handoff rational denominator plans', () => {
    const profile = profileEquationTargetShape('\\frac{z^4+z+1}{z-m}=b', 'z', {
      allowGeneratedImplicitProducts: true,
    });
    expect(profile.status).toBe('ok');

    const generated = planSelectedTargetRouteFamilies(profile, {
      phase: 'generated-handoff',
    });

    expect(generated.families).toEqual(['rational']);
    expect(generated.families).not.toContain('cubic-cardano');
    expect(generated.families).not.toContain('quartic-ferrari');
  });
});
