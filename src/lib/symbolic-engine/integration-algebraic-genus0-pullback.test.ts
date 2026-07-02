import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { pullbackAlgebraicGenus0Integral } from './integration/algebraic-genus0/pullback';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function success(latex: string, variable = 'x', parameter?: string) {
  const result = pullbackAlgebraicGenus0Integral(node(latex), variable, parameter);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected algebraic genus-0 pullback for ${latex}: ${result.reason}`);
  }
  return result;
}

function compact(value: string) {
  return value.replace(/\s+/g, '');
}

describe('algebraic genus-0 rational pullback evidence', () => {
  it('pulls affine radical integrands back to rational functions in the parameter', () => {
    const radical = success('\\sqrt{x+1}');
    expect(radical.parametrization.family).toBe('affine-radical');
    expect(compact(radical.pullbackLatex)).toContain('2t^2');
    expect(radical.pullbackIntegral.strategy).toBe('direct-rule');
    expect(radical.pullbackAntiderivativeLatex).toContain('t^{3}');

    const reciprocal = success('\\frac{1}{\\sqrt{x+1}}');
    expect(reciprocal.parametrization.family).toBe('affine-radical');
    expect(reciprocal.pullbackIntegral.kind).toBe('success');
    expect(compact(reciprocal.pullbackAntiderivativeLatex)).toContain('2t');
  });

  it('delegates completed-square plus quadratic pullbacks to existing rational integration', () => {
    const result = success('\\frac{x}{\\sqrt{x^2+1}}');
    const pullback = compact(result.pullbackLatex);

    expect(result.parametrization.family).toBe('quadratic-plus');
    expect(result.pullbackIntegral.strategy).toBe('partial-fractions');
    expect(pullback).toContain('t^2');
    expect(result.pullbackAntiderivativeLatex).toContain('\\frac{1}{2}t');
    expect(result.pullbackAntiderivativeLatex).toContain('\\frac{1}{t}');
    expect(compact(result.exactSupplementLatex.join('\n'))).toContain('t\\ne0');
  });

  it('pulls circle-type quadratic radicals back to rational functions', () => {
    const result = success('\\sqrt{4-x^2}');
    const pullback = compact(result.pullbackLatex);

    expect(result.parametrization.family).toBe('quadratic-minus');
    expect(result.pullbackIntegral.kind).toBe('success');
    expect(pullback).toContain('t^2+1');
    expect(compact(result.exactSupplementLatex.join('\n'))).toContain('t^2+1\\ne0');
  });

  it('keeps parametrization and profile stops explicit', () => {
    expect(pullbackAlgebraicGenus0Integral(node('\\sqrt{a*x^2+b*x+c}'))).toMatchObject({
      kind: 'stop',
      reason: 'parametrization-stop',
      parametrizationReason: 'exact-quadratic-required',
    });

    expect(pullbackAlgebraicGenus0Integral(node('\\sqrt{x^3+x+1}'))).toMatchObject({
      kind: 'stop',
      reason: 'profile-stop',
      profileReason: 'cubic-quartic-radicand',
    });
  });
});
