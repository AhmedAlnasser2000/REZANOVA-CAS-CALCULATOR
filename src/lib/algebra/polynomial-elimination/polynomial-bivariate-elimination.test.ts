import { describe, expect, it } from 'vitest';
import type { ExactScalar } from '../polynomial-core';
import {
  getProjectedPolynomialCoefficient,
  projectBivariateResultant,
  type BivariateResultantSuccess,
} from '../polynomial-bivariate-elimination';
import type { StoredVariableValue } from '../../../types/calculator';

const scalar = (numerator: number, denominator = 1): ExactScalar => ({ numerator, denominator });

function expectSuccess(result: ReturnType<typeof projectBivariateResultant>): BivariateResultantSuccess {
  if (result.kind !== 'success') {
    throw new Error(`expected success, got ${result.kind}:${result.reason}`);
  }
  return result;
}

describe('POLY-ELIM2 bivariate resultant projection', () => {
  it('projects two linear bivariate equations onto the retained variable', () => {
    const result = expectSuccess(projectBivariateResultant('x+y-3', 'x-y-1', 'x', 'y'));

    expect(result.projectedLatex).toBe('x-2');
    expect(result.leftDegree).toBe(1);
    expect(result.rightDegree).toBe(1);
    expect(result.sylvesterDimension).toBe(2);
    expect(getProjectedPolynomialCoefficient(result, 1)).toEqual(scalar(1));
    expect(getProjectedPolynomialCoefficient(result, 0)).toEqual(scalar(-2));
  });

  it('projects nonlinear retained-variable coefficients', () => {
    const result = expectSuccess(projectBivariateResultant('y-x^2', 'y-1', 'x', 'y'));

    expect(result.projectedLatex).toBe('x^2-1');
    expect(getProjectedPolynomialCoefficient(result, 2)).toEqual(scalar(1));
    expect(getProjectedPolynomialCoefficient(result, 0)).toEqual(scalar(-1));
  });

  it('uses stored numeric constants while protecting retained and eliminated variables', () => {
    const storedVariables: StoredVariableValue[] = [
      { name: 'a', valueLatex: '2', numericValue: 2 },
      { name: 'x', valueLatex: '99', numericValue: 99 },
      { name: 'y', valueLatex: '88', numericValue: 88 },
    ];
    const result = expectSuccess(projectBivariateResultant(
      'a*x+y-3',
      'x-y-1',
      'x',
      'y',
      { storedVariables },
    ));

    expect(result.projectedLatex).toBe('3x-4');
    expect(result.substitutions).toEqual([{ name: 'a', valueLatex: '2', numericValue: 2 }]);
    expect(result.protectedSubstitutions).toEqual([
      { name: 'x', valueLatex: '99', numericValue: 99 },
      { name: 'y', valueLatex: '88', numericValue: 88 },
    ]);
  });

  it('exact-rationalizes decimal, scientific, and rational stored constants', () => {
    const storedVariables: StoredVariableValue[] = [
      { name: 'a', valueLatex: '1.5', numericValue: 1.5 },
      { name: 'b', valueLatex: '0.25', numericValue: 0.25 },
      { name: 'c', valueLatex: '\\frac{1}{4}', numericValue: 0.25 },
    ];
    const result = expectSuccess(projectBivariateResultant(
      'a*x+y-b-c',
      'x-y-1',
      'x',
      'y',
      { storedVariables },
    ));

    expect(result.projectedLatex).toBe('5x-3');
    expect(result.substitutions.map((entry) => entry.name)).toEqual(['a', 'b', 'c']);
  });

  it('rejects unsupported symbolic parameters that were not stored constants', () => {
    expect(projectBivariateResultant('x+y+z', 'x-y-1', 'x', 'y')).toEqual({
      kind: 'stop',
      reason: 'unsupported-symbolic-parameter',
      symbols: ['z'],
    });
  });

  it('returns controlled stops for bounded projection limits', () => {
    expect(projectBivariateResultant('y^5+x', 'y-1', 'x', 'y')).toEqual({
      kind: 'stop',
      reason: 'degree-limit',
    });

    expect(projectBivariateResultant('(x+1)*(x+2)*(x+3)*(x+4)+y', 'y-1', 'x', 'y', {
      maxTerms: 3,
    })).toEqual({
      kind: 'stop',
      reason: 'term-limit',
    });

    expect(projectBivariateResultant('1000*x+y', 'x-y-1', 'x', 'y', {
      maxScalarAbs: 10,
    })).toEqual({
      kind: 'stop',
      reason: 'scalar-growth-limit',
    });

    expect(projectBivariateResultant('0', 'y-1', 'x', 'y')).toEqual({
      kind: 'stop',
      reason: 'zero-polynomial',
    });

    expect(projectBivariateResultant('x+1', 'y-1', 'x', 'y')).toEqual({
      kind: 'stop',
      reason: 'constant-polynomial',
    });

    expect(projectBivariateResultant('y^3+x', 'y^3-x', 'x', 'y', {
      maxSylvesterDimension: 5,
    })).toEqual({
      kind: 'stop',
      reason: 'sylvester-dimension-limit',
    });

    expect(projectBivariateResultant('x+y-3', 'x+y-3', 'x', 'y')).toEqual({
      kind: 'stop',
      reason: 'projection-ambiguity',
    });

    expect(projectBivariateResultant('y-x^2-44', 'y-x^2-5', 'x', 'y')).toEqual({
      kind: 'stop',
      reason: 'constant-polynomial',
      constantContext: 'resultant',
    });
  });

  it('stops when stored constants cannot be represented safely', () => {
    expect(projectBivariateResultant('a*x+y', 'x-y-1', 'x', 'y', {
      storedVariables: [{ name: 'a', valueLatex: '1000000000000', numericValue: 1_000_000_000_000 }],
      maxScalarAbs: 10,
    })).toEqual({
      kind: 'stop',
      reason: 'stored-constant-unsafe',
      storedVariable: 'a',
    });
  });
});
