import { describe, expect, it } from 'vitest';
import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  factorBoundedPolynomialAst,
  solveBoundedPolynomialEquationAst,
} from '../polynomial-factor-solve';

const ce = new ComputeEngine();

function parse(latex: string) {
  return ce.parse(latex).json;
}

function multiplyCoefficients(left: number[], right: number[]) {
  const result = Array.from({ length: left.length + right.length - 1 }, () => 0);
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      result[leftIndex + rightIndex] += left[leftIndex] * right[rightIndex];
    }
  }
  return result;
}

function expandedPolynomialLatex(variable: string, factors: number[][]) {
  const coefficients = factors.reduce(
    (current, factor) => multiplyCoefficients(current, factor),
    [1],
  );

  return coefficients
    .map((coefficient, degree) => ({ coefficient, degree }))
    .filter(({ coefficient }) => coefficient !== 0)
    .reverse()
    .map(({ coefficient, degree }, index) => {
      const sign = coefficient < 0 ? '-' : index === 0 ? '' : '+';
      const absolute = Math.abs(coefficient);
      const scalar = absolute === 1 && degree > 0 ? '' : String(absolute);
      const power = degree === 0 ? '' : degree === 1 ? variable : `${variable}^{${degree}}`;
      return `${sign}${scalar}${power}`;
    })
    .join('');
}

function factorsFromRoots(roots: number[]) {
  return roots.map((root) => [-root, 1]);
}

describe('polynomial-factor-solve', () => {
  it('solves bounded cubic families with rational roots exactly', () => {
    const result = solveBoundedPolynomialEquationAst(parse('x^3-6x^2+11x-6=0'), 'x');

    expect(result).not.toBeNull();
    expect(result?.exactLatex).toBe('x\\in\\left\\{1, 2, 3\\right\\}');
    expect(result?.approxText).toContain('1');
    expect(result?.factorization.strategy).toBe('rational-root');
  });

  it('dedupes repeated rational roots in cubic solve output while preserving factor multiplicity internally', () => {
    const result = solveBoundedPolynomialEquationAst(parse('x^3-4x^2+5x-2=0'), 'x');

    expect(result).not.toBeNull();
    expect(result?.exactLatex).toBe('x\\in\\left\\{1, 2\\right\\}');
    expect(result?.factorization.factors.some((factor) => factor.multiplicity > 1)).toBe(true);
  });

  it('solves supported quartic biquadratics exactly', () => {
    const result = solveBoundedPolynomialEquationAst(parse('x^4-5x^2+4=0'), 'x');

    expect(result).not.toBeNull();
    expect(result?.exactLatex).toContain('-2');
    expect(result?.exactLatex).toContain('-1');
    expect(result?.exactLatex).toContain('1');
    expect(result?.exactLatex).toContain('2');
    expect(result?.factorization.strategy).toBe('biquadratic');
  });

  it('keeps real roots from mixed real and complex quartic factors', () => {
    const result = solveBoundedPolynomialEquationAst(parse('x^4-16=0'), 'x');

    expect(result).not.toBeNull();
    expect(result?.exactLatex).toBe('x\\in\\left\\{-2, 2\\right\\}');
    expect(result?.factorization.factorizedLatex).toContain('x^2-4');
    expect(result?.factorization.factorizedLatex).toContain('x^2+4');
  });

  it('solves supported quartic biquadratics with exact algebraic x^2 targets', () => {
    const result = solveBoundedPolynomialEquationAst(parse('x^4-5x^2+3=0'), 'x');

    expect(result).not.toBeNull();
    expect(result?.exactLatex).toContain('\\frac{5}{2}');
    expect(result?.exactLatex).toMatch(/(\\sqrt\{13\}|13\^\{1\/2\})/);
    expect(result?.factorization.strategy).toBe('biquadratic');
  });

  it('solves quartics that factor into quadratics with exact radical roots', () => {
    const result = solveBoundedPolynomialEquationAst(parse('x^4+3x^3-x^2-4x+2=0'), 'x');

    expect(result).not.toBeNull();
    expect(result?.exactLatex).toContain('\\sqrt{3}');
    expect(result?.exactLatex).toContain('\\sqrt{5}');
    expect(result?.factorization.strategy).toBe('quadratic-pair');
  });

  it('handles exact-rational coefficients by clearing denominators before bounded factoring', () => {
    const result = solveBoundedPolynomialEquationAst(parse('\\frac{1}{2}x^4-\\frac{5}{2}x^2+2=0'), 'x');

    expect(result).not.toBeNull();
    expect(result?.exactLatex).toContain('-2');
    expect(result?.factorization.factorizedLatex).toContain('\\frac{1}{2}');
  });

  it('factors supported quartics even when the solve surface stays numeric-only for complex roots', () => {
    const factorization = factorBoundedPolynomialAst(parse('x^4+2x^2+1'));
    const solved = solveBoundedPolynomialEquationAst(parse('x^4+2x^2+1=0'), 'x');

    expect(factorization).not.toBeNull();
    expect(factorization?.factorizedLatex).toContain('x^2+1');
    expect(solved).toBeNull();
  });

  it('preserves repeated factor multiplicity for repeated biquadratic roots', () => {
    const factorization = factorBoundedPolynomialAst(parse('x^4-10x^2+25'));

    expect(factorization).not.toBeNull();
    expect(factorization?.factors).toHaveLength(1);
    expect(factorization?.factors[0].latex).toBe('x^2-5');
    expect(factorization?.factors[0].multiplicity).toBe(2);
    expect(factorization?.factorizedLatex).toBe('(x^2-5)(x^2-5)');
  });

  it('keeps unsupported irreducible cubic and quartic families out of the bounded exact path', () => {
    expect(solveBoundedPolynomialEquationAst(parse('x^3+x+1=0'), 'x')).toBeNull();
    expect(solveBoundedPolynomialEquationAst(parse('x^4+x+1=0'), 'x')).toBeNull();
    expect(factorBoundedPolynomialAst(parse('x^4+x+1'))).toBeNull();
  });

  it('keeps the default bounded solve capped at quartics', () => {
    const degreeFive = `${expandedPolynomialLatex('x', factorsFromRoots([1, 2, 3, 4, 5]))}=0`;

    expect(solveBoundedPolynomialEquationAst(parse(degreeFive), 'x')).toBeNull();
    expect(factorBoundedPolynomialAst(parse(degreeFive.replace('=0', '')))).toBeNull();
  });

  it('solves opt-in expanded exact-rational degree-five and degree-twelve factors', () => {
    const degreeFive = solveBoundedPolynomialEquationAst(
      parse(`${expandedPolynomialLatex('x', factorsFromRoots([1, 2, 3, 4, 5]))}=0`),
      'x',
      { maxDegree: 12 },
    );
    const degreeTwelve = solveBoundedPolynomialEquationAst(
      parse(`${expandedPolynomialLatex('x', factorsFromRoots([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))}=0`),
      'x',
      { maxDegree: 12 },
    );

    expect(degreeFive?.exactSolutions).toEqual(['1', '2', '3', '4', '5']);
    expect(degreeFive?.factorization.strategy).toBe('rational-root');
    expect(degreeTwelve?.exactSolutions).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
    expect(degreeTwelve?.factorization.factors.reduce((sum, factor) =>
      sum + factor.degree * factor.multiplicity, 0)).toBe(12);
  });

  it('keeps opt-in expanded exact-rational factoring bounded at degree twelve', () => {
    const degreeThirteen = `${expandedPolynomialLatex('x', factorsFromRoots([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]))}=0`;

    expect(solveBoundedPolynomialEquationAst(parse(degreeThirteen), 'x', { maxDegree: 12 })).toBeNull();
  });

  it('solves high-degree rational factors with a real quadratic remainder', () => {
    const latex = `${expandedPolynomialLatex('x', [
      ...factorsFromRoots([1, 2, 3]),
      [-2, 0, 1],
    ])}=0`;
    const result = solveBoundedPolynomialEquationAst(parse(latex), 'x', { maxDegree: 12 });

    expect(result).not.toBeNull();
    expect(result?.exactLatex).toContain('\\sqrt{8}');
    expect(result?.exactSolutions).toEqual([
      '-(\\frac{\\sqrt{8}}{2})',
      '1',
      '\\frac{\\sqrt{8}}{2}',
      '2',
      '3',
    ]);
  });

  it('keeps only real roots when high-degree rational factors leave a complex-only quadratic remainder', () => {
    const latex = `${expandedPolynomialLatex('x', [
      ...factorsFromRoots([1, 2, 3]),
      [1, 0, 1],
    ])}=0`;
    const result = solveBoundedPolynomialEquationAst(parse(latex), 'x', { maxDegree: 12 });

    expect(result).not.toBeNull();
    expect(result?.exactSolutions).toEqual(['1', '2', '3']);
    expect(result?.factorization.factors.some((factor) => factor.degree === 2)).toBe(true);
  });

  it('keeps unsupported opt-in exact-rational degree-five polynomials out of the bounded path', () => {
    expect(solveBoundedPolynomialEquationAst(parse('x^5+x+1=0'), 'x', { maxDegree: 12 })).toBeNull();
  });
});
