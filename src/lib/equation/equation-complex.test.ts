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

function solveComplex(equationLatex: string) {
  const result = runEquationMode({
    ...makeRequest(equationLatex),
    equationDomainIntent: 'complex',
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

  it('solves mixed factorable polynomial equations with real and complex branches', () => {
    const result = solveComplex('(x-1)(x^2+1)=0');

    expect(result.exactLatex).toContain('1');
    expect(result.exactLatex).toContain('-i');
    expect(result.exactLatex).toContain('i');
    expect(result.detailSections?.some((section) => section.title === 'Complex Polynomial Route')).toBe(true);
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
