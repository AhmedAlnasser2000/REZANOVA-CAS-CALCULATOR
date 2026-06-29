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
    equationDomainIntent: 'real',
    angleUnit: 'rad',
    ...extra,
  });
}

function expectApproxRoots(result: ReturnType<typeof solve>, expected: readonly number[], precision = 6) {
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error('Expected numeric fallback success');
  }
  expect(result.solutionKind).toBe('approximate-numeric');
  expect(result.resultOrigin).toBe('numeric-fallback');
  expect(result.answerDomain).toBe('real');
  expect(result.numericMethod).toBe('Real nonlinear bounded numeric search');
  for (const expectedRoot of expected) {
    expect(result.candidateValues?.some((root) =>
      Math.abs(root - expectedRoot) < 10 ** -precision)).toBe(true);
  }
}

describe('Equation real nonlinear numeric search fallback', () => {
  it('auto-searches bounded real windows for unsupported nonlinear numeric equations', () => {
    const result = solve('x^2+\\sin(x)=2');

    expectApproxRoots(result, [-1.728466, 1.06155]);
    const text = collectOutcomeText(result);
    expect(text).toContain('No supported exact form was found; showing validated approximate real roots.');
    expect(text).toContain('Searched expanding real windows: [-10, 10], [-100, 100], [-1000, 1000], [-10000, 10000].');
    expect(text).toContain('bounded real search');
    expect(text).not.toContain('Real Cardano Cases');
    expect(text).not.toContain('Real Ferrari Cases');
  });

  it('finds a transcendental fixed-point root without requiring an interval', () => {
    const result = solve('e^{-x}=x');

    expectApproxRoots(result, [0.567143], 6);
  });

  it('records domain facts and rejects discontinuity candidates during validation', () => {
    const result = solve('\\ln(x-1)+\\frac{1}{x-2}=3');

    expectApproxRoots(result, [2.372685, 20.00011], 5);
    if (result.kind !== 'success') {
      throw new Error('Expected numeric fallback success');
    }
    const text = collectOutcomeText(result);
    expect(text).toContain('x-1 >0');
    expect(text).toContain('x-2 \\ne0');
    expect(text).toContain('x\\ne 2');
    expect(text).toMatch(/Rejected [1-9]/u);
    expect(result.candidateValues?.some((root) => Math.abs(root - 2) < 1e-5)).toBe(false);
  });

  it('recovers tangent roots that do not create a sign-change bracket', () => {
    const result = solve('\\left(x-0.3\\right)^2+\\sin\\left(x-0.3\\right)^2=0');

    expectApproxRoots(result, [0.3], 6);
  });

  it('uses one-shot stored values while protecting the solve target', () => {
    const result = solve('x^2+\\sin(x)=a', 'x', {
      useStoredValueSubstitution: true,
      storedVariables: [
        { name: 'a', valueLatex: '2', numericValue: 2 },
        { name: 'x', valueLatex: '99', numericValue: 99 },
      ],
    });

    expectApproxRoots(result, [-1.728466, 1.06155]);
    if (result.kind !== 'success') {
      throw new Error('Expected numeric fallback success');
    }
    expect(result.variableSubstitutions).toEqual([
      { name: 'a', valueLatex: '2', numericValue: 2 },
    ]);
    const text = collectOutcomeText(result);
    expect(text).toContain('Effective equation for x: x^2+\\sin(x)=2.');
    expect(text).toContain('Kept x symbolic as the solve target.');
  });

  it('validates against non-x targets instead of assuming x', () => {
    const result = solve('z^2+\\sin(z)=2', 'z');

    expectApproxRoots(result, [-1.728466, 1.06155]);
    if (result.kind !== 'success') {
      throw new Error('Expected numeric fallback success');
    }
    expect(result.exactLatex).toContain('z\\approx');
    expect(result.approxText).toContain('z ~= ');
  });
});
