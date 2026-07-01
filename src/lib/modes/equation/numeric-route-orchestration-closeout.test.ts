import { describe, expect, it } from 'vitest';

import { runEquationMode } from '../equation';
import { collectOutcomeText, makeRequest } from './test-support';

function solve(equationLatex: string, extra: Partial<Parameters<typeof runEquationMode>[0]> = {}) {
  return runEquationMode({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: extra.equationSolveTarget ?? 'x',
    equationAnswerMode: 'exact',
    equationDomainIntent: 'real',
    angleUnit: 'rad',
    ...extra,
  });
}

describe('Equation numeric route orchestration closeout', () => {
  it('keeps exact symbolic routes ahead of every numeric fallback', () => {
    const result = solve('x+5=8');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected exact symbolic success');
    }
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.solutionKind).not.toBe('approximate-numeric');
    expect(result.numericMethod).toBeUndefined();
    expect(result.exactLatex).toBe('x=3');
  });

  it('uses deterministic algebraic numeric fallback before nonlinear search', () => {
    const result = solve('x^7-x=5');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected deterministic numeric fallback success');
    }
    expect(result.solutionKind).toBe('approximate-numeric');
    expect(result.numericMethod).toBe('Deterministic numeric polynomial roots');
    const text = collectOutcomeText(result);
    expect(text).toContain('No supported exact form was found; showing validated approximate real roots.');
    expect(text).not.toContain('Real nonlinear bounded numeric search');
    expect(text).not.toContain('Real Cardano Cases');
    expect(text).not.toContain('Real Ferrari Cases');
  });

  it('keeps unsupported periodic-only shapes interval-first instead of fixed-window enumeration', () => {
    const result = solve('\\sin(x!)=0');

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected periodic interval guidance');
    }
    expect(result.solutionKind).toBe('approximate-numeric');
    expect(result.numericMethod).toBe('Real periodic interval numeric solve');
    const text = collectOutcomeText(result);
    expect(result.error).toContain('needs a real interval');
    expect(text).toContain('No default interval was searched.');
    expect(text).not.toContain('Real nonlinear bounded numeric search');
    expect(text).not.toContain('Searched windows:');
  });

  it('does not numerically enumerate exact periodic quotient families by default', () => {
    const result = solve('\\frac{\\sin(x)}{x}=0');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected exact periodic quotient success');
    }
    expect(result.solutionKind).not.toBe('approximate-numeric');
    expect(result.numericMethod).toBeUndefined();
    const text = collectOutcomeText(result);
    expect(text).toContain('\\pi n');
    expect(text).toContain('x\\ne0');
    expect(text).not.toContain('Searched windows:');
  });

  it('keeps non-periodic nonlinear numeric-ready equations on bounded auto-search', () => {
    const result = solve('x^2+\\sin(x)=2');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected nonlinear numeric fallback success');
    }
    expect(result.solutionKind).toBe('approximate-numeric');
    expect(result.numericMethod).toBe('Real nonlinear bounded numeric search');
    const text = collectOutcomeText(result);
    expect(text).toContain('Searched windows: [-10, 10], [-100, 100].');
    expect(text).toContain('bounded real search');
  });

  it('keeps explicit numeric interval runs local to the chosen window', () => {
    const result = solve('\\tan(x)=1', {
      numericInterval: { start: '0', end: '10', subdivisions: 256 },
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected interval numeric success');
    }
    expect(result.solutionKind).toBe('approximate-numeric');
    expect(result.numericMethod).toBe('Bracket-first adaptive ITP + local-minimum recovery');
    const text = collectOutcomeText(result);
    expect(text).toContain('Roots are local to this chosen interval');
    expect(text).toContain('\\cos\\left(x\\right) \\ne0');
    expect(text).not.toContain('No default interval was searched.');
  });
});
