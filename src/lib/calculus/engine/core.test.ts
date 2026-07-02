import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { backcheckAntiderivative } from './verification';
import {
  evaluateDefiniteIntegralFromAst,
  resolveIndefiniteIntegralFromAst,
} from './integration';
import {
  evaluateFiniteLimitFromAst,
  evaluateInfiniteLimitFromAst,
} from './limits';
import { resolveCalculusEvaluation } from './eval';
import type { BoxedLike } from './shared';

const ce = new ComputeEngine();

function parse(latex: string) {
  return ce.parse(latex) as BoxedLike;
}

const finiteMessages = {
  mismatchError: 'Left and right behavior do not agree near the target.',
  unstableError: 'This limit could not be stabilized numerically in this milestone.',
  numericFallbackWarning: () => 'Symbolic limit unavailable; showing a numeric limit approximation.',
  oneSidedUnboundedError: (side: 'left' | 'right') =>
    `${side === 'left' ? 'Left-hand' : 'Right-hand'} limit appears unbounded near the target.`,
  oneSidedDomainError: (side: 'left' | 'right') =>
    `${side === 'left' ? 'Left-hand' : 'Right-hand'} behavior is outside the real domain near the target.`,
};

describe('calculus core', () => {
  it('resolves app-owned indefinite integrals before Compute Engine provenance', () => {
    const body = parse('\\frac{1}{1+x^2}');
    const computed = parse('\\int \\frac{1}{1+x^2}\\,dx').evaluate();

    const result = resolveIndefiniteIntegralFromAst({
      body: body.json,
      variable: 'x',
      computed,
      unresolvedComputeEngine: false,
      computeEngineOrigin: 'symbolic',
      unsupportedError: 'This antiderivative could not be determined symbolically in Calculus.',
    });

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.integrationStrategy).toBe('inverse-trig');
    expect(result.integrationCandidate?.method).toBe('inverse-trig');
    expect(result.integrationCandidate?.verificationStatus).toMatch(/verified-/);
    expect(result.antiderivativeBackcheck?.status).toMatch(/verified-/);
    expect(result.exactLatex).toContain('\\arctan');
  });

  it('resolves bounded rational partial-fraction antiderivatives through the shared core', () => {
    const body = parse('\\frac{1}{x^2-1}');
    const repeated = parse('\\frac{1}{(x-1)^2}');
    const quadratic = parse('\\frac{x+1}{x^2+1}');

    const result = resolveIndefiniteIntegralFromAst({
      body: body.json,
      variable: 'x',
      unresolvedComputeEngine: true,
      computeEngineOrigin: 'symbolic',
      unsupportedError: 'This antiderivative could not be determined symbolically in Calculus.',
    });

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.integrationStrategy).toBe('partial-fractions');
    expect(result.integrationCandidate?.method).toBe('partial-fractions');
    expect(result.integrationCandidate?.requiredPrerequisites).toContain('rational-function-core');
    expect(result.exactLatex).toContain('\\ln');
    expect(result.exactLatex).toContain('x-1');
    expect(result.exactLatex).toContain('x+1');
    expect(result.detailSections?.[0]?.title).toBe('Partial Fractions');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('shared polynomial/rational core');
    expect(result.detailSections?.map((section) => section.title)).toContain('Trust');

    const repeatedResult = resolveIndefiniteIntegralFromAst({
      body: repeated.json,
      variable: 'x',
      unresolvedComputeEngine: true,
      computeEngineOrigin: 'symbolic',
      unsupportedError: 'This antiderivative could not be determined symbolically in Calculus.',
    });

    expect(repeatedResult.error).toBeUndefined();
    expect(repeatedResult.resultOrigin).toBe('rule-based-symbolic');
    expect(repeatedResult.integrationStrategy).toBe('partial-fractions');
    expect(repeatedResult.exactLatex).toBe('-\\frac{1}{x-1}');
    expect(repeatedResult.detailSections?.[0]?.title).toBe('Partial Fractions');

    const quadraticResult = resolveIndefiniteIntegralFromAst({
      body: quadratic.json,
      variable: 'x',
      unresolvedComputeEngine: true,
      computeEngineOrigin: 'symbolic',
      unsupportedError: 'This antiderivative could not be determined symbolically in Calculus.',
    });

    expect(quadraticResult.error).toBeUndefined();
    expect(quadraticResult.resultOrigin).toBe('rule-based-symbolic');
    expect(quadraticResult.integrationStrategy).toBe('partial-fractions');
    expect(quadraticResult.exactLatex).toContain('\\ln');
    expect(quadraticResult.exactLatex).toContain('\\arctan');
    expect(quadraticResult.detailSections?.[0]?.lines.join(' ')).toContain('irreducible quadratic');
  });

  it('keeps unsupported indefinite integrals on a controlled stop', () => {
    const body = parse('\\sin(x^3)');

    const result = resolveIndefiniteIntegralFromAst({
      body: body.json,
      variable: 'x',
      unresolvedComputeEngine: true,
      computeEngineOrigin: 'symbolic',
      unsupportedError: 'This antiderivative could not be determined symbolically in Calculus.',
    });

    expect(result.warnings).toEqual([]);
    expect(result.error).toBe('This antiderivative could not be determined symbolically in Calculus.');
    expect(result.integrationCandidate?.method).toBe('unsupported');
    expect(result.integrationCandidate?.controlledFailureClass).toBe('missing-derivative-factor');
  });

  it('returns theorem-backed non-elementary certificates before Compute Engine fallback', () => {
    const body = parse('e^{x^2}');
    const computed = parse('\\int e^{x^2}\\,dx').evaluate();

    const result = resolveIndefiniteIntegralFromAst({
      body: body.json,
      variable: 'x',
      computed,
      unresolvedComputeEngine: false,
      computeEngineOrigin: 'symbolic',
      unsupportedError: 'This antiderivative could not be determined symbolically in Calculus.',
    });

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.integrationStrategy).toBeUndefined();
    expect(result.integrationCandidate).toBeUndefined();
    expect(result.antiderivativeBackcheck).toBeUndefined();
    expect(result.exactLatex).toContain('\\operatorname{erfi}');
    expect(result.detailSections?.map((section) => section.title)).toContain('Liouville Obstruction');
    expect(result.detailSections?.map((section) => section.title)).toContain('Non-Elementary Certificate');
  });

  it('returns depth-2 composition special-function certificates before Compute Engine fallback', () => {
    const expExp = resolveIndefiniteIntegralFromAst({
      body: parse('e^{e^x}').json,
      variable: 'x',
      unresolvedComputeEngine: true,
      computeEngineOrigin: 'symbolic',
      unsupportedError: 'This antiderivative could not be determined symbolically in Calculus.',
    });
    const sineExp = resolveIndefiniteIntegralFromAst({
      body: parse('\\sin(e^x)').json,
      variable: 'x',
      unresolvedComputeEngine: true,
      computeEngineOrigin: 'symbolic',
      unsupportedError: 'This antiderivative could not be determined symbolically in Calculus.',
    });
    const cosineExp = resolveIndefiniteIntegralFromAst({
      body: parse('\\cos(e^x)').json,
      variable: 'x',
      unresolvedComputeEngine: true,
      computeEngineOrigin: 'symbolic',
      unsupportedError: 'This antiderivative could not be determined symbolically in Calculus.',
    });

    expect(expExp.error).toBeUndefined();
    expect(expExp.resultOrigin).toBe('rule-based-symbolic');
    expect(expExp.integrationStrategy).toBeUndefined();
    expect(expExp.exactLatex).toBe(String.raw`\operatorname{Ei}\left(e^{x}\right)`);
    expect(expExp.exactSupplementLatex?.join(' ')).toContain('e^{x}>0');
    expect(sineExp.exactLatex).toBe(String.raw`\operatorname{Si}\left(e^{x}\right)`);
    expect(cosineExp.exactLatex).toBe(String.raw`\operatorname{Ci}\left(e^{x}\right)`);
  });

  it('returns Fresnel special-function certificates for exact-rational quadratic trig inputs', () => {
    const sine = resolveIndefiniteIntegralFromAst({
      body: parse('\\sin(x^2)').json,
      variable: 'x',
      unresolvedComputeEngine: true,
      computeEngineOrigin: 'symbolic',
      unsupportedError: 'This antiderivative could not be determined symbolically in Calculus.',
    });
    const shiftedCosine = resolveIndefiniteIntegralFromAst({
      body: parse('\\cos((2x+1)^2)').json,
      variable: 'x',
      unresolvedComputeEngine: true,
      computeEngineOrigin: 'symbolic',
      unsupportedError: 'This antiderivative could not be determined symbolically in Calculus.',
    });

    expect(sine.error).toBeUndefined();
    expect(sine.resultOrigin).toBe('rule-based-symbolic');
    expect(sine.integrationStrategy).toBeUndefined();
    expect(sine.exactLatex).toContain(String.raw`\operatorname{FresnelS}`);
    expect(sine.exactLatex).toContain(String.raw`\sqrt{\frac{\pi}{2}}`);
    expect(shiftedCosine.exactLatex).toContain(String.raw`\operatorname{FresnelC}`);
    expect(shiftedCosine.exactLatex).toContain(String.raw`\sqrt{\frac{8}{\pi}}\left(x+\frac{1}{2}\right)`);
    expect(sine.detailSections?.map((section) => section.title)).toContain('Non-Elementary Certificate');
    expect(sine.detailSections?.map((section) => section.title)).toContain('Special-Function Readback');
  });

  it('returns recurrence-backed special-function certificates for affine quotient powers', () => {
    const sine = resolveIndefiniteIntegralFromAst({
      body: parse('\\sin(x)/x^2').json,
      variable: 'x',
      unresolvedComputeEngine: true,
      computeEngineOrigin: 'symbolic',
      unsupportedError: 'This antiderivative could not be determined symbolically in Calculus.',
    });
    const exponential = resolveIndefiniteIntegralFromAst({
      body: parse('e^x/x^2').json,
      variable: 'x',
      unresolvedComputeEngine: true,
      computeEngineOrigin: 'symbolic',
      unsupportedError: 'This antiderivative could not be determined symbolically in Calculus.',
    });

    expect(sine.error).toBeUndefined();
    expect(sine.resultOrigin).toBe('rule-based-symbolic');
    expect(sine.integrationStrategy).toBeUndefined();
    expect(sine.exactLatex).toContain(String.raw`\operatorname{Ci}`);
    expect(sine.exactLatex).toContain(String.raw`\frac{\sin\left(x\right)}{x}`);
    expect(sine.exactSupplementLatex?.join(' ')).toContain('x\\ne0');

    expect(exponential.error).toBeUndefined();
    expect(exponential.exactLatex).toContain(String.raw`\operatorname{Ei}`);
    expect(exponential.exactLatex).toContain(String.raw`\frac{e^{x}}{x}`);
    expect(exponential.detailSections?.map((section) => section.title)).toContain('Proof Obligations');
  });

  it('preserves the controlled relation-integrand error before fallback', () => {
    const body = parse('a x+b y=e');

    const result = resolveIndefiniteIntegralFromAst({
      body: body.json,
      variable: 'x',
      computeEngineFallback: () => {
        throw new Error('Compute Engine fallback should not run for relation inputs');
      },
      computeEngineOrigin: 'symbolic',
      unsupportedError: 'This antiderivative could not be determined symbolically in Calculus.',
    });

    expect(result.warnings).toEqual([]);
    expect(result.error).toBe(
      'Calculus integrals expect an expression f(x), not an equation or relation.',
    );
    expect(result.integrationCandidate?.method).toBe('unsupported');
  });

  it('keeps Compute Engine-only integral candidates separate from app-owned rules', () => {
    const body = parse('\\sec(x)');
    const computed = parse('\\int \\sec(x)\\,dx').evaluate();

    const result = resolveIndefiniteIntegralFromAst({
      body: body.json,
      variable: 'x',
      computed,
      unresolvedComputeEngine: false,
      computeEngineOrigin: 'symbolic',
      unsupportedError: 'This antiderivative could not be determined symbolically in Calculus.',
    });

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.integrationStrategy).toBe('compute-engine');
    expect(result.integrationCandidate?.method).toBe('compute-engine');
    expect(result.integrationCandidate?.requiredPrerequisites).toContain('compute-engine');
    expect(result.integrationCandidate?.readinessNotes.join(' ')).toContain('separate from app-owned symbolic rules');
  });

  it('guards lazy Compute Engine fallback for parameter-heavy symbolic-variable integrals', () => {
    const body = parse('\\frac{A}{A+x}');
    let fallbackCalled = false;

    const result = resolveIndefiniteIntegralFromAst({
      body: body.json,
      variable: 'A',
      computeEngineFallback: () => {
        fallbackCalled = true;
        throw new Error('Compute Engine fallback should not run for parameter-heavy selected variables');
      },
      computeEngineOrigin: 'symbolic',
      unsupportedError: 'This antiderivative could not be determined symbolically in Calculus.',
    });

    expect(result.error).toBeUndefined();
    expect(result.integrationStrategy).toBe('partial-fractions');
    expect(result.integrationCandidate?.method).toBe('partial-fractions');
    expect(result.antiderivativeBackcheck?.status).toBe('verified-exact');
    expect(fallbackCalled).toBe(false);
  });

  it('uses verified antiderivatives for safe finite definite integrals', () => {
    const polynomial = evaluateDefiniteIntegralFromAst({
      body: parse('2x').json,
      variable: 'x',
      lower: 0,
      upper: 1,
      unreliableError: 'This definite integral could not be evaluated reliably in this milestone.',
    });
    const inverseTrig = evaluateDefiniteIntegralFromAst({
      body: parse('\\frac{1}{1+x^2}').json,
      variable: 'x',
      lower: 0,
      upper: 1,
      unreliableError: 'This definite integral could not be evaluated reliably in this milestone.',
    });
    const substitution = evaluateDefiniteIntegralFromAst({
      body: parse('2xe^{x^2}').json,
      variable: 'x',
      lower: 0,
      upper: 1,
      unreliableError: 'This definite integral could not be evaluated reliably in this milestone.',
    });
    const partialFractions = evaluateDefiniteIntegralFromAst({
      body: parse('\\frac{1}{x^2-1}').json,
      variable: 'x',
      lower: 2,
      upper: 3,
      unreliableError: 'This definite integral could not be evaluated reliably in this milestone.',
    });
    const repeatedRational = evaluateDefiniteIntegralFromAst({
      body: parse('\\frac{1}{(x-1)^2}').json,
      variable: 'x',
      lower: 2,
      upper: 3,
      unreliableError: 'This definite integral could not be evaluated reliably in this milestone.',
    });

    expect(polynomial.error).toBeUndefined();
    expect(polynomial.exactLatex).toBe('1');
    expect(polynomial.resultOrigin).toBe('rule-based-symbolic');
    expect(polynomial.integrationCandidate?.method).toBe('direct-rule');
    expect(polynomial.detailSections?.[0]?.title).toBe('Integral Method');
    expect(polynomial.detailSections?.[1]?.title).toBe('Interval Safety');

    expect(inverseTrig.error).toBeUndefined();
    expect(inverseTrig.resultOrigin).toBe('rule-based-symbolic');
    expect(Number(inverseTrig.approxText)).toBeCloseTo(Math.PI / 4, 5);

    expect(substitution.error).toBeUndefined();
    expect(substitution.resultOrigin).toBe('rule-based-symbolic');
    expect(Number(substitution.approxText)).toBeCloseTo(Math.E - 1, 5);

    expect(partialFractions.error).toBeUndefined();
    expect(partialFractions.resultOrigin).toBe('rule-based-symbolic');
    expect(partialFractions.integrationCandidate?.method).toBe('partial-fractions');
    expect(Number(partialFractions.approxText)).toBeCloseTo(0.202732, 5);

    expect(repeatedRational.error).toBeUndefined();
    expect(repeatedRational.resultOrigin).toBe('rule-based-symbolic');
    expect(repeatedRational.integrationCandidate?.method).toBe('partial-fractions');
    expect(Number(repeatedRational.approxText)).toBeCloseTo(0.5, 5);
    expect(repeatedRational.detailSections?.map((section) => section.title)).toContain('Partial Fractions');
  });

  it('preserves numeric fallback for safe unsupported definite integrals', () => {
    const result = evaluateDefiniteIntegralFromAst({
      body: parse('\\sin(x^3)').json,
      variable: 'x',
      lower: 0,
      upper: 1,
      unreliableError: 'This definite integral could not be evaluated reliably in this milestone.',
    });

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('numeric-fallback');
    expect(result.integrationCandidate?.method).toBe('unsupported');
    expect(result.integrationCandidate?.controlledFailureClass).toBe('missing-derivative-factor');
    expect(result.warnings).toContain('Symbolic integral unavailable; showing a numeric definite integral.');
    expect(Number(result.exactLatex)).toBeCloseTo(0.233845, 4);
    expect(result.detailSections?.[0]?.title).toBe('Integral Method');
    expect(result.detailSections?.[1]?.title).toBe('Interval Safety');
  });

  it('blocks numeric fallback on clearly unsafe definite-integral intervals', () => {
    for (const bodyLatex of ['\\frac{1}{x}', '\\ln(x)', '\\frac{1}{\\sqrt{x}}', '\\frac{1}{x^2-1}']) {
      const result = evaluateDefiniteIntegralFromAst({
        body: parse(bodyLatex).json,
        variable: 'x',
        lower: bodyLatex === '\\frac{1}{x}' ? -1 : 0,
        upper: bodyLatex === '\\frac{1}{x^2-1}' ? 2 : 1,
        unreliableError: 'This definite integral could not be evaluated reliably in this milestone.',
      });

      expect(result.error).toContain('outside the real domain');
      expect(result.detailSections?.[0]?.title).toBe('Interval Safety');
      expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Trust: blocked via domain/range core');
    }
  });

  it('returns controlled preflight errors for unsupported derivative expression forms', () => {
    const derivative = parse('\\frac{d}{dx}\\left(x=1\\right)');

    const result = resolveCalculusEvaluation(derivative, derivative);

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected derivative preflight error');
    }
    expect(result.error).toBe('This derivative uses an unsupported expression form in this milestone.');
    expect(result.warnings).toEqual([]);
  });

  it('uses bounded numeric fallback for over-budget derivative-at-point expressions', () => {
    const largeSum = ['Add', ...Array.from({ length: 180 }, () => 'x')];
    const derivativeAtPoint = ce.box(([
      'Subscript',
      ['EvaluateAt', ['Function', ['Block', ['D', largeSum, 'x']], 'x']],
      ['Equal', 'x', 2],
    ] as unknown) as Parameters<typeof ce.box>[0]) as BoxedLike;

    const result = resolveCalculusEvaluation(derivativeAtPoint, derivativeAtPoint);

    expect(result.kind).toBe('handled');
    if (result.kind !== 'handled') {
      throw new Error('Expected derivative-at-point numeric fallback');
    }
    expect(result.resultOrigin).toBe('numeric-fallback');
    expect(Number(result.approxText)).toBeCloseTo(180, 8);
    expect(result.warnings).toContain(
      'Symbolic derivative skipped because the expression is over budget; showing a numeric derivative at the selected point.',
    );
  });

  it('resolves common finite limits and directional numeric cases', () => {
    const sinOverX = evaluateFiniteLimitFromAst({
      body: parse('\\frac{\\sin(x)}{x}').json,
      variable: 'x',
      target: 0,
      direction: 'two-sided',
      messages: finiteMessages,
    });

    expect(sinOverX.error).toBeUndefined();
    expect(sinOverX.resultOrigin).toBe('rule-based-symbolic');
    expect(sinOverX.exactLatex).toBe('1');
    expect(sinOverX.detailSections?.[0]?.title).toBe('Limit Method');

    const logKnownForm = evaluateFiniteLimitFromAst({
      body: parse('\\frac{\\ln(1+x)}{x}').json,
      variable: 'x',
      target: 0,
      direction: 'two-sided',
      messages: finiteMessages,
    });

    expect(logKnownForm.error).toBeUndefined();
    expect(logKnownForm.resultOrigin).toBe('rule-based-symbolic');
    expect(logKnownForm.exactLatex).toBe('1');

    const mismatch = evaluateFiniteLimitFromAst({
      body: parse('\\frac{|x|}{x}').json,
      variable: 'x',
      target: 0,
      direction: 'two-sided',
      messages: finiteMessages,
    });

    expect(mismatch.error).toBe('Left and right behavior do not agree near the target.');

    const left = evaluateFiniteLimitFromAst({
      body: parse('\\frac{|x|}{x}').json,
      variable: 'x',
      target: 0,
      direction: 'left',
      messages: finiteMessages,
    });
    const right = evaluateFiniteLimitFromAst({
      body: parse('\\frac{|x|}{x}').json,
      variable: 'x',
      target: 0,
      direction: 'right',
      messages: finiteMessages,
    });

    expect(left.exactLatex).toBe('-1');
    expect(right.exactLatex).toBe('1');
  });

  it('carries local limit method details for rational and equivalent-form wins', () => {
    const rational = evaluateFiniteLimitFromAst({
      body: parse('\\frac{3x}{x+x^2}').json,
      variable: 'x',
      target: 0,
      direction: 'left',
      messages: finiteMessages,
    });
    const equivalent = evaluateFiniteLimitFromAst({
      body: parse('\\frac{\\ln(1+x)\\sin(x)}{x^2}').json,
      variable: 'x',
      target: 0,
      direction: 'two-sided',
      messages: finiteMessages,
    });

    expect(rational.error).toBeUndefined();
    expect(rational.exactLatex).toBe('3');
    expect(rational.detailSections?.[0]?.lines.join(' ')).toContain('rational normalizer');
    expect(equivalent.error).toBeUndefined();
    expect(equivalent.exactLatex).toBe('1');
    expect(equivalent.detailSections?.[0]?.lines.join(' ')).toContain('local orders');
  });

  it('returns trusted signed infinities for clear finite asymptotes', () => {
    const rightReciprocal = evaluateFiniteLimitFromAst({
      body: parse('\\frac{1}{x}').json,
      variable: 'x',
      target: 0,
      direction: 'right',
      messages: finiteMessages,
    });
    const leftReciprocal = evaluateFiniteLimitFromAst({
      body: parse('\\frac{1}{x}').json,
      variable: 'x',
      target: 0,
      direction: 'left',
      messages: finiteMessages,
    });
    const twoSidedReciprocal = evaluateFiniteLimitFromAst({
      body: parse('\\frac{1}{x}').json,
      variable: 'x',
      target: 0,
      direction: 'two-sided',
      messages: finiteMessages,
    });
    const reciprocalSquare = evaluateFiniteLimitFromAst({
      body: parse('\\frac{1}{x^2}').json,
      variable: 'x',
      target: 0,
      direction: 'two-sided',
      messages: finiteMessages,
    });
    const logBoundary = evaluateFiniteLimitFromAst({
      body: parse('\\ln(x)').json,
      variable: 'x',
      target: 0,
      direction: 'right',
      messages: finiteMessages,
    });

    expect(rightReciprocal.error).toBeUndefined();
    expect(rightReciprocal.exactLatex).toBe('\\infty');
    expect(rightReciprocal.resultOrigin).toBe('rule-based-symbolic');
    expect(leftReciprocal.exactLatex).toBe('-\\infty');
    expect(twoSidedReciprocal.error).toBe('Left and right behavior do not agree near the target.');
    expect(reciprocalSquare.exactLatex).toBe('\\infty');
    expect(reciprocalSquare.resultOrigin).toBe('rule-based-symbolic');
    expect(logBoundary.exactLatex).toBe('-\\infty');
  });

  it('classifies clear one-sided finite-domain gaps', () => {
    const sqrtBoundary = evaluateFiniteLimitFromAst({
      body: parse('\\sqrt{x}').json,
      variable: 'x',
      target: 0,
      direction: 'two-sided',
      messages: finiteMessages,
    });

    expect(sqrtBoundary.error).toBe('Left-hand behavior is outside the real domain near the target.');

    const right = evaluateFiniteLimitFromAst({
      body: parse('\\sqrt{x}').json,
      variable: 'x',
      target: 0,
      direction: 'right',
      messages: finiteMessages,
    });

    expect(right.error).toBeUndefined();
    expect(right.exactLatex).toBe('0');
    expect(right.resultOrigin).toBe('symbolic');
  });

  it('aligns infinite-limit heuristic provenance as rule-based symbolic', () => {
    const result = evaluateInfiniteLimitFromAst({
      body: parse('\\frac{3x^2+1}{2x^2-5}').json,
      variable: 'x',
      targetKind: 'posInfinity',
      messages: {
        targetLabel: () => '+infinity',
        unstableError: 'This limit could not be stabilized numerically in Calculus.',
        numericFallbackWarning: 'Symbolic limit unavailable; showing a numeric infinite-target approximation.',
      },
    });

    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toBe('\\frac{3}{2}');
    expect(Number(result.approxText)).toBeCloseTo(1.5, 6);
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('rational dominance');
  });

  it('backchecks antiderivatives with exact proof before numeric confidence', () => {
    const exact = backcheckAntiderivative({
      antiderivativeLatex: '\\frac{x^3}{3}',
      integrand: parse('x^2').json,
      variable: 'x',
    });
    expect(exact.status).toBe('verified-exact');

    const radicalExact = backcheckAntiderivative({
      antiderivativeLatex: '\\frac{1}{4}\\frac{x}{x^2+2}+\\frac{\\frac{1}{4}}{\\sqrt{2}}\\arctan\\left(\\frac{x}{\\sqrt{2}}\\right)',
      integrand: parse('\\frac{1}{(x^2+2)^2}').json,
      variable: 'x',
    });
    expect(radicalExact.status).toBe('verified-exact');

    const numericConfidence = backcheckAntiderivative({
      antiderivativeLatex: '\\sin(x)^2',
      integrand: parse('\\sin(2x)').json,
      variable: 'x',
    });
    expect(numericConfidence.status).toBe('verified-numeric-confidence');
    expect(numericConfidence.reason).toContain('confidence');

    const mismatch = backcheckAntiderivative({
      antiderivativeLatex: 'x^3',
      integrand: parse('x^2').json,
      variable: 'x',
    });
    expect(mismatch.status).toBe('not-verified');
  });
});
