import { describe, expect, it } from 'vitest';
import {
  collectBoundedSymbolicTargetPolynomial,
  collectDirectSymbolicTargetPolynomial,
  multiplySymbolicPolynomials,
  scaleSymbolicPolynomial,
  symbolicPolynomialDegree,
  symbolicPolynomialFromDegree,
  symbolicPolynomialNeedsExplicitLatex,
  symbolicPolynomialToExplicitLatex,
  symbolicPolynomialToNode,
} from './symbolic-polynomial';

type TestReason =
  | 'target-in-denominator'
  | 'degree-limit'
  | 'target-in-unsupported-operation'
  | 'target-in-unsupported-power'
  | 'target-in-unsupported-family';

const messages = {
  targetInDenominator: {
    reason: 'target-in-denominator' as TestReason,
    message: 'target denominator',
  },
  degreeLimit: {
    reason: 'degree-limit' as TestReason,
    message: 'degree limit',
  },
  targetInUnsupportedExpression: {
    reason: 'target-in-unsupported-operation' as TestReason,
    message: 'unsupported expression',
  },
  targetInUnsupportedPower: {
    reason: 'target-in-unsupported-power' as TestReason,
    message: 'unsupported power',
  },
  targetInUnsupportedFamily: {
    reason: 'target-in-unsupported-family' as TestReason,
    message: 'unsupported family',
  },
};

function expectCollected(node: unknown) {
  const result = collectDirectSymbolicTargetPolynomial(node, 'z', messages);
  expect(result.kind).toBe('ok');
  if (result.kind !== 'ok') {
    throw new Error(`Expected collection, received ${result.reason}: ${result.message}`);
  }
  return result.polynomial;
}

describe('symbolic-polynomial seam', () => {
  it('adds and multiplies symbolic coefficients under the degree cap', () => {
    const linear = expectCollected(['Add', 'z', 'a']);
    const product = multiplySymbolicPolynomials(linear, linear, messages.degreeLimit);

    expect(product.kind).toBe('ok');
    if (product.kind !== 'ok') {
      throw new Error(`Expected product, received ${product.reason}: ${product.message}`);
    }
    expect(symbolicPolynomialDegree(product.polynomial)).toBe(2);
    expect(symbolicPolynomialToNode(product.polynomial, 'z')).toEqual([
      'Add',
      ['Power', 'a', 2],
      ['Power', 'z', 2],
      ['Multiply', 2, 'a', 'z'],
    ]);
  });

  it('reports degree-cap stops without expanding solver capability', () => {
    const quadratic = symbolicPolynomialFromDegree(2, 1);
    const linear = symbolicPolynomialFromDegree(1, 1);
    const result = multiplySymbolicPolynomials(quadratic, linear, messages.degreeLimit);

    expect(result).toEqual({
      kind: 'unsupported',
      reason: 'degree-limit',
      message: 'degree limit',
    });
  });

  it('scales target-free divisors into symbolic coefficients', () => {
    const collected = expectCollected(['Divide', 'z', 'a']);
    const scaled = scaleSymbolicPolynomial(symbolicPolynomialFromDegree(1, 1), 'a');

    expect(collected).toEqual(scaled);
    expect(symbolicPolynomialToNode(collected, 'z')).toEqual(['Divide', 'z', 'a']);
  });

  it('collects direct quadratic target powers for parameterized polynomial solving', () => {
    const collected = expectCollected(['Add', ['Power', 'z', 2], ['Multiply', 'a', 'z'], 'b']);

    expect(symbolicPolynomialDegree(collected)).toBe(2);
    expect(collected.terms[2]).toBe(1);
    expect(collected.terms[1]).toBe('a');
    expect(collected.terms[0]).toBe('b');
  });

  it('collects bounded polynomial bases for rational clearing', () => {
    const result = collectBoundedSymbolicTargetPolynomial(['Power', ['Add', 'z', 1], 2], 'z', messages);

    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') {
      throw new Error(`Expected collection, received ${result.reason}: ${result.message}`);
    }
    expect(symbolicPolynomialDegree(result.polynomial)).toBe(2);
    expect(symbolicPolynomialToNode(result.polynomial, 'z')).toEqual([
      'Add',
      ['Power', 'z', 2],
      ['Multiply', 2, 'z'],
      1,
    ]);
  });

  it('keeps unsupported denominator and function shapes distinct', () => {
    const denominator = collectDirectSymbolicTargetPolynomial(['Divide', 1, 'z'], 'z', messages);
    const functionTarget = collectBoundedSymbolicTargetPolynomial(['Sin', 'z'], 'z', messages);

    expect(denominator).toMatchObject({
      kind: 'unsupported',
      reason: 'target-in-denominator',
    });
    expect(functionTarget).toMatchObject({
      kind: 'unsupported',
      reason: 'target-in-unsupported-family',
    });
  });

  it('renders exp/log coefficients with explicit target products', () => {
    const polynomial = symbolicPolynomialFromDegree(1, ['Exp', 'b']);

    expect(symbolicPolynomialNeedsExplicitLatex(polynomial)).toBe(true);
    expect(symbolicPolynomialToExplicitLatex(polynomial, 'z')).toContain('\\cdot z');
  });
});
