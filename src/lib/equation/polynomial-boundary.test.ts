import { describe, expect, it } from 'vitest';
import { parseLinearAlgebraScalarWire } from '../linear-algebra/scalar-wire';
import {
  solveEquationPolynomialBoundary,
  type EquationPolynomialRequestV1,
} from './polynomial-boundary';

function wire(latex: string, domain: 'real' | 'complex' = 'real') {
  const parsed = parseLinearAlgebraScalarWire(latex, domain);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

function request(
  target: string,
  coefficients: string[],
  domain: 'real' | 'complex' = 'real',
): EquationPolynomialRequestV1 {
  return {
    version: 1,
    target,
    domain,
    coefficients: coefficients.map((value) => wire(value, domain)),
  };
}

describe('Equation polynomial boundary', () => {
  it('solves for arbitrary accepted targets rather than privileging x', () => {
    for (const target of ['u', 'z', 'alpha_1']) {
      const result = solveEquationPolynomialBoundary(request(target, ['1', '-3', '2']));
      expect(result.kind).toBe('proved');
      if (result.kind === 'proved') {
        expect(result.roots).toHaveLength(2);
        expect(result.roots.map((root) => root.value.canonicalLatex).sort()).toEqual(['1', '2']);
      }
    }
  });

  it('distinguishes Real and Complex roots', () => {
    const real = solveEquationPolynomialBoundary(request('z', ['1', '0', '1']));
    const complex = solveEquationPolynomialBoundary(request('z', ['1', '0', '1'], 'complex'));
    expect(real).toMatchObject({ kind: 'proved', roots: [] });
    expect(complex.kind).toBe('proved');
    if (complex.kind === 'proved') {
      expect(complex.roots).toHaveLength(2);
      expect(complex.roots.map((root) => JSON.stringify(root.value.mathJson)).join(' '))
        .toContain('ImaginaryUnit');
    }
  });

  it('makes distinct symbolic quadratic roots conditional on the discriminant', () => {
    const real = solveEquationPolynomialBoundary(request('z', ['1', 'a', 'b']));
    const complex = solveEquationPolynomialBoundary(request('z', ['1', 'a', 'b'], 'complex'));
    expect(real).toMatchObject({
      kind: 'proved',
      conditions: [{ mathJson: ['Greater', expect.anything(), 0] }],
    });
    expect(complex).toMatchObject({
      kind: 'proved',
      conditions: [{ mathJson: ['NotEqual', expect.anything(), 0] }],
    });
  });

  it('proves a diagonal symbolic quartic from multivariable coefficients', () => {
    const result = solveEquationPolynomialBoundary(request('lambda', [
      '1',
      '-a-b-c-d',
      'a b+a c+a d+b c+b d+c d',
      '-a b c-a b d-a c d-b c d',
      'a b c d',
    ]));
    expect(result.kind).toBe('proved');
    if (result.kind === 'proved') {
      expect(result.roots.map((root) => root.value.canonicalLatex).sort())
        .toEqual(['a', 'b', 'c', 'd']);
    }
  });

  it('retains an unresolved general symbolic cubic and enforces parameter limits', () => {
    const partial = solveEquationPolynomialBoundary(request('u', ['1', 'a', 'b', 'c']));
    expect(partial.kind).toBe('partial');
    const overBudget = solveEquationPolynomialBoundary(request('u', [
      '1', 'a+b+c+d+e+f+g', '1', '1',
    ]));
    expect(overBudget).toEqual({ kind: 'unsupported', reason: 'parameter-limit' });
  });

  it('rejects reserved targets and coefficients that still contain the target', () => {
    expect(solveEquationPolynomialBoundary(request('i', ['1', '1'], 'complex')))
      .toEqual({ kind: 'unsupported', reason: 'invalid-target' });
    expect(solveEquationPolynomialBoundary(request('u', ['u', '1'])))
      .toEqual({ kind: 'unsupported', reason: 'invalid-coefficient' });
    expect(solveEquationPolynomialBoundary(request('u', ['1', '\\sin(a)'])))
      .toEqual({ kind: 'unsupported', reason: 'opaque-coefficient' });
  });
});
