import { describe, expect, it } from 'vitest';
import { normalizeSymbolicDisplayLatex } from '../symbolic-display';

const ROOT_PREFS = {
  symbolicDisplayMode: 'roots' as const,
  flattenNestedRootsWhenSafe: true,
};

const ROOT_PREFS_NO_FLATTEN = {
  symbolicDisplayMode: 'roots' as const,
  flattenNestedRootsWhenSafe: false,
};

const POWER_PREFS = {
  symbolicDisplayMode: 'powers' as const,
  flattenNestedRootsWhenSafe: true,
};

const AUTO_PREFS = {
  symbolicDisplayMode: 'auto' as const,
  flattenNestedRootsWhenSafe: true,
};

describe('normalizeSymbolicDisplayLatex', () => {
  it('flattens nested roots in root mode and prefers powers in power/auto modes', () => {
    expect(normalizeSymbolicDisplayLatex('\\sqrt[3]{\\sqrt{x}}', ROOT_PREFS)).toBe('\\sqrt[6]{x}');
    expect(normalizeSymbolicDisplayLatex('\\sqrt[3]{\\sqrt{x}}', POWER_PREFS)).toBe('x^{\\frac{1}{6}}');
    expect(normalizeSymbolicDisplayLatex('\\sqrt[3]{\\sqrt{x}}', AUTO_PREFS)).toBe('x^{\\frac{1}{6}}');
  });

  it('normalizes sqrt(x^(1/3)) into a bounded root/power display family', () => {
    expect(normalizeSymbolicDisplayLatex('\\sqrt{x^{1/3}}', ROOT_PREFS)).toBe('\\sqrt[6]{x}');
    expect(normalizeSymbolicDisplayLatex('\\sqrt{x^{1/3}}', ROOT_PREFS_NO_FLATTEN)).toBe('\\sqrt{\\sqrt[3]{x}}');
    expect(normalizeSymbolicDisplayLatex('\\sqrt{x^{1/3}}', POWER_PREFS)).toBe('x^{\\frac{1}{6}}');
  });

  it('normalizes awkward root-power forms without rewriting plain familiar roots', () => {
    expect(normalizeSymbolicDisplayLatex('(\\sqrt{x})^{3}', ROOT_PREFS)).toBe('\\sqrt{x^{3}}');
    expect(normalizeSymbolicDisplayLatex('(\\sqrt{x})^{3}', POWER_PREFS)).toBe('x^{\\frac{3}{2}}');
    expect(normalizeSymbolicDisplayLatex('(\\sqrt{x})^{1/3}', ROOT_PREFS)).toBe('\\sqrt[6]{x}');
    expect(normalizeSymbolicDisplayLatex('(\\sqrt{x})^{1/3}', ROOT_PREFS_NO_FLATTEN)).toBe('\\sqrt[3]{\\sqrt{x}}');
    expect(normalizeSymbolicDisplayLatex('(\\sqrt{x})^{1/3}', POWER_PREFS)).toBe('x^{\\frac{1}{6}}');
    expect(normalizeSymbolicDisplayLatex('\\sqrt{x}', POWER_PREFS)).toBe('\\sqrt{x}');
    expect(normalizeSymbolicDisplayLatex('\\sqrt[3]{x}', AUTO_PREFS)).toBe('\\sqrt[3]{x}');
  });

  it('keeps light log cleanup bounded to notation normalization', () => {
    expect(normalizeSymbolicDisplayLatex('\\ln(x)', ROOT_PREFS)).toBe('\\ln\\left(x\\right)');
    expect(normalizeSymbolicDisplayLatex('\\log_{10}(x)', ROOT_PREFS)).toBe('\\log\\left(x\\right)');
    expect(normalizeSymbolicDisplayLatex('\\log_{e}(x)', ROOT_PREFS)).toBe('\\ln\\left(x\\right)');
    expect(normalizeSymbolicDisplayLatex('\\log_{4}(x)', ROOT_PREFS)).toBe('\\log_{4}\\left(x\\right)');
  });

  it('compacts repeated multiplicative factors in rendered symbolic display', () => {
    expect(normalizeSymbolicDisplayLatex('\\ln\\left(4x\\cdot x^{3}\\right)', ROOT_PREFS)).toBe(
      '\\ln\\left(4\\,x^{4}\\right)',
    );
  });

  it('adds display-only product spacing in large radical fractions', () => {
    expect(
      normalizeSymbolicDisplayLatex(
        'a=\\sqrt[3]{\\frac{uy\\sqrt{k}}{vc^4}-\\frac{b^2}{v(z^2-\\ln(m)+\\sqrt{x})c^4}}',
        ROOT_PREFS,
      ),
    ).toContain('v\\,\\left(z^{2}-\\ln\\left(m\\right)+\\sqrt{x}\\right)\\,c^{4}');
  });

  it('preserves explicit product dots before function factors during symbolic display normalization', () => {
    const normalized = normalizeSymbolicDisplayLatex(
      '\\frac{2}{\\sqrt{4 a c-b^2}}\\cdot \\arctan\\left(\\frac{2 a x+b}{\\sqrt{4 a c-b^2}}\\right)',
      ROOT_PREFS,
    );

    expect(normalized).toContain('\\cdot \\arctan');
    expect(normalized).not.toContain('\\,\\arctan');
  });

  it('keeps relation commands separated from following symbolic terms', () => {
    const normalized = normalizeSymbolicDisplayLatex('c-\\sqrt{b+z}\\ge0', ROOT_PREFS);

    expect(normalized).not.toContain('\\lec');
    expect(normalized).toBe('0\\le c-\\sqrt{b+z}');
  });

  it('preserves the imaginary unit during symbolic display normalization', () => {
    expect(normalizeSymbolicDisplayLatex('x^4+\\imaginaryI=0', ROOT_PREFS)).toBe('x^{4}+\\imaginaryI=0');
    expect(normalizeSymbolicDisplayLatex('x^4+i=0', ROOT_PREFS)).toBe('x^{4}+\\imaginaryI=0');
    expect(normalizeSymbolicDisplayLatex('x^4+\\imaginaryI=0', ROOT_PREFS)).not.toContain('+1=0');
  });

  it('returns unsupported forms unchanged', () => {
    expect(normalizeSymbolicDisplayLatex('\\text{Conditions: } x\\ge0', ROOT_PREFS)).toBe('\\text{Conditions: } x\\ge0');
    expect(normalizeSymbolicDisplayLatex('x+1', POWER_PREFS)).toBe('x+1');
  });
});
