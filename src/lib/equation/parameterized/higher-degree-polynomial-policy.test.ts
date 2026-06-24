import { describe, expect, it } from 'vitest';
import { nDegreeSymbolicPolynomialDegree } from './n-degree-symbolic-polynomial';
import { inspectHigherDegreePolynomialEquation } from './higher-degree-polynomial-policy';

describe('higher-degree polynomial policy inspector', () => {
  it('reports cubic formulas as ready for the Complex Cardano route without solving', () => {
    const result = inspectHigherDegreePolynomialEquation('a*z^3+b*z+c=0', 'z');

    expect(result).toMatchObject({
      kind: 'ready',
      reason: 'complex-cardano-ready',
      algorithm: 'cardano',
      degree: 3,
      domain: 'complex',
      target: 'z',
      parameterNames: ['a', 'b', 'c'],
    });
    if (result.kind !== 'ready') {
      throw new Error(`Expected ready policy, received ${result.kind}`);
    }
    expect(nDegreeSymbolicPolynomialDegree(result.polynomial)).toBe(3);
    expect(result.message).toContain('Complex Exact Cardano');
  });

  it('blocks quartic formulas as Ferrari-prereq work without solving', () => {
    const result = inspectHigherDegreePolynomialEquation('a*z^4+b*z^3+c*z^2+d*z+p=0', 'z');

    expect(result).toMatchObject({
      kind: 'blocked',
      reason: 'formula-deferred',
      algorithm: 'ferrari',
      degree: 4,
      target: 'z',
      parameterNames: ['a', 'b', 'c', 'd', 'p'],
    });
    if (result.kind !== 'blocked') {
      throw new Error(`Expected blocked policy, received ${result.kind}`);
    }
    expect(nDegreeSymbolicPolynomialDegree(result.polynomial)).toBe(4);
    expect(result.message).toContain('Ferrari prerequisites');
  });

  it('keeps degree-2 and lower equations not applicable', () => {
    const quadratic = inspectHigherDegreePolynomialEquation('a*z^2+b*z+c=0', 'z');

    expect(quadratic).toMatchObject({
      kind: 'not-applicable',
      reason: 'degree-below-threshold',
      degree: 2,
    });
  });

  it('returns explicit unsupported reasons for shapes outside the substrate', () => {
    expect(inspectHigherDegreePolynomialEquation('z^5+a=0', 'z')).toMatchObject({
      kind: 'unsupported',
      reason: 'degree-limit',
    });
    expect(inspectHigherDegreePolynomialEquation('\\frac{1}{z}=a', 'z')).toMatchObject({
      kind: 'unsupported',
      reason: 'target-in-denominator',
    });
    expect(inspectHigherDegreePolynomialEquation('\\sin\\left(z\\right)=a', 'z')).toMatchObject({
      kind: 'unsupported',
      reason: 'target-in-unsupported-family',
    });
  });
});
