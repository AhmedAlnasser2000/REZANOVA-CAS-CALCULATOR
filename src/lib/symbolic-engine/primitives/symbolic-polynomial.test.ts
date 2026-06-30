import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  buildSymbolicPolynomialNode,
  derivativeSymbolicPolynomial,
  divideSymbolicPolynomials,
  parseSymbolicPolynomial,
  resultantSymbolicPolynomials,
  squarefreeReadinessSymbolicPolynomial,
} from './symbolic-polynomial';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function compact(value: string) {
  return value.replace(/\s+/g, '');
}

function latex(value: unknown) {
  return compact(ce.box(value as Parameters<typeof ce.box>[0]).latex);
}

function polynomial(latexInput: string, variable = 'x', maxDegree = 8) {
  const parsed = parseSymbolicPolynomial(node(latexInput), variable, maxDegree);
  expect(parsed.kind).toBe('success');
  if (parsed.kind !== 'success') {
    throw new Error(`expected polynomial for ${latexInput}`);
  }
  return parsed.polynomial;
}

describe('shared symbolic polynomial primitives', () => {
  it('parses and builds bounded polynomials with target-free coefficients', () => {
    const parsed = polynomial('a*x^2+b*x+c');

    expect(parsed.degree).toBe(2);
    expect(latex(buildSymbolicPolynomialNode(parsed))).toContain('ax^2');
  });

  it('parses negative monomial terms without treating them as coefficients', () => {
    const parsed = polynomial('-x^2+2*x-1');

    expect(parsed.degree).toBe(2);
    expect(latex(buildSymbolicPolynomialNode(parsed))).toContain('-x^2');
  });

  it('differentiates symbolic polynomials in the selected variable', () => {
    const derivative = derivativeSymbolicPolynomial(polynomial('a*x^3+b*x+c'));

    expect(derivative.kind).toBe('success');
    if (derivative.kind !== 'success') {
      throw new Error('expected derivative');
    }
    expect(latex(buildSymbolicPolynomialNode(derivative.polynomial))).toContain('3ax^2');
  });

  it('performs exact coefficient-field division with denominator facts', () => {
    const divided = divideSymbolicPolynomials(polynomial('x^2-1'), polynomial('x-1'));

    expect(divided.kind).toBe('success');
    if (divided.kind !== 'success') {
      throw new Error('expected division');
    }
    expect(divided.remainder.degree).toBe(0);
    expect(latex(buildSymbolicPolynomialNode(divided.quotient))).toContain('x+1');
  });

  it('reports squarefree readiness for simple repeated symbolic factors', () => {
    const readiness = squarefreeReadinessSymbolicPolynomial(polynomial('(x-a)^2'));

    expect(readiness.kind).toBe('success');
    if (readiness.kind !== 'success') {
      throw new Error('expected squarefree readiness');
    }
    expect(readiness.squarefree).toBe(false);
    expect(readiness.repeatedFactor?.degree).toBe(1);
  });

  it('computes bounded symbolic Sylvester resultants', () => {
    const result = resultantSymbolicPolynomials(polynomial('x-a'), polynomial('x-b'));

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected resultant');
    }
    expect(compact(result.resultant.latex)).toBe('a-b');
    expect(result.sylvesterMatrix).toHaveLength(2);
  });

  it('stops on unsupported or over-cap symbolic polynomial cases', () => {
    expect(parseSymbolicPolynomial(node('\\sin(a)*x+1'), 'x').kind).toBe('stop');
    expect(parseSymbolicPolynomial(node('x^9+1'), 'x', 8)).toEqual({
      kind: 'stop',
      reason: 'over-cap-degree',
    });
    expect(resultantSymbolicPolynomials(polynomial('x^4+a'), polynomial('x^4+b'), {
      maxSylvesterDimension: 6,
    })).toEqual({
      kind: 'stop',
      reason: 'sylvester-dimension-limit',
    });
  });
});
