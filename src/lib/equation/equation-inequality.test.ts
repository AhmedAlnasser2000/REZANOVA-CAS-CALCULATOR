import { describe, expect, it } from 'vitest';
import { runEquationMode, type RunEquationModeRequest } from '../modes/equation';

const system2 = [
  [1, 1, 3],
  [2, -1, 0],
];

const system3 = [
  [1, 1, 1, 6],
  [2, -1, 1, 3],
  [1, 2, -1, 3],
];

function makeRequest(equationLatex: string): RunEquationModeRequest {
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

function solveInequality(
  equationLatex: string,
  overrides: Partial<ReturnType<typeof makeRequest>> = {},
) {
  const result = runEquationMode({
    ...makeRequest(equationLatex),
    ...overrides,
  });
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected ${equationLatex} to solve as an inequality`);
  }
  expect(result.answerDomain).toBe('conditional-real');
  expect(result.solutionKind).toBe('inequality-solution-set');
  return result;
}

describe('equation inequality route', () => {
  it('solves quadratic sign-chart families with open and closed interval unions', () => {
    expect(solveInequality('x^2-4<0').exactLatex).toBe('-2<x<2');
    expect(solveInequality('x^2-4\\le0').exactLatex).toBe('-2\\le x\\le 2');
    expect(solveInequality('x^2-4>0').exactLatex).toBe('x<-2\\;\\cup\\;x>2');
    expect(solveInequality('x^2-4\\ge0').exactLatex).toBe('x\\le-2\\;\\cup\\;x\\ge2');
    expect(solveInequality('-x^2+4\\ge0').exactLatex).toBe('-2\\le x\\le 2');
  });

  it('handles repeated roots and constant true or false reductions', () => {
    expect(solveInequality('(x-1)^2\\le0').exactLatex).toBe('x=1');
    expect(solveInequality('(x-1)^2>0').exactLatex).toBe('x<1\\;\\cup\\;x>1');
    expect(solveInequality('x^2+1<0').exactLatex).toBe('x\\in\\varnothing');
    expect(solveInequality('x^2+1\\ge0').exactLatex).toBe('x\\in\\mathbb{R}');
  });

  it('keeps exact symbolic bound labels for irrational roots', () => {
    expect(solveInequality('x^2-2\\le0').exactLatex).toBe('-\\sqrt{2}\\le x\\le \\sqrt{2}');
  });

  it('solves factorable rational inequalities with denominator exclusions', () => {
    const first = solveInequality('\\frac{x-1}{x+2}>0');
    expect(first.exactLatex).toBe('x<-2\\;\\cup\\;x>1');
    expect(first.exactSupplementLatex).toContain('x\\ne-2');
    expect(first.detailSections?.flatMap((section) => section.lines).join(' ')).not.toContain('x\\ne-2');

    const second = solveInequality('\\frac{x^2-4}{x-3}\\le0');
    expect(second.exactLatex).toBe('x\\le-2\\;\\cup\\;2\\le x<3');
    expect(second.exactSupplementLatex).toContain('x\\ne3');
  });

  it('solves finite rational preimages through absolute value, radical, and logarithm wrappers', () => {
    const absolute = solveInequality('\\left|\\frac{x-1}{x+2}\\right|<3');
    expect(absolute.exactLatex).toBe('x<\\frac{-7}{2}\\;\\cup\\;x>\\frac{-5}{4}');
    expect(absolute.exactSupplementLatex).toContain('x\\ne-2');

    const radical = solveInequality('\\sqrt{\\frac{x-1}{x+2}}\\le2');
    expect(radical.exactLatex).toBe('x\\le-3\\;\\cup\\;x\\ge1');
    expect(radical.exactSupplementLatex).toContain('x\\ne-2');
    expect(radical.exactSupplementLatex).toContain('\\frac{x-1}{x+2}\\ge0');

    const logarithm = solveInequality('\\ln\\left(\\frac{x-1}{x+2}\\right)<4');
    expect(logarithm.exactLatex).toBe('x<\\frac{1+2e^{4}}{1-e^{4}}\\;\\cup\\;x>1');
    expect(logarithm.exactSupplementLatex).toContain('x\\ne-2');
    expect(logarithm.exactSupplementLatex).toContain('\\frac{x-1}{x+2}>0');
  });

  it('solves textbook absolute-value inequalities', () => {
    expect(solveInequality('\\left|x-2\\right|<3').exactLatex).toBe('-1<x<5');
    expect(solveInequality('\\left|2x+1\\right|\\ge5').exactLatex).toBe('x\\le-3\\;\\cup\\;x\\ge2');
    expect(solveInequality('\\left|x^2-1\\right|<2').exactLatex).toBe('-\\sqrt{3}<x<\\sqrt{3}');
  });

  it('solves guarded radical inequalities with explicit domain handling', () => {
    expect(solveInequality('\\sqrt{x-1}\\ge2').exactLatex).toBe('x\\ge5');
    expect(solveInequality('\\sqrt{x^2-1}\\le3').exactLatex).toBe('-\\sqrt{10}\\le x\\le -1\\;\\cup\\;1\\le x\\le \\sqrt{10}');
    expect(solveInequality('\\sqrt{x-1}\\ge2').exactSupplementLatex).toContain('x-1\\ge0');
  });

  it('solves monotone log and exp inequalities', () => {
    expect(solveInequality('\\ln(x-2)<4').exactLatex).toBe('2<x<2+e^{4}');
    expect(solveInequality('e^x\\ge5').exactLatex).toBe('x\\ge\\ln(5)');
    expect(solveInequality('\\ln(x-2)<4').exactSupplementLatex).toContain('x-2>0');
  });

  it('peels simple target-free shells before guarded log inequality solving', () => {
    const additive = solveInequality('\\ln(x)-5<4');
    expect(additive.exactLatex).toBe('0<x<e^{9}');
    expect(additive.detailSections?.flatMap((section) => section.lines).join(' '))
      .toContain('Moved a target-free additive shell');

    const positiveScale = solveInequality('\\frac{\\ln(x)}{5}<4');
    expect(positiveScale.exactLatex).toBe('0<x<e^{20}');
    expect(positiveScale.detailSections?.flatMap((section) => section.lines).join(' '))
      .toContain('Scaled both sides by a positive target-free factor');

    const negativeScale = solveInequality('-2\\ln(x)<4');
    expect(negativeScale.exactLatex).toBe('x>e^{-2}');
    expect(negativeScale.detailSections?.flatMap((section) => section.lines).join(' '))
      .toContain('flipped the inequality direction');
  });

  it('solves direct affine trig inequalities as periodic families', () => {
    expect(solveInequality('\\sin(x)>\\frac{1}{2}').exactLatex).toContain('30^{\\circ}');
    expect(solveInequality('\\sin(x)>\\frac{1}{2}').exactLatex).toContain('360^{\\circ}');
    expect(solveInequality('\\cos(2x)\\le0').exactLatex).toContain('45^{\\circ}');
    const tangent = solveInequality('\\tan(x)>1');
    expect(tangent.exactLatex).toContain('45^{\\circ}');
    expect(tangent.exactSupplementLatex?.join(' ')).toContain('x\\ne90^{\\circ}');
  });

  it('solves guarded finite compositions through four supported layers', () => {
    expect(solveInequality('\\sqrt{\\left|x^2-4\\right|}\\le3').exactLatex)
      .toBe('-\\sqrt{13}\\le x\\le \\sqrt{13}');

    const logRadical = solveInequality('\\ln(\\sqrt{x^2-1})<4');
    expect(logRadical.exactLatex).toBe('-\\sqrt{1+e^{8}}<x<-1\\;\\cup\\;1<x<\\sqrt{1+e^{8}}');
    expect(logRadical.exactSupplementLatex).toContain('x^2-1\\ge0');
    expect(logRadical.exactSupplementLatex).toContain('\\sqrt{x^2-1}>0');

    expect(solveInequality('\\left|\\ln(x-1)\\right|<2').exactLatex)
      .toBe('1+e^{-2}<x<1+e^{2}');

    const fourLayer = solveInequality('\\sqrt{\\left|\\ln(\\sqrt{x^2-1})\\right|}\\le2');
    expect(fourLayer.exactLatex).toContain('\\sqrt{1+e^{8}}');
    expect(fourLayer.exactSupplementLatex).toContain('\\sqrt{x^2-1}>0');
  });

  it('solves abs-affine periodic preimages as x-family readback', () => {
    const sine = solveInequality('\\sin\\left(\\left|x-4\\right|\\right)>\\frac{1}{2}', { angleUnit: 'rad' });
    expect(sine.exactLatex).not.toContain('\\vert x-4\\vert');
    expect(sine.exactLatex).toContain('4+\\frac{\\pi}{6}+2n\\pi');
    expect(sine.exactLatex).toContain('4-\\frac{5\\pi}{6}-2n\\pi');
    expect(sine.exactSupplementLatex).toContain('\\text{Branch index } n\\in\\mathbb{Z}_{\\ge0}');
    expect(sine.exactSupplementLatex?.join(' ')).not.toContain('\\vert x-4\\vert');
    expect(sine.detailSections?.flatMap((section) => section.lines).join(' '))
      .toContain('flattened the periodic preimage back to x');

    const cosine = solveInequality('\\cos\\left(\\left|2x+1\\right|\\right)\\le0', { angleUnit: 'rad' });
    expect(cosine.exactLatex).not.toContain('\\vert2x+1\\vert');
    expect(cosine.exactLatex).toContain('\\frac{\\frac{\\pi}{2}-1}{2}+n\\pi');
    expect(cosine.exactLatex).toContain('\\frac{-\\frac{3\\pi}{2}-1}{2}-n\\pi');
    expect(cosine.exactSupplementLatex?.join(' ')).not.toContain('\\vert2x+1\\vert');

    const tangent = solveInequality('\\tan\\left(\\left|x-4\\right|\\right)>1', { angleUnit: 'rad' });
    expect(tangent.exactLatex).not.toContain('\\vert x-4\\vert');
    expect(tangent.exactLatex).toContain('4+\\frac{\\pi}{4}+n\\pi');
    expect(tangent.exactLatex).toContain('4-\\frac{\\pi}{2}-n\\pi');
    expect(tangent.exactSupplementLatex?.join(' ')).toContain('x\\ne4+\\frac{\\pi}{2}+n\\pi');
    expect(tangent.exactSupplementLatex?.join(' ')).not.toContain('\\vert x-4\\vert');
  });

  it('respects output style for abs-affine periodic threshold readback', () => {
    const exact = solveInequality('\\tan\\left(\\left|5x-4\\right|\\right)>\\frac{1}{2}', {
      angleUnit: 'rad',
      outputStyle: 'exact',
    });
    expect(exact.exactLatex).toContain('\\frac{4+\\arctan\\left(\\frac{1}{2}\\right)}{5}+\\frac{n\\pi}{5}');
    expect(exact.exactLatex).not.toContain('0.463648');

    const decimal = solveInequality('\\tan\\left(\\left|5x-4\\right|\\right)>\\frac{1}{2}', {
      angleUnit: 'rad',
      outputStyle: 'decimal',
    });
    expect(decimal.exactLatex).toContain('\\frac{4+0.463648}{5}+\\frac{n\\pi}{5}');
    expect(decimal.exactLatex).not.toContain('\\arctan');

    const both = solveInequality('\\tan\\left(\\left|5x-4\\right|\\right)>\\frac{1}{2}', {
      angleUnit: 'rad',
      outputStyle: 'both',
    });
    expect(both.exactLatex).toContain('\\arctan\\left(\\frac{1}{2}\\right)');
    expect(both.approxText).toContain('0.463648');
  });

  it('peels numeric shells before abs-affine periodic preimage routing', () => {
    const result = solveInequality('\\frac{\\tan\\left(\\left|x-4\\right|\\right)}{4}-55\\le4', {
      angleUnit: 'rad',
    });
    expect(result.exactLatex).not.toContain('\\vert x-4\\vert');
    expect(result.exactLatex).toContain('\\arctan\\left(236\\right)');
    expect(result.exactLatex).toContain('4+\\frac{\\pi}{2}+n\\pi<x<4+\\pi+n\\pi');
    expect(result.approxText).toContain('1.566559');
    expect(result.detailSections?.flatMap((section) => section.lines).join(' '))
      .toContain('Scaled both sides by a positive target-free factor');
    expect(result.exactSupplementLatex?.join(' ')).toContain('x\\ne4+\\frac{\\pi}{2}+n\\pi');
  });

  it('solves representable two-layer trigonometric inequalities', () => {
    const sinCos = solveInequality('\\sin(\\cos(x))>\\frac{1}{2}', { angleUnit: 'rad' });
    expect(sinCos.exactLatex).toContain('2k\\pi');
    expect(sinCos.detailSections?.flatMap((section) => section.lines).join(' '))
      .toContain('two-layer sin/cos');

    const cosSin = solveInequality('\\cos(2\\sin(x))\\le0', { angleUnit: 'rad' });
    expect(cosSin.exactLatex).toContain('0.903339');
    expect(cosSin.exactLatex).toContain('4.044932');

    const tanSin = solveInequality('\\tan(\\sin(x))>1', { angleUnit: 'rad' });
    expect(tanSin.exactLatex).toContain('0.903339');
    expect(tanSin.exactSupplementLatex?.join(' ')).toContain('\\text{Period: } 2\\pi');

    const safeInnerTan = solveInequality('\\sin(\\tan(x))<2', { angleUnit: 'rad' });
    expect(safeInnerTan.exactLatex).toBe('x\\in\\mathbb{R}');
    expect(safeInnerTan.exactSupplementLatex?.join(' ')).toContain('x\\ne\\frac{\\pi}{2}');
  });

  it('rejects unsupported inequality families with controlled guidance', () => {
    for (const equationLatex of [
      'x+y<1',
      'x^5>0',
      '\\sin(x^2)>0',
      '\\sin(\\tan(x))<\\frac{1}{2}',
      '\\sin\\left(\\frac{x-1}{x+2}\\right)>\\frac{1}{2}',
      '\\tan\\left(\\left|\\frac{x-1}{x+2}\\right|\\right)>1',
      '\\sin\\left(\\left|x^2-4\\right|\\right)>\\frac{1}{2}',
      '\\tan\\left(\\sqrt{\\ln\\left(\\frac{1}{x^2}\\right)}\\right)\\le1',
    ]) {
      const result = runEquationMode(makeRequest(equationLatex));
      expect(result.kind).toBe('error');
      if (result.kind !== 'error') {
        throw new Error(`Expected ${equationLatex} to stay unsupported`);
      }
      expect(result.error).toContain('outside the supported guarded real inequality families');
    }
  });

  it('keeps Approximate and Isolate outside inequality solving', () => {
    const approximate = runEquationMode({
      ...makeRequest('x^2-4<0'),
      equationAnswerMode: 'approximate',
    });
    const isolate = runEquationMode({
      ...makeRequest('x^2-4<0'),
      equationAnswerMode: 'isolate',
    });

    expect(approximate.kind).toBe('error');
    expect(isolate.kind).toBe('error');
    if (approximate.kind !== 'error' || isolate.kind !== 'error') {
      throw new Error('Expected inequality answer-mode guidance');
    }
    expect(approximate.error).toContain('Approximate answer mode does not solve inequalities');
    expect(isolate.error).toContain('Isolate answer mode does not solve inequalities');
  });

  it('keeps ordered inequalities on the real line when Complex is enabled', () => {
    const result = runEquationMode({
      ...makeRequest('-2x+5\\ge-1'),
      equationDomainIntent: 'complex',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected Complex On inequality success');
    }
    expect(result.exactLatex).toBe('x\\le3');
    expect(result.exactSupplementLatex?.join(' ')).toContain(
      'Complex intent is enabled; ordered inequalities are solved over the real line.',
    );
  });
});
