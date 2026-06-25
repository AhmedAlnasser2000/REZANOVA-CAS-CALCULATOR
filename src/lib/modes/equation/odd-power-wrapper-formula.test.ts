import { describe, expect, it } from 'vitest';
import { buildDisplayBlocks } from '../../display/result/display-blocks';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

describe('Equation mode odd-power wrapper formulas', () => {
  function solve(equationLatex: string, target = 'z', domain: 'real' | 'complex' = 'real') {
    return runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex,
      equationSolveTarget: target,
      equationDomainIntent: domain,
    });
  }

  it('solves Real odd-power formula handoffs through case math', () => {
    const cubic = solve('\\left(z^3+z+1\\right)^3=b');
    const quartic = solve('\\left(z^4+z+1\\right)^5=b');
    const expressionRhs = solve('\\left(z^3+z+1\\right)^7=a+c');
    const nonX = solve('\\left(y^3+y+1\\right)^7=b', 'y');

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
      throw new Error('Expected odd-power formula handoffs to solve');
    }
    for (const result of [cubic, quartic, expressionRhs, nonX]) {
      expect(result.answerDomain).toBe('real');
      expect(result.exactLatex).not.toContain('PrincipalRoot');
      expect(buildDisplayBlocks(result).find((block) => block.id === 'answer')?.renderKind).toBe('caseMath');
    }
    expect(cubic.exactSupplementLatex ?? []).not.toContain('b\\ge0');
    expect(quartic.exactSupplementLatex ?? []).not.toContain('b\\ge0');
    expect(expressionRhs.exactSupplementLatex ?? []).not.toContain('a+c\\ge0');
    expect(cubic.detailSections?.some((section) => section.title === 'Real Cardano Cases')).toBe(true);
    expect(quartic.detailSections?.some((section) => section.title === 'Real Ferrari Cases')).toBe(true);
    expect(nonX.exactLatex).toContain('y\\in\\begin{cases}');
  });

  it('preserves denominator exclusions and exact RHS policy', () => {
    const rational = solve('\\left(\\frac{z^3+z+1}{z-m}\\right)^3=b');
    const zero = solve('\\left(z^3+z+1\\right)^3=0');
    const negative = solve('\\left(z^3+z\\right)^3=-1');

    expect(rational.kind).toBe('success');
    expect(zero.kind).toBe('success');
    expect(negative.kind).toBe('success');
    if (rational.kind !== 'success' || zero.kind !== 'success' || negative.kind !== 'success') {
      throw new Error('Expected rational, zero, and negative odd-power handoffs to solve');
    }
    expect(rational.exactSupplementLatex).toContain('z-m\\ne0');
    expect(rational.exactSupplementLatex ?? []).not.toContain('b\\ge0');
    expect(zero.exactSupplementLatex ?? []).not.toContain('0\\ge0');
    expect(negative.exactSupplementLatex ?? []).not.toContain('-1\\ge0');
  });

  it('keeps Complex, higher even-power, and root-wrapper cases unsupported', () => {
    const complex = solve('\\left(z^3+z+1\\right)^3=b', 'z', 'complex');
    const higherEven = solve('\\left(z^3+z+1\\right)^4=b');
    const rootWrapper = solve('\\sqrt[3]{z^3+z+1}=b');

    expect(complex.kind).toBe('error');
    expect(higherEven.kind).toBe('error');
    expect(rootWrapper.kind).toBe('error');
    if (complex.kind !== 'error' || higherEven.kind !== 'error' || rootWrapper.kind !== 'error') {
      throw new Error('Expected deferred Complex, higher-even, and root-wrapper cases to stop');
    }
    expect(JSON.stringify(complex)).not.toContain('Real Cardano Cases');
    expect(JSON.stringify(higherEven)).not.toContain('Real Cardano Cases');
    expect(JSON.stringify(rootWrapper)).not.toContain('Real Cardano Cases');
  });
});
