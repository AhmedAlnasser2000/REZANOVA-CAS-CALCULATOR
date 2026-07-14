import { finalizeCanonicalRuntimeOutcomeFromProducer } from '../../result-contract';
import { describe, expect, it } from 'vitest';
import { buildDisplayBlocks } from '../../display/result/display-blocks';
import { collectUnsafeSymbolicOutputFragments } from '../../display/symbolic-output-hygiene';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

type TestAngleUnit = 'deg' | 'rad' | 'grad';

function solve(
  equationLatex: string,
  target = 'z',
  domain: 'real' | 'complex' = 'real',
  angleUnit: TestAngleUnit = 'deg',
) {
  return runEquationMode({
    ...makeRequest(),
    angleUnit,
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: target,
    equationDomainIntent: domain,
  });
}

function expectSuccess(equationLatex: string, target = 'z', angleUnit: TestAngleUnit = 'deg') {
  const result = solve(equationLatex, target, 'real', angleUnit);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected success for ${equationLatex}, received ${result.kind}`);
  }
  return result;
}

function expectCaseMath(result: ReturnType<typeof expectSuccess>) {
  expect(result.answerDomain).toBe('real');
  expect(buildProducerDisplayBlocks(result).find((block) => block.id === 'answer')?.renderKind).toBe('caseMath');
}

function expectDetail(result: ReturnType<typeof expectSuccess>, title: string) {
  const section = result.detailSections?.find((entry) => entry.title === title);
  expect(section).toBeTruthy();
  return section;
}

function expectNoFormulaSections(result: unknown) {
  const text = JSON.stringify(result);
  expect(text).not.toContain('Trig Formula Cases');
  expect(text).not.toContain('Mixed Trig Formula Cases');
  expect(text).not.toContain('Real Cardano Cases');
  expect(text).not.toContain('Real Ferrari Cases');
}

function expectClosedFerrariReadback(text: string) {
  expect(text).not.toContain('Y');
  expect(text).not.toContain('F_{');
  expect(text).not.toContain('\\Delta');
  expect(text).not.toContain('P');
  expect(text).not.toContain('Q');
  expect(text).not.toContain('t=');
}

function expectFormulaRoute(result: ReturnType<typeof expectSuccess>, route: string) {
  expect(JSON.stringify(result.detailSections)).toContain(`Formula route: ${route}`);
}

function expectNoUnsafeFragments(result: ReturnType<typeof expectSuccess>) {
  expect(collectUnsafeSymbolicOutputFragments(
    finalizeCanonicalRuntimeOutcomeFromProducer(result, 'Equation test'),
  )).toEqual([]);
  expect(JSON.stringify(result)).not.toContain('Unsupported symbolic fragment');
}

describe('Equation Real mixed trig wrapper formulas', () => {
  it('solves affine single-carrier trig shells through Real formula cases', () => {
    const sine = expectSuccess('a\\sin\\left(z^3+z+1\\right)+c=d');
    const cosine = expectSuccess('a\\cos\\left(z^4+z+1\\right)+c=d');
    const tangent = expectSuccess('a\\tan\\left(z^4+z+1\\right)+c=d');

    expectCaseMath(sine);
    expectDetail(sine, 'Parameterized Trig Solve');
    expectDetail(sine, 'Trig Formula Cases');
    expectFormulaRoute(sine, 'cubic-cardano');
    expect(sine.exactSupplementLatex).toContain('a\\ne0');
    expect(sine.exactSupplementLatex).toContain('-1\\le \\frac{d-c}{a}\\le1');
    expect(sine.exactSupplementLatex).toContain('n\\in\\mathbb{Z}');

    for (const result of [cosine, tangent]) {
      expectCaseMath(result);
      expectDetail(result, 'Parameterized Trig Solve');
      expectDetail(result, 'Trig Formula Cases');
      const trigCases = expectDetail(result, 'Trig Formula Cases');
      expectFormulaRoute(result, 'quartic-ferrari');
      expect(result.exactSupplementLatex).toContain('a\\ne0');
      expect(result.exactSupplementLatex).toContain('n\\in\\mathbb{Z}');
      expectClosedFerrariReadback(result.exactLatex ?? '');
      expectClosedFerrariReadback(trigCases?.lines.join(' ') ?? '');
    }
    expect(cosine.exactSupplementLatex).toContain('-1\\le \\frac{d-c}{a}\\le1');
    expect(tangent.exactSupplementLatex ?? []).not.toContain('-1\\le \\frac{d-c}{a}\\le1');
    expect(JSON.stringify(sine)).not.toContain('Mixed Trig Formula Cases');
  });

  it('solves same-argument mixed sine/cosine wrappers through Real formula cases', () => {
    const cubic = expectSuccess('A\\sin\\left(z^3+z+1\\right)+B\\cos\\left(z^3+z+1\\right)=C');
    const rationalQuartic = expectSuccess(
      'A\\sin\\left(\\frac{z^4+z+1}{z-m}\\right)+B\\cos\\left(\\frac{z^4+z+1}{z-m}\\right)=C',
    );

    expectCaseMath(cubic);
    expectDetail(cubic, 'Parameterized Mixed Trig Solve');
    expectDetail(cubic, 'Trig Formula Cases');
    expectFormulaRoute(cubic, 'cubic-cardano');
    expect(cubic.exactSupplementLatex).toContain('A^2+B^2>0');
    expect(cubic.exactSupplementLatex?.some((fact) =>
      fact.includes('\\le C\\le') && fact.includes('\\sqrt{A^2+B^2}'))).toBe(true);
    expect(cubic.exactSupplementLatex).toContain('n\\in\\mathbb{Z}');

    expectCaseMath(rationalQuartic);
    expectDetail(rationalQuartic, 'Parameterized Mixed Trig Solve');
    expectDetail(rationalQuartic, 'Trig Formula Cases');
    expectFormulaRoute(rationalQuartic, 'quartic-ferrari');
    expect(rationalQuartic.exactSupplementLatex).toContain('z-m\\ne0');
    expect(rationalQuartic.exactSupplementLatex).toContain('A^2+B^2>0');
  });

  it('locks rational same-argument mixed sine/cosine screenshots against unsafe fallback', () => {
    const slash = expectSuccess(
      String.raw`A\sin((z^4+z+1)/(z-m))+B\cos((z^4+z+1)/(z-m))=C`,
      'z',
      'rad',
    );
    const fraction = expectSuccess(
      String.raw`A\sin\left(\frac{z^4+z+1}{z-m}\right)+B\cos\left(\frac{z^4+z+1}{z-m}\right)=C`,
      'z',
      'rad',
    );

    for (const result of [slash, fraction]) {
      const text = JSON.stringify(result);
      expectCaseMath(result);
      expectDetail(result, 'Parameterized Mixed Trig Solve');
      const trigCases = expectDetail(result, 'Trig Formula Cases');
      expectFormulaRoute(result, 'quartic-ferrari');
      expect(result.exactSupplementLatex).toContain('z-m\\ne0');
      expect(result.exactSupplementLatex).toContain('A^2+B^2>0');
      expect(JSON.stringify(result.detailSections)).toContain('Trig Formula Cases');
      expectClosedFerrariReadback(result.exactLatex ?? '');
      expectClosedFerrariReadback(trigCases?.lines.join(' ') ?? '');
      expectNoUnsafeFragments(result);
      expect(text).not.toContain('m\\\\mathrm{atan_2}');
      expect(text).toContain('m\\\\cdot \\\\operatorname{atan2}');
    }
  });

  it('keeps Complex, target-outside, products, mismatched, and nested trig formula cases deferred', () => {
    const complex = solve('a\\sin\\left(z^3+z+1\\right)+c=d', 'z', 'complex');
    const targetOutside = solve('\\sin\\left(z^3+z+1\\right)+z=b');
    const product = solve('\\sin\\left(z^3+z+1\\right)\\cos\\left(z^3+z+1\\right)=b');
    const mismatched = solve('\\sin\\left(z^3+z+1\\right)+\\cos\\left(z^4+z+1\\right)=b');
    const nested = solve('\\sin\\left(\\sin\\left(z^3+z+1\\right)\\right)=b');
    const mixedRadical = solve('\\sin\\left(z^3+z+1\\right)+\\sqrt{z}=b');
    const mixedExpLog = solve('\\sin\\left(z^3+z+1\\right)+e^z=b');

    for (const result of [complex, targetOutside, product, mismatched, nested, mixedRadical, mixedExpLog]) {
      expect(result.kind).toBe('error');
      expectNoFormulaSections(result);
    }
  });
});

function buildProducerDisplayBlocks(outcome: Parameters<typeof finalizeCanonicalRuntimeOutcomeFromProducer>[0]) {
  return buildDisplayBlocks(finalizeCanonicalRuntimeOutcomeFromProducer(outcome, 'Equation test'));
}
