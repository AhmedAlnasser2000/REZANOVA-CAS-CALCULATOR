import { describe, expect, it } from 'vitest';
import {
  runEquationMode,
} from '../equation';
import { makeRequest } from './test-support';

describe('Equation mode parameterized families', () => {
  it('solves affine multi-symbol equations for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x+z=5',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('z=5-x');
    expect(result.approxText).toBeUndefined();
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.detailSections?.[0]?.title).toBe('Solve Target');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Selected target: z');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Symbolic parameters: x');
  });

  it('adds nonzero parameter facts for symbolic linear coefficients', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'a z+b=c',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('z=\\frac{c-b}{a}');
    expect(result.exactSupplementLatex).toEqual(['a\\ne0']);
  });

  it('solves quadratic multi-symbol equations for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'z^2+x z+1=0',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('x^2-4');
    expect(result.exactSupplementLatex).toEqual(['x^2-4\\ge0']);
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Selected target: z');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Symbolic parameters: x');
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('solves rational multi-symbol equations for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{z-a}=b',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('z=\\frac{ab+1}{b}');
    expect(result.exactSupplementLatex).toEqual(['z-a\\ne0', 'b\\ne0']);
    expect(result.detailSections?.some((section) => section.title === 'Parameterized Rational Solve')).toBe(true);
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('solves nested rational multi-symbol equations for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\frac{1}{1+\\frac{1}{z-a}}=b',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('z=\\frac{-(ab)+a+b}{1-b}');
    expect(result.exactSupplementLatex).toContain('z-a\\ne0');
    expect(result.exactSupplementLatex).toContain('-a+z+1\\ne0');
    expect(result.exactSupplementLatex).toContain('1-b\\ne0');
    expect(result.detailSections?.some((section) => section.title === 'Parameterized Rational Solve')).toBe(true);
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('solves factorable polynomial multi-symbol equations for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '(z-a)(z-b)(z-c)=0',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('z\\in\\left\\{a,\\ b,\\ c\\right\\}');
    expect(result.detailSections?.some((section) =>
      section.title === 'Parameterized Factorable Polynomial Solve')).toBe(true);
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('solves widened real affine power families for the selected target', () => {
    const odd = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '(x+a)^5=b',
      equationSolveTarget: 'x',
      equationDomainIntent: 'real',
    });
    const even = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '(x+a)^{12}=b',
      equationSolveTarget: 'x',
      equationDomainIntent: 'real',
    });

    expect(odd.kind).toBe('success');
    expect(even.kind).toBe('success');
    if (odd.kind !== 'success' || even.kind !== 'success') {
      throw new Error('Expected affine power successes');
    }
    expect(odd.exactLatex).toBe('x=\\sqrt[5]{b}-a');
    expect(even.exactLatex).toContain('\\sqrt[12]{b}-a');
    expect(even.exactLatex).toContain('-a-\\sqrt[12]{b}');
    expect(even.exactSupplementLatex).toEqual(['b\\ge0']);
    expect(odd.detailSections?.some((section) => section.title === 'Algebraic Isolation')).toBe(true);
    expect(even.detailSections?.some((section) => section.title === 'Algebraic Isolation')).toBe(true);
  });

  it('routes single-target pure-power carrier quadratics through special-form roots', () => {
    const degreeSix = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^6-5x^3+4=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'real',
    });
    const degreeTwelve = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^{12}-5x^6+4=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'real',
    });

    expect(degreeSix.kind).toBe('success');
    expect(degreeTwelve.kind).toBe('success');
    if (degreeSix.kind !== 'success' || degreeTwelve.kind !== 'success') {
      throw new Error('Expected special-form root successes');
    }
    expect(degreeSix.exactLatex).toContain('\\sqrt[3]{4}');
    expect(degreeSix.exactLatex).toContain('1');
    expect(degreeSix.detailSections?.some((section) => section.title === 'Special-Form Root Solve')).toBe(true);
    expect(degreeTwelve.exactLatex).toContain('-\\sqrt[6]{4}');
    expect(degreeTwelve.exactLatex).toContain('\\sqrt[6]{4}');
    expect(degreeTwelve.exactLatex).toContain('-1');
    expect(degreeTwelve.exactLatex).toContain('1');
    expect(degreeTwelve.detailSections?.some((section) => section.title === 'Special-Form Root Solve')).toBe(true);
  });

  it('solves nonperiodic carrier equations for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\left|z-a\\right|=b',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('a+b');
    expect(result.exactLatex).toContain('a-b');
    expect(result.exactSupplementLatex).toEqual(['b\\ge0']);
    expect(result.detailSections?.some((section) => section.title === 'Parameterized Carrier Solve')).toBe(true);
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('solves exp-log multi-symbol equations for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\ln\\left(z+a\\right)=b',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('z=e^{b}-a');
    expect(result.exactSupplementLatex).toEqual(['a+z>0']);
    expect(result.detailSections?.some((section) => section.title === 'Parameterized Exp/Log Solve')).toBe(true);
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('solves symbolic-base exp-log equations for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'a^z=b',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('z=\\log_{a}(b)');
    expect(result.exactSupplementLatex).toEqual(['a>0', 'a\\ne1', 'b>0']);
    expect(result.detailSections?.some((section) => section.title === 'Parameterized Exp/Log Solve')).toBe(true);
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('solves direct affine trig multi-symbol equations for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(z\\right)=a',
      equationSolveTarget: 'z',
      angleUnit: 'rad',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('\\arcsin(a)');
    expect(result.exactLatex).toContain('2\\pi n');
    expect(result.branchReadback).toMatchObject({
      targetLatex: 'z',
      relationLatex: '\\in',
      source: 'equation-parameterized-trig',
    });
    expect(result.branchReadback?.branchesLatex).toHaveLength(2);
    expect(result.exactSupplementLatex).toEqual(['-1\\le a\\le1', 'n\\in\\mathbb{Z}']);
    expect(result.detailSections?.some((section) => section.title === 'Parameterized Trig Solve')).toBe(true);
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('solves mixed sine/cosine identities for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'A\\sin\\left(z\\right)+B\\cos\\left(z\\right)=C',
      equationSolveTarget: 'z',
      angleUnit: 'rad',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('\\operatorname{atan2}\\left(B,A\\right)');
    expect(result.branchReadback).toMatchObject({
      targetLatex: 'z',
      relationLatex: '\\in',
      source: 'equation-parameterized-trig',
    });
    expect(result.branchReadback?.branchesLatex.join(' ')).toContain('\\operatorname{atan2}\\left(B,A\\right)');
    expect(result.exactSupplementLatex).toContain('A^2+B^2>0');
    expect(result.detailSections?.some((section) =>
      section.title === 'Parameterized Mixed Trig Solve')).toBe(true);
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('solves one-layer composition handoffs for the selected target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(z^2+a\\right)=b',
      equationSolveTarget: 'z',
      angleUnit: 'rad',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('\\arcsin(b)');
    expect(result.exactSupplementLatex).toContain('-1\\le b\\le1');
    expect(result.exactSupplementLatex).toContain('n\\in\\mathbb{Z}');
    expect(result.detailSections?.some((section) =>
      section.title === 'Parameterized Composition Handoff')).toBe(true);
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('solves two-layer periodic/composition carrier families after target selection', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(\\left|z-a\\right|\\right)=b',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('\\arcsin(b)');
    expect(result.exactSupplementLatex).toContain('-1\\le b\\le1');
    expect(result.exactSupplementLatex).toContain('n\\in\\mathbb{Z}');
    expect(result.detailSections?.some((section) =>
      section.title === 'Parameterized Composition Handoff')).toBe(true);
  });

  it('solves nested algebraic composition when it reduces to power isolation', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sqrt{\\sqrt{x^3+a}}=b',
      equationSolveTarget: 'x',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x=\\sqrt[3]');
    expect(result.exactLatex).toContain('b^4-a');
    expect(result.exactSupplementLatex).toContain('b\\ge0');
    expect(result.detailSections?.some((section) =>
      section.title === 'Parameterized Composition Handoff')).toBe(true);
  });

  it('solves algebraic mixed-carrier equations for the selected target', () => {
    const rootCompanion = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sqrt{z+a}+z=b',
      equationSolveTarget: 'z',
    });
    const twoCarriers = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sqrt{z+a}+\\sqrt{z+b}=c',
      equationSolveTarget: 'z',
    });

    expect(rootCompanion.kind).toBe('success');
    expect(twoCarriers.kind).toBe('success');
    if (rootCompanion.kind !== 'success' || twoCarriers.kind !== 'success') {
      throw new Error('Expected success outcomes');
    }
    expect(rootCompanion.exactLatex).toContain('z\\in');
    expect(rootCompanion.exactSupplementLatex).toContain('b-z\\ge0');
    expect(rootCompanion.detailSections?.some((section) =>
      section.title === 'Parameterized Mixed Algebraic Solve')).toBe(true);
    expect(twoCarriers.exactLatex).toContain('z=');
    expect(twoCarriers.exactSupplementLatex?.join(' ')).toContain('c-\\sqrt{b+z}\\ge0');
    expect(twoCarriers.detailSections?.some((section) =>
      section.title === 'Parameterized Mixed Algebraic Solve')).toBe(true);
  });

  it('keeps depth-three composition carrier families controlled after target selection', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(\\sqrt{\\left|z-a\\right|}\\right)=b',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toBe('This equation needs a deeper composition pass.');
    expect(result.detailSections?.some((section) => section.title === 'Why It Stopped')).toBe(true);
    expect(result.detailSections?.some((section) =>
      section.lines.some((line) => line.includes('more composition layers')))).toBe(true);
    expect(`${result.error} ${result.detailSections?.flatMap((section) => section.lines).join(' ')}`).not.toMatch(/(?:EQUATION-)?PARAM\d|milestone/i);
  });

  it('solves selected-target cubic power families after target selection', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'z^3+a=0',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('z=\\sqrt[3]{-a}');
    expect(result.detailSections?.some((section) => section.title === 'Algebraic Isolation')).toBe(true);
    expect(result.runtimeAdvisories?.equationNumericSolve).toEqual({ kind: 'manual-only' });
  });

  it('solves selected-target cube-root isolation after shell isolation', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '34x^3-z^2=25',
      equationSolveTarget: 'x',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x=\\sqrt[3]');
    expect(result.exactLatex).toContain('z^2');
    expect(result.detailSections?.some((section) => section.title === 'Algebraic Isolation')).toBe(true);
    expect(result.resultOrigin).toBe('symbolic');
  });

  it('reports real range failures without milestone wording after target selection', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(\\cos\\left(z^2+x\\right)\\right)=5',
      equationSolveTarget: 'z',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    const text = `${result.error} ${result.detailSections?.flatMap((section) => section.lines).join(' ')}`;
    expect(result.error).toBe('No real solution remains for the selected target.');
    expect(text).toContain('Sine and cosine outputs must stay between -1 and 1');
    expect(text).not.toMatch(/(?:EQUATION-)?PARAM\d|milestone/i);
  });

  it('explains mixed carriers and multiple target islands while solving raw adjacent products as multiplication', () => {
    const mixed = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin(z)+\\sqrt{z}=a',
      equationSolveTarget: 'z',
    });
    const outside = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'z+\\sin\\left(z^2\\right)=a',
      equationSolveTarget: 'z',
    });
    const ambiguous = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'az=1',
      equationSolveTarget: 'z',
    });

    expect(mixed.kind).toBe('error');
    expect(outside.kind).toBe('error');
    expect(ambiguous.kind).toBe('success');
    if (mixed.kind !== 'error' || outside.kind !== 'error' || ambiguous.kind !== 'success') {
      throw new Error('Expected mixed/outside errors and adjacent-product success');
    }
    expect(mixed.error).toBe('This equation mixes independent selected-target carriers.');
    expect(outside.error).toBe('This equation has more than one selected-target island.');
    expect(ambiguous.exactLatex).toBe('z=\\frac{1}{a}');
    const text = [
      mixed.error,
      outside.error,
      ...(mixed.detailSections ?? []).flatMap((section) => section.lines),
      ...(outside.detailSections ?? []).flatMap((section) => section.lines),
    ].join(' ');
    expect(text).not.toMatch(/(?:EQUATION-)?PARAM\d|milestone/i);
  });
});
