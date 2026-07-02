import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { profileAlgebraicGenus0Candidate } from './integration/algebraic-genus0/profile';

const ce = new ComputeEngine();

function profile(latex: string, variable = 'x') {
  return profileAlgebraicGenus0Candidate(ce.parse(latex).json, variable);
}

function ready(latex: string, variable = 'x') {
  const result = profile(latex, variable);
  expect(result.kind).toBe('ready');
  if (result.kind !== 'ready') {
    throw new Error(`expected algebraic genus-0 profile for ${latex}`);
  }
  return result;
}

describe('algebraic genus-0 radical profiler', () => {
  it('profiles exact-rational affine and quadratic one-radical candidates', () => {
    const affine = ready('\\sqrt{x+1}');
    expect(affine).toMatchObject({
      family: 'one-radical-genus0-candidate',
      integrandShape: 'radical',
      radicandDegree: 1,
      radicandKind: 'affine',
      coefficientScope: 'exact-rational',
      radicalCount: 1,
    });

    const reciprocal = ready('\\frac{1}{\\sqrt{x+1}}');
    expect(reciprocal.integrandShape).toBe('reciprocal-radical');
    expect(reciprocal.radicandLatex).toContain('x');

    const quadratic = ready('\\sqrt{x^2+1}');
    expect(quadratic.radicandDegree).toBe(2);
    expect(quadratic.radicandKind).toBe('quadratic');
  });

  it('accepts target-free symbolic linear and quadratic radicands', () => {
    const symbolic = ready('\\sqrt{a*x^2+b*x+c}');
    expect(symbolic.coefficientScope).toBe('exact-rational-plus-target-free-symbolic');
    expect(symbolic.radicandDegree).toBe(2);

    const arbitraryVariable = ready('\\sqrt{a*t^2+x*t+b}', 't');
    expect(arbitraryVariable.variable).toBe('t');
    expect(arbitraryVariable.radicandDegree).toBe(2);
    expect(arbitraryVariable.coefficientScope).toBe('exact-rational-plus-target-free-symbolic');
  });

  it('classifies rational-in-radical expressions without adopting them', () => {
    const result = ready('\\frac{x+\\sqrt{x^2+1}}{x-1}');
    expect(result.integrandShape).toBe('rational-in-radical');
    expect(result.radicandDegree).toBe(2);
  });

  it('stops unsafe or out-of-scope radical shapes explicitly', () => {
    expect(profile('x^2')).toMatchObject({
      kind: 'stop',
      reason: 'no-radical',
      radicalCount: 0,
    });
    expect(profile('\\sqrt{x+\\sqrt{x+1}}')).toMatchObject({
      kind: 'stop',
      reason: 'nested-radical',
    });
    expect(profile('\\sqrt{x}+\\sqrt{x+1}')).toMatchObject({
      kind: 'stop',
      reason: 'multiple-independent-radicals',
    });
    expect(profile('\\sqrt{0.5*x+1}')).toMatchObject({
      kind: 'stop',
      reason: 'inexact-coefficient',
    });
    expect(profile('|x|\\sqrt{x+1}')).toMatchObject({
      kind: 'stop',
      reason: 'branch-sensitive',
    });
    expect(profile('\\operatorname{arsinh}(x)\\sqrt{x+1}')).toMatchObject({
      kind: 'stop',
      reason: 'unsupported-transcendental-carrier',
    });
  });

  it('keeps cubic and quartic radicands outside the genus-0 live scope for now', () => {
    expect(profile('\\sqrt{x^3+x+1}')).toMatchObject({
      kind: 'stop',
      reason: 'cubic-quartic-radicand',
    });
    expect(profile('\\sqrt{x^4+x+1}')).toMatchObject({
      kind: 'stop',
      reason: 'cubic-quartic-radicand',
    });
    expect(profile('\\sqrt{x^5+x+1}')).toMatchObject({
      kind: 'stop',
      reason: 'over-cap-radicand-degree',
    });
  });
});
