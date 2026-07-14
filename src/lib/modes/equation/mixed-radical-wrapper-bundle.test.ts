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

function expectSupplement(result: ReturnType<typeof expectSuccess>, predicate: (fact: string) => boolean) {
  expect(result.exactSupplementLatex?.some(predicate)).toBe(true);
}

describe('Equation Real mixed radical wrapper bundle', () => {
  it('hands single square-root mixed cubic and quartic branches to Real formulas', () => {
    const cubic = expectSuccess('\\sqrt{z^3+z+1}+z=b');
    const quartic = expectSuccess('\\sqrt{z^4+z+1}+z=b');

    expect(cubic.detailSections?.some((section) => section.title === 'Real Cardano Cases')).toBe(true);
    expect(quartic.detailSections?.some((section) => section.title === 'Real Ferrari Cases')).toBe(true);
    expect(cubic.detailSections?.some((section) => section.title === 'Mixed Algebraic Branches')).toBe(true);
    expect(quartic.detailSections?.some((section) => section.title === 'Mixed Algebraic Branches')).toBe(true);

    for (const result of [cubic, quartic]) {
      expectSupplement(result, (fact) => fact.includes('b') && fact.includes('z') && fact.includes('\\ge0'));
      expectCaseMath(result);
      expect(result.answerDomain).toBe('real');
    }
  });

  it('keeps target-free radical companions inside the same single-carrier formula handoff', () => {
    const result = expectSuccess('\\sqrt{z^3+z+1}+\\sqrt{a}=b');

    expect(result.detailSections?.some((section) => section.title === 'Real Cardano Cases')).toBe(true);
    expectSupplement(result, (fact) => fact.includes('b') && fact.includes('\\sqrt{a}') && fact.includes('\\ge0'));
    expectCaseMath(result);
  });

  it('preserves existing low-degree mixed algebraic output without forcing formula cases', () => {
    const result = expectSuccess('\\sqrt{z+a}+z=b');

    expect(result.detailSections?.some((section) => section.title === 'Parameterized Mixed Algebraic Solve')).toBe(true);
    expect(result.detailSections?.some((section) => section.title === 'Real Cardano Cases')).toBe(false);
    expect(result.detailSections?.some((section) => section.title === 'Real Ferrari Cases')).toBe(false);
    expect(result.exactLatex).toContain('z\\in');
  });

  it('keeps Complex, true two-radical, and nested mixed radical formula widening deferred', () => {
    const complex = solve('\\sqrt{z^3+z+1}+z=b', 'z', 'complex');
    const twoRadicals = solve('\\sqrt{z^3+z+1}+\\sqrt{z+1}=b');
    const nested = solve('\\sqrt{\\sqrt{z^3+z+1}}+z=b');

    for (const result of [complex, twoRadicals, nested]) {
      expect(result.kind).toBe('error');
      expect(JSON.stringify(result)).not.toContain('Real Cardano Cases');
      expect(JSON.stringify(result)).not.toContain('Real Ferrari Cases');
    }
  });
});

function buildProducerDisplayBlocks(outcome: Parameters<typeof finalizeCanonicalRuntimeOutcomeFromProducer>[0]) {
  return buildDisplayBlocks(finalizeCanonicalRuntimeOutcomeFromProducer(outcome, 'Equation test'));
}
