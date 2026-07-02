import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { parametrizeAlgebraicGenus0Radicand } from './integration/algebraic-genus0/parametrization';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function success(latex: string, variable = 'x', parameter?: string) {
  const result = parametrizeAlgebraicGenus0Radicand(node(latex), variable, parameter);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected parametrization for ${latex}: ${result.reason}`);
  }
  return result;
}

function compact(value: string) {
  return value.replace(/\s+/g, '');
}

describe('algebraic genus-0 parametrization evidence', () => {
  it('parametrizes symbolic affine radicals with t=sqrt(a*x+b)', () => {
    const result = success('a*x+b');
    const xOfT = compact(result.variableParamLatex);
    const radical = compact(result.radicalParamLatex);
    const derivative = compact(result.derivativeParamLatex);
    const facts = compact(result.exactSupplementLatex.join('\n'));

    expect(result.family).toBe('affine-radical');
    expect(xOfT).toContain('t^2-b');
    expect(xOfT).toContain('a');
    expect(radical).toBe('t');
    expect(derivative).toContain('2t');
    expect(derivative).toContain('a');
    expect(facts).toContain('a\\ne0');
    expect(facts).toContain('ax+b\\ge0');
  });

  it('uses a non-conflicting parameter when the integration variable is t', () => {
    const result = success('a*t+b', 't');

    expect(result.variable).toBe('t');
    expect(result.parameter).toBe('s');
    expect(compact(result.variableParamLatex)).toContain('s^2-b');
    expect(compact(result.radicalParamLatex)).toBe('s');
  });

  it('parametrizes exact plus quadratics such as sqrt(x^2+1)', () => {
    const result = success('x^2+1');

    expect(result.family).toBe('quadratic-plus');
    expect(compact(result.variableParamLatex)).toContain('t^2-1');
    expect(compact(result.radicalParamLatex)).toContain('t^2+1');
    expect(compact(result.derivativeParamLatex)).toContain('t^2+1');
    expect(compact(result.exactSupplementLatex.join('\n'))).toContain('t\\ne0');
  });

  it('parametrizes exact circle-type quadratics such as sqrt(4-x^2)', () => {
    const result = success('4-x^2');
    const xOfT = compact(result.variableParamLatex);
    const radical = compact(result.radicalParamLatex);

    expect(result.family).toBe('quadratic-minus');
    expect(xOfT).toContain('4t');
    expect(xOfT).toContain('t^2+1');
    expect(radical).toContain('2');
    expect(radical).toContain('1-t^2');
    expect(compact(result.exactSupplementLatex.join('\n'))).toContain('t^2+1\\ne0');
  });

  it('parametrizes exact outside-root quadratics such as sqrt(x^2-4)', () => {
    const result = success('x^2-4');

    expect(result.family).toBe('quadratic-outside');
    expect(compact(result.variableParamLatex)).toContain('t^2+4');
    expect(compact(result.radicalParamLatex)).toContain('t^2-4');
    expect(compact(result.exactSupplementLatex.join('\n'))).toContain('t\\ne0');
  });

  it('stops symbolic quadratic parametrization until algebraic constants/branch facts are live', () => {
    expect(parametrizeAlgebraicGenus0Radicand(node('a*x^2+b*x+c'))).toMatchObject({
      kind: 'stop',
      reason: 'exact-quadratic-required',
    });
  });

  it('stops exact quadratics that need hidden algebraic constants in this slice', () => {
    expect(parametrizeAlgebraicGenus0Radicand(node('2*x^2+1'))).toMatchObject({
      kind: 'stop',
      reason: 'requires-algebraic-constant',
    });
  });
});
