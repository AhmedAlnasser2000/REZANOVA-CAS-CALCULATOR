import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { solveTranscendentalLiouvilleCandidate } from './integration/transcendental-liouville-solver';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function solve(latex: string, variable = 'x') {
  return solveTranscendentalLiouvilleCandidate(node(latex), variable);
}

function compact(value: string) {
  return value.replace(/\s+/g, '');
}

describe('transcendental Liouville solver driver', () => {
  it('returns named special-function proof evidence for exp-quadratic certificates', () => {
    const result = solve('e^{x^2}');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected Liouville solver success');
    }

    expect(result.family).toBe('named-special-function-proof');
    expect(result.sourceFamily).toBe('exp-quadratic');
    expect(result.decomposition?.family).toBe('exp-quadratic-certificate');
    expect(result.certificate?.exactLatex).toContain('\\operatorname{erfi}');
    expect(result.proofMode).toBe('exact-symbolic-no-compute-engine');
  });

  it('returns logarithmic residual evidence for rational log derivatives and LRT residuals', () => {
    const logDerivative = solve('\\frac{k*(2a*x+b)}{a*x^2+b*x+c}');
    const lrt = solve('\\frac{1}{x^3+x+1}');

    expect(logDerivative.kind).toBe('success');
    expect(lrt.kind).toBe('success');
    if (logDerivative.kind !== 'success' || lrt.kind !== 'success') {
      throw new Error('expected logarithmic residual successes');
    }

    expect(logDerivative.family).toBe('logarithmic-residual');
    expect(logDerivative.sourceFamily).toBe('rational-log-derivative');
    expect(compact(logDerivative.decomposition?.logarithmicDerivativeResiduals[0]?.exactLatex ?? ''))
      .toContain('k\\cdot\\ln');
    expect(lrt.family).toBe('logarithmic-residual');
    expect(lrt.sourceFamily).toBe('rational-lrt-log-part');
    expect(lrt.decomposition?.logarithmicDerivativeResiduals[0]?.exactLatex).toContain('\\alpha_{1}\\cdot\\ln');
  });

  it('returns rational-part evidence for Hermite corrections', () => {
    const result = solve(
      '\\frac{A*(a*x^2+b*x+c)-(A*x+B)*(2a*x+b)}{(a*x^2+b*x+c)^2}',
    );

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected Hermite solver success');
    }

    expect(result.family).toBe('rational-part');
    expect(result.sourceFamily).toBe('rational-hermite-correction');
    expect(result.decomposition?.rationalPart.kind).toBe('hermite-rational-correction');
  });

  it('returns named special-function evidence outside ordinary rational decomposition', () => {
    const sineIntegral = solve('\\sin(x)/x');
    const fresnel = solve('\\sin(x^2)');

    expect(sineIntegral.kind).toBe('success');
    expect(fresnel.kind).toBe('success');
    if (sineIntegral.kind !== 'success' || fresnel.kind !== 'success') {
      throw new Error('expected named special-function successes');
    }

    expect(sineIntegral.family).toBe('named-special-function-proof');
    expect(sineIntegral.sourceFamily).toBe('depth2-affine-quotient');
    expect(sineIntegral.certificate?.exactLatex).toContain('\\operatorname{Si}');
    expect(fresnel.sourceFamily).toBe('fresnel-quadratic');
    expect(fresnel.certificate?.exactLatex).toContain('\\operatorname{FresnelS}');
  });

  it('returns certificate stops when no Liouville solver outcome is supported', () => {
    expect(solve('e^{x^3}')).toMatchObject({
      kind: 'stop',
      reason: 'polynomial-degree-over-certificate-scope',
    });

    expect(solve('\\sqrt{x}e^x')).toMatchObject({
      kind: 'stop',
      reason: 'no-supported-certificate-family',
    });
  });
});
