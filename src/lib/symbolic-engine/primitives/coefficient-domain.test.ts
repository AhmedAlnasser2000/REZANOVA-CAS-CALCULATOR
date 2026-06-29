import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  addSymbolicCoefficients,
  divideSymbolicCoefficients,
  isSymbolicCoefficientOne,
  isSymbolicCoefficientZero,
  multiplySymbolicCoefficients,
  oneSymbolicCoefficient,
  parseSymbolicCoefficient,
  subtractSymbolicCoefficients,
  zeroSymbolicCoefficient,
} from './coefficient-domain';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function coefficient(latex: string, variable = 'x') {
  const result = parseSymbolicCoefficient(node(latex), variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected coefficient for ${latex}`);
  }
  return result.coefficient;
}

function stopReason(latex: string, variable = 'x') {
  const result = parseSymbolicCoefficient(node(latex), variable);
  expect(result.kind).toBe('stop');
  if (result.kind !== 'stop') {
    throw new Error(`expected stop for ${latex}`);
  }
  return result.reason;
}

function compact(value: string) {
  return value.replace(/\s+/g, '');
}

describe('shared symbolic coefficient domain', () => {
  it('accepts exact-rational and target-free symbolic coefficients', () => {
    const sum = coefficient('c+d');
    const product = coefficient('a*b');
    const reciprocal = coefficient('\\frac{1}{a+b}');

    expect(compact(sum.latex)).toBe('c+d');
    expect(compact(product.latex)).toBe('ab');
    expect(reciprocal.facts).toContainEqual({
      kind: 'nonzero',
      expressionLatex: 'a+b',
      relation: '\\ne0',
    });
  });

  it('supports scoped arithmetic and denominator facts', () => {
    const a = coefficient('a');
    const b = coefficient('b');
    const c = coefficient('c');

    const sum = addSymbolicCoefficients(a, b, 'x');
    expect(sum.kind).toBe('success');
    if (sum.kind !== 'success') {
      throw new Error('expected sum');
    }
    expect(compact(sum.coefficient.latex)).toBe('a+b');

    const product = multiplySymbolicCoefficients(sum.coefficient, c, 'x');
    expect(product.kind).toBe('success');
    if (product.kind !== 'success') {
      throw new Error('expected product');
    }
    expect(compact(product.coefficient.latex)).toContain('c');

    const difference = subtractSymbolicCoefficients(sum.coefficient, a, 'x');
    expect(difference.kind).toBe('success');
    if (difference.kind !== 'success') {
      throw new Error('expected difference');
    }
    expect(difference.coefficient.latex).toContain('b');

    const quotient = divideSymbolicCoefficients(product.coefficient, sum.coefficient, 'x');
    expect(quotient.kind).toBe('success');
    if (quotient.kind !== 'success') {
      throw new Error('expected quotient');
    }
    expect(quotient.coefficient.facts).toContainEqual({
      kind: 'nonzero',
      expressionLatex: sum.coefficient.latex,
      relation: '\\ne0',
    });
  });

  it('exposes zero and one helpers', () => {
    const zero = zeroSymbolicCoefficient('x');
    const one = oneSymbolicCoefficient('x');

    expect(zero.kind).toBe('success');
    expect(one.kind).toBe('success');
    if (zero.kind !== 'success' || one.kind !== 'success') {
      throw new Error('expected constants');
    }
    expect(isSymbolicCoefficientZero(zero.coefficient)).toBe(true);
    expect(isSymbolicCoefficientOne(one.coefficient)).toBe(true);
  });

  it('rejects coefficients outside the shared symbolic scope', () => {
    expect(stopReason('x+a')).toBe('selected-variable-dependent-coefficient');
    expect(stopReason('2.5')).toBe('inexact-coefficient');
    expect(stopReason('|a|')).toBe('branch-sensitive');
    expect(stopReason('\\sin(a)')).toBe('unsupported-transcendental-coefficient');
    expect(stopReason('\\ln(a)')).toBe('unsupported-transcendental-coefficient');
    expect(stopReason('e^a')).toBe('unsupported-transcendental-coefficient');
    expect(stopReason('\\frac{1}{0}')).toBe('zero-denominator');
  });
});
