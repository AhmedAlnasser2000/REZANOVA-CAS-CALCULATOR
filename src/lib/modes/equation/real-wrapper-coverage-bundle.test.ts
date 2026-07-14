import { finalizeCanonicalRuntimeOutcomeFromProducer } from '../../result-contract';
import { describe, expect, it } from 'vitest';
import { buildDisplayBlocks } from '../../display/result/display-blocks';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

function solve(equationLatex: string, target = 'z', domain: 'real' | 'complex' = 'real') {
  return runEquationMode({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: target,
    equationDomainIntent: domain,
  });
}

function expectSuccess(equationLatex: string, target = 'z') {
  const result = solve(equationLatex, target);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected success for ${equationLatex}, received ${result.kind}`);
  }
  return result;
}

function expectCaseMath(result: ReturnType<typeof expectSuccess>) {
  expect(buildProducerDisplayBlocks(result).find((block) => block.id === 'answer')?.renderKind).toBe('caseMath');
}

function serialized(result: unknown) {
  return JSON.stringify(result).replace(/\s/g, '');
}

function expectSupplement(result: ReturnType<typeof expectSuccess>, predicate: (fact: string) => boolean) {
  expect(result.exactSupplementLatex?.some(predicate)).toBe(true);
}

describe('Equation Real wrapper coverage bundle', () => {
  it('locks rational Cardano/Ferrari coverage and normalizes self-ratio coefficients', () => {
    const cubic = expectSuccess('(z^3+z+1)/(z-m)=b');
    const quartic = expectSuccess('(z^4+z+1)/(z-m)=b');
    const reciprocalQuartic = expectSuccess('1/(z^4+z+1)=b');
    const linearFractionalCubic = expectSuccess('(a*(z^3+z+1)+c)/(d*(z^3+z+1)+h)=b');
    const linearFractionalQuartic = expectSuccess('(a*(z^4+z+1)+c)/(d*(z^4+z+1)+h)=b');

    expect(cubic.detailSections?.some((section) => section.title === 'Cubic Rational Normalization')).toBe(true);
    expect(cubic.detailSections?.some((section) => section.title === 'Real Cardano Cases')).toBe(true);
    expect(quartic.detailSections?.some((section) => section.title === 'Quartic Rational Normalization')).toBe(true);
    expect(quartic.detailSections?.some((section) => section.title === 'Real Ferrari Cases')).toBe(true);
    expect(reciprocalQuartic.detailSections?.some((section) => section.title === 'Quartic Rational Normalization')).toBe(true);

    for (const result of [cubic, quartic]) {
      expect(result.exactSupplementLatex).toContain('z-m\\ne0');
      expectCaseMath(result);
    }
    expect(reciprocalQuartic.exactSupplementLatex).toContain('z^4+z+1\\ne0');
    expectCaseMath(reciprocalQuartic);

    for (const result of [linearFractionalCubic, linearFractionalQuartic]) {
      expectSupplement(result, (fact) => fact.includes('a-bd') && fact.includes('\\ne0'));
      expect(serialized(result)).not.toContain('a-bd}{a-bd');
      expectCaseMath(result);
    }
    expect(serialized(linearFractionalCubic)).toContain('p=1');
    expect(serialized(linearFractionalQuartic)).toContain('q=1');
  });

  it('solves affine single-root radical wrappers through Real formula handoff', () => {
    const squareRoot = expectSuccess('2\\sqrt{z^3+z+1}+c=b');
    const cubicRootQuartic = expectSuccess('\\sqrt[3]{z^4+z+1}+c=b');
    const scaledOddRoot = expectSuccess('a\\sqrt[5]{z^3+z+1}+c=d');
    const rationalEvenRoot = expectSuccess('\\sqrt[4]{\\frac{z^4+z+1}{z-m}}+c=b');

    expect(squareRoot.detailSections?.some((section) => section.title === 'Real Cardano Cases')).toBe(true);
    expectSupplement(squareRoot, (fact) => fact.includes('b') && fact.includes('c') && fact.includes('\\ge0'));
    expectCaseMath(squareRoot);

    expect(cubicRootQuartic.detailSections?.some((section) => section.title === 'Nth-Root Formula Cases')).toBe(true);
    expect(cubicRootQuartic.detailSections?.some((section) => section.title.includes('Substituted Real Ferrari Values'))).toBe(true);
    expect(cubicRootQuartic.exactSupplementLatex ?? []).not.toContain('b-c\\ge0');
    expectCaseMath(cubicRootQuartic);

    expect(scaledOddRoot.detailSections?.some((section) => section.title === 'Nth-Root Formula Cases')).toBe(true);
    expect(scaledOddRoot.exactSupplementLatex).toContain('a\\ne0');
    expect(scaledOddRoot.exactSupplementLatex?.some((fact) => fact.includes('\\ge0'))).toBe(false);
    expectCaseMath(scaledOddRoot);

    expect(rationalEvenRoot.detailSections?.some((section) => section.title === 'Nth-Root Formula Cases')).toBe(true);
    expect(rationalEvenRoot.exactSupplementLatex).toContain('z-m\\ne0');
    expectSupplement(rationalEvenRoot, (fact) => fact.includes('b') && fact.includes('c') && fact.includes('\\ge0'));
    expectCaseMath(rationalEvenRoot);
  });

  it('keeps Complex, mixed-radical, and nested affine radical formula wrappers deferred', () => {
    const complexSquareRoot = solve('2\\sqrt{z^3+z+1}+c=b', 'z', 'complex');
    const complexNthRoot = solve('a\\sqrt[5]{z^3+z+1}+c=d', 'z', 'complex');
    const mixedRadicals = solve('\\sqrt{z^3+z+1}+\\sqrt{z+1}=b');
    const nestedDepthThree = solve('\\sqrt{\\sqrt{\\sqrt{z^3+z+1}}}=b');

    for (const result of [complexSquareRoot, complexNthRoot, mixedRadicals, nestedDepthThree]) {
      expect(result.kind).toBe('error');
      expect(JSON.stringify(result)).not.toContain('Nth-Root Formula Cases');
      expect(JSON.stringify(result)).not.toContain('Real Cardano Cases');
      expect(JSON.stringify(result)).not.toContain('Real Ferrari Cases');
    }
  });
});

function buildProducerDisplayBlocks(outcome: Parameters<typeof finalizeCanonicalRuntimeOutcomeFromProducer>[0]) {
  return buildDisplayBlocks(finalizeCanonicalRuntimeOutcomeFromProducer(outcome, 'Equation test'));
}
