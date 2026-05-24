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

  it('delegates isolated logarithmic quadratics to the polynomial helper', () => {
    const result = expectSuccess('\\ln\\left(z^2+a\\right)=b', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('e^{b}');
    expect(result.exactSupplementLatex?.join(' ')).toContain('z^2+a>0');
  });

  it('delegates isolated logarithmic rational equations to the rational helper', () => {
    const result = expectSuccess('\\ln\\left(1/(z-a)\\right)=b', 'z');

    expect(result.exactLatex).toContain('z=');
    expect(result.exactSupplementLatex).toContain('z-a\\ne0');
    expect(result.exactSupplementLatex?.join(' ')).toContain('\\frac{1}{z-a}>0');
  });

  it('delegates isolated exponential carrier equations to the carrier helper', () => {
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

  it('solves target-free symbolic-base exponential target equations', () => {
    const result = expectSuccess('a^z=b', 'z');

    expect(result.exactLatex).toBe('z=\\log_{a}(b)');
    expect(result.exactSupplementLatex).toEqual(['a>0', 'a\\ne1', 'b>0']);
    expect(result.generatedEquationLatex).toBe('z=\\log_{a}\\left(b\\right)');
  });

  it('solves affine symbolic-base exponential carriers', () => {
    const result = expectSuccess('a^{z+c}=d', 'z');

    expect(result.exactLatex).toBe('z=\\log_{a}(d)-c');
    expect(result.exactSupplementLatex).toEqual(['a>0', 'a\\ne1', 'd>0']);
  });

  it('solves symbolic-base logarithmic target equations', () => {
    const result = expectSuccess('\\log_a(z+c)=d', 'z');

    expect(result.exactLatex).toBe('z=a^{d}-c');
    expect(result.exactSupplementLatex).toEqual(['a>0', 'a\\ne1', 'c+z>0']);
  });

  it('delegates symbolic-base exponential quadratics and rationals to existing helpers', () => {
    const quadratic = expectSuccess('a^{z^2+c}=d', 'z');
    expect(quadratic.exactLatex).toContain('z\\in');
    expect(quadratic.exactLatex).toContain('\\log_{a}(d)');
    expect(quadratic.exactSupplementLatex?.join(' ')).toContain('4\\log_{a}(d)-4c\\ge0');

    const rational = expectSuccess('a^{1/(z-c)}=d', 'z');
    expect(rational.exactLatex).toContain('z=');
    expect(rational.exactSupplementLatex).toContain('z-c\\ne0');
    expect(rational.exactSupplementLatex).toContain('\\log_{a}(d)\\ne0');
  });

  it('reduces same symbolic-base exponential and logarithmic equalities', () => {
    const exponential = expectSuccess('a^{z+c}=a^d', 'z');
    expect(exponential.exactLatex).toBe('z=d-c');
    expect(exponential.exactSupplementLatex).toEqual(['a>0', 'a\\ne1']);

    const logarithmic = expectSuccess('\\log_a(z+c)=\\log_a(d)', 'z');
    expect(logarithmic.exactLatex).toBe('z=d-c');
    expect(logarithmic.exactSupplementLatex).toEqual(['a>0', 'a\\ne1', 'c+z>0', 'd>0']);
  });

  it('solves target-in-base powers with principal-positive facts', () => {
    const result = expectSuccess('z^a=b', 'z');

    expect(result.exactLatex).toBe('z=\\sqrt[a]{b}');
    expect(result.generatedEquationLatex).toBe('z=b^{\\frac{1}{a}}');
    expect(result.exactSupplementLatex).toEqual(['b>0', 'a\\ne0', 'z>0']);
  });

  it('parenthesizes generated target-base powers instead of rendering exponent lists', () => {
    const result = expectSuccess('a^z=b^z', 'a');

    expect(result.exactLatex).toBe('a=\\sqrt[z]{b^{z}}');
    expect(result.exactLatex).not.toContain('lbrack');
    expect(result.generatedEquationLatex).toBe('a=\\left(b^{z}\\right)^{\\frac{1}{z}}');
    expect(result.exactSupplementLatex).toEqual(['b^{z}>0', 'z\\ne0', 'a>0']);
  });

  it('solves affine target-in-base powers with principal-positive facts', () => {
    const result = expectSuccess('(z+c)^a=b', 'z');

    expect(result.exactLatex).toBe('z=\\sqrt[a]{b}-c');
    expect(result.generatedEquationLatex).toBe('c+z=b^{\\frac{1}{a}}');
    expect(result.exactSupplementLatex).toEqual(['b>0', 'a\\ne0', 'c+z>0']);
  });

  it('solves target-in-log-base equations with principal-positive facts', () => {
    const result = expectSuccess('\\log_z(a)=b', 'z');

    expect(result.exactLatex).toBe('z=\\sqrt[b]{a}');
    expect(result.generatedEquationLatex).toBe('z=a^{\\frac{1}{b}}');
    expect(result.exactSupplementLatex).toEqual(['a>0', 'b\\ne0', 'z>0', 'z\\ne1']);
  });

  it('solves affine target-in-log-base equations with principal-positive facts', () => {
    const result = expectSuccess('\\log_{z+c}(a)=b', 'z');

    expect(result.exactLatex).toBe('z=\\sqrt[b]{a}-c');
    expect(result.generatedEquationLatex).toBe('c+z=a^{\\frac{1}{b}}');
    expect(result.exactSupplementLatex).toEqual(['a>0', 'b\\ne0', 'c+z>0', 'c+z\\ne1']);
  });

  it('rejects logarithmic combinations for a later milestone', () => {
    const result = expectUnsupported('\\ln\\left(z\\right)+\\ln\\left(z-a\\right)=b', 'z');

    expect(result.reason).toBe('multiple-carriers');
  });

  it('rejects mixed target plus exp/log equations', () => {
    const result = expectUnsupported('z+a^z=b', 'z');

    expect(result.reason).toBe('target-in-unsupported-operation');
  });

  it('rejects nested exp/log carriers', () => {
    const result = expectUnsupported('\\ln\\left(e^z\\right)=a', 'z');

    expect(result.reason).toBe('nested-exp-log');
  });

  it('rejects target in both base and exponent and zero log-base conditionals', () => {
    const mixedTarget = expectUnsupported('z^z=a', 'z');
    expect(mixedTarget.reason).toBe('target-in-unsupported-operation');

    const zeroLogBase = expectUnsupported('\\log_z(a)=0', 'z');
    expect(zeroLogBase.reason).toBe('unsupported-shell');
  });

  it('rejects raw adjacent products until variable hints can explain them', () => {
    const result = expectUnsupported('\\ln\\left(az\\right)=b', 'z');

    expect(result.reason).toBe('ambiguous-adjacent-product');
  });
});
