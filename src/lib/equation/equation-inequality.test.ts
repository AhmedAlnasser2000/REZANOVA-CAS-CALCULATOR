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

function solveInequality(equationLatex: string) {
  const result = runEquationMode(makeRequest(equationLatex));
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

  it('rejects unsupported inequality families with controlled guidance', () => {
    for (const equationLatex of ['\\frac{1}{x}>0', 'x+y<1', '\\sin(x)>0', 'x^5>0']) {
      const result = runEquationMode(makeRequest(equationLatex));
      expect(result.kind).toBe('error');
      if (result.kind !== 'error') {
        throw new Error(`Expected ${equationLatex} to stay unsupported`);
      }
      expect(result.error).toContain('outside the bounded Equation polynomial inequality family');
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
    expect(result.detailSections?.flatMap((section) => section.lines).join(' ')).toContain(
      'Complex intent is enabled, but ordered inequalities are solved over the real line.',
    );
  });
});
