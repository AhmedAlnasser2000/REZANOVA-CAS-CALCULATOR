import { describe, expect, it } from 'vitest';
import {
  runEquationMode,
} from '../equation';
import { makeRequest } from './test-support';

describe('Equation mode complex domain', () => {
  it('keeps Equation complex intent behavior-neutral until complex solving is enabled', () => {
    const real = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x+1=2',
      equationDomainIntent: 'real',
    });
    const complex = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x+1=2',
      equationDomainIntent: 'complex',
    });

    expect(complex).toEqual(real);
  });

  it('keeps Complex Off real-first for symbolic complex cases', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^2+2x+2=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'real',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected Complex Off to keep the real-first stop');
    }
    expect(result.answerDomain).toBeUndefined();
    expect(result.error).toContain('outside the supported exact symbolic solve families');
  });

  it('treats explicit imaginary input as Complex-only Equation intent', () => {
    const complexOff = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x+\\imaginaryI=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'real',
    });

    expect(complexOff.kind).toBe('error');
    if (complexOff.kind !== 'error') {
      throw new Error('Expected Complex Off guidance');
    }
    expect(complexOff.error).toContain('Enable Complex');
    expect(complexOff.detailSections?.some((section) => section.title === 'Complex Input')).toBe(true);
  });

  it('solves bounded symbolic quadratics over the complex domain when Complex is enabled', () => {
    const pureImaginary = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^2+1=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
    });
    const shifted = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^2+2x+2=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
    });

    expect(pureImaginary.kind).toBe('success');
    expect(shifted.kind).toBe('success');
    if (pureImaginary.kind !== 'success' || shifted.kind !== 'success') {
      throw new Error('Expected complex quadratic successes');
    }
    expect(pureImaginary.answerDomain).toBe('complex');
    expect(pureImaginary.exactLatex).toContain('-i');
    expect(pureImaginary.exactLatex).toContain('i');
    expect(shifted.answerDomain).toBe('complex');
    expect(shifted.exactLatex).toContain('-1-i');
    expect(shifted.exactLatex).toContain('-1+i');
    expect(shifted.detailSections?.some((section) => section.title === 'Complex Domain')).toBe(true);
  });

  it('solves simple selected-target powers with bounded complex branches when Complex is enabled', () => {
    const square = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'u^2=a',
      equationSolveTarget: 'u',
      equationDomainIntent: 'complex',
    });
    const cube = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'u^3=a',
      equationSolveTarget: 'u',
      equationDomainIntent: 'complex',
    });

    expect(square.kind).toBe('success');
    expect(cube.kind).toBe('success');
    if (square.kind !== 'success' || cube.kind !== 'success') {
      throw new Error('Expected complex power successes');
    }
    expect(square.answerDomain).toBe('complex');
    expect(square.exactLatex).toContain('-\\sqrt{a}');
    expect(square.exactLatex).toContain('\\sqrt{a}');
    expect(square.exactSupplementLatex ?? []).not.toContain('a\\ge0');
    expect(cube.answerDomain).toBe('complex');
    expect(cube.exactLatex).toContain('\\sqrt[3]{a}');
    expect(cube.exactLatex).toContain('\\sqrt{3}');
    expect(cube.exactLatex).toContain('i');

    const concreteCube = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^3+8=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
    });
    expect(concreteCube.kind).toBe('success');
    if (concreteCube.kind !== 'success') {
      throw new Error('Expected concrete complex cube success');
    }
    expect(concreteCube.exactLatex).toContain('-2');
    expect(concreteCube.exactLatex).toContain('1-\\sqrt{3}i');
    expect(concreteCube.exactLatex).toContain('1+\\sqrt{3}i');
    expect(concreteCube.exactLatex).not.toContain('\\right)\\left(');
  });

  it('rejects reserved-only equations without inventing a solve target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(\\pi\\right)=e',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('reserved');
  });

  it('keeps symbolic mode symbolic-only for complex cases', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^2+2x+2=0',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toBe('This equation is outside the supported exact symbolic solve families.');
    expect(result.runtimeAdvisories?.stopReason).toEqual({
      kind: 'unsupported-family',
      source: 'stage',
    });
    expect(result.runtimeAdvisories?.equationNumericSolve).toEqual({
      kind: 'suggest-on-error',
    });
  });

  it('keeps Complex On inequality answers on the real order line', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '2x+3\\le7',
      equationAnswerMode: 'exact',
      equationDomainIntent: 'complex',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected Complex On inequality success');
    }

    expect(result.exactLatex).toBe('x\\le2');
    expect(result.answerDomain).toBe('conditional-real');
    expect(result.solutionKind).toBe('inequality-solution-set');
    expect(result.exactSupplementLatex?.join(' ')).toContain(
      'Complex intent is enabled; ordered inequalities are solved over the real line.',
    );
  });
});
