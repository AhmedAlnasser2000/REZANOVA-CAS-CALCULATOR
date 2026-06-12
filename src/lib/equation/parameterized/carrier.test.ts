import { describe, expect, it } from 'vitest';
import { solveParameterizedCarrierEquation } from './carrier';

function expectSuccess(latex: string, target: string) {
  const result = solveParameterizedCarrierEquation(latex, target);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected success, received ${result.reason}: ${result.message}`);
  }
  return result;
}

function expectUnsupported(latex: string, target: string) {
  const result = solveParameterizedCarrierEquation(latex, target);
  expect(result.kind).toBe('unsupported');
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected unsupported, received ${result.exactLatex}`);
  }
  return result;
}

describe('solveParameterizedCarrierEquation', () => {
  it('solves absolute-value target carriers with real branch facts', () => {
    const result = expectSuccess('\\left|z-a\\right|=b', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('a+b');
    expect(result.exactLatex).toContain('a-b');
    expect(result.exactSupplementLatex).toEqual(['b\\ge0']);
    expect(result.branchEquations).toEqual(['z-a=b', 'z-a=-b']);
  });

  it('solves affine shells around absolute-value carriers', () => {
    const result = expectSuccess('2\\left|z-a\\right|+c=d', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('a-\\frac{c}{2}+\\frac{d}{2}');
    expect(result.exactLatex).toContain('a+\\frac{c}{2}-\\frac{d}{2}');
    expect(result.exactSupplementLatex).toEqual(['\\frac{d}{2}-\\frac{c}{2}\\ge0']);
  });

  it('solves square-root target carriers with nonnegative right-side facts', () => {
    const result = expectSuccess('\\sqrt{z+a}=b', 'z');

    expect(result.exactLatex).toBe('z=b^2-a');
    expect(result.exactSupplementLatex).toEqual(['b\\ge0']);
  });

  it('solves affine shells around square-root carriers', () => {
    const result = expectSuccess('\\sqrt{z-a}+c=b', 'z');

    expect(result.exactLatex).toBe('z=(b-c)^2+a');
    expect(result.exactSupplementLatex).toEqual(['b-c\\ge0']);
  });

  it('solves square-power carriers through square-root branches', () => {
    const result = expectSuccess('(z-a)^2=b', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('a+\\sqrt{b}');
    expect(result.exactLatex).toContain('a-\\sqrt{b}');
    expect(result.exactSupplementLatex).toEqual(['b\\ge0']);
  });

  it('delegates bounded rational carrier branches to PARAM3', () => {
    const result = expectSuccess('\\left|\\frac{1}{z-a}\\right|=b', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('\\frac{ab+1}{b}');
    expect(result.exactLatex).toContain('\\frac{ab-1}{b}');
    expect(result.exactSupplementLatex).toEqual(['b\\ge0', 'z-a\\ne0', 'b\\ne0']);
  });

  it('stops periodic or deep composition carriers for later PARAM milestones', () => {
    const result = expectUnsupported('\\sin\\left(\\left|z-a\\right|\\right)=b', 'z');

    expect(result.reason).toBe('target-in-unsupported-operation');
  });

  it('stops target-inside-function branches after carrier isolation', () => {
    const result = expectUnsupported('\\sqrt{\\sin\\left(z\\right)}=a', 'z');

    expect(result.reason).toBe('branch-unsupported');
    expect(result.message).toContain('outside current selected-target parameter solvers');
  });

  it('stops nested selected-target carriers', () => {
    const result = expectUnsupported('\\sqrt{\\left|z-a\\right|}=b', 'z');

    expect(result.reason).toBe('nested-carrier');
  });

  it('rejects raw adjacent-letter products until variable hints can explain them', () => {
    const result = expectUnsupported('\\left|az\\right|=b', 'z');

    expect(result.reason).toBe('ambiguous-adjacent-product');
  });

  it('stops unsupported higher powers outside the square-power surface', () => {
    const result = expectUnsupported('(z-a)^3=b', 'z');

    expect(result.reason).toBe('target-in-unsupported-operation');
  });
});
