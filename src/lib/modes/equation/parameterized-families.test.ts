import { describe, expect, it } from 'vitest';
import {
  runEquationMode,
  runEquationModeForIsolatedWorker,
} from '../equation';
import { buildDisplayBlocks } from '../../display/result/display-blocks';
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

  it('routes algebraic carrier quadratics through carrier elimination', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '(x^2+a)^2-5(x^2+a)+4=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'real',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a carrier-elimination success outcome');
    }
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('\\sqrt');
    expect(result.exactSupplementLatex).toEqual(['16-4a\\ge0', '4-4a\\ge0']);
    expect(result.detailSections?.some((section) => section.title === 'Carrier Elimination Solve')).toBe(true);
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

  it('solves Real square-root cubic formula handoff through Equation mode case math', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sqrt{z^3+z+1}=b',
      equationSolveTarget: 'z',
      equationDomainIntent: 'real',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.answerDomain).toBe('real');
    expect(result.exactLatex).toContain('z\\in\\begin{cases}');
    expect(result.exactSupplementLatex).toContain('b\\ge0');
    expect(result.detailSections?.some((section) => section.title === 'Real Cardano Cases')).toBe(true);
    expect(buildDisplayBlocks(result).find((block) => block.id === 'answer')?.renderKind).toBe('caseMath');
  });

  it('solves Real square-root rational formula handoffs through Equation mode case math', () => {
    const solve = (equationLatex: string) => runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex,
      equationSolveTarget: 'z',
      equationDomainIntent: 'real',
    });
    const cubic = solve('\\sqrt{\\frac{z^3+z+1}{z-m}}=b');
    const cubicSlash = solve('\\sqrt{(z^3+z+1)/(z-m)}=b');
    const quartic = solve('\\sqrt{\\frac{z^4+z+1}{z-m}}=b');
    const quarticSlash = solve('\\sqrt{(z^4+z+1)/(z-m)}=b');

    expect(cubic.kind).toBe('success');
    expect(cubicSlash.kind).toBe('success');
    expect(quartic.kind).toBe('success');
    expect(quarticSlash.kind).toBe('success');
    if (
      cubic.kind !== 'success'
      || cubicSlash.kind !== 'success'
      || quartic.kind !== 'success'
      || quarticSlash.kind !== 'success'
    ) {
      throw new Error('Expected cubic and quartic rational square-root handoffs to solve');
    }
    expect(cubic.answerDomain).toBe('real');
    expect(cubicSlash.answerDomain).toBe('real');
    expect(quartic.answerDomain).toBe('real');
    expect(quarticSlash.answerDomain).toBe('real');
    for (const result of [cubic, cubicSlash, quartic, quarticSlash]) {
      expect(result.exactSupplementLatex).toContain('b\\ge0');
      expect(result.exactSupplementLatex).toContain('z-m\\ne0');
    }
    expect(cubic.detailSections?.some((section) => section.title === 'Real Cardano Cases')).toBe(true);
    expect(cubicSlash.detailSections?.some((section) => section.title === 'Real Cardano Cases')).toBe(true);
    expect(quartic.detailSections?.some((section) => section.title === 'Real Ferrari Cases')).toBe(true);
    expect(quarticSlash.detailSections?.some((section) => section.title === 'Real Ferrari Cases')).toBe(true);
    expect(buildDisplayBlocks(cubic).find((block) => block.id === 'answer')?.renderKind).toBe('caseMath');
    expect(buildDisplayBlocks(cubicSlash).find((block) => block.id === 'answer')?.renderKind).toBe('caseMath');
    expect(buildDisplayBlocks(quartic).find((block) => block.id === 'answer')?.renderKind).toBe('caseMath');
    expect(buildDisplayBlocks(quarticSlash).find((block) => block.id === 'answer')?.renderKind).toBe('caseMath');
  });

  it('solves Real absolute-value formula handoffs through grouped Equation mode case math', () => {
    const solve = (equationLatex: string, target = 'z') => runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex,
      equationSolveTarget: target,
      equationDomainIntent: 'real',
    });
    const cubic = solve('\\left|z^3+z+1\\right|=b');
    const quartic = solve('\\left|z^4+z+1\\right|=b');
    const nonX = solve('\\left|y^3+y+1\\right|=b', 'y');

    expect(cubic.kind).toBe('success');
    expect(quartic.kind).toBe('success');
    expect(nonX.kind).toBe('success');
    if (cubic.kind !== 'success' || quartic.kind !== 'success' || nonX.kind !== 'success') {
      throw new Error('Expected grouped absolute-value formula handoffs to solve');
    }
    for (const result of [cubic, quartic, nonX]) {
      expect(result.answerDomain).toBe('real');
      expect(result.exactSupplementLatex).toContain('b\\ge0');
      expect(result.detailSections?.some((section) => section.title === 'Absolute-Value Formula Cases')).toBe(true);
      const answer = buildDisplayBlocks(result).find((block) => block.id === 'answer');
      expect(answer?.renderKind).toBe('caseMath');
      expect(answer?.lines?.some((line) => line.groupLatex?.endsWith('=b'))).toBe(true);
      expect(answer?.lines?.some((line) => line.groupLatex?.endsWith('=-b'))).toBe(true);
    }
    expect(cubic.detailSections?.some((section) => section.title === 'Abs Branch 1 - Substituted Real Cardano Values')).toBe(true);
    expect(quartic.detailSections?.some((section) => section.title === 'Abs Branch 1 - Substituted Real Ferrari Values')).toBe(true);
    expect(nonX.exactLatex).toContain('y\\in\\begin{cases}');
  });

  it('preserves denominator exclusions for Real absolute-value rational formula handoffs', () => {
    const solve = (equationLatex: string) => runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex,
      equationSolveTarget: 'z',
      equationDomainIntent: 'real',
    });
    const cubic = solve('\\left|\\frac{z^3+z+1}{z-m}\\right|=b');
    const cubicSlash = solve('\\left|(z^3+z+1)/(z-m)\\right|=b');
    const quartic = solve('\\left|\\frac{z^4+z+1}{z-m}\\right|=b');
    const quarticSlash = solve('\\left|(z^4+z+1)/(z-m)\\right|=b');

    expect(cubic.kind).toBe('success');
    expect(cubicSlash.kind).toBe('success');
    expect(quartic.kind).toBe('success');
    expect(quarticSlash.kind).toBe('success');
    if (
      cubic.kind !== 'success'
      || cubicSlash.kind !== 'success'
      || quartic.kind !== 'success'
      || quarticSlash.kind !== 'success'
    ) {
      throw new Error('Expected cubic and quartic rational absolute-value handoffs to solve');
    }
    for (const result of [cubic, cubicSlash, quartic, quarticSlash]) {
      expect(result.exactSupplementLatex).toContain('b\\ge0');
      expect(result.exactSupplementLatex).toContain('z-m\\ne0');
      expect(result.detailSections?.some((section) => section.title === 'Absolute-Value Formula Cases')).toBe(true);
      expect(buildDisplayBlocks(result).find((block) => block.id === 'answer')?.renderKind).toBe('caseMath');
    }
  });

  it('solves Real square-power formula handoffs through grouped Equation mode case math', () => {
    const solve = (equationLatex: string, target = 'z') => runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex,
      equationSolveTarget: target,
      equationDomainIntent: 'real',
    });
    const cubic = solve('\\left(z^3+z+1\\right)^2=b');
    const quartic = solve('\\left(z^4+z+1\\right)^2=b');
    const nonX = solve('\\left(y^3+y+1\\right)^2=b', 'y');
    const expressionRhs = solve('\\left(z^3+z+1\\right)^2=a+c');

    expect(cubic.kind).toBe('success');
    expect(quartic.kind).toBe('success');
    expect(nonX.kind).toBe('success');
    expect(expressionRhs.kind).toBe('success');
    if (
      cubic.kind !== 'success'
      || quartic.kind !== 'success'
      || nonX.kind !== 'success'
      || expressionRhs.kind !== 'success'
    ) {
      throw new Error('Expected grouped square-power formula handoffs to solve');
    }
    for (const result of [cubic, quartic, nonX]) {
      expect(result.answerDomain).toBe('real');
      expect(result.exactSupplementLatex).toContain('b\\ge0');
      expect(result.detailSections?.some((section) => section.title === 'Square-Power Formula Cases')).toBe(true);
      const answer = buildDisplayBlocks(result).find((block) => block.id === 'answer');
      expect(answer?.renderKind).toBe('caseMath');
      expect(answer?.lines?.some((line) => line.groupLatex?.includes('=\\sqrt{b}'))).toBe(true);
      expect(answer?.lines?.some((line) => line.groupLatex?.includes('=-\\sqrt{b}'))).toBe(true);
    }
    expect(expressionRhs.exactSupplementLatex).toContain('a+c\\ge0');
    expect(cubic.detailSections?.some((section) =>
      section.title === 'Square-Power Branch 1 - Substituted Real Cardano Values')).toBe(true);
    expect(quartic.detailSections?.some((section) =>
      section.title === 'Square-Power Branch 1 - Substituted Real Ferrari Values')).toBe(true);
    expect(nonX.exactLatex).toContain('y\\in\\begin{cases}');
  });

  it('preserves denominator exclusions for Real square-power rational formula handoffs', () => {
    const solve = (equationLatex: string) => runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex,
      equationSolveTarget: 'z',
      equationDomainIntent: 'real',
    });
    const cubic = solve('\\left(\\frac{z^3+z+1}{z-m}\\right)^2=b');
    const quartic = solve('\\left(\\frac{z^4+z+1}{z-m}\\right)^2=b');

    expect(cubic.kind).toBe('success');
    expect(quartic.kind).toBe('success');
    if (cubic.kind !== 'success' || quartic.kind !== 'success') {
      throw new Error('Expected cubic and quartic rational square-power handoffs to solve');
    }
    for (const result of [cubic, quartic]) {
      expect(result.exactSupplementLatex).toContain('b\\ge0');
      expect(result.exactSupplementLatex).toContain('z-m\\ne0');
      expect(result.detailSections?.some((section) => section.title === 'Square-Power Formula Cases')).toBe(true);
      expect(buildDisplayBlocks(result).find((block) => block.id === 'answer')?.renderKind).toBe('caseMath');
    }
  });

  it('collapses exact zero absolute-value formula wrappers through Equation mode', () => {
    const solve = (equationLatex: string) => runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex,
      equationSolveTarget: 'z',
      equationDomainIntent: 'real',
    });
    const cubic = solve('\\left|z^3+z+1\\right|=0');
    const quartic = solve('\\left|z^4+z+1\\right|=0');

    expect(cubic.kind).toBe('success');
    expect(quartic.kind).toBe('success');
    if (cubic.kind !== 'success' || quartic.kind !== 'success') {
      throw new Error('Expected exact zero absolute-value formula handoffs to solve');
    }
    for (const result of [cubic, quartic]) {
      expect(result.exactSupplementLatex ?? []).not.toContain('b\\ge0');
      expect(result.detailSections?.some((section) => section.title === 'Absolute-Value Formula Cases')).toBe(true);
      const answer = buildDisplayBlocks(result).find((block) => block.id === 'answer');
      expect(answer?.renderKind).toBe('caseMath');
      const groups = [...new Set((answer?.lines ?? []).map((line) => line.groupLatex).filter(Boolean))];
      expect(groups).toHaveLength(0);
    }
    expect(cubic.detailSections?.some((section) => section.title === 'Abs Branch 1 - Substituted Real Cardano Values')).toBe(true);
    expect(quartic.detailSections?.some((section) => section.title === 'Abs Branch 1 - Substituted Real Ferrari Values')).toBe(true);
  });

  it('collapses exact zero square-power formula wrappers through Equation mode', () => {
    const solve = (equationLatex: string) => runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex,
      equationSolveTarget: 'z',
      equationDomainIntent: 'real',
    });
    const cubic = solve('\\left(z^3+z+1\\right)^2=0');
    const quartic = solve('\\left(z^4+z+1\\right)^2=0');

    expect(cubic.kind).toBe('success');
    expect(quartic.kind).toBe('success');
    if (cubic.kind !== 'success' || quartic.kind !== 'success') {
      throw new Error('Expected exact zero square-power formula handoffs to solve');
    }
    for (const result of [cubic, quartic]) {
      expect(result.exactSupplementLatex ?? []).not.toContain('0\\ge0');
      expect(result.detailSections?.some((section) => section.title === 'Square-Power Formula Cases')).toBe(true);
      const answer = buildDisplayBlocks(result).find((block) => block.id === 'answer');
      expect(answer?.renderKind).toBe('caseMath');
      const groups = [...new Set((answer?.lines ?? []).map((line) => line.groupLatex).filter(Boolean))];
      expect(groups).toHaveLength(0);
    }
    expect(cubic.detailSections?.some((section) =>
      section.title === 'Square-Power Branch 1 - Substituted Real Cardano Values')).toBe(true);
    expect(quartic.detailSections?.some((section) =>
      section.title === 'Square-Power Branch 1 - Substituted Real Ferrari Values')).toBe(true);
  });

  it('keeps exact negative and Complex square-power formula wrappers unsupported', () => {
    const negative = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\left(z^3+z+1\\right)^2=-1',
      equationSolveTarget: 'z',
      equationDomainIntent: 'real',
    });
    const complex = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\left(z^3+z+1\\right)^2=b',
      equationSolveTarget: 'z',
      equationDomainIntent: 'complex',
    });

    expect(negative.kind).toBe('error');
    if (negative.kind !== 'error') {
      throw new Error('Expected negative square-power wrapper to stop');
    }
    expect(negative.error).toContain('square powers are nonnegative');
    expect(complex.kind).toBe('error');
    if (complex.kind !== 'error') {
      throw new Error('Expected Complex square-power wrapper to remain unsupported');
    }
    expect(JSON.stringify(complex)).not.toContain('Square-Power Formula Cases');
  });

  it('keeps non-x Cardano and abs-zero formula handoffs live through the isolated worker path', async () => {
    const solve = async (equationLatex: string) => {
      const result = await runEquationModeForIsolatedWorker({
        ...makeRequest(),
        equationScreen: 'symbolic',
        equationLatex,
        equationSolveTarget: 'z',
        equationDomainIntent: 'real',
      });
      return result.payload;
    };
    const direct = await solve('z^3+z+1=0');
    const absoluteZero = await solve('\\left|z^3+z+1\\right|=0');

    expect(direct.kind).toBe('success');
    expect(absoluteZero.kind).toBe('success');
    if (direct.kind !== 'success' || absoluteZero.kind !== 'success') {
      throw new Error('Expected isolated worker path to keep Real Cardano/formula fallback live');
    }
    expect(direct.exactLatex).toContain('z\\in\\begin{cases}');
    expect(direct.detailSections?.some((section) => section.title === 'Real Cardano Cases')).toBe(true);
    expect(absoluteZero.exactLatex).toContain('z^3+z+1=0');
    expect(absoluteZero.detailSections?.some((section) => section.title === 'Absolute-Value Formula Cases')).toBe(true);
  });

  it('keeps exact negative absolute-value formula wrappers domain-empty', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\left|z^3+z+1\\right|=-1',
      equationSolveTarget: 'z',
      equationDomainIntent: 'real',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected a domain-empty error outcome');
    }
    expect(result.error).toBe('No real solutions because absolute values are always nonnegative.');
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
    expect(mixed.error).toBe('This equation has more than one selected-target island.');
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
