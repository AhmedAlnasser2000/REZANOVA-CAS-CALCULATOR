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
    expect(result.answerDomain).toBe('real');
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

    expect(imaginaryUnit.exactLatex).toBe('x=-i');
    expect(imaginaryUnit.approxText).toBe('x ~= -i');
    expect(plainImaginaryUnit.exactLatex).toBe('x=-i');
    expect(mixedConstant.exactLatex).toBe('x=2+3i');
    expect(mixedConstant.approxText).toBe('x ~= 2 + 3i');
    expect(polarMixedConstant.exactLatex).toBe(
      'x=\\sqrt{13}\\left(\\cos\\left(\\arctan\\left(\\frac{3}{2}\\right)\\right)+i\\sin\\left(\\arctan\\left(\\frac{3}{2}\\right)\\right)\\right)',
    );
    expect(cisImaginaryUnit.exactLatex).toBe('x=\\operatorname{cis}\\left(-\\frac{\\pi}{2}\\right)');
    expect(mixedConstant.detailSections?.some((section) => section.title === 'Complex Linear Route')).toBe(true);
  });

  it('guides explicit imaginary input to Complex mode when Complex is off', () => {
    const result = runEquationMode({
      ...makeRequest('x+i=0'),
      equationDomainIntent: 'real',
    });
    const commandResult = runEquationMode({
      ...makeRequest(String.raw`x+\imaginaryI=0`),
      equationDomainIntent: 'real',
    });

    expect(result.kind).toBe('error');
    expect(commandResult.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected Complex Off explicit imaginary input to stop');
    }
    expect(result.error).toContain('Enable Complex');
    expect(commandResult.kind === 'error' && commandResult.error).toContain('Enable Complex');
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

  it('solves guarded principal log and rational-log complex preimages', () => {
    const affineLog = solveComplex(String.raw`\ln(x-1)=4`);
    const zeroLog = solveComplex(String.raw`\ln(x-1)=0`);
    const rationalLog = solveComplex(String.raw`\ln((x-1)/(x+2))=4`);

    expect(affineLog.exactLatex).toBe('x\\in\\left\\{e^{4}+1\\right\\}');
    expect(zeroLog.exactLatex).toBe('x\\in\\left\\{2\\right\\}');
    expect(zeroLog.exactLatex).not.toContain('e^{0}');
    expect(affineLog.exactSupplementLatex).toContain('x-1\\ne0');
    expect(rationalLog.exactLatex).toContain('\\frac{2e^{4}+1}{1-e^{4}}');
    expect(rationalLog.exactSupplementLatex).toContain('x+2\\ne0');
    expect(rationalLog.detailSections?.some((section) => section.title === 'Complex Preimage Route')).toBe(true);
  });

  it('solves guarded complex exponential preimages with integer branch families', () => {
    const direct = solveComplex(String.raw`\exp(x)=1`);
    const affine = solveComplex(String.raw`\exp(2x+1)=i`);
    const rational = solveComplex(String.raw`\exp((x-1)/(x+2))=1`);
    const square = solveComplex(String.raw`\exp(x^2)=1`);
    const quartic = solveComplex(String.raw`\exp(x^4)=1`);

    expect(direct.exactLatex).toBe('x=2\\pi i k');
    expect(direct.exactSupplementLatex).toContain('k\\in\\mathbb{Z}');
    expect(affine.exactLatex).toContain('\\frac{i\\left(\\frac{\\pi}{2}+2\\pi k\\right)-1}{2}');
    expect(rational.exactLatex).toContain('\\frac{4\\pi i k+1}{1-2\\pi i k}');
    expect(rational.exactSupplementLatex).toContain('x+2\\ne0');
    expect(square.exactLatex).toContain('-\\sqrt{2\\pi i k}');
    expect(square.exactLatex).toContain('\\sqrt{2\\pi i k}');
    expect(square.exactLatex).not.toContain('\\operatorname{Roots}_{2}');
    const expanded = square.detailSections?.find((section) => section.title === 'Expanded Branches');
    const preimageRoute = square.detailSections?.find((section) =>
      section.title === 'Complex Preimage Route');
    expect(expanded).toBeUndefined();
    expect(preimageRoute?.lineKind).toBe('text');
    expect(preimageRoute?.lineParts).toBeUndefined();
    expect(quartic.exactLatex).toContain('\\sqrt[4]{2\\pi i k}');
    expect(quartic.exactLatex).not.toContain('\\mathrm{all}');
  });

  it('solves supported rational equations against explicit complex right-hand sides', () => {
    const result = solveComplex('(x^2+1)/(x-2)=i');
    const quadraticDenominator = solveComplex(String.raw`\frac{x^2+1}{x^2-2}=\imaginaryI`);

    expect(result.exactLatex).toContain('\\sqrt{-5-8i}');
    expect(result.exactSupplementLatex).toContain('x-2\\ne0');
    expect(result.detailSections?.some((section) => section.title === 'Complex Preimage Route')).toBe(true);
    expect(quadraticDenominator.exactLatex).toContain('\\sqrt{-12-4i}');
    expect(quadraticDenominator.exactSupplementLatex).toContain('x^2-2\\ne0');
  });

  it('clears supported rational inners inside complex log and exp preimages', () => {
    const log = solveComplex(String.raw`\ln\left(\frac{x^2+1}{x-2}\right)=1+\imaginaryI`);
    const exp = solveComplex(String.raw`\exp\left(\frac{x^2+1}{x-2}\right)=\imaginaryI`);

    expect(log.exactLatex).toContain('e^{1+i}');
    expect(log.exactSupplementLatex).toContain('x-2\\ne0');
    expect(log.exactSupplementLatex).toContain('\\frac{x^2+1}{x-2}\\ne0');
    expect(exp.exactLatex).toContain('i\\left(\\frac{\\pi}{2}+2\\pi k\\right)');
    expect(exp.exactSupplementLatex).toContain('k\\in\\mathbb{Z}');
    expect(exp.exactSupplementLatex).toContain('x-2\\ne0');
  });

  it('solves direct complex trig preimages and honors angle units in branch-family readback', () => {
    const sin = solveComplex(String.raw`\sin(x)=i`, { angleUnit: 'rad' });
    const tan = solveComplex(String.raw`\tan(x)=1+i`, { angleUnit: 'rad' });
    const cosDeg = solveComplex(String.raw`\cos(2x+1)=i`, { angleUnit: 'deg' });
    const cosZero = solveComplex(String.raw`\cos(2x)=0`, { angleUnit: 'rad' });
    const sinZero = solveComplex(String.raw`\sin(2x)=0`, { angleUnit: 'rad' });
    const tanUnit = solveComplex(String.raw`\tan(2x)=1`, { angleUnit: 'rad' });
    const cosHalf = solveComplex(String.raw`\cos\left(\frac{x}{2}\right)=0`, { angleUnit: 'rad' });

    expect(sin.exactLatex).toContain('\\arcsin\\left(i\\right)+2\\pi k');
    expect(sin.exactLatex).toContain('\\pi-\\arcsin\\left(i\\right)+2\\pi k');
    expect(sin.exactSupplementLatex).toContain('k\\in\\mathbb{Z}');
    expect(tan.exactLatex).toContain('\\arctan\\left(1+i\\right)+\\pi k');
    expect(cosDeg.exactLatex).toContain('\\frac{180}{\\pi}\\arccos\\left(i\\right)');
    expect(cosDeg.exactLatex).toContain('360k');
    expect(cosZero.exactLatex).toBe(String.raw`x=\frac{\pi}{4}+\frac{\pi k}{2}`);
    expect(sinZero.exactLatex).toBe(String.raw`x=\frac{\pi k}{2}`);
    expect(tanUnit.exactLatex).toBe(String.raw`x=\frac{\pi}{8}+\frac{\pi k}{2}`);
    expect(cosHalf.exactLatex).toBe(String.raw`x=\pi+2\pi k`);
    for (const result of [cosZero, sinZero, tanUnit, cosHalf]) {
      expect(result.exactLatex).not.toContain(String.raw`\frac{\frac`);
      expect(result.exactSupplementLatex).toContain(String.raw`k\in\mathbb{Z}`);
    }
  });

  it('solves true two-trig-layer complex preimages with independent integer families', () => {
    const tanSin = solveComplex(String.raw`\tan\left(\sin\left(x\right)\right)=1+\imaginaryI`, { angleUnit: 'rad' });
    const sinCos = solveComplex(String.raw`\sin\left(\cos\left(x\right)\right)=\imaginaryI`, { angleUnit: 'rad' });
    const cosTan = solveComplex(String.raw`\cos\left(\tan\left(x\right)\right)=1+\imaginaryI`, { angleUnit: 'rad' });

    expect(tanSin.exactLatex).toContain('\\arcsin\\left(\\arctan\\left(1+i\\right)+\\pi k\\right)+2\\pi n');
    expect(tanSin.exactSupplementLatex).toContain('k,n\\in\\mathbb{Z}');
    expect(sinCos.exactLatex).toContain('\\arccos\\left(\\arcsin\\left(i\\right)+2\\pi k\\right)+2\\pi n');
    expect(sinCos.exactSupplementLatex).toContain('k,n\\in\\mathbb{Z}');
    expect(cosTan.exactLatex).toContain('\\arctan\\left(\\arccos\\left(1+i\\right)+2\\pi k\\right)+\\pi n');
    expect(cosTan.exactSupplementLatex).toContain('k,n\\in\\mathbb{Z}');
  });

  it('hands two-trig-layer complex preimages to bounded selected-target powers', () => {
    const square = solveComplex(String.raw`\tan\left(\sin\left(x^2\right)\right)=1+\imaginaryI`, { angleUnit: 'rad' });
    const quartic = solveComplex(String.raw`\sin\left(\cos\left(x^4\right)\right)=\imaginaryI`, { angleUnit: 'rad' });

    expect(square.exactLatex).toContain('-\\sqrt{\\arcsin');
    expect(square.exactLatex).toContain('\\sqrt{\\arcsin');
    expect(square.exactLatex).not.toContain('\\operatorname{Roots}_{2}');
    expect(square.exactSupplementLatex).toContain('k,n\\in\\mathbb{Z}');
    expect(square.detailSections?.find((section) => section.title === 'Expanded Branches')?.lineKind)
      .toBeUndefined();
    expect(quartic.exactLatex).toContain('\\sqrt[4]{');
    expect(quartic.exactLatex).not.toContain('\\mathrm{all}');
    expect(quartic.exactSupplementLatex).toContain('k,n\\in\\mathbb{Z}');
    expect(quartic.detailSections?.find((section) => section.title === 'Expanded Branches')?.lineKind)
      .toBe('math');
  });

  it('simplifies explicit imaginary-unit powers before complex preimage branch readback', () => {
    const result = solveComplex(String.raw`\cos\left(\tan\left(x^2\right)\right)=\imaginaryI^2`, {
      angleUnit: 'rad',
    });

    expect(result.exactLatex).not.toContain('\\imaginaryI^2');
    expect(result.exactLatex).not.toContain('i^2');
    expect(result.exactLatex).not.toContain('\\arccos\\left(-1\\right)');
    expect(result.exactLatex).not.toContain('\\operatorname{Roots}_{2}');
    expect(result.exactLatex).toContain('\\sqrt{\\arctan\\left(\\pi+2\\pi k\\right)+\\pi n}');
  });

  it('stops unsupported complex preimage shapes without falling through to real parameterized routes', () => {
    const cases = [
      String.raw`\tan\left(\sin\left(\frac{x-1}{x+2}\right)\right)=1+\imaginaryI`,
      String.raw`\sin\left(\sin\left(x^5\right)\right)=\imaginaryI`,
      String.raw`\sin\left(\sin\left(x+y\right)\right)=\imaginaryI`,
    ];

    for (const equationLatex of cases) {
      const result = runEquationMode({
        ...makeRequest(equationLatex),
        equationDomainIntent: 'complex',
      });

      expect(result.kind).toBe('error');
      if (result.kind !== 'error') {
        throw new Error(`Expected ${equationLatex} to stop`);
      }
      expect(result.error).toContain('supported guarded complex preimage families');
      expect(result.answerDomain).not.toBe('real');
    }

    const absLocus = runEquationMode({
      ...makeRequest(String.raw`\left|x\right|=2`),
      equationDomainIntent: 'complex',
    });
    expect(absLocus.kind).toBe('success');
    if (absLocus.kind !== 'success') {
      throw new Error('Expected complex absolute-value locus success');
    }
    expect(absLocus.exactLatex).toBe(String.raw`\left|x\right|=2`);
    expect(absLocus.answerDomain).toBe('complex');
    expect(absLocus.detailSections?.some((section) => section.title === 'Locus Meaning')).toBe(true);
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
    expect(real.exactLatex).toBe('x\\in\\left\\{\\frac{-4}{2}, \\frac{4}{2}\\right\\}');
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
    const exactBranches = exact.branchReadback?.branchesLatex.join(' ') ?? '';
    const polarBranches = polar.branchReadback?.branchesLatex.join(' ') ?? '';
    const cisBranches = cis.branchReadback?.branchesLatex.join(' ') ?? '';
    expect(exactBranches).not.toContain('\\operatorname{cis}');
    expect(exactBranches).not.toContain('\\cos\\left');
    expect(exactBranches).toContain('\\frac{\\sqrt{2+\\sqrt{2}}}{2}-\\frac{\\sqrt{2-\\sqrt{2}}}{2}i');
    expect(polarBranches).not.toContain('\\operatorname{cis}');
    expect(polarBranches).toContain('\\cos\\left(-\\frac{\\pi}{8}\\right)+i\\sin\\left(-\\frac{\\pi}{8}\\right)');
    expect(cisBranches).toContain('\\operatorname{cis}\\left(-\\frac{\\pi}{8}\\right)');
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

  it('uses bounded Complex formula routes for unfactorable cubic and quartic equations', () => {
    for (const equationLatex of ['x^3+8=5+x', 'x^4+x+1=0']) {
      const result = runEquationMode({
        ...makeRequest(equationLatex),
        equationDomainIntent: 'complex',
      });
      expect(result.kind).toBe('success');
      if (result.kind !== 'success') {
        throw new Error(`Expected ${equationLatex} to use bounded Complex formula solving`);
      }
      expect(result.answerDomain).toBe('complex');
      expect(JSON.stringify(result)).toContain('Complex');
      expect(JSON.stringify(result)).not.toContain('RootOf');
    }
  });

  it('keeps legacy Approximate and Isolate outside complex exact solving', () => {
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
    expect(approximate.error).toContain('Numeric Interval Solve needs a numeric interval');
    expect(isolate.answerDomain).not.toBe('complex');
  });
});
