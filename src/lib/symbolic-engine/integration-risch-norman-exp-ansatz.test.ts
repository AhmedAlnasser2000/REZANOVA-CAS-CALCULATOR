import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { solveRischNormanExponentialAnsatz } from './integration/risch-norman/exponential-ansatz';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function solve(latex: string, variable = 'x') {
  return solveRischNormanExponentialAnsatz(node(latex), variable);
}

function compact(value: string) {
  return value.replace(/\s+/g, '');
}

function factExpressions(result: ReturnType<typeof solve>, kind?: 'nonzero' | 'positive' | 'nonunit') {
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error('expected ansatz success');
  }
  return result.facts
    .filter((fact) => kind === undefined || fact.kind === kind)
    .map((fact) => compact(fact.expressionLatex));
}

describe('Risch-Norman exponential ansatz', () => {
  it('solves polynomial times symbolic affine exponential candidates', () => {
    const result = solve('x^3 e^{a*x+b}');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected ansatz success');
    }
    expect(result.family).toBe('affine-exp');
    expect(result.polynomialDegree).toBe(3);
    expect(compact(result.exactLatex)).toContain('e^{ax+b}');
    expect(factExpressions(result, 'nonzero')).toContain('a');
  });

  it('solves symbolic-coefficient polynomial times affine exponential candidates', () => {
    const result = solve('(c*x^2+d*x+g)e^{a*x+b}');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected ansatz success');
    }
    expect(result.family).toBe('affine-exp');
    expect(result.polynomialDegree).toBe(2);
    expect(compact(result.exactLatex)).toContain('c');
    expect(compact(result.exactLatex)).toContain('d');
    expect(compact(result.exactLatex)).toContain('g');
    expect(result.exactLatex).not.toMatch(/\d+\.\d+/);
    expect(factExpressions(result, 'nonzero')).toContain('a');
  });

  it('solves exact numeric positive-base exponential candidates', () => {
    const result = solve('x^2 2^{3*x-1}');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected ansatz success');
    }
    expect(result.family).toBe('positive-base-exp');
    expect(compact(result.exactLatex)).toContain('2^{3x-1}');
    expect(compact(result.exactLatex)).toContain('\\ln(2)');
    expect(factExpressions(result, 'nonzero')).toContain('3');
    expect(factExpressions(result, 'positive')).toContain('2');
    expect(factExpressions(result, 'nonunit')).toContain('2');
  });

  it('solves symbolic positive-base exponential candidates with visible base facts', () => {
    const result = solve('(c*x+d)q^{a*x+b}');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected ansatz success');
    }
    expect(result.family).toBe('positive-base-exp');
    expect(compact(result.exactLatex)).toContain('q^{ax+b}');
    expect(compact(result.exactLatex)).toContain('\\ln(q)');
    expect(factExpressions(result, 'nonzero')).toContain('a');
    expect(factExpressions(result, 'positive')).toContain('q');
    expect(factExpressions(result, 'nonunit')).toContain('q');
  });

  it('honors arbitrary selected variables in the candidate parser', () => {
    const result = solve('(c*t+d)e^{a*t+b}', 't');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected ansatz success');
    }
    expect(result.variable).toBe('t');
    expect(result.polynomialDegree).toBe(1);
    expect(factExpressions(result, 'nonzero')).toContain('a');
  });

  it('stops outside the first exponential ansatz scope', () => {
    expect(solve('2.5^x')).toMatchObject({
      kind: 'stop',
      reason: 'coefficient-stop',
      coefficientReason: 'inexact-coefficient',
    });
    expect(solve('e^{x^2}')).toMatchObject({
      kind: 'stop',
      reason: 'non-affine-exponent',
    });
    expect(solve('e^{a*x+b}\\sin(x)')).toMatchObject({
      kind: 'stop',
      reason: 'selected-variable-dependent-coefficient',
    });
    expect(solve('1^x')).toMatchObject({
      kind: 'stop',
      reason: 'invalid-base',
    });
  });
});
