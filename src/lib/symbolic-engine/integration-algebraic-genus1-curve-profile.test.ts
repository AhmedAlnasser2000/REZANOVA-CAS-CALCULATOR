import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { profileAlgebraicGenus1CurveCandidate } from './integration/algebraic-genus1/curve-profile';

const ce = new ComputeEngine();

function profile(latex: string, variable = 'x') {
  return profileAlgebraicGenus1CurveCandidate(ce.parse(latex).json, variable);
}

function ready(latex: string, variable = 'x') {
  const result = profile(latex, variable);
  expect(result.kind).toBe('ready');
  if (result.kind !== 'ready') {
    throw new Error(`expected algebraic genus-1 curve profile for ${latex}`);
  }
  return result;
}

describe('algebraic genus-1 curve profiler', () => {
  it('profiles exact-rational cubic and quartic one-radical candidates', () => {
    const cubic = ready('\\sqrt{x^3+x+1}');
    expect(cubic).toMatchObject({
      family: 'one-radical-genus1-candidate',
      integrandShape: 'radical',
      radicandDegree: 3,
      coefficientScope: 'exact-rational',
      radicalCount: 1,
      degenerationStatus: 'squarefree-candidate',
    });

    const reciprocalQuartic = ready('\\frac{1}{\\sqrt{x^4+x+1}}');
    expect(reciprocalQuartic.integrandShape).toBe('reciprocal-radical');
    expect(reciprocalQuartic.radicandDegree).toBe(4);
  });

  it('profiles Legendre-shaped symbolic quartics without live adoption', () => {
    const legendre = ready('\\frac{1}{\\sqrt{(1-x^2)(1-m*x^2)}}');
    expect(legendre).toMatchObject({
      integrandShape: 'reciprocal-radical',
      radicandDegree: 4,
      coefficientScope: 'exact-rational-plus-target-free-symbolic',
      degenerationStatus: 'squarefree-check-deferred',
    });
    expect(legendre.radicandLatex).toContain('m');
  });

  it('treats non-selected variables as target-free symbolic coefficients', () => {
    const result = ready('\\sqrt{t^3+x*t+1}', 't');
    expect(result.variable).toBe('t');
    expect(result.radicandDegree).toBe(3);
    expect(result.coefficientScope).toBe('exact-rational-plus-target-free-symbolic');
    expect(result.radicandLatex).toContain('x');
  });

  it('records repeated-root degeneration readiness for exact-rational radicands', () => {
    const repeated = ready('\\sqrt{x^3}');
    expect(repeated.radicandDegree).toBe(3);
    expect(repeated.degenerationStatus).toBe('repeated-root-detected');
    expect(repeated.degenerationDetail).toContain('nonconstant factor');
  });

  it('stops non-genus-1 radical shapes explicitly', () => {
    expect(profile('x^2')).toMatchObject({
      kind: 'stop',
      reason: 'no-radical',
      radicalCount: 0,
    });
    expect(profile('\\sqrt{x^2+1}')).toMatchObject({
      kind: 'stop',
      reason: 'genus0-radicand',
    });
    expect(profile('\\sqrt{x+\\sqrt{x^3+1}}')).toMatchObject({
      kind: 'stop',
      reason: 'nested-radical',
    });
    expect(profile('\\sqrt{x^3+1}+\\sqrt{x+1}')).toMatchObject({
      kind: 'stop',
      reason: 'multiple-independent-radicals',
    });
    expect(profile('\\sqrt{x^5+x+1}')).toMatchObject({
      kind: 'stop',
      reason: 'over-cap-radicand-degree',
    });
    expect(profile('\\sqrt{0.5*x^3+x+1}')).toMatchObject({
      kind: 'stop',
      reason: 'inexact-coefficient',
    });
    expect(profile('|x|\\sqrt{x^3+x+1}')).toMatchObject({
      kind: 'stop',
      reason: 'branch-sensitive',
    });
    expect(profile('\\sin(x)\\sqrt{x^3+x+1}')).toMatchObject({
      kind: 'stop',
      reason: 'unsupported-transcendental-carrier',
    });
  });

  it('does not change current cubic and quartic radical integration behavior', () => {
    const cubic = resolveSymbolicIntegralFromLatex('\\sqrt{x^3+x+1}');
    expect(cubic.kind).toBe('error');
    if (cubic.kind === 'error') {
      expect(cubic.error).toContain('genus-1');
      expect(cubic.error).toContain('elliptic');
    }
  });
});
