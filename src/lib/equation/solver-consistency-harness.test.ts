import { describe, expect, it } from 'vitest';
import { runNumericIntervalSolve } from './numeric-interval-solve';
import { validateCandidateRoots } from './candidate-validation';
import { runEquationMode } from '../modes/equation';
import { makeRequest } from '../modes/equation/test-support';

function normalSolve(latex: string) {
  return runEquationMode({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex: latex,
    equationSolveTarget: 'x',
    equationAnswerMode: 'exact',
    equationDomainIntent: 'real',
    angleUnit: 'rad',
  });
}

function intervalSolve(latex: string, start: string, end: string, subdivisions = 256) {
  return runNumericIntervalSolve(latex, { start, end, subdivisions }, [], 'rad');
}

function expectNumericRoots(latex: string, roots: number[]) {
  const validation = validateCandidateRoots(latex, roots, [], 'numeric-interval', 'rad');
  expect(validation.rejected).toHaveLength(0);
  expect(validation.accepted).toHaveLength(roots.length);
}

function expectNearRoot(roots: number[], expected: number, tolerance = 1e-5) {
  expect(roots.some((root) => Math.abs(root - expected) <= tolerance)).toBe(true);
}

describe('Equation solver consistency harness', () => {
  it('keeps exact finite roots consistent with explicit interval roots', () => {
    const exact = normalSolve('x^2-4=0');
    const interval = intervalSolve('x^2-4=0', '-3', '3');

    expect(exact.kind).toBe('success');
    expect(interval.kind).toBe('success');
    if (exact.kind !== 'success' || interval.kind !== 'success') {
      throw new Error('Expected exact and interval successes');
    }

    expect(exact.exactLatex).toContain('-2');
    expect(exact.exactLatex).toContain('2');
    expect(interval.roots).toHaveLength(2);
    expectNearRoot(interval.roots, -2);
    expectNearRoot(interval.roots, 2);
    expectNumericRoots('x^2-4=0', interval.roots);
  });

  it('keeps deterministic numeric fallback consistent with explicit interval roots', () => {
    const normal = normalSolve('x^7-x=5');
    const interval = intervalSolve('x^7-x=5', '0', '2');

    expect(normal.kind).toBe('success');
    expect(interval.kind).toBe('success');
    if (normal.kind !== 'success' || interval.kind !== 'success') {
      throw new Error('Expected normal and interval successes');
    }

    expectNearRoot(normal.candidateValues ?? [], 1.3007656097, 1e-8);
    expectNearRoot(interval.roots, 1.3007656097, 1e-6);
    expectNumericRoots('x^7-x=5', interval.roots);
  });

  it('keeps exact no-solution cases from producing interval roots', () => {
    const exact = normalSolve('\\left|x-2\\right|=-3');
    const interval = intervalSolve('\\left|x-2\\right|=-3', '-10', '10');

    expect(exact.kind).toBe('success');
    expect(interval.kind).toBe('error');
    if (exact.kind !== 'success' || interval.kind !== 'error') {
      throw new Error('Expected exact empty-set success and interval error');
    }
    expect(exact.exactLatex).toBe('\\varnothing');
    expect(exact.solveBadges).toContain('Range Guard');
    expect(exact.warnings?.join(' ')).toContain('No real solutions');
    expect(interval.error).toContain('No bracketed or near-zero real roots');
  });

  it('keeps rational interval roots validated against the original equation', () => {
    const exact = normalSolve('\\frac{x^2-4}{x-2}=0');
    const interval = intervalSolve('\\frac{x^2-4}{x-2}=0', '-4', '4');

    expect(exact.kind).toBe('success');
    expect(interval.kind).toBe('success');
    if (exact.kind !== 'success' || interval.kind !== 'success') {
      throw new Error('Expected exact and interval successes');
    }

    expect(exact.exactLatex).toContain('-2');
    expect(exact.exactLatex).not.toContain('x=2');
    expect(interval.roots).toHaveLength(1);
    expectNearRoot(interval.roots, -2);
    expect(interval.rejectedCandidates?.some((candidate) => Math.abs(candidate.value - 2) < 1e-6)).toBe(true);
    expectNumericRoots('\\frac{x^2-4}{x-2}=0', interval.roots);
  });

  it('keeps discontinuity-heavy nonlinear roots consistent between auto-search and interval search', () => {
    const latex = '\\ln\\left(x-1\\right)+\\frac{1}{x-2}=3';
    const normal = normalSolve(latex);
    const interval = intervalSolve(latex, '1.1', '25', 512);

    expect(normal.kind).toBe('success');
    expect(interval.kind).toBe('success');
    if (normal.kind !== 'success' || interval.kind !== 'success') {
      throw new Error('Expected normal and interval successes');
    }

    expectNearRoot(normal.candidateValues ?? [], 2.372685, 1e-5);
    expectNearRoot(normal.candidateValues ?? [], 20.00011, 1e-4);
    expectNearRoot(interval.roots, 2.372685, 1e-5);
    expectNearRoot(interval.roots, 20.00011, 1e-4);
    expect(interval.rejectedCandidates?.some((candidate) => Math.abs(candidate.value - 2) < 1e-6)).toBe(true);
    expectNumericRoots(latex, interval.roots);
  });

  it('keeps exact periodic families consistent with local interval roots', () => {
    const exact = normalSolve('\\frac{\\sin\\left(x\\right)}{x}=0');
    const interval = intervalSolve('\\frac{\\sin\\left(x\\right)}{x}=0', '0', '10', 512);

    expect(exact.kind).toBe('success');
    expect(interval.kind).toBe('success');
    if (exact.kind !== 'success' || interval.kind !== 'success') {
      throw new Error('Expected exact and interval successes');
    }

    expect(exact.exactLatex).toMatch(/(?:k\\pi|\\pi n)/);
    expect(interval.roots.some((root) => Math.abs(root) < 1e-6)).toBe(false);
    expectNearRoot(interval.roots, Math.PI, 1e-5);
    expectNearRoot(interval.roots, 2 * Math.PI, 1e-5);
    expectNearRoot(interval.roots, 3 * Math.PI, 1e-5);
    expectNumericRoots('\\frac{\\sin\\left(x\\right)}{x}=0', interval.roots);
  });

  it('collapses repeated-root interval clusters to one representative numeric root', () => {
    const exact = normalSolve('\\left(x-1\\right)^3\\left(x+2\\right)^2=0');
    const interval = intervalSolve('\\left(x-1\\right)^3\\left(x+2\\right)^2=0', '-5', '5');

    expect(exact.kind).toBe('success');
    expect(interval.kind).toBe('success');
    if (exact.kind !== 'success' || interval.kind !== 'success') {
      throw new Error('Expected exact and interval successes');
    }

    expect(exact.exactLatex).toContain('-2');
    expect(exact.exactLatex).toContain('1');
    expect(interval.roots).toHaveLength(2);
    expectNearRoot(interval.roots, -2, 1e-6);
    expectNearRoot(interval.roots, 1, 2e-3);
    expectNumericRoots('\\left(x-1\\right)^3\\left(x+2\\right)^2=0', interval.roots);
  });
});
