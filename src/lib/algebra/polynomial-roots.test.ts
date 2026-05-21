import { describe, expect, it } from 'vitest';
import { solvePolynomialRoots } from './polynomial-roots';

function expectRootStrings(coefficients: number[], expected: string[]) {
  const result = solvePolynomialRoots({ coefficients });
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error('Expected a success result');
  }

  const formatted = result.roots.map((root) => `${root.re.toFixed(4)},${root.im.toFixed(4)}`);
  expect(formatted).toEqual(expected);
}

describe('solvePolynomialRoots', () => {
  it('solves quadratic complex roots', () => {
    expectRootStrings([1, 2, 2], ['-1.0000,-1.0000', '-1.0000,1.0000']);
  });

  it('solves cubic real roots', () => {
    expectRootStrings([1, -6, 11, -6], ['1.0000,0.0000', '2.0000,0.0000', '3.0000,0.0000']);
  });

  it('solves quartic real roots', () => {
    expectRootStrings([1, 0, -5, 0, 4], ['-2.0000,0.0000', '-1.0000,0.0000', '1.0000,0.0000', '2.0000,0.0000']);
  });

  it('solves quartic complex roots', () => {
    const result = solvePolynomialRoots({ coefficients: [5, -6, 5, 4, 1] });
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success result');
    }

    const formatted = result.roots.map((root) => `${root.re.toFixed(4)},${root.im.toFixed(4)}`);
    expect(formatted).toEqual([
      '-0.2703,-0.1901',
      '-0.2703,0.1901',
      '0.8703,-1.0365',
      '0.8703,1.0365',
    ]);
  });

  it('rejects a zero leading coefficient', () => {
    const result = solvePolynomialRoots({ coefficients: [0, 2, 1] });
    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error result');
    }
    expect(result.error).toContain('Leading coefficient');
  });
});
