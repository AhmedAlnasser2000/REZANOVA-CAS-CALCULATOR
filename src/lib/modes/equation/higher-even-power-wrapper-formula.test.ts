import { finalizeCanonicalRuntimeOutcomeFromProducer } from '../../result-contract';
import { describe, expect, it } from 'vitest';
import { buildDisplayBlocks } from '../../display/result/display-blocks';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

describe('Equation mode higher even-power wrapper formulas', () => {
  function solve(equationLatex: string, target = 'z', domain: 'real' | 'complex' = 'real') {
    return runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex,
      equationSolveTarget: target,
      equationDomainIntent: domain,
    });
  }

  it('solves Real higher even-power formula handoffs through grouped case math', () => {
    const cubic = solve('\\left(z^3+z+1\\right)^4=b');
    const quartic = solve('\\left(z^4+z+1\\right)^6=b');
    const expressionRhs = solve('\\left(z^3+z+1\\right)^8=a+c');
    const nonX = solve('\\left(y^3+y+1\\right)^{12}=b', 'y');

    expect(cubic.kind).toBe('success');
    expect(quartic.kind).toBe('success');
    expect(expressionRhs.kind).toBe('success');
    expect(nonX.kind).toBe('success');
    if (
      cubic.kind !== 'success'
      || quartic.kind !== 'success'
      || expressionRhs.kind !== 'success'
      || nonX.kind !== 'success'
    ) {
      throw new Error('Expected higher even-power formula handoffs to solve');
    }
    for (const result of [cubic, quartic, expressionRhs, nonX]) {
      expect(result.answerDomain).toBe('real');
      expect(result.exactLatex).not.toContain('PrincipalRoot');
      expect(result.detailSections?.some((section) => section.title === 'Even-Power Formula Cases')).toBe(true);
      expect(buildProducerDisplayBlocks(result).find((block) => block.id === 'answer')?.renderKind).toBe('caseMath');
    }
    expect(cubic.exactSupplementLatex).toContain('b\\ge0');
    expect(quartic.exactSupplementLatex).toContain('b\\ge0');
    expect(expressionRhs.exactSupplementLatex).toContain('a+c\\ge0');
    expect(cubic.detailSections?.some((section) => section.title === 'Even-Power Branch 1 - Substituted Real Cardano Values')).toBe(true);
    expect(quartic.detailSections?.some((section) => section.title === 'Even-Power Branch 1 - Substituted Real Ferrari Values')).toBe(true);
    expect(nonX.exactLatex).toContain('y\\in\\begin{cases}');
  });

  it('collapses exact zero higher even-power wrappers before the shared high-degree solve path', () => {
    const zero = solve('\\left(z^3+z+1\\right)^{10}=0');

    expect(zero.kind).toBe('success');
    if (zero.kind !== 'success') {
      throw new Error('Expected exact-zero higher even-power wrapper to solve');
    }
    expect(zero.exactSupplementLatex ?? []).not.toContain('0\\ge0');
    expect(zero.detailSections?.some((section) => section.title === 'Even-Power Formula Cases')).toBe(true);
    expect(zero.detailSections?.some((section) => section.title === 'Even-Power Branch 1 - Substituted Real Cardano Values')).toBe(true);
    const answer = buildProducerDisplayBlocks(zero).find((block) => block.id === 'answer');
    expect(answer?.renderKind).toBe('caseMath');
    const groups = [...new Set((answer?.lines ?? []).map((line) => line.groupLatex).filter(Boolean))];
    expect(groups).toHaveLength(0);
  });

  it('keeps Complex, over-cap, and over-cap root-wrapper cases unsupported', () => {
    const complex = solve('\\left(z^3+z+1\\right)^4=b', 'z', 'complex');
    const overCap = solve('\\left(z^3+z+1\\right)^{14}=b');
    const rootWrapper = solve('\\sqrt[13]{z^3+z+1}=b');

    for (const result of [complex, overCap, rootWrapper]) {
      expect(result.kind).toBe('error');
      expect(JSON.stringify(result)).not.toContain('Even-Power Formula Cases');
    }
  });
});

function buildProducerDisplayBlocks(outcome: Parameters<typeof finalizeCanonicalRuntimeOutcomeFromProducer>[0]) {
  return buildDisplayBlocks(finalizeCanonicalRuntimeOutcomeFromProducer(outcome, 'Equation test'));
}
