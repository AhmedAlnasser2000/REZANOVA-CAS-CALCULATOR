import { describe, expect, it } from 'vitest';
import { runEquationMode } from '../modes/equation';

const system2 = [
  [1, 1, 3],
  [2, -1, 0],
];

const system3 = [
  [1, 1, 1, 6],
  [2, -1, 1, 3],
  [1, 2, -1, 3],
];

function makeRequest(equationLatex: string) {
  return {
    equationLatex,
    quadraticCoefficients: [1, -5, 6],
    cubicCoefficients: [1, -6, 11, -6],
    quarticCoefficients: [1, 0, -5, 0, 4],
    polynomialSystem2Latex: ['x+y=3', 'x-y=1'] as const,
    system2,
    system3,
    angleUnit: 'deg' as const,
    outputStyle: 'both' as const,
    ansLatex: '0',
    equationScreen: 'symbolic' as const,
    equationSolveTarget: 'x',
    equationAnswerMode: 'exact' as const,
  };
}

function solveComplex(equationLatex: string, options: Partial<Parameters<typeof runEquationMode>[0]> = {}) {
  const result = runEquationMode({
    ...makeRequest(equationLatex),
    equationDomainIntent: 'complex',
    ...options,
  });
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected ${equationLatex} to solve over the complex domain`);
  }
  expect(result.answerDomain).toBe('complex');
  return result;
}

describe('equation complex route', () => {
  it('keeps Complex Off real-first for complex-only symbolic cases', () => {
    const result = runEquationMode({
      ...makeRequest('x^2+2x+5=0'),
      equationDomainIntent: 'real',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected Complex Off to preserve real-first behavior');
    }
    expect(result.answerDomain).toBeUndefined();
  });

  it('solves bounded negative-discriminant quadratics exactly when Complex is enabled', () => {
    const result = solveComplex('x^2+2x+5=0');

    expect(result.exactLatex).toContain('-1-2i');
    expect(result.exactLatex).toContain('-1+2i');
    expect(result.detailSections?.some((section) => section.title === 'Complex Domain')).toBe(true);
  });

  it('solves direct explicit imaginary constants in Complex Exact mode', () => {
    const imaginaryUnit = solveComplex(String.raw`x+\imaginaryI=0`);
    const plainImaginaryUnit = solveComplex('x+i=0');
    const mixedConstant = solveComplex(String.raw`x-(2+3\imaginaryI)=0`);
    const polarMixedConstant = solveComplex(String.raw`x-(2+3\imaginaryI)=0`, {
      complexExactForm: 'polar',
    });
    const cisImaginaryUnit = solveComplex('x+i=0', {
      complexExactForm: 'cis',
    });

    expect(imaginaryUnit.exactLatex).toBe('x\\in\\left\\{-i\\right\\}');
    expect(imaginaryUnit.approxText).toBe('x ~= -i');
    expect(plainImaginaryUnit.exactLatex).toBe('x\\in\\left\\{-i\\right\\}');
    expect(mixedConstant.exactLatex).toBe('x\\in\\left\\{2+3i\\right\\}');
    expect(mixedConstant.approxText).toBe('x ~= 2 + 3i');
    expect(polarMixedConstant.exactLatex).toBe(
      'x\\in\\left\\{\\sqrt{13}\\left(\\cos\\left(\\arctan\\left(\\frac{3}{2}\\right)\\right)+i\\sin\\left(\\arctan\\left(\\frac{3}{2}\\right)\\right)\\right)\\right\\}',
    );
    expect(cisImaginaryUnit.exactLatex).toBe('x\\in\\left\\{\\operatorname{cis}\\left(-\\frac{\\pi}{2}\\right)\\right\\}');
    expect(mixedConstant.detailSections?.some((section) => section.title === 'Complex Linear Route')).toBe(true);
  });

  it('guides explicit imaginary input to Complex mode when Complex is off', () => {
    const result = runEquationMode({
      ...makeRequest('x+i=0'),
      equationDomainIntent: 'real',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected Complex Off explicit imaginary input to stop');
    }
    expect(result.error).toContain('Enable Complex');
    expect(result.detailSections?.some((section) =>
      section.lines.some((line) => line.includes('reserved as the imaginary unit'))))
      .toBe(true);
  });

  it('solves supported rational equations by numerator roots and preserves denominator exclusions', () => {
    const result = solveComplex('(x^2+1)/(x-2)=0');

    expect(result.exactLatex).toBe('x\\in\\left\\{-i,\\ i\\right\\}');
    expect(result.approxText).toBe('x ~= -i, i');
    expect(result.exactSupplementLatex).toContain('x-2\\ne0');
    expect(result.detailSections?.some((section) => section.title === 'Complex Rational Route')).toBe(true);
  });

  it('solves mixed factorable polynomial equations with real and complex branches', () => {
    const result = solveComplex('(x-1)(x^2+1)=0');

    expect(result.exactLatex).toBe('x\\in\\left\\{1,\\ -i,\\ i\\right\\}');
    expect(result.detailSections?.some((section) => section.title === 'Complex Polynomial Route')).toBe(true);
  });

  it('keeps real roots visible when Complex Off and adds complex-only branches when Complex On', () => {
    const real = runEquationMode({
      ...makeRequest('x^4-16=0'),
      equationDomainIntent: 'real',
    });
    const complex = solveComplex('x^4-16=0');

    expect(real.kind).toBe('success');
    if (real.kind !== 'success') {
      throw new Error('Expected real-domain roots to stay visible');
    }
    expect(real.answerDomain).toBeUndefined();
    expect(real.exactLatex).toBe('x\\in\\left\\{-2, 2\\right\\}');
    expect(complex.exactLatex).toBe('x\\in\\left\\{-2,\\ 2,\\ -2i,\\ 2i\\right\\}');
  });

  it('keeps selected-target power complex branches bounded and symbolic', () => {
    const cube = solveComplex('x^3+8=0');
    const quartic = solveComplex('x^4+1=0');

    expect(cube.exactLatex).toContain('-2');
    expect(cube.exactLatex).toContain('1-\\sqrt{3}i');
    expect(cube.exactLatex).toContain('1+\\sqrt{3}i');
    expect(quartic.exactLatex).toContain('i');
    expect(quartic.exactLatex).not.toContain('~=');
  });

  it('orders and formats selected-target complex power branches without axis-root leakage', () => {
    const quartic = solveComplex('x^4+16=0');

    expect(quartic.exactLatex).toContain('-\\sqrt{2}-\\sqrt{2}i');
    expect(quartic.exactLatex).toContain('-\\sqrt{2}+\\sqrt{2}i');
    expect(quartic.exactLatex).toContain('\\sqrt{2}-\\sqrt{2}i');
    expect(quartic.exactLatex).toContain('\\sqrt{2}+\\sqrt{2}i');
    expect(quartic.exactLatex).not.toContain('i2');
    expect(quartic.exactLatex).not.toContain('\\{2,\\ -2');
  });

  it('respects output style for bounded complex branches', () => {
    const exact = runEquationMode({
      ...makeRequest('x^2+2x+5=0'),
      outputStyle: 'exact',
      equationDomainIntent: 'complex',
    });
    const decimal = runEquationMode({
      ...makeRequest('x^2+2x+5=0'),
      outputStyle: 'decimal',
      equationDomainIntent: 'complex',
    });
    const both = runEquationMode({
      ...makeRequest('x^2+2x+5=0'),
      outputStyle: 'both',
      equationDomainIntent: 'complex',
    });

    expect(exact.kind).toBe('success');
    expect(decimal.kind).toBe('success');
    expect(both.kind).toBe('success');
    if (exact.kind !== 'success' || decimal.kind !== 'success' || both.kind !== 'success') {
      throw new Error('Expected output-style probes to solve');
    }
    expect(exact.exactLatex).toBe('x\\in\\left\\{-1-2i,\\ -1+2i\\right\\}');
    expect(exact.approxText).toBeUndefined();
    expect(decimal.exactLatex).toBe('x\\in\\left\\{-1-2i,\\ -1+2i\\right\\}');
    expect(decimal.approxText).toBeUndefined();
    expect(both.exactLatex).toBe('x\\in\\left\\{-1-2i,\\ -1+2i\\right\\}');
    expect(both.approxText).toBe('x ~= -1 - 2i, -1 + 2i');
  });

  it('uses the selected exact form for awkward exact imaginary-unit power branches', () => {
    const exact = runEquationMode({
      ...makeRequest('x^4+i=0'),
      outputStyle: 'exact',
      equationDomainIntent: 'complex',
      complexExactForm: 'rectangular',
    });
    const polar = runEquationMode({
      ...makeRequest('x^4+i=0'),
      outputStyle: 'exact',
      equationDomainIntent: 'complex',
      complexExactForm: 'polar',
    });
    const cis = runEquationMode({
      ...makeRequest('x^4+i=0'),
      outputStyle: 'exact',
      equationDomainIntent: 'complex',
      complexExactForm: 'cis',
    });
    const decimal = runEquationMode({
      ...makeRequest('x^4+i=0'),
      outputStyle: 'decimal',
      equationDomainIntent: 'complex',
      complexExactForm: 'cis',
    });
    const both = runEquationMode({
      ...makeRequest('x^4+i=0'),
      outputStyle: 'both',
      equationDomainIntent: 'complex',
      complexExactForm: 'polar',
    });

    expect(exact.kind).toBe('success');
    expect(polar.kind).toBe('success');
    expect(cis.kind).toBe('success');
    expect(decimal.kind).toBe('success');
    expect(both.kind).toBe('success');
    if (
      exact.kind !== 'success'
      || polar.kind !== 'success'
      || cis.kind !== 'success'
      || decimal.kind !== 'success'
      || both.kind !== 'success'
    ) {
      throw new Error('Expected imaginary-unit power probes to solve');
    }

    expect(exact.exactLatex).toContain('\\frac{\\sqrt{2+\\sqrt{2}}}{2}-\\frac{\\sqrt{2-\\sqrt{2}}}{2}i');
    expect(exact.exactLatex).not.toContain('\\operatorname{cis}');
    expect(exact.exactLatex).not.toContain('\\cos\\left');
    expect(polar.exactLatex).toContain('\\cos\\left(-\\frac{\\pi}{8}\\right)+i\\sin\\left(-\\frac{\\pi}{8}\\right)');
    expect(polar.exactLatex).toContain('\\cos\\left(\\frac{3\\pi}{8}\\right)+i\\sin\\left(\\frac{3\\pi}{8}\\right)');
    expect(cis.exactLatex).toContain('\\operatorname{cis}\\left(-\\frac{\\pi}{8}\\right)');
    expect(cis.exactLatex).toContain('\\operatorname{cis}\\left(\\frac{3\\pi}{8}\\right)');
    expect(exact.exactLatex).not.toContain('\\sqrt[4]{-i}');
    expect(exact.exactLatex).not.toContain('\\left(\\sqrt[4]{-i}\\right)i');
    expect(decimal.exactLatex).toContain('0.92388-0.382683i');
    expect(decimal.exactLatex).not.toContain('\\operatorname{cis}');
    expect(both.exactLatex).toContain('\\cos\\left(-\\frac{\\pi}{8}\\right)+i\\sin\\left(-\\frac{\\pi}{8}\\right)');
    expect(both.approxText).toContain('x ~= 0.92388 - 0.382683i');
  });

  it('uses the selected exact form for direct real-constant power branches', () => {
    const rectangularQuartic = solveComplex('x^4+1=0', { complexExactForm: 'rectangular' });
    const polarQuartic = solveComplex('x^4+1=0', { complexExactForm: 'polar' });
    const cisQuartic = solveComplex('x^4+1=0', { complexExactForm: 'cis' });
    const polarCubic = solveComplex('x^3+8=0', { complexExactForm: 'polar' });
    const cisRealQuartic = solveComplex('x^4-16=0', { complexExactForm: 'cis' });

    expect(rectangularQuartic.exactLatex).toContain('\\frac{\\sqrt{2}}{2}+\\frac{\\sqrt{2}}{2}i');
    expect(rectangularQuartic.exactLatex).not.toContain('\\operatorname{cis}');
    expect(rectangularQuartic.exactLatex).not.toContain('\\cos\\left');
    expect(polarQuartic.exactLatex).toContain('\\cos\\left(\\frac{\\pi}{4}\\right)+i\\sin\\left(\\frac{\\pi}{4}\\right)');
    expect(polarQuartic.exactLatex).toContain('\\cos\\left(\\frac{7\\pi}{4}\\right)+i\\sin\\left(\\frac{7\\pi}{4}\\right)');
    expect(cisQuartic.exactLatex).toContain('\\operatorname{cis}\\left(\\frac{\\pi}{4}\\right)');
    expect(cisQuartic.exactLatex).toContain('\\operatorname{cis}\\left(\\frac{7\\pi}{4}\\right)');
    expect(polarCubic.exactLatex).toContain('2\\left(\\cos\\left(\\pi\\right)+i\\sin\\left(\\pi\\right)\\right)');
    expect(polarCubic.exactLatex).toContain('2\\left(\\cos\\left(\\frac{5\\pi}{3}\\right)+i\\sin\\left(\\frac{5\\pi}{3}\\right)\\right)');
    expect(cisRealQuartic.exactLatex).toContain('2\\operatorname{cis}\\left(\\pi\\right)');
    expect(cisRealQuartic.exactLatex).toContain('2\\operatorname{cis}\\left(\\frac{3\\pi}{2}\\right)');
  });

  it('keeps explicit imaginary units distinct from numeric one in exact display', () => {
    const imaginary = solveComplex('x^4+i=0', { complexExactForm: 'rectangular' });
    const real = solveComplex('x^4+1=0', { complexExactForm: 'rectangular' });

    expect(imaginary.exactLatex).not.toBe(real.exactLatex);
    expect(imaginary.detailSections?.flatMap((section) => section.lines).join(' '))
      .toContain('Generated equation: x^4=-\\imaginaryI');
  });

  it('does not fake exact complex answers for unsupported unfactorable cubic or quartic equations', () => {
    for (const equationLatex of ['x^3+8=5+x', 'x^4+x+1=0']) {
      const result = runEquationMode({
        ...makeRequest(equationLatex),
        equationDomainIntent: 'complex',
      });
      expect(result.kind).toBe('error');
      if (result.kind !== 'error') {
        throw new Error(`Expected ${equationLatex} to stay unsupported`);
      }
      expect(result.error).toContain('outside the supported exact symbolic solve families');
    }
  });

  it('keeps Approximate and Isolate outside complex exact solving', () => {
    const approximate = runEquationMode({
      ...makeRequest('(x-1)(x^2+1)=0'),
      equationAnswerMode: 'approximate',
      equationDomainIntent: 'complex',
    });
    const isolate = runEquationMode({
      ...makeRequest('(x-1)(x^2+1)=0'),
      equationAnswerMode: 'isolate',
      equationDomainIntent: 'complex',
    });

    expect(approximate.kind).toBe('error');
    expect(isolate.kind).toBe('error');
    if (approximate.kind !== 'error' || isolate.kind !== 'error') {
      throw new Error('Expected answer-mode boundaries to remain strict');
    }
    expect(approximate.error).toContain('Approximate answer mode needs a numeric interval');
    expect(isolate.answerDomain).not.toBe('complex');
  });
});
