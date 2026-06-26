import { describe, expect, it } from 'vitest';
import { buildDisplayBlocks } from '../../display/result/display-blocks';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

describe('Equation mode trig wrapper formulas', () => {
  function solve(equationLatex: string, target = 'z', domain: 'real' | 'complex' = 'real') {
    return runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex,
      equationSolveTarget: target,
      equationDomainIntent: domain,
    });
  }

  it('solves Real sine, cosine, and tangent formula handoffs through case math', () => {
    const sine = solve('\\sin\\left(z^3+z+1\\right)=b');
    const cosine = solve('\\cos\\left(z^4+z+1\\right)=b');
    const tangent = solve('\\tan\\left(y^4+y+1\\right)=b', 'y');

    expect(sine.kind).toBe('success');
    expect(cosine.kind).toBe('success');
    expect(tangent.kind).toBe('success');
    if (sine.kind !== 'success' || cosine.kind !== 'success' || tangent.kind !== 'success') {
      throw new Error('Expected trig formula handoffs to solve');
    }

    for (const result of [sine, cosine, tangent]) {
      expect(result.answerDomain).toBe('real');
      expect(result.exactLatex).not.toContain('PrincipalRoot');
      expect(result.detailSections?.some((section) => section.title === 'Trig Formula Cases')).toBe(true);
      expect(buildDisplayBlocks(result).find((block) => block.id === 'answer')?.renderKind).toBe('caseMath');
    }
    expect(sine.exactSupplementLatex).toContain('-1\\le b\\le1');
    expect(cosine.exactSupplementLatex).toContain('-1\\le b\\le1');
    expect(tangent.exactSupplementLatex ?? []).not.toContain('-1\\le b\\le1');
    expect(tangent.exactSupplementLatex).toContain('n\\in\\mathbb{Z}');
    expect(tangent.exactLatex).toContain('y\\in\\begin{cases}');
  });

  it('preserves rational denominator exclusions in Real trig formula handoffs', () => {
    const result = solve('\\sin\\left(\\frac{z^3+z+1}{z-m}\\right)=b');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected rational trig formula handoff to solve');
    }
    expect(result.exactSupplementLatex).toContain('-1\\le b\\le1');
    expect(result.exactSupplementLatex).toContain('z-m\\ne0');
    expect(result.detailSections?.some((section) => section.title === 'Trig Formula Cases')).toBe(true);
    expect(buildDisplayBlocks(result).find((block) => block.id === 'answer')?.renderKind).toBe('caseMath');
  });

  it('dedupes exact endpoint branches and keeps range-empty cases stopped', () => {
    const sineEndpoint = solve('\\sin\\left(z^3+z+1\\right)=1');
    const cosineEndpoint = solve('\\cos\\left(z^4+z+1\\right)=-1');
    const outOfRange = solve('\\sin\\left(z^3+z+1\\right)=2');

    expect(sineEndpoint.kind).toBe('success');
    expect(cosineEndpoint.kind).toBe('success');
    expect(outOfRange.kind).toBe('error');
    if (sineEndpoint.kind !== 'success' || cosineEndpoint.kind !== 'success' || outOfRange.kind !== 'error') {
      throw new Error('Expected endpoint dedupe successes and out-of-range stop');
    }
    expect(sineEndpoint.exactLatex).not.toContain('\\pi-\\arcsin(1)');
    expect(cosineEndpoint.exactLatex).not.toContain('-\\arccos(-1)');
    expect(outOfRange.error).toContain('only take values between -1 and 1');
  });

  it('keeps Complex trig formula wrappers unsupported', () => {
    const complex = solve('\\sin\\left(z^3+z+1\\right)=b', 'z', 'complex');

    expect(complex.kind).toBe('error');
    if (complex.kind !== 'error') {
      throw new Error('Expected Complex trig formula wrapper to remain unsupported');
    }
    expect(JSON.stringify(complex)).not.toContain('Trig Formula Cases');
    expect(JSON.stringify(complex)).not.toContain('Real Cardano Cases');
  });
});
