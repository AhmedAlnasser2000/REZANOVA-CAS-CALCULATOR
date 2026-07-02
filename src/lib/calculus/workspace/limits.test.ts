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
    expect(mismatch.error).toBe('Left and right absolute-value behavior do not agree near the target.');
    expect(mismatch.detailSections?.[0]?.title).toBe('Why This Limit Fails');
    expect(mismatch.detailSections?.[0]?.lines.join(' ')).toContain('absolute-value quotient');
    expect(mismatch.detailSections?.[0]?.lineParts?.flat()).toContainEqual({
      kind: 'math',
      latex: '\\lim_{x\\to 0^{-}}\\frac{\\vert x\\vert}{x}=-1',
    });

    const poleMismatch = evaluateCalculusFiniteLimit({
      bodyLatex: '\\frac{1}{x}',
      target: '0',
      direction: 'two-sided',
    });
    expect(poleMismatch.error).toBe('Left and right behavior do not agree near the target.');
    const mismatchProof = poleMismatch.detailSections?.[0];
    expect(mismatchProof?.title).toBe('Why This Limit Fails');
    expect(mismatchProof?.lines.join(' ')).toContain('Left calculation');
    expect(mismatchProof?.lines.join(' ')).toContain('Right calculation');
    expect(mismatchProof?.lines.join(' ')).toContain('two-sided limit does not exist');
    expect(mismatchProof?.lineParts?.flat()).toContainEqual({
      kind: 'math',
      latex: '\\lim_{x\\to 0^{-}} f(x)=-\\infty',
    });
    expect(mismatchProof?.lineParts?.flat()).toContainEqual({
      kind: 'math',
      latex: '\\lim_{x\\to 0^{+}} f(x)=\\infty',
    });
    expect(mismatchProof?.lineParts?.flat()).toContainEqual({
      kind: 'math',
      latex: '-\\infty',
    });
    expect(mismatchProof?.lineParts?.flat()).toContainEqual({
      kind: 'math',
      latex: '\\infty',
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
    expect(targetOverride.detailSections?.map((section) => section.title)).toContain('Side Behavior');
    const rightSideBehavior = targetOverride.detailSections
      ?.find((section) => section.title === 'Side Behavior');
    expect(rightSideBehavior?.lines.join(' ')).toContain('right-hand limit');
    expect(rightSideBehavior?.lines.join(' ')).toContain('Calculation');
    expect(rightSideBehavior?.lineParts?.flat()).toContainEqual({
      kind: 'math',
      latex: '\\lim_{x\\to 0^{+}} f(x)=\\infty',
    });

    const leftTargetOverride = evaluateCalculusFiniteLimit({
      bodyLatex: '\\frac{1}{x}',
      target: '0^-',
      direction: 'two-sided',
    });
    expect(leftTargetOverride.exactLatex).toBe('-\\infty');
    expect(leftTargetOverride.detailSections?.map((section) => section.title)).toContain('Side Behavior');
    const leftSideBehavior = leftTargetOverride.detailSections
      ?.find((section) => section.title === 'Side Behavior');
    expect(leftSideBehavior?.lines.join(' ')).toContain('left-hand limit');
    expect(leftSideBehavior?.lineParts?.flat()).toContainEqual({
      kind: 'math',
      latex: '\\lim_{x\\to 0^{-}} f(x)=-\\infty',
    });

    const sameSignDivergence = evaluateCalculusFiniteLimit({
      bodyLatex: '\\frac{1}{x^2}',
      target: '0',
      direction: 'two-sided',
    });
    expect(sameSignDivergence.error).toBeUndefined();
    expect(sameSignDivergence.exactLatex).toBe('\\infty');
    expect(sameSignDivergence.detailSections?.map((section) => section.title)).toContain('Side Behavior');
    const sameSignBehavior = sameSignDivergence.detailSections
      ?.find((section) => section.title === 'Side Behavior');
    expect(sameSignBehavior?.lines.join(' '))
      .toContain('two-sided limit is \\infty');
    expect(sameSignBehavior?.lineParts?.flat()).toContainEqual({
      kind: 'math',
      latex: '\\lim_{x\\to 0^{-}} f(x)=\\infty',
    });
    expect(sameSignBehavior?.lineParts?.flat()).toContainEqual({
      kind: 'math',
      latex: '\\lim_{x\\to 0^{+}} f(x)=\\infty',
    });

    const shiftedAbs = evaluateCalculusLimit({
      requestLatex: 'lim x -> 2+ |x-2|/(x-2)',
    });
    expect(shiftedAbs.error).toBeUndefined();
    expect(shiftedAbs.exactLatex).toBe('1');
    expect(shiftedAbs.resultOrigin).toBe('rule-based-symbolic');
    expect(shiftedAbs.detailSections?.find((section) => section.title === 'Limit Route')?.lines.join(' '))
      .toContain('absolute-value side behavior');

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
    expect(sameDegree.detailSections?.[0]?.lines.join(' ')).toContain('Form detected');
    expect(sameDegree.detailSections?.[0]?.lines.join(' ')).toContain('Key calculation');

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
    expect(unbounded.error).toBeUndefined();
    expect(unbounded.exactLatex).toBe('\\infty');

    const scale = evaluateCalculusLimit({
      requestLatex: 'lim x -> infinity x/e^x',
    });
    expect(scale.error).toBeUndefined();
    expect(scale.resultOrigin).toBe('rule-based-symbolic');
    expect(scale.exactLatex).toBe('0');
    expect(scale.detailSections?.[0]?.lines.join(' ')).toContain('infinity scale comparison');
    expect(scale.detailSections?.[0]?.lines.join(' ')).toContain('Conclusion');

    const mrv = evaluateCalculusLimit({
      requestLatex: '\\lim_{x\\to\\infty}\\frac{e^{\\sqrt{x}}}{e^x}',
    });
    expect(mrv.error).toBeUndefined();
    expect(mrv.exactLatex).toBe('0');
    expect(mrv.resultOrigin).toBe('rule-based-symbolic');
    expect(mrv.detailSections?.[0]?.lines.join(' ')).toContain('MRV-lite');
    expect(mrv.detailSections?.find((section) => section.title === 'Limit Route')?.lines.join(' '))
      .toContain('MRV-lite asymptotic comparison');
  });

  it('handles natural Piecewise limit expressions', () => {
    const friendly = evaluateCalculusLimit({
      requestLatex: 'lim x -> 0 piecewise(x if x<0, x^2 otherwise)',
    });
    expect(friendly.error).toBeUndefined();
    expect(friendly.exactLatex).toBe('0');
    expect(friendly.resultOrigin).toBe('symbolic');
    expect(friendly.detailSections?.[0]?.title).toBe('Limit Method');
    expect(friendly.detailSections?.[0]?.lines.join(' ')).toContain('piecewise branch analysis');
    expect(friendly.detailSections?.find((section) => section.title === 'Limit Route')?.lines.join(' '))
      .toContain('Route chosen: piecewise branch analysis');

    const mismatch = evaluateCalculusLimit({
      requestLatex: 'lim x -> 0 piecewise(-1 if x<0, 1 otherwise)',
    });
    expect(mismatch.error).toContain('do not agree');
    expect(mismatch.detailSections?.[0]?.title).toBe('Why This Limit Fails');
    expect(mismatch.detailSections?.[0]?.lineParts?.flat()).toContainEqual({
      kind: 'math',
      latex: '\\lim_{x\\to 0^{-}}-1=-1',
    });
    expect(mismatch.detailSections?.find((section) => section.title === 'Limit Route')?.lines.join(' '))
      .toContain('did not resolve the expression within the current exact rules');

    const cases = evaluateCalculusLimit({
      requestLatex: '\\lim_{x\\to0}\\begin{cases}x&x<0\\\\x^2&\\text{otherwise}\\end{cases}',
    });
    expect(cases.error).toBeUndefined();
    expect(cases.exactLatex).toBe('0');

    const infinity = evaluateCalculusLimit({
      requestLatex: 'lim x -> infinity piecewise(1 if x<0, 2 otherwise)',
    });
    expect(infinity.error).toBeUndefined();
    expect(infinity.exactLatex).toBe('2');
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

  it('blocks unsupported natural limit routes with diagnostics', () => {
    const result = evaluateCalculusLimit({
      requestLatex: 'lim x -> 0 floor(1/x)',
    });

    expect(result.error).toContain('outside the supported Calculus limit routes');
    expect(result.detailSections?.[0]?.title).toBe('Limit Route');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Route chosen: unsupported route');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('stopped with a controlled explanation');
    const diagnostic = result.detailSections?.find((section) => section.title === 'Limit Diagnostic');
    expect(diagnostic?.lines.join(' ')).toContain('Route classification:');
    expect(diagnostic?.lines.join(' ')).toContain('unsupported');
  });

  it('resolves squeeze and oscillation natural limit expressions', () => {
    const squeeze = evaluateCalculusLimit({
      requestLatex: 'lim x -> 0 x sin(1/x)',
    });
    const secondOrder = evaluateCalculusLimit({
      requestLatex: 'lim x -> 0 x^2 cos(1/x)',
    });
    const widened = evaluateCalculusLimit({
      requestLatex: 'lim x -> 0 ((1-cos(x))/x) cos(1/x^2)',
    });
    const oscillation = evaluateCalculusLimit({
      requestLatex: 'lim x -> 0 sin(1/x)',
    });

    expect(squeeze.error).toBeUndefined();
    expect(squeeze.exactLatex).toBe('0');
    expect(squeeze.detailSections?.[0]?.lines.join(' ')).toContain('squeeze theorem');
    expect(squeeze.detailSections?.find((section) => section.title === 'Limit Route')?.lines.join(' '))
      .toContain('Route chosen: squeeze or oscillation');

    expect(secondOrder.error).toBeUndefined();
    expect(secondOrder.exactLatex).toBe('0');

    expect(widened.error).toBeUndefined();
    expect(widened.exactLatex).toBe('0');
    expect(widened.detailSections?.[0]?.lines.join(' ')).toContain('bounded oscillator');

    expect(oscillation.error).toContain('oscillates near the target');
    expect(oscillation.exactLatex).toBeUndefined();
    expect(oscillation.detailSections?.[0]?.title).toBe('Why This Limit Fails');
    expect(oscillation.detailSections?.[0]?.lines.join(' ')).toContain('does not approach one number');
    expect(oscillation.detailSections?.find((section) => section.title === 'Limit Route')?.lines.join(' '))
      .toContain('Outcome: the selected route did not resolve');
    expect(oscillation.detailSections?.[0]?.lineParts?.flat()).toContainEqual({
      kind: 'math',
      latex: 'x_n=1/(\\pi/2+2\\pi n)',
    });
    expect(oscillation.detailSections?.[0]?.lineParts?.flat()).toContainEqual({
      kind: 'math',
      latex: 'y_n=1/(3\\pi/2+2\\pi n)',
    });
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

  it('resolves exact local algebra natural limit expressions', () => {
    const finite = evaluateCalculusLimit({
      requestLatex: 'lim x -> 0 1/x - 1/sin(x)',
    });
    const infinity = evaluateCalculusLimit({
      requestLatex: 'lim x -> infinity sqrt(x^2+x)-x',
    });

    expect(finite.error).toBeUndefined();
    expect(finite.exactLatex).toBe('0');
    expect(finite.detailSections?.[0]?.lines.join(' ')).toContain('rewrite/cancellation spine');
    expect(finite.detailSections?.[0]?.lines.join(' ')).toContain('common denominator');
    expect(finite.detailSections?.[0]?.lines.join(' ')).toContain('Form detected');

    expect(infinity.error).toBeUndefined();
    expect(infinity.exactLatex).toBe('\\frac{1}{2}');
    expect(infinity.detailSections?.[0]?.lines.join(' ')).toContain('rewrite/cancellation spine');
    expect(infinity.detailSections?.[0]?.lines.join(' ')).toContain('conjugate');
    expect(infinity.detailSections?.[0]?.lines.join(' ')).toContain('Key calculation');
  });

  it('uses proof-first complex domain handling for recognized radical limits', () => {
    const requestLatex = '\\lim_{x\\to 0}\\left(\\sqrt{x^2+x}-x\\right)';
    const realMode = evaluateCalculusLimit({ requestLatex });
    const complexMode = evaluateCalculusLimit({
      requestLatex,
      equationDomainIntent: 'complex',
    });
    const unsupported = evaluateCalculusLimit({
      requestLatex: '\\lim_{x\\to 0}\\sqrt{x}',
      equationDomainIntent: 'complex',
    });

    expect(realMode.error).toContain('outside the real domain');

    expect(complexMode.error).toBeUndefined();
    expect(complexMode.exactLatex).toBe('0');
    expect(complexMode.detailSections?.[0]?.title).toBe('Complex Domain');
    expect(complexMode.detailSections?.[0]?.lineParts?.flat()).toContainEqual({
      kind: 'math',
      latex: '\\sqrt{x^2+x}',
    });

    expect(unsupported.error).toBe('Complex proof is not supported yet for this finite-domain-boundary limit.');
    expect(unsupported.detailSections?.[0]?.title).toBe('Complex Domain');
    expect(unsupported.detailSections?.[0]?.lines.join(' ')).toContain('proof-first');
  });

  it('resolves safe indeterminate transform natural limit expressions', () => {
    const product = evaluateCalculusLimit({
      requestLatex: 'lim x -> 0+ x ln(x)',
    });
    const power = evaluateCalculusLimit({
      requestLatex: 'lim x -> infinity (1+1/x)^x',
    });

    expect(product.error).toBeUndefined();
    expect(product.exactLatex).toBe('0');
    expect(product.detailSections?.[0]?.lines.join(' ')).toContain('rewrite/cancellation spine');
    expect(product.detailSections?.[0]?.lines.join(' ')).toContain('0 times infinity');
    expect(product.detailSections?.[0]?.lines.join(' ')).toContain('Rewrite/equivalent');

    expect(power.error).toBeUndefined();
    expect(power.exactLatex).toBe('e');
    expect(Number(power.approxText)).toBeCloseTo(Math.E, 6);
    expect(power.detailSections?.[0]?.lines.join(' ')).toContain('rewrite/cancellation spine');
    expect(power.detailSections?.[0]?.lines.join(' ')).toContain('1^infinity');
    expect(power.detailSections?.[0]?.lines.join(' ')).toContain('Conclusion');
  });

  it('resolves capped Taylor leading-term natural limit expressions', () => {
    const symbolicCoefficient = evaluateCalculusLimit({
      requestLatex: 'lim x -> 0 a*sin(x)/x',
    });
    const tangent = evaluateCalculusLimit({
      requestLatex: 'lim x -> 0 (tan(x)-x)/x^3',
    });
    const exponential = evaluateCalculusLimit({
      requestLatex: 'lim x -> 0 (e^x-1-x-x^2/2)/x^3',
    });

    expect(symbolicCoefficient.error).toBeUndefined();
    expect(symbolicCoefficient.exactLatex).toBe('a');
    expect(symbolicCoefficient.approxText).toBeUndefined();
    expect(symbolicCoefficient.resultOrigin).toBe('rule-based-symbolic');
    expect(symbolicCoefficient.detailSections?.[0]?.lines.join(' ')).toContain('recursive finite leading-term');

    expect(tangent.error).toBeUndefined();
    expect(tangent.exactLatex).toBe('\\frac{1}{3}');
    expect(tangent.detailSections?.[0]?.lines.join(' ')).toContain('Taylor leading term');
    expect(tangent.detailSections?.[0]?.lines.join(' ')).toContain('Key calculation');

    expect(exponential.error).toBeUndefined();
    expect(exponential.exactLatex).toBe('\\frac{1}{6}');
    expect(exponential.detailSections?.[0]?.lines.join(' ')).toContain('first nonzero derivative order 3');
  });

  it('resolves recursive composed finite leading terms', () => {
    const logarithmicCosine = evaluateCalculusLimit({
      requestLatex: 'lim x -> 0 ln(cos(x))/x^2',
    });

    expect(logarithmicCosine.error).toBeUndefined();
    expect(logarithmicCosine.exactLatex).toBe('-\\frac{1}{2}');
    expect(logarithmicCosine.resultOrigin).toBe('rule-based-symbolic');
    expect(logarithmicCosine.detailSections?.[0]?.lines.join(' ')).toContain('Key calculation');
  });

  it('resolves infinity scale comparisons for logs powers and exponentials', () => {
    const logOverPower = evaluateCalculusLimit({
      requestLatex: 'lim x -> infinity log(x)/x',
    });
    const powerOverExp = evaluateCalculusLimit({
      requestLatex: 'lim x -> infinity x^5/e^x',
    });
    const expRatio = evaluateCalculusLimit({
      requestLatex: 'lim x -> infinity (e^x+x^3)/(e^x-1)',
    });
    const iteratedLog = evaluateCalculusLimit({
      requestLatex: 'lim x -> infinity log(log(x))/log(x)',
    });

    expect(logOverPower.error).toBeUndefined();
    expect(logOverPower.exactLatex).toBe('0');
    expect(powerOverExp.error).toBeUndefined();
    expect(powerOverExp.exactLatex).toBe('0');
    expect(expRatio.error).toBeUndefined();
    expect(expRatio.exactLatex).toBe('1');
    expect(iteratedLog.error).toBeUndefined();
    expect(iteratedLog.exactLatex).toBe('0');
  });
});
