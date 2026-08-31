import { describe, expect, it } from 'vitest';
import {
  runEquationAlgebraTransform,
} from '../equation';
import { finalizeEquationCanonicalRuntimeOutcome } from '../../equation/equation-solve-result';

describe('Equation mode transforms', () => {
  it('runs explicit equation transforms without auto-solving the transformed equation', () => {
    const result = runEquationAlgebraTransform({
      action: 'useLCD',
      equationLatex: '\\frac{1}{x}+\\frac{1}{x+1}=1',
      angleUnit: 'deg',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('=0');
    expect(result.transformBadges).toEqual(['Use LCD']);
    expect(result.transformSummaryText).toContain('Cleared the equation');
    expect(result.exactSupplementLatex?.[0]).toContain('x\\ne0');
    expect(result.canonicalResult?.primaryMath?.mathJson).toEqual([
      'Equal',
      expect.anything(),
      0,
    ]);

    const finalized = finalizeEquationCanonicalRuntimeOutcome(result);
    expect(finalized.kind).toBe('success');
    if (finalized.kind !== 'success' || finalized.canonicalResult.version !== 2) {
      throw new Error('Expected the LCD transform to finalize as Equation V2.');
    }
    expect(finalized.canonicalResult.supplements?.map((entry) => entry.role)).toEqual([
      'exclusion',
      'exclusion',
    ]);
    expect(finalized.canonicalResult.supplements?.every((entry) =>
      entry.math.mathJson !== undefined)).toBe(true);
  });

  it('runs PRL3 explicit equation transforms without auto-solving', () => {
    const asRoot = runEquationAlgebraTransform({
      action: 'rewriteAsRoot',
      equationLatex: 'x^{1/2}=3',
      angleUnit: 'deg',
    });
    const asPower = runEquationAlgebraTransform({
      action: 'rewriteAsPower',
      equationLatex: '\\sqrt{x}=3',
      angleUnit: 'deg',
    });
    const changedBase = runEquationAlgebraTransform({
      action: 'changeBase',
      equationLatex: '\\log_{4}(x)=2',
      angleUnit: 'deg',
    });

    expect(asRoot.kind).toBe('success');
    if (asRoot.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(asRoot.exactLatex).toBe('\\sqrt{x}=3');
    expect(asRoot.transformBadges).toEqual(['Rewrite as Root']);
    const finalizedRoot = finalizeEquationCanonicalRuntimeOutcome(asRoot);
    expect(finalizedRoot.kind).toBe('success');
    if (finalizedRoot.kind !== 'success') {
      throw new Error('Expected the root transform to finalize successfully');
    }
    expect(finalizedRoot.canonicalResult.version).toBe(2);

    expect(asPower.kind).toBe('success');
    if (asPower.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(asPower.exactLatex).toBe('x^{\\frac{1}{2}}=3');
    expect(asPower.exactSupplementLatex).toEqual(['\\text{Conditions: } x\\ge0']);
    expect(asPower.transformBadges).toEqual(['Rewrite as Power']);

    expect(changedBase.kind).toBe('success');
    if (changedBase.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(changedBase.exactLatex).toBe('\\frac{\\ln\\left(x\\right)}{\\ln\\left(4\\right)}=2');
    expect(changedBase.transformBadges).toEqual(['Change Base']);
  });

  it('widens explicit equation transforms to binomial denominator families', () => {
    const result = runEquationAlgebraTransform({
      action: 'useLCD',
      equationLatex: '\\frac{1}{x^2+1}+\\frac{1}{x-1}=0',
      angleUnit: 'deg',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x^2+x=0');
    expect(result.transformBadges).toEqual(['Use LCD']);
    expect(result.transformSummaryText).toContain('Cleared the equation');
    expect(result.transformSummaryLatex).toContain('x-1');
    expect(result.transformSummaryLatex).toContain('x^2+1');
    expect(result.exactSupplementLatex?.[0]).toContain('x^2+1\\ne0');
  });
});
