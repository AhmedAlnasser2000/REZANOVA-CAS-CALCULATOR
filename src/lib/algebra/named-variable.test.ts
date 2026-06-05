import { describe, expect, it } from 'vitest';
import {
  namedVariableEditorLatex,
  normalizeExplicitNamedVariablesInLatex,
  parseExplicitNamedVariableSyntax,
} from './named-variable';

describe('named-variable', () => {
  it('normalizes @name and var(name) to the same internal token', () => {
    const at = normalizeExplicitNamedVariablesInLatex('@mass+2');
    const call = normalizeExplicitNamedVariablesInLatex('var(mass)+2');

    expect(at.latex).toBe('\\mathrm{mass}+2');
    expect(call.latex).toBe('\\mathrm{mass}+2');
    expect([...at.explicitNames]).toEqual(['mass']);
    expect([...call.explicitNames]).toEqual(['mass']);
  });

  it('validates explicit named-variable syntax without accepting reserved names', () => {
    expect(parseExplicitNamedVariableSyntax('@Rate')).toEqual({
      ok: true,
      name: 'Rate',
      syntax: 'at',
    });
    expect(parseExplicitNamedVariableSyntax('var(rate_2)')).toEqual({
      ok: true,
      name: 'rate_2',
      syntax: 'var-call',
    });
    expect(parseExplicitNamedVariableSyntax('@sin')).toEqual({
      ok: false,
      error: 'Reserved constants, units, and functions cannot be stored variables.',
    });
  });

  it('returns canonical editor insertion text for stored variable names', () => {
    expect(namedVariableEditorLatex('x')).toBe('x');
    expect(namedVariableEditorLatex('K')).toBe('K');
    expect(namedVariableEditorLatex('mass')).toBe('@mass');
  });
});
