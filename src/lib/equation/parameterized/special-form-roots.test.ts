import { describe, expect, it } from 'vitest';
import { solveParameterizedSpecialFormRootsEquation } from './special-form-roots';

function expectSuccess(latex: string, target: string) {
  const result = solveParameterizedSpecialFormRootsEquation(latex, target);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected success, received ${result.reason}: ${result.message}`);
  }
  return result;
}

function expectUnsupported(latex: string, target: string) {
  const result = solveParameterizedSpecialFormRootsEquation(latex, target);
  expect(result.kind).toBe('unsupported');
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected unsupported, received ${result.exactLatex}`);
  }
  return result;
}

describe('solveParameterizedSpecialFormRootsEquation', () => {
  it('solves exact-rational quadratic-in-cubic-carrier equations', () => {
    const result = expectSuccess('x^6-5x^3+4=0', 'x');

    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('1');
    expect(result.exactLatex).toMatch(/\\sqrt\[3\]\{4\}|4\^\{1\/3\}/);
    expect(result.branchReadback?.source).toBe('equation-special-form-roots');
    expect(result.detailSections.flatMap((section) => section.lines).join(' ')).toContain('u=x^{3}');
  });

  it('solves exact-rational quadratic-in-sixth-power-carrier equations at total degree twelve', () => {
    const result = expectSuccess('x^{12}-5x^6+4=0', 'x');

    expect(result.exactLatex).toContain('-1');
    expect(result.exactLatex).toContain('1');
    expect(result.exactLatex).toMatch(/\\sqrt\[6\]\{4\}|4\^\{1\/6\}/);
    expect(result.branchReadback?.branchesLatex.length).toBe(4);
  });

  it('solves exact-rational quadratic-in-affine-carrier equations', () => {
    const shifted = expectSuccess('(x+a)^6-5(x+a)^3+4=0', 'x');
    const scaled = expectSuccess('(2x-1)^{12}-5(2x-1)^6+4=0', 'x');

    expect(shifted.exactLatex).toContain('x\\in');
    expect(shifted.exactLatex).toMatch(/\\sqrt\[3\]\{4\}-a|-a\+\\sqrt\[3\]\{4\}/);
    expect(shifted.exactLatex).toMatch(/1-a|-a\+1/);
    expect(shifted.detailSections.flatMap((section) => section.lines).join(' ')).toContain('affine carrier');
    expect(scaled.branchReadback?.branchesLatex.length).toBe(4);
    expect(scaled.exactLatex).toContain('\\frac');
    expect(scaled.exactLatex).toMatch(/\\sqrt\[6\]\{4\}|4\^\{1\/6\}/);
  });

  it('keeps total degree above twelve out of the special-form frontier', () => {
    const result = expectUnsupported('x^{14}-5x^7+4=0', 'x');

    expect(result.reason).toBe('total-degree-limit');
    expect(result.message).toContain('12');
  });

  it('solves symbolic-coefficient carrier quadratics', () => {
    const odd = expectSuccess('x^6-a x^3+b=0', 'x');
    const even = expectSuccess('x^{12}-a x^6+b=0', 'x');
    const shifted = expectSuccess('(x+c)^6-a*(x+c)^3+b=0', 'x');

    expect(odd.exactLatex).toContain('\\sqrt[3]');
    expect(odd.exactLatex).toContain('a^2-4b');
    expect(odd.exactSupplementLatex).toContain('a^2-4b\\ge0');
    expect(even.branchReadback?.branchesLatex.length).toBe(4);
    expect(even.exactSupplementLatex?.some((fact) => fact.includes('\\ge0'))).toBe(true);
    expect(shifted.exactLatex).toContain('-c');
    expect(shifted.detailSections.flatMap((section) => section.lines).join(' '))
      .toContain('symbolic-coefficient quadratic');
  });

  it('rejects target-bearing carrier coefficients', () => {
    const result = expectUnsupported('x^6-x*x^3+b=0', 'x');

    expect(result.reason).not.toBe('symbolic-carrier-coefficients');
  });

  it('rejects target-function carrier shapes', () => {
    expect(expectUnsupported('\\sin\\left(x^3\\right)^2-5\\sin\\left(x^3\\right)+4=0', 'x').reason)
      .toBe('no-special-form');
  });

  it('reports complex-only carrier quadratics as no real roots', () => {
    const result = expectUnsupported('x^6+1=0', 'x');

    expect(result.reason).toBe('no-real-roots');
  });
});
