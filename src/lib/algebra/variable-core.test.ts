import { describe, expect, it } from 'vitest';
import { analyzeVariablesFromLatex, expandImplicitCharacterProductsInLatex } from './variable-core';

function symbol(result: ReturnType<typeof analyzeVariablesFromLatex>, name: string) {
  return result.symbols.find((entry) => entry.name === name);
}

describe('variable-core', () => {
  it('discovers case-sensitive single-symbol variables', () => {
    const result = analyzeVariablesFromLatex('K+k+x+z');

    expect(result.symbols.map((entry) => entry.name)).toEqual(['K', 'k', 'x', 'z']);
    expect(symbol(result, 'K')?.identifierKind).toBe('single-symbol-variable');
    expect(symbol(result, 'k')?.identifierKind).toBe('single-symbol-variable');
    expect(result.stops).toEqual([]);
  });

  it('filters reserved functions and constants away from variable candidates', () => {
    const result = analyzeVariablesFromLatex('sin(x)+cos(K)+log(z)+pi+e');

    expect(result.symbols.map((entry) => entry.name)).toEqual(['K', 'x', 'z']);
    expect(result.reservedIdentifiers.map((entry) => entry.name)).toEqual([
      'Cos',
      'ExponentialE',
      'Log',
      'Pi',
      'Sin',
    ]);
  });

  it('does not silently accept raw adjacent letters as one named variable', () => {
    const result = analyzeVariablesFromLatex('hello');

    expect(symbol(result, 'hello')).toBeUndefined();
    expect(result.implicitCharacterProducts).toEqual([{
      raw: 'hello',
      characters: ['h', 'e', 'l', 'l', 'o'],
    }]);
    expect(result.symbols.map((entry) => entry.name)).toEqual(['h', 'l', 'o']);
    expect(result.reservedIdentifiers.map((entry) => entry.name)).toEqual(['ExponentialE']);
  });

  it('expands acknowledged raw products without turning commands into variables', () => {
    expect(expandImplicitCharacterProductsInLatex('(v)(c^4a^3)+uy\\sqrt{k}+\\ln(m)'))
      .toBe('v c^4a^3+u y\\sqrt{k}+\\ln(m)');
    expect(expandImplicitCharacterProductsInLatex('v(c^4a^3)+\\mathrm{mass}'))
      .toBe('v c^4a^3+\\mathrm{mass}');
  });

  it('leaves additive parenthesized groups untouched while expanding raw names', () => {
    expect(expandImplicitCharacterProductsInLatex('a(b+c)+mass')).toBe('a(b+c)+m a s s');
  });

  it('classifies explicit named variable tokens without treating raw letters as names', () => {
    const result = analyzeVariablesFromLatex('@hello+var(Rate)+\\mathrm{mass}+x');

    expect(symbol(result, 'hello')?.identifierKind).toBe('named-variable');
    expect(symbol(result, 'Rate')?.identifierKind).toBe('named-variable');
    expect(symbol(result, 'mass')?.identifierKind).toBe('named-variable');
    expect(symbol(result, 'x')?.identifierKind).toBe('single-symbol-variable');
    expect(result.implicitCharacterProducts).toEqual([]);
    expect(result.stops).toEqual([]);
  });

  it('classifies role policies without substituting stored values', () => {
    const result = analyzeVariablesFromLatex('x+z=5', {
      solveTarget: 'x',
      storedVariables: ['z'],
    });

    expect(symbol(result, 'x')?.roles).toEqual(['solve-target']);
    expect(symbol(result, 'z')?.roles).toEqual(['stored-value-candidate']);
    expect(result.stops).toEqual([]);
  });

  it('classifies active and bound variables as metadata only', () => {
    const result = analyzeVariablesFromLatex('x+t', {
      activeVariable: 't',
      boundVariables: ['x'],
    });

    expect(symbol(result, 't')?.roles).toEqual(['active-variable']);
    expect(symbol(result, 'x')?.roles).toEqual(['bound-variable']);
  });

  it('returns a controlled stop when a solve target must be chosen', () => {
    const result = analyzeVariablesFromLatex('x+z=5', {
      requireSingleTarget: true,
    });

    expect(result.stops).toEqual([{
      reason: 'multiple-target-candidates',
      message: 'Multiple variable candidates are present; a solve target must be chosen explicitly.',
      symbols: ['x', 'z'],
    }]);
  });

  it('returns a controlled stop when only reserved identifiers are available', () => {
    const result = analyzeVariablesFromLatex('sin(pi)=e', {
      requireSingleTarget: true,
    });

    expect(result.symbols).toEqual([]);
    expect(result.stops).toEqual([{
      reason: 'reserved-identifier-only',
      message: 'Only reserved identifiers were found; no solve variable candidate is available.',
      symbols: ['ExponentialE', 'Pi', 'Sin'],
    }]);
  });
});
