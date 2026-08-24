import { describe, expect, it } from 'vitest';
import { runExpressionAction } from '../math-engine';
import { request } from './test-support';

describe('runExpressionAction symbolic simplify', () => {
  it('simplifies direct bounded abs identities without widening Factor', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\left|x\\right|^2' } },
      'simplify',
    );

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('symbolic-engine');
    expect(result.exactLatex).toBe('x^2');
  });

  it('canonicalizes direct abs readback through the shared simplify-only abs core', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\left|\\left|x+1\\right|\\right|' } },
      'simplify',
    );

    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toBe('\\vert x+1\\vert');
  });

  it('combines exact bounded rational expressions in simplify mode', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\frac{1}{3}+\\frac{1}{6x}' } },
      'simplify',
    );

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('symbolic-engine');
    expect(result.exactLatex).toBe('\\frac{2x+1}{6x}');
    expect(result.exactSupplementLatex).toEqual(['\\text{Exclusions: } x\\ne0']);
    expect(result.detailSections?.[0]?.title).toBe('Domain Facts');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('x must stay nonzero');
  });

  it('factors rational numerators and denominators separately without cancellation', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\frac{x^2-1}{x^2-x}' } },
      'factor',
    );

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('symbolic-engine');
    expect(result.exactLatex).toBe('\\frac{(x-1)(x+1)}{x(x-1)}');
    expect(result.exactSupplementLatex?.[0]).toContain('x\\ne0');
    expect(result.exactSupplementLatex?.[0]).toContain('x-1\\ne0');
  });

  it('normalizes supported radicals exactly in simplify mode', () => {
    const sqrtSquare = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{x^2}' } },
      'simplify',
    );
    const oddRoot = runExpressionAction(
      { ...request, document: { latex: '\\sqrt[3]{54x^4}' } },
      'simplify',
    );

    expect(sqrtSquare.error).toBeUndefined();
    expect(sqrtSquare.resultOrigin).toBe('symbolic-engine');
    expect(sqrtSquare.exactLatex).toBe('\\vert x\\vert');

    expect(oddRoot.error).toBeUndefined();
    expect(oddRoot.resultOrigin).toBe('symbolic-engine');
    expect(oddRoot.exactLatex).toBe('3x\\sqrt[3]{2x}');
  });

  it('normalizes perfect-square quadratic radicands and two-radical denominators visibly', () => {
    const perfectSquare = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{x^2+2x+1}' } },
      'simplify',
    );
    const factorSurface = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{9(x+1)^2}' } },
      'factor',
    );
    const rationalized = runExpressionAction(
      { ...request, document: { latex: '\\frac{1}{\\sqrt{x+1}+\\sqrt{x}}' } },
      'simplify',
    );

    expect(perfectSquare.error).toBeUndefined();
    expect(perfectSquare.resultOrigin).toBe('symbolic-engine');
    expect(perfectSquare.exactLatex?.replaceAll('\\left', '').replaceAll('\\right', '')).toBe('\\vert x+1\\vert');

    expect(factorSurface.error).toBeUndefined();
    expect(factorSurface.resultOrigin).toBe('symbolic-engine');
    expect(factorSurface.exactLatex?.replaceAll('\\left', '').replaceAll('\\right', '')).toBe('3\\vert x+1\\vert');

    expect(rationalized.error).toBeUndefined();
    expect(rationalized.resultOrigin).toBe('symbolic-engine');
    expect(rationalized.exactLatex?.replaceAll('\\left', '').replaceAll('\\right', '')).toBe('\\sqrt{x+1}-\\sqrt{x}');
    const supplements = rationalized.exactSupplementLatex?.join(' ') ?? '';
    expect(supplements).toContain('x+1\\ge0');
    expect(supplements).toContain('x\\ge0');
  });

  it('denests bounded constant nested square roots without widening simplify into variable denesting', () => {
    const denested = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{5+2\\sqrt{6}}' } },
      'simplify',
    );
    const variableNested = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{x+\\sqrt{x}}' } },
      'simplify',
    );

    expect(denested.error).toBeUndefined();
    expect(denested.resultOrigin).toBe('symbolic-engine');
    expect(denested.exactLatex?.replaceAll('\\left', '').replaceAll('\\right', '')).toBe('\\sqrt{2}+\\sqrt{3}');

    expect(variableNested.error).toBeUndefined();
    expect(variableNested.exactLatex).toBe('\\sqrt{x+\\sqrt{x}}');
  });

  it('normalizes bounded quartic perfect-square radicands without turning simplify into factor', () => {
    const repeatedBiquadratic = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{x^4-10x^2+25}' } },
      'simplify',
    );
    const repeatedDifference = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{x^4-2x^2+1}' } },
      'simplify',
    );

    expect(repeatedBiquadratic.error).toBeUndefined();
    expect(repeatedBiquadratic.resultOrigin).toBe('symbolic-engine');
    expect(repeatedBiquadratic.exactLatex?.replaceAll('\\left', '').replaceAll('\\right', '')).toBe('\\vert x^2-5\\vert');

    expect(repeatedDifference.error).toBeUndefined();
    expect(repeatedDifference.resultOrigin).toBe('symbolic-engine');
    expect(repeatedDifference.exactLatex?.replaceAll('\\left', '').replaceAll('\\right', '')).toBe('\\vert x^2-1\\vert');
  });

  it('canonicalizes bounded power-root forms in simplify mode with raw power-leaning output', () => {
    const nested = runExpressionAction(
      { ...request, document: { latex: '\\sqrt[3]{\\sqrt{x}}' } },
      'simplify',
    );
    const awkward = runExpressionAction(
      { ...request, document: { latex: '(\\sqrt{x})^{3}' } },
      'simplify',
    );

    expect(nested.error).toBeUndefined();
    expect(nested.exactLatex).toBe('x^{\\frac{1}{6}}');
    expect(nested.exactSupplementLatex).toEqual(['\\text{Conditions: } x\\ge0']);

    expect(awkward.error).toBeUndefined();
    expect(awkward.exactLatex).toBe('x^{\\frac{3}{2}}');
    expect(awkward.exactSupplementLatex).toEqual(['\\text{Conditions: } x\\ge0']);
  });

  it('treats valid textual nth-root input as the existing structured root form', () => {
    const textual = runExpressionAction(
      { ...request, document: { latex: 'root(3,sqrt(x))' } },
      'simplify',
    );
    const structured = runExpressionAction(
      { ...request, document: { latex: '\\sqrt[3]{\\sqrt{x}}' } },
      'simplify',
    );

    expect(textual.error).toBeUndefined();
    expect(textual.exactLatex).toBe('x^{\\frac{1}{6}}');
    expect(textual.exactLatex).toBe(structured.exactLatex);
    expect(textual.normalizedMathJson).toEqual(structured.normalizedMathJson);
  });

  it('keeps malformed textual nth-root input on a controlled error path', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: 'root(1,sqrt(x))' } },
      'simplify',
    );

    expect(result.exactLatex).toBeUndefined();
    expect(result.error).toContain('integer index of at least 2');
  });

  it('normalizes bounded same-base log sums without applying unsupported log identities', () => {
    const sameBase = runExpressionAction(
      { ...request, document: { latex: '\\ln(x)+\\ln(x+1)' } },
      'simplify',
    );
    const difference = runExpressionAction(
      { ...request, document: { latex: '\\ln(x)-\\ln(y)' } },
      'simplify',
    );

    expect(sameBase.error).toBeUndefined();
    expect(sameBase.exactLatex).toBe('\\ln\\left(x\\left(x+1\\right)\\right)');
    expect(sameBase.exactSupplementLatex).toEqual(['\\text{Conditions: } x>0,\\;x+1>0']);

    expect(difference.error).toBeUndefined();
    expect(difference.exactLatex).toBe('\\ln\\left(x\\right)-\\ln\\left(y\\right)');
    expect(difference.exactSupplementLatex).toBeUndefined();
  });

  it('rationalizes supported radical denominators in simplify mode', () => {
    const numericBinomial = runExpressionAction(
      { ...request, document: { latex: '\\frac{1}{1+\\sqrt{2}}' } },
      'simplify',
    );
    const symbolicBinomial = runExpressionAction(
      { ...request, document: { latex: '\\frac{1}{x+\\sqrt{2}}' } },
      'simplify',
    );

    expect(numericBinomial.error).toBeUndefined();
    expect(numericBinomial.exactLatex).toBe('\\sqrt{2}-1');

    expect(symbolicBinomial.error).toBeUndefined();
    expect(symbolicBinomial.exactLatex).toContain('x^2-2');
    expect(symbolicBinomial.exactSupplementLatex).toEqual(['\\text{Exclusions: } x+\\sqrt{2}\\ne0']);
  });

  it('widens simplify rationalization to affine-scaled and selected three-term square-root denominators', () => {
    const affineScaled = runExpressionAction(
      { ...request, document: { latex: '\\frac{1}{2+\\sqrt{x}}' } },
      'simplify',
    );
    const threeTerm = runExpressionAction(
      { ...request, document: { latex: '\\frac{1}{1+\\sqrt{2}+\\sqrt{3}}' } },
      'simplify',
    );

    expect(affineScaled.error).toBeUndefined();
    expect(affineScaled.resultOrigin).toBe('symbolic-engine');
    expect(affineScaled.exactLatex).toBe('\\frac{2-\\sqrt{x}}{4-x}');
    expect(affineScaled.exactSupplementLatex).toEqual([
      '\\text{Exclusions: } \\sqrt{x}+2\\ne0',
      '\\text{Conditions: } x\\ge0',
    ]);

    expect(threeTerm.error).toBeUndefined();
    expect(threeTerm.resultOrigin).toBe('symbolic-engine');
    expect(threeTerm.exactLatex).toBe('\\frac{1}{8}(4-2\\sqrt{6}+2\\sqrt{2})');
  });

  it('preserves radical cleanup in factor mode without rationalizing denominators', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '\\sqrt{x^2}' } },
      'factor',
    );

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('symbolic-engine');
    expect(result.exactLatex).toBe('\\vert x\\vert');
  });

  it('expands first and then keeps radicals exact', () => {
    const result = runExpressionAction(
      { ...request, document: { latex: '(\\sqrt{2}+1)^2' } },
      'expand',
    );

    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toBe('3+2\\sqrt{2}');
  });
});
