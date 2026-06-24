import { describe, expect, it } from 'vitest';
import {
  collectBoundedNDegreeSymbolicTargetPolynomial,
  collectDirectNDegreeSymbolicTargetPolynomial,
  nDegreeSymbolicPolynomialDegree,
  nDegreeSymbolicPolynomialLeadingCoefficient,
  nDegreeSymbolicPolynomialNeedsExplicitLatex,
  nDegreeSymbolicPolynomialToExplicitLatex,
  nDegreeSymbolicPolynomialToNode,
} from './n-degree-symbolic-polynomial';

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

function expectDirectCollected(node: unknown) {
  const result = collectDirectNDegreeSymbolicTargetPolynomial(node, 'z', 4, messages);
  expect(result.kind).toBe('ok');
  if (result.kind !== 'ok') {
    throw new Error(`Expected collection, received ${result.reason}: ${result.message}`);
  }
  return result.polynomial;
}

describe('n-degree symbolic polynomial substrate', () => {
  it('collects direct cubic symbolic coefficients through degree 4', () => {
    const collected = expectDirectCollected([
      'Add',
      ['Multiply', 'a', ['Power', 'z', 3]],
      ['Multiply', 'b', 'z'],
      'c',
    ]);

    expect(nDegreeSymbolicPolynomialDegree(collected)).toBe(3);
    expect(nDegreeSymbolicPolynomialLeadingCoefficient(collected)).toBe('a');
    expect(collected.terms).toEqual(['c', 'b', 0, 'a', 0]);
    expect(nDegreeSymbolicPolynomialToNode(collected, 'z')).toEqual([
      'Add',
      ['Multiply', 'a', ['Power', 'z', 3]],
      ['Multiply', 'b', 'z'],
      'c',
    ]);
  });

  it('collects direct quartic symbolic coefficients through degree 4', () => {
    const collected = expectDirectCollected([
      'Add',
      ['Multiply', 'a', ['Power', 'z', 4]],
      ['Multiply', 'b', ['Power', 'z', 3]],
      ['Multiply', 'c', ['Power', 'z', 2]],
      ['Multiply', 'd', 'z'],
      'p',
    ]);

    expect(nDegreeSymbolicPolynomialDegree(collected)).toBe(4);
    expect(nDegreeSymbolicPolynomialLeadingCoefficient(collected)).toBe('a');
    expect(collected.terms).toEqual(['p', 'd', 'c', 'b', 'a']);
  });

  it('collects bounded polynomial bases inside the degree-4 cap', () => {
    const result = collectBoundedNDegreeSymbolicTargetPolynomial(['Power', ['Add', 'z', 'a'], 3], 'z', 4, messages);

    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') {
      throw new Error(`Expected collection, received ${result.reason}: ${result.message}`);
    }
    expect(nDegreeSymbolicPolynomialDegree(result.polynomial)).toBe(3);
    expect(nDegreeSymbolicPolynomialToNode(result.polynomial, 'z')).toEqual([
      'Add',
      ['Power', 'a', 3],
      ['Power', 'z', 3],
      ['Multiply', 3, 'z', ['Power', 'a', 2]],
      ['Multiply', 3, 'a', ['Power', 'z', 2]],
    ]);
  });

  it('reports degree-limit stops for degree 5 without adding solver capability', () => {
    const direct = collectDirectNDegreeSymbolicTargetPolynomial(['Power', 'z', 5], 'z', 4, messages);
    const bounded = collectBoundedNDegreeSymbolicTargetPolynomial(['Power', ['Add', 'z', 1], 5], 'z', 4, messages);

    expect(direct).toMatchObject({ kind: 'unsupported', reason: 'degree-limit' });
    expect(bounded).toMatchObject({ kind: 'unsupported', reason: 'degree-limit' });
  });

  it('preserves target denominator and function-shape stop families', () => {
    const denominator = collectDirectNDegreeSymbolicTargetPolynomial(['Divide', 1, 'z'], 'z', 4, messages);
    const functionTarget = collectBoundedNDegreeSymbolicTargetPolynomial(['Sin', 'z'], 'z', 4, messages);

    expect(denominator).toMatchObject({
      kind: 'unsupported',
      reason: 'target-in-denominator',
    });
    expect(functionTarget).toMatchObject({
      kind: 'unsupported',
      reason: 'target-in-unsupported-family',
    });
  });

  it('keeps explicit coefficient-times-target latex fallback available', () => {
    const polynomial = expectDirectCollected(['Multiply', ['Exp', 'b'], ['Power', 'z', 3]]);

    expect(nDegreeSymbolicPolynomialNeedsExplicitLatex(polynomial)).toBe(true);
    expect(nDegreeSymbolicPolynomialToExplicitLatex(polynomial, 'z')).toContain('\\cdot z^3');
  });
});
