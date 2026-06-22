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

  it('uses the selected exact form for high-degree special-form powers in Complex exact mode', () => {
    const rectangular = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^5=32',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
      complexExactForm: 'rectangular',
    });
    const polar = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^5=32',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
      complexExactForm: 'polar',
    });
    const cis = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^5=32',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
      complexExactForm: 'cis',
    });

    expect(rectangular.kind).toBe('success');
    expect(polar.kind).toBe('success');
    expect(cis.kind).toBe('success');
    if (rectangular.kind !== 'success' || polar.kind !== 'success' || cis.kind !== 'success') {
      throw new Error('Expected high-degree complex special-form success');
    }
    expect(rectangular.answerDomain).toBe('complex');
    expect(rectangular.exactLatex).not.toContain('\\operatorname{cis}');
    expect(rectangular.exactLatex).toContain('\\cos\\left(\\frac{2\\pi}{5}\\right)+i\\sin\\left(\\frac{2\\pi}{5}\\right)');
    expect(polar.exactLatex).not.toContain('\\operatorname{cis}');
    expect(polar.exactLatex).toContain('\\cos\\left(\\frac{2\\pi}{5}\\right)+i\\sin\\left(\\frac{2\\pi}{5}\\right)');
    expect(cis.exactLatex).toContain('\\operatorname{cis}\\left(\\frac{2\\pi}{5}\\right)');
    expect(rectangular.detailSections?.some((section) => section.title === 'Complex Special-Form Route')).toBe(true);
  });

  it('keeps symbolic high-degree powers deferred in Complex exact mode', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'u^5=a',
      equationSolveTarget: 'u',
      equationDomainIntent: 'complex',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected symbolic complex degree-five power to stay deferred');
    }
    expect(result.error).toContain('symbolic carrier coefficients are deferred');
  });

  it('solves exact-rational pure carrier special forms in Complex exact mode', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^6-5x^3+4=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected complex pure-carrier special-form success');
    }
    expect(result.answerDomain).toBe('complex');
    expect(result.exactLatex).not.toContain('\\operatorname{cis}');
    expect(result.exactLatex).toContain('\\cos\\left(\\frac{2\\pi}{3}\\right)+i\\sin\\left(\\frac{2\\pi}{3}\\right)');
    expect(result.detailSections?.some((section) =>
      section.lines.some((line) => line.includes('Total selected-target degree: 6')))).toBe(true);
  });

  it('solves exact-rational affine carrier special forms in Complex exact mode', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '(2*x-1)^{12}-5*(2*x-1)^6+4=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
      complexExactForm: 'cis',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected affine complex special-form success');
    }
    expect(result.answerDomain).toBe('complex');
    expect(result.exactLatex).toContain('\\operatorname{cis}');
    expect(result.detailSections?.some((section) =>
      section.lines.some((line) => line.includes('Total selected-target degree: 12')))).toBe(true);
  });

  it('keeps symbolic-coefficient special-form carrier roots deferred in Complex exact mode', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^6-a*x^3+b=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected symbolic-carrier complex boundary to stay unsupported');
    }
    expect(result.error).toContain('symbolic carrier coefficients are deferred');
  });

  it('caps Complex special-form branch readback at twelve visible branches', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '(x+a)^{13}=32',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected complex degree-thirteen boundary');
    }
    expect(result.error).toContain('capped at 12 visible branches');
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
