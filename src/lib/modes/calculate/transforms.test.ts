import { describe, expect, it } from 'vitest';
import { runCalculateAlgebraTransform } from '../calculate';

describe('runCalculateAlgebraTransform', () => {
  it('runs explicit algebra transforms without changing the broad simplify action', () => {
    const result = runCalculateAlgebraTransform({
      action: 'combineFractions',
      latex: '\\frac{1}{3}+\\frac{1}{6x}',
      angleUnit: 'deg',
      storedVariables: [{ name: 'x', valueLatex: '4', numericValue: 4 }],
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('\\frac{2x+1}{6x}');
    expect(result.transformBadges).toEqual(['Combine Fractions']);
    expect(result.exactSupplementLatex?.[0]).toContain('x\\ne0');
    expect(result.detailSections?.[0]).toMatchObject({
      title: 'Variable Policy',
      lines: [
        'Ignored stored values: x=4. Symbolic transforms keep variables symbolic.',
      ],
    });
  });

  it('preserves removable-denominator restrictions in Calculate transforms', () => {
    const result = runCalculateAlgebraTransform({
      action: 'cancelFactors',
      latex: '\\frac{(x^2-1)(x+1)}{x-1}',
      angleUnit: 'deg',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('(x+1)^2');
    expect(result.exactSupplementLatex?.[0]).toContain('x-1\\ne0');
    expect(result.detailSections?.some((section) =>
      section.lines.some((line) => line.includes('x-1\\ne0')),
    )).not.toBe(true);
  });

  it('runs PRL3 symbolic algebra transforms explicitly in Calculate', () => {
    const asPower = runCalculateAlgebraTransform({
      action: 'rewriteAsPower',
      latex: '\\sqrt[3]{\\sqrt{x}}',
      angleUnit: 'deg',
    });
    const asRoot = runCalculateAlgebraTransform({
      action: 'rewriteAsRoot',
      latex: 'x^{1/6}',
      angleUnit: 'deg',
    });
    const changedBase = runCalculateAlgebraTransform({
      action: 'changeBase',
      latex: '\\log_{4}(x)',
      angleUnit: 'deg',
    });

    expect(asPower.kind).toBe('success');
    if (asPower.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(asPower.exactLatex).toBe('x^{\\frac{1}{6}}');
    expect(asPower.transformBadges).toEqual(['Rewrite as Power']);

    expect(asRoot.kind).toBe('success');
    if (asRoot.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(asRoot.exactLatex).toBe('\\sqrt[6]{x}');
    expect(asRoot.transformBadges).toEqual(['Rewrite as Root']);

    expect(changedBase.kind).toBe('success');
    if (changedBase.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(changedBase.exactLatex).toBe('\\frac{\\ln\\left(x\\right)}{\\ln\\left(4\\right)}');
    expect(changedBase.transformBadges).toEqual(['Change Base']);
  });

  it('runs widened bounded conjugate and rationalize transforms explicitly in Calculate', () => {
    const affineConjugate = runCalculateAlgebraTransform({
      action: 'conjugate',
      latex: '\\frac{1}{2+\\sqrt{x}}',
      angleUnit: 'deg',
    });
    const threeTermRationalize = runCalculateAlgebraTransform({
      action: 'rationalize',
      latex: '\\frac{1}{1+\\sqrt{2}+\\sqrt{3}}',
      angleUnit: 'deg',
    });

    expect(affineConjugate.kind).toBe('success');
    if (affineConjugate.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(affineConjugate.exactLatex).toBe('\\frac{2-\\sqrt{x}}{4-x}');
    expect(affineConjugate.transformBadges).toEqual(['Conjugate']);
    expect(affineConjugate.exactSupplementLatex).toEqual([
      '\\text{Exclusions: } \\sqrt{x}+2\\ne0',
      '\\text{Conditions: } x\\ge0',
    ]);

    expect(threeTermRationalize.kind).toBe('success');
    if (threeTermRationalize.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(threeTermRationalize.exactLatex).toBe('\\frac{1}{8}(4-2\\sqrt{6}+2\\sqrt{2})');
    expect(threeTermRationalize.transformBadges).toEqual(['Rationalize']);
  });
});
