import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { solveRischNormanLogCorrection } from './integration/risch-norman/log-correction';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function solve(latex: string, variable = 'x') {
  return solveRischNormanLogCorrection(node(latex), variable);
}

function compact(value: string) {
  return value.replace(/\s+/g, '');
}

function success(result: ReturnType<typeof solve>) {
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error('expected log-correction success');
  }
  return result;
}

function factExpressions(result: ReturnType<typeof solve>, kind?: 'nonzero' | 'positive') {
  const solved = success(result);
  return solved.facts
    .filter((fact) => kind === undefined || fact.kind === kind)
    .map((fact) => compact(fact.expressionLatex));
}

describe('Risch-Norman affine-log correction', () => {
  it('solves polynomial times symbolic affine natural-log candidates', () => {
    const result = success(solve('x^2\\ln(a*x+b)'));

    expect(result.family).toBe('affine-log-correction');
    expect(result.source).toBe('Ln');
    expect(result.polynomialDegree).toBe(2);
    expect(compact(result.exactLatex)).toContain('\\ln(ax+b)');
    expect(result.exactLatex).not.toMatch(/\d+\.\d+/);
    expect(factExpressions(result, 'nonzero')).toContain('a');
    expect(factExpressions(result, 'positive')).toContain('ax+b');
  });

  it('solves symbolic-coefficient polynomial times affine logs', () => {
    const linear = success(solve('(c*x+d)\\ln(a*x+b)'));
    expect(linear.polynomialDegree).toBe(1);
    expect(compact(linear.exactLatex)).toContain('c');
    expect(compact(linear.exactLatex)).toContain('d');
    expect(factExpressions(linear, 'positive')).toContain('ax+b');

    const baseTen = success(solve('(c*x^2+d*x+g)\\log(a*x+b)'));
    expect(baseTen.source).toBe('Log');
    expect(baseTen.polynomialDegree).toBe(2);
    expect(compact(baseTen.exactLatex)).toContain('\\ln(10)');
    expect(baseTen.exactLatex).not.toMatch(/\d+\.\d+/);
  });

  it('honors arbitrary selected variables', () => {
    const result = success(solve('t^2\\ln(a*t+b)', 't'));

    expect(result.variable).toBe('t');
    expect(result.polynomialDegree).toBe(2);
    expect(factExpressions(result, 'nonzero')).toContain('a');
  });

  it('stops outside the first affine-log correction scope', () => {
    expect(solve('x^2\\ln(x^2+b)')).toMatchObject({
      kind: 'stop',
      reason: 'non-affine-argument',
    });
    expect(solve('x^2\\ln(\\sin(x))')).toMatchObject({
      kind: 'stop',
      reason: 'non-affine-argument',
    });
    expect(solve('|x|\\ln(a*x+b)')).toMatchObject({
      kind: 'stop',
      reason: 'selected-variable-dependent-coefficient',
    });
  });
});
