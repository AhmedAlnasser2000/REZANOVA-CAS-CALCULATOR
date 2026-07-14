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
  expect(result.answerDomain).toBe('real');
}

function expectDetail(result: ReturnType<typeof expectSuccess>, title: string) {
  const section = result.detailSections?.find((entry) => entry.title === title);
  expect(section).toBeTruthy();
  return section;
}

function expectFact(result: ReturnType<typeof expectSuccess>, fact: string) {
  expect(result.exactSupplementLatex).toContain(fact);
}

function expectClosedFerrariReadback(text: string) {
  expect(text).not.toContain('Y');
  expect(text).not.toContain('F_');
  expect(text).not.toContain('P');
  expect(text).not.toContain('Q');
  expect(text).not.toContain('\\Delta');
  expect(text).not.toContain('t=');
}

describe('Equation Real mixed exp/log wrapper formulas', () => {
  it('locks affine logarithmic shells through Real Cardano case math', () => {
    const numericCoefficient = expectSuccess('2\\ln\\left(z^3+z+1\\right)+c=b');
    const symbolicCoefficient = expectSuccess('a\\ln\\left(z^3+z+1\\right)+c=d');

    for (const result of [numericCoefficient, symbolicCoefficient]) {
      expectCaseMath(result);
      expectDetail(result, 'Parameterized Exp/Log Solve');
      expectDetail(result, 'Real Cardano Cases');
      expect(result.detailSections?.some((section) => section.title === 'Mixed Exp/Log Formula Cases')).toBe(false);
      expectFact(result, 'z^3+z+1>0');
    }
    expectFact(symbolicCoefficient, 'a\\ne0');
  });

  it('locks affine exponential shells through closed Real Ferrari case math', () => {
    const result = expectSuccess('a e^{z^4+z+1}+c=d');

    expectCaseMath(result);
    expectDetail(result, 'Parameterized Exp/Log Solve');
    const ferrariCases = expectDetail(result, 'Real Ferrari Cases');
    expectFact(result, 'a\\ne0');
    expectFact(result, '\\frac{d-c}{a}>0');
    expectClosedFerrariReadback(result.exactLatex ?? '');
    expectClosedFerrariReadback(ferrariCases?.lines.join(' ') ?? '');
  });

  it('preserves rational exclusions and target-free exp/log companion facts', () => {
    const rational = expectSuccess('\\ln\\left(\\frac{z^4+z+1}{z-m}\\right)+c=b');
    const companionLog = expectSuccess('\\ln\\left(z^3+z+1\\right)+\\ln\\left(a\\right)=b');

    expectCaseMath(rational);
    expectDetail(rational, 'Real Ferrari Cases');
    expectFact(rational, 'z-m\\ne0');
    expect(rational.exactSupplementLatex?.some((fact) =>
      fact.includes('\\frac{z^4+z+1}{z-m}') && fact.includes('>0'))).toBe(true);

    expectCaseMath(companionLog);
    expectDetail(companionLog, 'Real Cardano Cases');
    expectFact(companionLog, 'a>0');
    expectFact(companionLog, 'z^3+z+1>0');
  });

  it('keeps Complex, target-dependent companions, multi-carrier logs, and target-in-base formulas deferred', () => {
    const complex = solve('2\\ln\\left(z^3+z+1\\right)+c=b', 'z', 'complex');
    const targetCompanionLog = solve('\\ln\\left(z^3+z+1\\right)+z=b');
    const targetCompanionExp = solve('e^{z^3+z+1}+z=b');
    const twoSelectedLogs = solve('\\ln\\left(z^3+z+1\\right)+\\ln\\left(z+1\\right)=b');
    const targetInBaseFormula = solve('\\left(z^3+z+1\\right)^a=b');

    for (const result of [
      complex,
      targetCompanionLog,
      targetCompanionExp,
      twoSelectedLogs,
      targetInBaseFormula,
    ]) {
      expect(result.kind).toBe('error');
      expect(JSON.stringify(result)).not.toContain('Real Cardano Cases');
      expect(JSON.stringify(result)).not.toContain('Real Ferrari Cases');
      expect(JSON.stringify(result)).not.toContain('Mixed Exp/Log Formula Cases');
    }
  });
});

function buildProducerDisplayBlocks(outcome: Parameters<typeof finalizeCanonicalRuntimeOutcomeFromProducer>[0]) {
  return buildDisplayBlocks(finalizeCanonicalRuntimeOutcomeFromProducer(outcome, 'Equation test'));
}
