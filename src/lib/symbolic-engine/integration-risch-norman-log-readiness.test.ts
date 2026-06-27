import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { profileRischNormanCandidate } from './integration/risch-norman';

const ce = new ComputeEngine();

function profile(latex: string, variable = 'x') {
  return profileRischNormanCandidate(ce.parse(latex).json, variable);
}

describe('Risch-Norman affine-log readiness', () => {
  it('records rational-correction readiness for polynomial times natural log', () => {
    const result = profile('x^2\\ln(a*x+b)');

    expect(result.kind).toBe('ready');
    if (result.kind !== 'ready') {
      throw new Error('expected ready profile');
    }
    expect(result.family).toBe('affine-log');
    expect(result.polynomialDegree).toBe(2);
    expect(result.logReadiness).toEqual({
      kind: 'affine-log-rational-correction',
      polynomialDegree: 2,
      span: ['P(v)log(u)', 'R(v)/u'],
      prerequisite: 'symbolic-rational-correction-solver',
      adoption: 'readiness-only',
    });
  });

  it('records the same readiness for common log with target-free symbolic coefficients', () => {
    const result = profile('(c*x+d)\\log(a*x+b)');

    expect(result.kind).toBe('ready');
    if (result.kind !== 'ready') {
      throw new Error('expected ready profile');
    }
    expect(result.family).toBe('affine-log');
    expect(result.coefficientScope).toBe('exact-rational-target-free-symbolic');
    expect(result.logReadiness?.polynomialDegree).toBe(1);
    expect(result.logReadiness?.adoption).toBe('readiness-only');
  });

  it('keeps non-affine and nested log towers stopped', () => {
    expect(profile('\\ln(x^2)')).toMatchObject({
      kind: 'stop',
      reason: 'non-affine-argument',
    });
    expect(profile('x\\ln(\\sin(x))')).toMatchObject({
      kind: 'stop',
      reason: 'nested-transcendental-tower',
    });
  });
});
