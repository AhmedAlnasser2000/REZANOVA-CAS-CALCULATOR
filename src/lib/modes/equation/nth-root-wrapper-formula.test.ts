import { describe, expect, it } from 'vitest';
import { buildDisplayBlocks } from '../../display/result/display-blocks';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

describe('Equation mode nth-root wrapper formulas', () => {
  function solve(equationLatex: string, target = 'z', domain: 'real' | 'complex' = 'real') {
    return runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex,
      equationSolveTarget: target,
      equationDomainIntent: domain,
    });
  }

  it('solves Real nth-root formula handoffs through case math', () => {
    const cubic = solve('\\sqrt[3]{z^3+z+1}=b');
    const quartic = solve('\\sqrt[4]{z^4+z+1}=b');
    const expressionRhs = solve('\\sqrt[5]{z^3+z+1}=a+c');
    const nonX = solve('\\sqrt[3]{y^3+y+1}=b', 'y');

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
      throw new Error('Expected nth-root formula handoffs to solve');
    }

    for (const result of [cubic, quartic, expressionRhs, nonX]) {
      expect(result.answerDomain).toBe('real');
      expect(result.exactLatex).not.toContain('PrincipalRoot');
      expect(result.detailSections?.some((section) => section.title === 'Nth-Root Formula Cases')).toBe(true);
      expect(buildDisplayBlocks(result).find((block) => block.id === 'answer')?.renderKind).toBe('caseMath');
    }
    expect(cubic.exactSupplementLatex ?? []).not.toContain('b\\ge0');
    expect(quartic.exactSupplementLatex).toContain('b\\ge0');
    expect(expressionRhs.exactSupplementLatex ?? []).not.toContain('a+c\\ge0');
    expect(cubic.detailSections?.some((section) => section.title === 'Nth-Root Branch 1 - Substituted Real Cardano Values')).toBe(true);
    expect(quartic.detailSections?.some((section) => section.title === 'Nth-Root Branch 1 - Substituted Real Ferrari Values')).toBe(true);
    expect(nonX.exactLatex).toContain('y\\in\\begin{cases}');
  });

  it('preserves denominator exclusions and exact RHS policy', () => {
    const rational = solve('\\sqrt[3]{\\frac{z^3+z+1}{z-m}}=b');
    const zero = solve('\\sqrt[5]{z^3+z+1}=0');
    const oddNegative = solve('\\sqrt[3]{z^3+z+1}=-1');
    const evenNegative = solve('\\sqrt[4]{z^3+z+1}=-1');

    expect(rational.kind).toBe('success');
    expect(zero.kind).toBe('success');
    expect(oddNegative.kind).toBe('success');
    expect(evenNegative.kind).toBe('error');
    if (rational.kind !== 'success' || zero.kind !== 'success' || oddNegative.kind !== 'success' || evenNegative.kind !== 'error') {
      throw new Error('Expected nth-root RHS policy to route as planned');
    }
    expect(rational.exactSupplementLatex).toContain('z-m\\ne0');
    expect(rational.exactSupplementLatex ?? []).not.toContain('b\\ge0');
    expect(zero.exactSupplementLatex ?? []).not.toContain('0\\ge0');
    expect(oddNegative.exactSupplementLatex ?? []).not.toContain('-1\\ge0');
    expect(evenNegative.error).toContain('even root cannot equal a negative target');
  });

  it('keeps Complex and over-cap nth-root wrappers unsupported', () => {
    const complex = solve('\\sqrt[3]{z^3+z+1}=b', 'z', 'complex');
    const overCap = solve('\\sqrt[13]{z^3+z+1}=b');

    for (const result of [complex, overCap]) {
      expect(result.kind).toBe('error');
      expect(JSON.stringify(result)).not.toContain('Nth-Root Formula Cases');
    }
  });
});
