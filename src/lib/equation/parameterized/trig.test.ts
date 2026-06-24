import { describe, expect, it } from 'vitest';
import { solveParameterizedTrigEquation } from './trig';
import type { AngleUnit } from '../../../types/calculator';

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
    expect(result.branchReadback).toMatchObject({
      targetLatex: 'z',
      relationLatex: '\\in',
      source: 'equation-parameterized-trig',
    });
    expect(result.branchReadback?.branchesLatex).toEqual([
      '\\arcsin(a)+2\\pi n',
      '\\pi-\\arcsin(a)+2\\pi n',
    ]);
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
    expect(result.branchReadback).toBeUndefined();
  });

  it('solves affine shells around trig carriers', () => {
    const result = expectSuccess('2\\sin\\left(z+a\\right)+c=d', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('\\arcsin');
    expect(result.exactLatex).toContain('-a');
    expect(result.branchReadback?.targetLatex).toBe('z');
    expect(result.branchReadback?.branchesLatex).toHaveLength(2);
    expect(result.branchReadback?.branchesLatex.every((branch) => branch.includes('-a'))).toBe(true);
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

  it('solves same-argument mixed sine/cosine identities', () => {
    const result = expectSuccess('\\sin\\left(z\\right)+\\cos\\left(z\\right)=a', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('\\arcsin');
    expect(result.exactLatex).toContain('\\operatorname{atan2}\\left(1,1\\right)');
    expect(result.exactLatex).toContain('2\\pi n');
    expect(result.branchReadback).toMatchObject({
      targetLatex: 'z',
      relationLatex: '\\in',
      source: 'equation-parameterized-trig',
    });
    expect(result.branchReadback?.branchesLatex).toHaveLength(2);
    expect(result.branchReadback?.branchesLatex.join(' ')).toContain('\\operatorname{atan2}\\left(1,1\\right)');
    expect(result.exactSupplementLatex).toContain('-\\sqrt{2}\\le a\\le \\sqrt{2}');
    expect(result.exactSupplementLatex).toContain('n\\in\\mathbb{Z}');
  });

  it('solves numeric-coefficient mixed trig shells with affine shifts', () => {
    const result = expectSuccess('2\\sin\\left(z+a\\right)+3\\cos\\left(z+a\\right)=b', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('\\frac{b\\sqrt{13}}{13}');
    expect(result.exactLatex).toContain('\\operatorname{atan2}\\left(3,2\\right)');
    expect(result.exactLatex).toContain('-a');
    expect(result.exactSupplementLatex).toContain('-\\sqrt{13}\\le b\\le \\sqrt{13}');
  });

  it('solves symbolic-coefficient mixed trig identities with explicit real facts', () => {
    const result = expectSuccess('A\\sin\\left(z\\right)+B\\cos\\left(z\\right)=C', 'z');

    expect(result.exactLatex).toContain('\\operatorname{atan2}\\left(B,A\\right)');
    expect(result.exactLatex).toContain('\\frac{C}{\\sqrt{A^2+B^2}}');
    expect(result.exactSupplementLatex).toContain('A^2+B^2>0');
    expect(result.exactSupplementLatex).toContain('-\\sqrt{A^2+B^2}\\le C\\le \\sqrt{A^2+B^2}');
  });

  it('preserves symbolic target argument coefficients in mixed trig identities', () => {
    const result = expectSuccess('A\\sin\\left(k z+B\\right)+C\\cos\\left(k z+B\\right)=D', 'z');

    expect(result.exactLatex).toContain('\\frac{');
    expect(result.exactLatex).toContain('k');
    expect(result.exactSupplementLatex).toContain('k\\ne0');
    expect(result.exactSupplementLatex).toContain('A^2+C^2>0');
  });

  it('honors degree and grad angle output for mixed trig identities', () => {
    const degree = expectSuccess('A\\sin\\left(z\\right)+B\\cos\\left(z\\right)=C', 'z', 'deg');
    const grad = expectSuccess('A\\sin\\left(z\\right)+B\\cos\\left(z\\right)=C', 'z', 'grad');

    expect(degree.exactLatex).toContain('\\frac{180}{\\pi}\\arcsin');
    expect(degree.exactLatex).toContain('\\frac{180}{\\pi}\\operatorname{atan2}');
    expect(degree.exactLatex).toContain('360n');
    expect(grad.exactLatex).toContain('\\frac{200}{\\pi}\\arcsin');
    expect(grad.exactLatex).toContain('\\frac{200}{\\pi}\\operatorname{atan2}');
    expect(grad.exactLatex).toContain('400n');
  });

  it('stops impossible mixed trig range cases', () => {
    const result = expectUnsupported('\\sin\\left(z\\right)+\\cos\\left(z\\right)=3', 'z');

    expect(result.reason).toBe('no-real-solution');
  });

  it('stops mismatched mixed trig arguments', () => {
    const result = expectUnsupported('\\sin\\left(z\\right)+\\cos\\left(2z\\right)=a', 'z');

    expect(result.reason).toBe('multiple-carriers');
  });

  it('stops nonlinear selected-target trig arguments', () => {
    const result = expectUnsupported('\\sin\\left(z^2\\right)=a', 'z');

    expect(result.reason).toBe('non-affine-argument');
  });

  it('keeps nonlinear cubic and quartic trig arguments outside generated formula handoff', () => {
    const result = expectUnsupported('\\sin\\left(z^3+z+1\\right)=b', 'z');

    expect(result.reason).toBe('non-affine-argument');

    const quartic = expectUnsupported('\\sin\\left(z^4+z+1\\right)=b', 'z');
    expect(quartic.reason).toBe('non-affine-argument');
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

  it('stops products and non-trig mixed selected-target carriers', () => {
    expect(expectUnsupported('\\sin\\left(z\\right)\\cos\\left(z\\right)=a', 'z').reason).toBe('unsupported-shell');
    expect(expectUnsupported('\\sin\\left(z\\right)+\\sqrt{z}=a', 'z').reason).toBe('target-in-unsupported-operation');
    expect(expectUnsupported('\\sin\\left(z\\right)+e^z=a', 'z').reason).toBe('target-in-unsupported-operation');
    expect(expectUnsupported('\\tan\\left(z\\right)+\\sin\\left(z\\right)=a', 'z').reason).toBe('multiple-carriers');
  });

  it('rejects raw adjacent-letter products until variable hints can explain them', () => {
    const result = expectUnsupported('\\sin\\left(az\\right)=b', 'z');

    expect(result.reason).toBe('ambiguous-adjacent-product');
  });
});
