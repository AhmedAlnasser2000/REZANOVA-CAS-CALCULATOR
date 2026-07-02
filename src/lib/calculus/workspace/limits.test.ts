import { describe, expect, it } from 'vitest';
import {
  evaluateCalculusFiniteLimit,
  evaluateCalculusInfiniteLimit,
  evaluateCalculusLimit,
} from './limits';
import { buildCalculusFiniteLimitLatex } from './examples';

describe('calculus limits', () => {
  it('handles common finite removable singularities', () => {
    const sinOverX = evaluateCalculusFiniteLimit({
      bodyLatex: '\\frac{\\sin(x)}{x}',
      target: '0',
      direction: 'two-sided',
    });
    expect(sinOverX.error).toBeUndefined();
    expect(Number(sinOverX.approxText)).toBeCloseTo(1, 3);

    const cosCase = evaluateCalculusFiniteLimit({
      bodyLatex: '\\frac{1-\\cos(x)}{x^2}',
      target: '0',
      direction: 'two-sided',
    });
    expect(cosCase.error).toBeUndefined();
    expect(cosCase.exactLatex).toBe('\\frac{1}{2}');
    expect(Number(cosCase.approxText)).toBeCloseTo(0.5, 2);

    const logKnownForm = evaluateCalculusFiniteLimit({
      bodyLatex: '\\frac{\\ln(1+x)}{x}',
      target: '0',
      direction: 'two-sided',
    });
    expect(logKnownForm.error).toBeUndefined();
    expect(logKnownForm.resultOrigin).toBe('rule-based-symbolic');
    expect(Number(logKnownForm.approxText)).toBeCloseTo(1, 6);
  });

  it('handles directional mismatch and unbounded cases', () => {
    expect(buildCalculusFiniteLimitLatex({
      bodyLatex: '\\frac{1}{x}',
      target: '0^-',
      direction: 'two-sided',
    })).toBe('\\lim_{x\\to 0^{-}}\\left(\\frac{1}{x}\\right)');

    const mismatch = evaluateCalculusFiniteLimit({
      bodyLatex: '\\frac{|x|}{x}',
      target: '0',
      direction: 'two-sided',
    });
    expect(mismatch.error).toBe('Left and right behavior do not agree near the target.');
    expect(mismatch.detailSections?.[0]?.title).toBe('Why This Limit Fails');
    expect(mismatch.detailSections?.[0]?.lines.join(' ')).toContain('two one-sided limits');

    const poleMismatch = evaluateCalculusFiniteLimit({
      bodyLatex: '\\frac{1}{x}',
      target: '0',
      direction: 'two-sided',
    });
    expect(poleMismatch.error).toBe('Left and right behavior do not agree near the target.');
    expect(poleMismatch.detailSections?.[0]).toEqual({
      title: 'Why This Limit Fails',
      lines: [
        'Left side tends to -\\infty.',
        'Right side tends to \\infty.',
        'The two one-sided limits are different, so the two-sided limit does not exist.',
      ],
    });

    const unbounded = evaluateCalculusFiniteLimit({
      bodyLatex: '\\frac{1}{x}',
      target: '0',
      direction: 'left',
    });
    expect(unbounded.error).toBeUndefined();
    expect(unbounded.exactLatex).toBe('-\\infty');
    expect(unbounded.resultOrigin).toBe('rule-based-symbolic');

    const targetOverride = evaluateCalculusFiniteLimit({
      bodyLatex: '\\frac{1}{x}',
      target: '0^+',
      direction: 'two-sided',
    });
    expect(targetOverride.error).toBeUndefined();
    expect(targetOverride.exactLatex).toBe('\\infty');

    const leftTargetOverride = evaluateCalculusFiniteLimit({
      bodyLatex: '\\frac{1}{x}',
      target: '0^-',
      direction: 'two-sided',
    });
    expect(leftTargetOverride.exactLatex).toBe('-\\infty');

    const domainGap = evaluateCalculusFiniteLimit({
      bodyLatex: '\\sqrt{x}',
      target: '0',
      direction: 'two-sided',
    });
    expect(domainGap.error).toContain('outside the real domain');
  });

  it('handles infinite target limits', () => {
    const friendlyInfinity = evaluateCalculusLimit({
      requestLatex: 'lim x -> infinty 1/x',
    });
    expect(friendlyInfinity.error).toBeUndefined();
    expect(friendlyInfinity.exactLatex).toBe('0');

    const sameDegree = evaluateCalculusInfiniteLimit({
      bodyLatex: '\\frac{3x^2+1}{2x^2-5}',
      targetKind: 'posInfinity',
    });
    expect(sameDegree.error).toBeUndefined();
    expect(sameDegree.resultOrigin).toBe('rule-based-symbolic');
    expect(sameDegree.exactLatex).toBe('\\frac{3}{2}');
    expect(Number(sameDegree.approxText)).toBeCloseTo(1.5, 6);
    expect(sameDegree.detailSections?.[0]?.title).toBe('Limit Method');

    const toZero = evaluateCalculusInfiniteLimit({
      bodyLatex: '\\frac{x+1}{x^2+5}',
      targetKind: 'posInfinity',
    });
    expect(toZero.error).toBeUndefined();
    expect(Number(toZero.approxText)).toBeCloseTo(0, 2);

    const unbounded = evaluateCalculusInfiniteLimit({
      bodyLatex: '\\frac{e^x}{x^3}',
      targetKind: 'posInfinity',
    });
    expect(unbounded.error).toContain('unbounded');

    const lHospital = evaluateCalculusLimit({
      requestLatex: 'lim x -> infinity x/e^x',
    });
    expect(lHospital.error).toBeUndefined();
    expect(lHospital.resultOrigin).toBe('heuristic-symbolic');
    expect(lHospital.exactLatex).toBe('0');
    expect(lHospital.detailSections?.[0]?.lines.join(' ')).toContain("L'Hospital");
  });

  it('stops variable mismatches with a correction suggestion', () => {
    const result = evaluateCalculusLimit({
      requestLatex: 'lim x -> infinity (3t^2+1)/(2t^2-5)',
    });

    expect(result.error).toContain('approaches x');
    expect(result.error).toContain('uses t');
    expect(result.error).toContain('\\lim_{t\\to \\infty}');
    expect(result.exactLatex).toBeUndefined();
    expect(result.detailSections?.[0]?.title).toBe('Limit Variable Check');
  });

  it('handles parsed variable and exact-constant finite targets', () => {
    const theta = evaluateCalculusFiniteLimit({
      bodyLatex: '\\sin(\\theta)',
      target: '\\pi/2',
      direction: 'two-sided',
      variable: 'theta',
    });
    expect(theta.error).toBeUndefined();
    expect(Number(theta.approxText)).toBeCloseTo(1, 6);

    const tAtE = evaluateCalculusFiniteLimit({
      bodyLatex: '\\ln(t)',
      target: 'e',
      direction: 'two-sided',
      variable: 't',
    });
    expect(tAtE.error).toBeUndefined();
    expect(Number(tAtE.approxText)).toBeCloseTo(1, 6);
  });

  it('surfaces CALC-LIM3 finite-limit detail notes', () => {
    const rational = evaluateCalculusFiniteLimit({
      bodyLatex: '\\frac{3x}{x+x^2}',
      target: '0^-',
      direction: 'two-sided',
    });
    const equivalent = evaluateCalculusFiniteLimit({
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
