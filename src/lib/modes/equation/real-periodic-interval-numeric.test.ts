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

describe('Equation real periodic interval numeric fallback', () => {
  it('asks for a real window when unsupported periodic numeric fallback has no interval', () => {
    const result = solve('\\sin(x!)=0');

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected periodic interval guidance');
    }
    expect(result.solutionKind).toBe('approximate-numeric');
    expect(result.answerDomain).toBe('real');
    expect(result.numericMethod).toBe('Real periodic interval numeric solve');
    expect(result.error).toContain('needs a real interval');
    const text = collectOutcomeText(result);
    expect(text).toContain('Periodic equations can have infinitely many roots');
    expect(text).toContain('No default interval was searched.');
    expect(text).toContain('Periodic carrier detected: Sin(x!).');
  });

  it('keeps exact symbolic periodic routes ahead of numeric guidance when they solve cleanly', () => {
    const result = solve('\\sin(x)=0');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected exact periodic success');
    }
    expect(result.solutionKind).not.toBe('approximate-numeric');
    expect(result.exactLatex).toContain('\\pi n');
  });

  it('enumerates local sine roots inside a chosen interval only', () => {
    const result = solve('\\sin(x)=0', 'x', {
      numericInterval: { start: '0', end: '10', subdivisions: 128 },
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected numeric interval success');
    }
    expect(result.solutionKind).toBe('approximate-numeric');
    expect(result.numericMethod).toBe('Bracket-first adaptive ITP + guarded Newton/secant acceleration + local-minimum recovery');
    expect(result.approxText).toContain('x ~= 0, 3.141593, 6.283185, 9.424778');
    const text = collectOutcomeText(result);
    expect(text).toContain('Roots are local to this chosen interval; this is not a claim of all real roots.');
    expect(text).toContain('Sin(x) carrier repeats every about 6.283185');
  });

  it('records trig pole facts while enumerating tangent roots in a chosen interval', () => {
    const result = solve('\\tan(x)=1', 'x', {
      numericInterval: { start: '0', end: '10', subdivisions: 256 },
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected numeric interval success');
    }
    expect(result.approxText).toContain('0.785398');
    expect(result.approxText).toContain('3.926991');
    expect(result.approxText).toContain('7.068583');
    const text = collectOutcomeText(result);
    expect(text).toContain('\\cos\\left(x\\right) \\ne0');
    expect(text).toContain('Tan(x) carrier repeats every about 3.141593');
  });

  it('rejects discontinuity candidates in periodic quotient interval searches', () => {
    const result = solve('\\frac{\\sin(x)}{x}=0', 'x', {
      numericInterval: { start: '-1', end: '10', subdivisions: 256 },
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected numeric interval success');
    }
    expect(result.approxText).not.toContain('x ~= 0');
    expect(result.approxText).toContain('3.141593');
    const text = collectOutcomeText(result);
    expect(text).toContain('x \\ne0');
    expect(text).toContain('x\\ne 0');
    expect(text).toContain('Sin(x) carrier repeats every about 6.283185');
  });

  it('keeps interval solving target-aware for non-x targets', () => {
    const result = solve('\\cos(z)=z', 'z', {
      numericInterval: { start: '0', end: '1', subdivisions: 128 },
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected numeric interval success');
    }
    expect(result.approxText).toContain('z ~= 0.739085');
    expect(collectOutcomeText(result)).toContain('Periodic carrier detected: Cos(z).');
  });

  it('caps very dense interval root readback and recommends narrowing the window', () => {
    const result = solve('\\sin(50x)=0', 'x', {
      numericInterval: { start: '0', end: '10', subdivisions: 4096 },
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected dense numeric interval success');
    }
    expect(result.branchReadback?.branchesLatex.length).toBeLessThanOrEqual(64);
    const text = collectOutcomeText(result);
    expect(text).toContain('showing the first 64');
    expect(text).toContain('Narrow the interval');
  });
});
