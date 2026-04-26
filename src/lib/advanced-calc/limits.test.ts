import { describe, expect, it } from 'vitest';
import {
  evaluateAdvancedFiniteLimit,
  evaluateAdvancedInfiniteLimit,
} from './limits';
import { buildAdvancedFiniteLimitLatex } from './examples';

describe('advanced calc limits', () => {
  it('handles common finite removable singularities', () => {
    const sinOverX = evaluateAdvancedFiniteLimit({
      bodyLatex: '\\frac{\\sin(x)}{x}',
      target: '0',
      direction: 'two-sided',
    });
    expect(sinOverX.error).toBeUndefined();
    expect(Number(sinOverX.approxText)).toBeCloseTo(1, 3);

    const cosCase = evaluateAdvancedFiniteLimit({
      bodyLatex: '\\frac{1-\\cos(x)}{x^2}',
      target: '0',
      direction: 'two-sided',
    });
    expect(cosCase.error).toBeUndefined();
    expect(Number(cosCase.approxText)).toBeCloseTo(0.5, 2);

    const logKnownForm = evaluateAdvancedFiniteLimit({
      bodyLatex: '\\frac{\\ln(1+x)}{x}',
      target: '0',
      direction: 'two-sided',
    });
    expect(logKnownForm.error).toBeUndefined();
    expect(logKnownForm.resultOrigin).toBe('rule-based-symbolic');
    expect(Number(logKnownForm.approxText)).toBeCloseTo(1, 6);
  });

  it('handles directional mismatch and unbounded cases', () => {
    expect(buildAdvancedFiniteLimitLatex({
      bodyLatex: '\\frac{1}{x}',
      target: '0^-',
      direction: 'two-sided',
    })).toBe('\\lim_{x\\to 0^{-}}\\left(\\frac{1}{x}\\right)');

    const mismatch = evaluateAdvancedFiniteLimit({
      bodyLatex: '\\frac{|x|}{x}',
      target: '0',
      direction: 'two-sided',
    });
    expect(mismatch.error).toBe('Left and right behavior do not agree near the target.');

    const unbounded = evaluateAdvancedFiniteLimit({
      bodyLatex: '\\frac{1}{x}',
      target: '0',
      direction: 'left',
    });
    expect(unbounded.error).toBeUndefined();
    expect(unbounded.exactLatex).toBe('-\\infty');
    expect(unbounded.resultOrigin).toBe('rule-based-symbolic');

    const targetOverride = evaluateAdvancedFiniteLimit({
      bodyLatex: '\\frac{1}{x}',
      target: '0^+',
      direction: 'two-sided',
    });
    expect(targetOverride.error).toBeUndefined();
    expect(targetOverride.exactLatex).toBe('\\infty');

    const leftTargetOverride = evaluateAdvancedFiniteLimit({
      bodyLatex: '\\frac{1}{x}',
      target: '0^-',
      direction: 'two-sided',
    });
    expect(leftTargetOverride.exactLatex).toBe('-\\infty');

    const domainGap = evaluateAdvancedFiniteLimit({
      bodyLatex: '\\sqrt{x}',
      target: '0',
      direction: 'two-sided',
    });
    expect(domainGap.error).toContain('outside the real domain');
  });

  it('handles infinite target limits', () => {
    const sameDegree = evaluateAdvancedInfiniteLimit({
      bodyLatex: '\\frac{3x^2+1}{2x^2-5}',
      targetKind: 'posInfinity',
    });
    expect(sameDegree.error).toBeUndefined();
    expect(sameDegree.resultOrigin).toBe('rule-based-symbolic');
    expect(Number(sameDegree.approxText)).toBeCloseTo(1.5, 6);
    expect(sameDegree.detailSections?.[0]?.title).toBe('Limit Method');

    const toZero = evaluateAdvancedInfiniteLimit({
      bodyLatex: '\\frac{x+1}{x^2+5}',
      targetKind: 'posInfinity',
    });
    expect(toZero.error).toBeUndefined();
    expect(Number(toZero.approxText)).toBeCloseTo(0, 2);

    const unbounded = evaluateAdvancedInfiniteLimit({
      bodyLatex: '\\frac{e^x}{x^3}',
      targetKind: 'posInfinity',
    });
    expect(unbounded.error).toContain('unbounded');
  });

  it('surfaces CALC-LIM3 finite-limit detail notes', () => {
    const rational = evaluateAdvancedFiniteLimit({
      bodyLatex: '\\frac{3x}{x+x^2}',
      target: '0^-',
      direction: 'two-sided',
    });
    const equivalent = evaluateAdvancedFiniteLimit({
      bodyLatex: '\\frac{\\ln(1+x)\\sin(x)}{x^2}',
      target: '0',
      direction: 'two-sided',
    });

    expect(rational.error).toBeUndefined();
    expect(rational.exactLatex).toBe('3');
    expect(rational.detailSections?.[0]?.lines.join(' ')).toContain('rational normalizer');
    expect(equivalent.error).toBeUndefined();
    expect(equivalent.exactLatex).toBe('1');
    expect(equivalent.detailSections?.[0]?.lines.join(' ')).toContain('local orders');
  });
});
