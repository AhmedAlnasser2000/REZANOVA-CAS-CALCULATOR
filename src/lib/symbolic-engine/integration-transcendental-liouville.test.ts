import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { decomposeTranscendentalLiouvilleCandidate } from './integration/transcendental-liouville';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function decompose(latex: string, variable = 'x') {
  return decomposeTranscendentalLiouvilleCandidate(node(latex), variable);
}

function compact(value: string) {
  return value.replace(/\s+/g, '');
}

describe('transcendental Liouville decomposition proof objects', () => {
  it('reduces exp-quadratic certificates to an RDE obstruction object', () => {
    const result = decompose('e^{x^2}');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected Liouville decomposition success');
    }

    expect(result.family).toBe('exp-quadratic-certificate');
    expect(result.rationalPart.kind).toBe('rde-rational-certificate');
    expect(result.obstruction?.kind).toBe('rde-polynomial-degree');
    expect(result.obstruction?.equationLatex).toContain("r'(x)");
    expect(result.proofSummary).toContain('RDE obstruction');
    expect(result.proofDetails.map((section) => section.title)).toEqual([
      'Liouville Decomposition',
      'RDE Obstruction',
    ]);
    expect(result.proofMode).toBe('exact-symbolic-no-compute-engine');
  });

  it('keeps target-free symbolic and selected-variable evidence in exp-quadratic decomposition', () => {
    const result = decompose('e^{a*t^2+x*t+b}', 't');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected symbolic Liouville decomposition success');
    }

    expect(result.variable).toBe('t');
    expect(result.family).toBe('exp-quadratic-certificate');
    expect(result.obstruction?.proofSteps.join(' ')).toContain('incompatible polynomial degrees');
    expect(result.exactSupplementLatex?.join(' ')).toContain('2a\\ne0');
  });

  it('classifies ordinary rational log-derivative residuals through existing RN proof helpers', () => {
    const result = decompose('\\frac{k*(2a*x+b)}{a*x^2+b*x+c}');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected log-derivative Liouville decomposition success');
    }

    expect(result.family).toBe('rational-log-derivative');
    expect(result.rationalPart).toEqual({ kind: 'none' });
    expect(result.logarithmicDerivativeResiduals).toHaveLength(1);
    expect(result.logarithmicDerivativeResiduals[0]?.kind).toBe('ordinary-log-derivative');
    expect(result.logarithmicDerivativeResiduals[0]?.proofReason).toContain('log-derivative');
    expect(compact(result.logarithmicDerivativeResiduals[0]?.exactLatex ?? '')).toContain('k\\cdot\\ln');
  });

  it('reuses Hermite rational-correction proof evidence when a rational part is present', () => {
    const result = decompose(
      '\\frac{A*(a*x^2+b*x+c)-(A*x+B)*(2a*x+b)}{(a*x^2+b*x+c)^2}',
    );

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected Hermite Liouville decomposition success');
    }

    expect(result.family).toBe('rational-hermite-correction');
    expect(result.rationalPart.kind).toBe('hermite-rational-correction');
    if (result.rationalPart.kind !== 'hermite-rational-correction') {
      throw new Error('expected Hermite rational part');
    }
    expect(result.rationalPart.proofReason).toContain('Hermite rational-correction');
    expect(compact(result.rationalPart.exactLatex)).toContain('\\frac{Ax+B}{ax^2+bx+c}');
  });

  it('reuses bounded LRT algebraic-log residual evidence for cubic rational residuals', () => {
    const result = decompose('\\frac{1}{x^3+x+1}');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected LRT Liouville decomposition success');
    }

    expect(result.family).toBe('rational-lrt-log-part');
    expect(result.logarithmicDerivativeResiduals[0]?.kind).toBe('algebraic-log-lrt');
    expect(result.logarithmicDerivativeResiduals[0]?.proofReason).toContain('LRT logarithmic-part');
    expect(result.logarithmicDerivativeResiduals[0]?.exactLatex).toContain('\\alpha_{1}\\cdot\\ln');
    expect(result.exactSupplementLatex?.join(' ')).toContain('S_{1}\\left(x\\right)');
  });

  it('stops cleanly outside the bounded Liouville decomposition scope', () => {
    expect(decompose('e^{x^3}')).toMatchObject({
      kind: 'stop',
      reason: 'polynomial-degree-over-certificate-scope',
    });

    expect(decompose('e^{\\sin(x)}')).toMatchObject({
      kind: 'stop',
      reason: 'nested-transcendental-tower',
    });

    expect(decompose('\\frac{1}{x^9+x+1}')).toMatchObject({
      kind: 'stop',
      reason: 'no-supported-certificate-family',
    });
  });
});
