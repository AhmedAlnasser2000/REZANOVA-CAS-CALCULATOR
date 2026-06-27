import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { solveRischNormanSinCosAnsatz } from './integration/risch-norman/sincos-ansatz';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function solve(latex: string, variable = 'x') {
  return solveRischNormanSinCosAnsatz(node(latex), variable);
}

function compact(value: string) {
  return value.replace(/\s+/g, '');
}

function nonzeroFacts(result: ReturnType<typeof solve>) {
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error('expected ansatz success');
  }
  return result.facts
    .filter((fact) => fact.kind === 'nonzero')
    .map((fact) => compact(fact.expressionLatex));
}

describe('Risch-Norman sine/cosine ansatz', () => {
  it('solves symbolic-coefficient polynomial times affine sine candidates', () => {
    const result = solve('(c*x^2+d)\\sin(a*x+b)');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected ansatz success');
    }
    expect(result.family).toBe('affine-sin-cos');
    expect(result.source).toBe('Sin');
    expect(result.polynomialDegree).toBe(2);
    expect(compact(result.exactLatex)).toContain('\\sin');
    expect(compact(result.exactLatex)).toContain('\\cos');
    expect(result.exactLatex).not.toMatch(/\d+\.\d+/);
    expect(nonzeroFacts(result)).toContain('a');
  });

  it('solves symbolic-coefficient polynomial times affine cosine candidates', () => {
    const result = solve('(c*x^2+d*x+g)\\cos(a*x+b)');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected ansatz success');
    }
    expect(result.source).toBe('Cos');
    expect(result.polynomialDegree).toBe(2);
    expect(compact(result.exactLatex)).toContain('c');
    expect(compact(result.exactLatex)).toContain('d');
    expect(compact(result.exactLatex)).toContain('g');
    expect(nonzeroFacts(result)).toContain('a');
  });

  it('solves higher-degree exact-polynomial candidates through the paired span', () => {
    const result = solve('x^4\\sin(a*x+b)');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected ansatz success');
    }
    expect(result.polynomialDegree).toBe(4);
    expect(nonzeroFacts(result)).toContain('a');
  });

  it('honors arbitrary selected variables', () => {
    const result = solve('(c*t+d)\\cos(a*t+b)', 't');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected ansatz success');
    }
    expect(result.variable).toBe('t');
    expect(result.polynomialDegree).toBe(1);
    expect(nonzeroFacts(result)).toContain('a');
  });

  it('stops outside the first sine/cosine ansatz scope', () => {
    expect(solve('\\sin(x^2)')).toMatchObject({
      kind: 'stop',
      reason: 'non-affine-argument',
    });
    expect(solve('x\\sec(x)')).toMatchObject({
      kind: 'stop',
      reason: 'no-sin-cos-factor',
    });
    expect(solve('\\sin(x)\\cos(x)')).toMatchObject({
      kind: 'stop',
      reason: 'extra-trig-factor',
    });
    expect(solve('|x|\\sin(x)')).toMatchObject({
      kind: 'stop',
      reason: 'selected-variable-dependent-coefficient',
    });
  });
});
