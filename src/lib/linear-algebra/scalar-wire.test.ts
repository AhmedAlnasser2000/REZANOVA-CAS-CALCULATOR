import { describe, expect, it } from 'vitest';
import {
  linearAlgebraScalarWireFromNumber,
  linearAlgebraScalarWireToFiniteReal,
  parseLinearAlgebraScalarWire,
  resolveLinearAlgebraScalarWire,
} from './scalar-wire';

describe('Linear Algebra scalar wire', () => {
  it('builds bounded standard MathJSON for rationals, parameters, radicals, and opaque functions', () => {
    expect(parseLinearAlgebraScalarWire('\\frac{2}{3}', 'real')).toMatchObject({
      ok: true,
      value: { exactRational: { numerator: 2, denominator: 3 } },
    });
    expect(parseLinearAlgebraScalarWire('a_1+\\alpha+\\sqrt{2}', 'real')).toMatchObject({ ok: true });
    expect(parseLinearAlgebraScalarWire('@mass+\\operatorname{var}(speed)+\\beta_2', 'real'))
      .toMatchObject({ ok: true });
    expect(parseLinearAlgebraScalarWire('e+f', 'real')).toMatchObject({
      ok: true,
      value: { mathJson: ['Add', 'e', 'f'] },
    });
    const opaque = parseLinearAlgebraScalarWire('f(t)+1', 'real');
    expect(opaque).toMatchObject({
      ok: true,
      value: { mathJson: ['Add', ['Apply', 'f', 't'], 1] },
    });
  });

  it('recognizes exact complex rationals and reserves i for Complex mode', () => {
    expect(parseLinearAlgebraScalarWire('2+3i', 'real')).toEqual({
      ok: false,
      error: 'The imaginary unit i requires Complex mode.',
    });
    expect(parseLinearAlgebraScalarWire('2+3i', 'complex')).toMatchObject({
      ok: true,
      value: {
        exactComplexRational: {
          re: { numerator: 2, denominator: 1 },
          im: { numerator: 3, denominator: 1 },
        },
      },
    });
  });

  it('normalizes conjugation without custom MathJSON operators', () => {
    expect(parseLinearAlgebraScalarWire('\\overline{z}', 'complex')).toMatchObject({
      ok: true,
      value: { mathJson: ['Conjugate', 'z'] },
    });
    expect(parseLinearAlgebraScalarWire('\\operatorname{conj}(z)', 'complex')).toMatchObject({
      ok: true,
      value: { mathJson: ['Conjugate', 'z'] },
    });
  });

  it('applies available stored values while protecting structural names', () => {
    const source = parseLinearAlgebraScalarWire('a+u+f(t)+k', 'real');
    expect(source.ok).toBe(true);
    if (!source.ok) return;
    const resolved = resolveLinearAlgebraScalarWire({
      wire: source.value,
      domain: 'real',
      mode: 'use-stored-values',
      storedVariables: [
        { name: 'a', valueLatex: '2', numericValue: 2, updatedAt: '2026-07-15T00:00:00.000Z' },
        { name: 'u', valueLatex: '9', numericValue: 9, updatedAt: '2026-07-15T00:00:00.000Z' },
        { name: 'f', valueLatex: '4', numericValue: 4, updatedAt: '2026-07-15T00:00:00.000Z' },
      ],
      protectedNames: ['u'],
    });
    expect(resolved).toMatchObject({
      source: { canonicalLatex: expect.stringContaining('a') },
      substitutions: [{ name: 'a', valueLatex: '2', numericValue: 2 }],
      protectedSubstitutions: [{ name: 'u', valueLatex: '9', numericValue: 9 }],
    });
    expect(resolved).toMatchObject({
      resolved: { mathJson: ['Add', 2, 'k', 'u', ['Apply', 'f', 't']] },
    });
  });

  it('round-trips finite real compatibility values', () => {
    expect(linearAlgebraScalarWireToFiniteReal(linearAlgebraScalarWireFromNumber(-1.25))).toBe(-1.25);
  });
});
