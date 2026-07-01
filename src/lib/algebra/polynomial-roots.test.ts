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

  it('solves linear roots', () => {
    expectRootStrings([2, -6], ['3.0000,0.0000']);
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

  it('solves higher-degree numeric polynomial roots within the Equation budget', () => {
    const result = solvePolynomialRoots({ coefficients: [1, 0, 0, 0, 0, 0, -1, -5] });
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success result');
    }

    const realRoots = result.roots.filter((root) => Math.abs(root.im) < 1e-7);
    expect(realRoots).toHaveLength(1);
    expect(realRoots[0].re).toBeCloseTo(1.3007656097, 9);
    expect(result.diagnostics.method).toBe('aberth-ehrlich');
    expect(result.diagnostics.maxResidual).toBeLessThan(1e-8);
  });

  it('computes complex roots internally for quartics without real roots', () => {
    const result = solvePolynomialRoots({ coefficients: [1, 0, 0, 0, 1] });
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success result');
    }

    const formatted = result.roots.map((root) => `${root.re.toFixed(4)},${root.im.toFixed(4)}`);
    expect(formatted).toEqual([
      '-0.7071,-0.7071',
      '-0.7071,0.7071',
      '0.7071,-0.7071',
      '0.7071,0.7071',
    ]);
    expect(result.diagnostics.method).toBe('aberth-ehrlich');
    expect(result.diagnostics.warningLines.join(' ')).not.toContain('Higher precision');
  });

  it('dedupes repeated numeric roots while recording the cluster signal', () => {
    const result = solvePolynomialRoots({ coefficients: [1, 0, -3, 2] });
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success result');
    }

    const formatted = result.roots.map((root) => `${root.re.toFixed(4)},${root.im.toFixed(4)}`);
    expect(formatted).toEqual(['-2.0000,0.0000', '1.0000,0.0000']);
    expect(result.diagnostics.rootCountBeforeDedupe).toBeGreaterThan(result.diagnostics.rootCountAfterDedupe);
    expect(result.diagnostics.warningLines.join(' ')).toContain('Repeated or tightly clustered');
  });

  it('warns when roots are tightly clustered', () => {
    const result = solvePolynomialRoots({ coefficients: [1, -2.0005, 1.0005] });
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success result');
    }

    expect(result.roots).toHaveLength(2);
    expect(result.diagnostics.clusteredRootCount).toBeGreaterThan(0);
    expect(result.diagnostics.minimumRootSeparation).not.toBeNull();
    expect(result.diagnostics.minimumRootSeparation ?? 1).toBeLessThan(1e-3);
    expect(result.diagnostics.warningLines.join(' ')).toContain('Repeated or tightly clustered');
    expect(result.diagnostics.warningLines.join(' ')).toContain('Higher precision');
  });

  it('reports conditioning warnings for badly scaled coefficients', () => {
    const result = solvePolynomialRoots({ coefficients: [1e15, 0, -1] });
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success result');
    }

    expect(result.diagnostics.coefficientScaleRatio).toBeGreaterThan(1e12);
    expect(result.diagnostics.warningLines.join(' ')).toContain('Large coefficient scale ratio');
    expect(result.diagnostics.warningLines.join(' ')).toContain('Higher precision');
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
