import { describe, expect, it } from 'vitest';
import { solveParameterizedExpLogEquation } from './equation-parameterized-exp-log';

function expectSuccess(latex: string, target: string) {
  const result = solveParameterizedExpLogEquation(latex, target);
  if (result.kind !== 'success') {
    throw new Error(`Expected success, received ${result.reason}: ${result.message}`);
  }
  expect(result.kind).toBe('success');
  return result;
}

function expectUnsupported(latex: string, target: string) {
  const result = solveParameterizedExpLogEquation(latex, target);
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected unsupported, received ${result.exactLatex}`);
  }
  expect(result.kind).toBe('unsupported');
  return result;
}

describe('solveParameterizedExpLogEquation', () => {
  it('isolates natural exponential target equations', () => {
    const result = expectSuccess('e^z=a', 'z');

    expect(result.exactLatex).toBe('z=\\ln(a)');
    expect(result.exactSupplementLatex).toEqual(['a>0']);
    expect(result.generatedEquationLatex).toBe('z=\\ln\\left(a\\right)');
  });

  it('solves affine natural exponential carriers', () => {
    const result = expectSuccess('e^{z+a}=b', 'z');

    expect(result.exactLatex).toContain('z=');
    expect(result.exactLatex).toContain('\\ln(b)');
    expect(result.exactLatex).toContain('-a');
    expect(result.exactSupplementLatex).toEqual(['b>0']);
  });

  it('solves natural logarithmic target equations with domain facts', () => {
    const result = expectSuccess('\\ln\\left(z+a\\right)=b', 'z');

    expect(result.exactLatex).toBe('z=e^{b}-a');
    expect(result.exactSupplementLatex).toEqual(['a+z>0']);
  });

  it('solves common logarithmic target equations', () => {
    const result = expectSuccess('\\log\\left(z+a\\right)=b', 'z');

    expect(result.exactLatex).toBe('z=10^{b}-a');
    expect(result.exactSupplementLatex).toEqual(['a+z>0']);
  });

  it('solves numeric-base exponential target equations', () => {
    const result = expectSuccess('2^{z+a}=b', 'z');

    expect(result.exactLatex).toContain('\\log_{2}(b)');
    expect(result.exactLatex).toContain('-a');
    expect(result.exactSupplementLatex).toEqual(['b>0']);
  });

  it('delegates isolated logarithmic quadratics to PARAM2', () => {
    const result = expectSuccess('\\ln\\left(z^2+a\\right)=b', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('e^{b}');
    expect(result.exactSupplementLatex?.join(' ')).toContain('z^2+a>0');
  });

  it('delegates isolated logarithmic rational equations to PARAM3', () => {
    const result = expectSuccess('\\ln\\left(1/(z-a)\\right)=b', 'z');

    expect(result.exactLatex).toContain('z=');
    expect(result.exactSupplementLatex).toContain('z-a\\ne0');
    expect(result.exactSupplementLatex?.join(' ')).toContain('\\frac{1}{z-a}>0');
  });

  it('delegates isolated exponential carrier equations to PARAM4', () => {
    const result = expectSuccess('e^{\\left|z-a\\right|}=b', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('a+\\ln(b)');
    expect(result.exactLatex).toContain('a-\\ln(b)');
    expect(result.exactSupplementLatex).toEqual(['b>0', '\\ln(b)\\ge0']);
  });

  it('reduces same-base exponential equalities', () => {
    const result = expectSuccess('e^{z+a}=e^b', 'z');

    expect(result.exactLatex).toBe('z=b-a');
    expect(result.generatedEquationLatex).toBe('a+z=b');
  });

  it('reduces same-base logarithmic equalities with domain facts', () => {
    const result = expectSuccess('\\ln\\left(z+a\\right)=\\ln\\left(b\\right)', 'z');

    expect(result.exactLatex).toBe('z=b-a');
    expect(result.exactSupplementLatex).toEqual(['a+z>0', 'b>0']);
  });

  it('rejects symbolic exponential bases', () => {
    const result = expectUnsupported('a^z=b', 'z');

    expect(result.reason).toBe('symbolic-base');
  });

  it('rejects logarithmic combinations for a later milestone', () => {
    const result = expectUnsupported('\\ln\\left(z\\right)+\\ln\\left(z-a\\right)=b', 'z');

    expect(result.reason).toBe('multiple-carriers');
  });

  it('rejects mixed target plus exp/log equations', () => {
    const result = expectUnsupported('z+e^z=a', 'z');

    expect(result.reason).toBe('target-in-unsupported-operation');
  });

  it('rejects nested exp/log carriers', () => {
    const result = expectUnsupported('\\ln\\left(e^z\\right)=a', 'z');

    expect(result.reason).toBe('nested-exp-log');
  });

  it('rejects raw adjacent products until variable hints can explain them', () => {
    const result = expectUnsupported('\\ln\\left(az\\right)=b', 'z');

    expect(result.reason).toBe('ambiguous-adjacent-product');
  });
});
