import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  exactPolynomialDegree,
  getExactPolynomialCoefficient,
  type ExactScalar,
} from '../../../algebra/polynomial-core';
import type { StoredVariableValue } from '../../../../types/calculator';
import { eliminateBivariateResultantNodes, type SymbolicEliminationSuccess } from './elimination';

const ce = new ComputeEngine();
const scalar = (numerator: number, denominator = 1): ExactScalar => ({ numerator, denominator });

function node(latex: string): unknown {
  return ce.parse(latex).json;
}

function productThrough(count: number) {
  return Array.from({ length: count }, (_, index) => `(x^2-${(index + 1) ** 2})`).join('*');
}

function expectSuccess(result: ReturnType<typeof eliminateBivariateResultantNodes>): SymbolicEliminationSuccess {
  if (result.kind !== 'success') {
    throw new Error(`expected success, got ${result.kind}:${result.reason}`);
  }
  return result;
}

describe('symbolic elimination primitive', () => {
  it('projects two linear bivariate zero-form nodes onto the retained variable', () => {
    const result = expectSuccess(eliminateBivariateResultantNodes(
      node('x+y-3'),
      node('x-y-1'),
      'x',
      'y',
    ));

    expect(result.projectedLatex).toBe('x-2');
    expect(result.projectedNode).toEqual(['Add', 'x', -2]);
    expect(result.leftDegree).toBe(1);
    expect(result.rightDegree).toBe(1);
    expect(result.sylvesterDimension).toBe(2);
    expect(getExactPolynomialCoefficient(result.projectedPolynomial, 1)).toEqual(scalar(1));
    expect(getExactPolynomialCoefficient(result.projectedPolynomial, 0)).toEqual(scalar(-2));
  });

  it('projects nonlinear retained-variable coefficients', () => {
    const result = expectSuccess(eliminateBivariateResultantNodes(
      node('y-x^2'),
      node('y-1'),
      'x',
      'y',
    ));

    expect(result.projectedLatex).toBe('x^2-1');
    expect(result.projectedNode).toEqual(['Add', ['Power', 'x', 2], -1]);
    expect(getExactPolynomialCoefficient(result.projectedPolynomial, 2)).toEqual(scalar(1));
    expect(getExactPolynomialCoefficient(result.projectedPolynomial, 0)).toEqual(scalar(-1));
  });

  it('keeps retained-degree caps bounded unless callers opt in', () => {
    expect(eliminateBivariateResultantNodes(
      node(`y-${productThrough(6)}`),
      node('y'),
      'x',
      'y',
    )).toEqual({
      kind: 'stop',
      reason: 'degree-limit',
    });

    const result = expectSuccess(eliminateBivariateResultantNodes(
      node(`y-${productThrough(6)}`),
      node('y'),
      'x',
      'y',
      { maxRetainedDegree: 12 },
    ));

    expect(exactPolynomialDegree(result.projectedPolynomial)).toBe(12);
    expect(result.sylvesterDimension).toBe(2);
  });

  it('uses stored numeric constants while protecting retained and eliminated variables', () => {
    const storedVariables: StoredVariableValue[] = [
      { name: 'a', valueLatex: '2', numericValue: 2 },
      { name: 'x', valueLatex: '99', numericValue: 99 },
      { name: 'y', valueLatex: '88', numericValue: 88 },
    ];
    const result = expectSuccess(eliminateBivariateResultantNodes(
      node('a*x+y-3'),
      node('x-y-1'),
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

  it('rejects unsupported free symbolic parameters', () => {
    expect(eliminateBivariateResultantNodes(
      node('x+y+z'),
      node('x-y-1'),
      'x',
      'y',
    )).toEqual({
      kind: 'stop',
      reason: 'unsupported-symbolic-parameter',
      symbols: ['z'],
    });
  });

  it('returns controlled stops for bounded resultant requests', () => {
    expect(eliminateBivariateResultantNodes(node('\\sin(x)+y'), node('y-1'), 'x', 'y')).toEqual({
      kind: 'stop',
      reason: 'non-polynomial-input',
    });

    expect(eliminateBivariateResultantNodes(
      node('(x+1)*(x+2)*(x+3)*(x+4)+y'),
      node('y-1'),
      'x',
      'y',
      { maxTerms: 3 },
    )).toEqual({
      kind: 'stop',
      reason: 'term-limit',
    });

    expect(eliminateBivariateResultantNodes(
      node('1000*x+y'),
      node('x-y-1'),
      'x',
      'y',
      { maxScalarAbs: 10 },
    )).toEqual({
      kind: 'stop',
      reason: 'scalar-growth-limit',
    });

    expect(eliminateBivariateResultantNodes(node('y^3+x'), node('y^3-x'), 'x', 'y', {
      maxSylvesterDimension: 5,
    })).toEqual({
      kind: 'stop',
      reason: 'sylvester-dimension-limit',
    });

    expect(eliminateBivariateResultantNodes(node('x+y-3'), node('x+y-3'), 'x', 'y')).toEqual({
      kind: 'stop',
      reason: 'projection-ambiguity',
    });

    expect(eliminateBivariateResultantNodes(node('y-x^2-44'), node('y-x^2-5'), 'x', 'y')).toEqual({
      kind: 'stop',
      reason: 'constant-polynomial',
      constantContext: 'resultant',
    });
  });

  it('stops when stored constants cannot be represented safely', () => {
    expect(eliminateBivariateResultantNodes(
      node('a*x+y'),
      node('x-y-1'),
      'x',
      'y',
      {
        storedVariables: [{ name: 'a', valueLatex: '1000000000000', numericValue: 1_000_000_000_000 }],
        maxScalarAbs: 10,
      },
    )).toEqual({
      kind: 'stop',
      reason: 'stored-constant-unsafe',
      storedVariable: 'a',
    });
  });

  it('returns an engine-error stop when zero-form MathJSON cannot be rendered', () => {
    expect(eliminateBivariateResultantNodes({ invalid: true }, node('y-1'), 'x', 'y')).toEqual({
      kind: 'stop',
      reason: 'engine-error',
      message: 'Elimination could not render zero-form MathJSON for projection.',
    });
  });
});
