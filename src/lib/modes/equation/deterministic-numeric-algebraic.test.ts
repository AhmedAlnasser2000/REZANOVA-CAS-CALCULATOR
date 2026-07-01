import { describe, expect, it } from 'vitest';
import { runEquationMode } from '../equation';
import { collectOutcomeText, makeRequest } from './test-support';

function solve(equationLatex: string, target = 'x', extra: Partial<Parameters<typeof runEquationMode>[0]> = {}) {
  return runEquationMode({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: target,
    equationAnswerMode: 'exact',
    angleUnit: 'rad',
    ...extra,
  });
}

describe('Equation deterministic numeric algebraic fallback', () => {
  it('returns validated approximate roots for unsupported exact high-degree polynomials', () => {
    const result = solve('x^7-x=5');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected numeric fallback success');
    }
    expect(result.solutionKind).toBe('approximate-numeric');
    expect(result.resultOrigin).toBe('numeric-fallback');
    expect(result.answerDomain).toBe('real');
    expect(result.answerMode).toBeUndefined();
    expect(result.exactLatex).toContain('x\\approx');
    expect(result.candidateValues?.[0]).toBeCloseTo(1.3007656097, 9);
    const text = collectOutcomeText(result);
    expect(text).toContain('No supported exact form was found; showing validated approximate real roots.');
    expect(result.detailSections?.map((section) => section.title)).toContain('Polynomial Diagnostics');
    expect(text).toContain('Root engine: aberth-ehrlich');
    expect(text).toContain('Nearest root separation:');
    expect(text).not.toContain('Higher precision is recommended');
    expect(text).not.toContain('Real Cardano Cases');
    expect(text).not.toContain('Real Ferrari Cases');
  });

  it('preserves target-aware validation for selected non-x targets', () => {
    const result = solve('z^7-z=5', 'z');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected numeric fallback success');
    }
    expect(result.exactLatex).toContain('z\\approx');
    expect(result.approxText).toContain('z ~= 1.300766');
    expect(result.candidateValues?.[0]).toBeCloseTo(1.3007656097, 9);
  });

  it('uses one-shot stored values while protecting the solve target', () => {
    const result = solve('z^7-z=a', 'z', {
      useStoredValueSubstitution: true,
      storedVariables: [
        { name: 'a', valueLatex: '5', numericValue: 5 },
        { name: 'z', valueLatex: '99', numericValue: 99 },
      ],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected stored-value numeric fallback success');
    }
    expect(result.variableSubstitutions).toEqual([
      { name: 'a', valueLatex: '5', numericValue: 5 },
    ]);
    expect(collectOutcomeText(result)).toContain('Effective equation for z: z^7-z=5.');
    expect(collectOutcomeText(result)).toContain('Kept z symbolic as the solve target.');
    expect(result.candidateValues?.[0]).toBeCloseTo(1.3007656097, 9);
  });

  it('records rational exclusions and validated roots after denominator clearing', () => {
    const result = solve('\\frac{x^7-x-5}{x-2}=0');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected numeric rational fallback success');
    }
    expect(result.solutionKind).toBe('approximate-numeric');
    expect(result.solveBadges).toEqual(expect.arrayContaining(['LCD Clear', 'Candidate Checked']));
    expect(result.candidateValues?.[0]).toBeCloseTo(1.3007656097, 9);
    const text = collectOutcomeText(result);
    expect(text).toContain('x-2 \\ne0');
    expect(text).toContain('x\\ne 2');
    expect(text).toContain('Cleared numeric polynomial denominators');
  });

  it('keeps exact symbolic wins ahead of numeric fallback for simple supported forms', () => {
    const result = solve('x+5=8');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected exact symbolic success');
    }
    expect(result.solutionKind).not.toBe('approximate-numeric');
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.exactLatex).toBe('x=3');
  });
});
