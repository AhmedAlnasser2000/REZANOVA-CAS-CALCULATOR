import { describe, expect, it } from 'vitest';
import { solveParameterizedTrigEquation } from './equation-parameterized-trig';
import type { AngleUnit } from '../../types/calculator';

function expectSuccess(latex: string, target: string, angleUnit: AngleUnit = 'rad') {
  const result = solveParameterizedTrigEquation(latex, target, angleUnit);
  if (result.kind !== 'success') {
    throw new Error(`Expected success, received ${result.reason}: ${result.message}`);
  }
  expect(result.kind).toBe('success');
  return result;
}

function expectUnsupported(latex: string, target: string, angleUnit: AngleUnit = 'rad') {
  const result = solveParameterizedTrigEquation(latex, target, angleUnit);
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected unsupported, received ${result.exactLatex}`);
  }
  expect(result.kind).toBe('unsupported');
  return result;
}

describe('solveParameterizedTrigEquation', () => {
  it('solves sine target carriers with periodic real-family facts', () => {
    const result = expectSuccess('\\sin\\left(z\\right)=a', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('\\arcsin(a)');
    expect(result.exactLatex).toContain('\\pi-\\arcsin(a)');
    expect(result.exactLatex).toContain('2\\pi n');
    expect(result.exactSupplementLatex).toEqual(['-1\\le a\\le1', 'n\\in\\mathbb{Z}']);
  });

  it('solves cosine target carriers with affine shifts', () => {
    const result = expectSuccess('\\cos\\left(z+a\\right)=b', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('\\arccos(b)');
    expect(result.exactLatex).toContain('-a');
    expect(result.exactSupplementLatex).toEqual(['-1\\le b\\le1', 'n\\in\\mathbb{Z}']);
  });

  it('solves tangent target carriers with affine scaling', () => {
    const result = expectSuccess('\\tan\\left(2z+a\\right)=b', 'z');

    expect(result.exactLatex).toBe('z=\\frac{\\arctan(b)+\\pi n-a}{2}');
    expect(result.exactSupplementLatex).toEqual(['n\\in\\mathbb{Z}']);
  });

  it('solves affine shells around trig carriers', () => {
    const result = expectSuccess('2\\sin\\left(z+a\\right)+c=d', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('\\arcsin');
    expect(result.exactLatex).toContain('-a');
    expect(result.carrierValueLatex).toContain('\\frac{d}{2}');
    expect(result.exactSupplementLatex?.join(' ')).toContain('-1\\le');
  });

  it('preserves symbolic nonzero argument coefficients', () => {
    const result = expectSuccess('\\sin\\left(A z+B\\right)=c', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('\\frac{');
    expect(result.exactLatex).toContain('A');
    expect(result.exactSupplementLatex).toEqual(['A\\ne0', '-1\\le c\\le1', 'n\\in\\mathbb{Z}']);
  });

  it('honors degree angle output by converting inverse-trig principal values', () => {
    const result = expectSuccess('\\sin\\left(z\\right)=a', 'z', 'deg');

    expect(result.exactLatex).toContain('\\frac{180}{\\pi}\\arcsin(a)');
    expect(result.exactLatex).toContain('360n');
  });

  it('honors grad angle output by converting inverse-trig principal values', () => {
    const result = expectSuccess('\\sin\\left(z\\right)=a', 'z', 'grad');

    expect(result.exactLatex).toContain('\\frac{200}{\\pi}\\arcsin(a)');
    expect(result.exactLatex).toContain('400n');
  });

  it('stops numeric impossible real range cases', () => {
    const result = expectUnsupported('\\sin\\left(z\\right)=2', 'z');

    expect(result.reason).toBe('no-real-solution');
  });

  it('stops multiple trig carriers for a later family', () => {
    const result = expectUnsupported('\\sin\\left(z\\right)+\\cos\\left(z\\right)=a', 'z');

    expect(result.reason).toBe('multiple-carriers');
  });

  it('stops nonlinear selected-target trig arguments', () => {
    const result = expectUnsupported('\\sin\\left(z^2\\right)=a', 'z');

    expect(result.reason).toBe('non-affine-argument');
  });

  it('stops deep nonperiodic carriers inside trig arguments', () => {
    const result = expectUnsupported('\\sin\\left(\\left|z-a\\right|\\right)=b', 'z');

    expect(result.reason).toBe('non-affine-argument');
  });

  it('stops nested trig carriers', () => {
    const result = expectUnsupported('\\sin\\left(\\sin\\left(z\\right)\\right)=a', 'z');

    expect(result.reason).toBe('nested-trig');
  });

  it('stops target expressions outside the trig carrier', () => {
    const result = expectUnsupported('\\sin\\left(z\\right)=z', 'z');

    expect(result.reason).toBe('target-in-rhs');
  });

  it('rejects raw adjacent-letter products until variable hints can explain them', () => {
    const result = expectUnsupported('\\sin\\left(az\\right)=b', 'z');

    expect(result.reason).toBe('ambiguous-adjacent-product');
  });
});
