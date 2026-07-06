import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  evaluateCalculusDefiniteIntegral,
  evaluateCalculusImproperIntegral,
  evaluateCalculusIndefiniteIntegral,
} from './integrals';
import { resolveSymbolicIntegralFromLatex } from '../../symbolic-engine/integration';

const ce = new ComputeEngine();

function expectParseableLatex(latex: string | undefined) {
  expect(latex).toBeDefined();
  expect(() => ce.parse(latex ?? '')).not.toThrow();
}

describe('calculus integrals', () => {
  it('handles inverse trig primitives', () => {
    const result = evaluateCalculusIndefiniteIntegral({ bodyLatex: '\\frac{1}{1+x^2}' });
    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.exactLatex).toContain('\\arctan');
  });

  it('handles arcsin primitive', () => {
    const result = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '\\frac{1}{\\sqrt{1-x^2}}',
    });
    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toContain('\\arcsin');
  });

  it('handles polynomial times exponential and trig cases', () => {
    const expResult = evaluateCalculusIndefiniteIntegral({ bodyLatex: 'xe^x' });
    expect(expResult.error).toBeUndefined();

    const trigResult = evaluateCalculusIndefiniteIntegral({ bodyLatex: 'x\\cos(x)' });
    expect(trigResult.error).toBeUndefined();

    const integrationByPartsCapExp = evaluateCalculusIndefiniteIntegral({ bodyLatex: 'x^5e^x' });
    expect(integrationByPartsCapExp.error).toBeUndefined();
    expect(integrationByPartsCapExp.resultOrigin).toBe('rule-based-symbolic');
    expect(integrationByPartsCapExp.integrationStrategy).toBe('integration-by-parts');
  });

  it('threads the chosen integration variable through indefinite integrals', () => {
    const yResult = evaluateCalculusIndefiniteIntegral({
      bodyLatex: 'y^2',
      integrationVariable: 'y',
    });
    expect(yResult.error).toBeUndefined();
    expect(yResult.exactLatex).toContain('y^{3}');

    const tResult = evaluateCalculusIndefiniteIntegral({
      bodyLatex: 't e^t',
      integrationVariable: 't',
    });
    expect(tResult.error).toBeUndefined();
    expect(tResult.exactLatex).toContain('e^{t}');

    const parameterResult = evaluateCalculusIndefiniteIntegral({
      bodyLatex: 'x t',
      integrationVariable: 't',
    });
    expect(parameterResult.error).toBeUndefined();
    expect(parameterResult.exactLatex).toContain('x');
    expect(parameterResult.exactLatex).toContain('t^{2}');
  });

  it('rejects equation-like indefinite-integral inputs with a controlled expression error', () => {
    const relation = evaluateCalculusIndefiniteIntegral({
      bodyLatex: 'a x+b y=e',
    });
    expect(relation.error).toBe(
      'Calculus integrals expect an expression f(x), not an equation or relation.',
    );

    const expression = evaluateCalculusIndefiniteIntegral({
      bodyLatex: 'x^2',
    });
    expect(expression.error).toBeUndefined();
    expect(expression.integrationStrategy).toBe('direct-rule');
  });

  it('uses app-owned symbolic rules before guarded Compute Engine fallback for symbolic selected variables', () => {
    const integrateA = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '\\frac{A x+B}{(a x+b)^2(c x+d)}',
      integrationVariable: 'A',
    });
    expect(integrateA.error).toBeUndefined();
    expect(integrateA.resultOrigin).toBe('rule-based-symbolic');
    expect(integrateA.integrationStrategy).toBe('direct-rule');
    expect(integrateA.exactLatex).toContain('A^2');
    expect(integrateA.exactSupplementLatex?.join(' ')).toContain('(cx+d)(ax+b)^2\\ne0');

    const integrateB = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '\\frac{A x+B}{(a x+b)^2(c x+d)}',
      integrationVariable: 'B',
    });
    expect(integrateB.error).toBeUndefined();
    expect(integrateB.resultOrigin).toBe('rule-based-symbolic');
    expect(integrateB.integrationStrategy).toBe('direct-rule');
    expect(integrateB.exactLatex).toContain('B^2');
  });

  it('rejects compound or reserved integration variables', () => {
    const compound = evaluateCalculusIndefiniteIntegral({
      bodyLatex: 'x^2',
      integrationVariable: 'xy',
    });
    expect(compound.error).toContain('single symbol');

    const reserved = evaluateCalculusIndefiniteIntegral({
      bodyLatex: 'x^2',
      integrationVariable: 'pi',
    });
    expect(reserved.error).toContain('single symbol');
  });

  it('routes Calculus indefinite integrals through the shared symbolic backend', () => {
    for (const bodyLatex of [
      '\\frac{1}{1+x^2}',
      '\\frac{2x+3}{x^2+3x+2}',
      '2x\\cos(x^2)',
      'x^5e^x',
      '2x\\sqrt{x^2+1}',
      '\\cos(\\sin(x))\\cos(x)',
    ]) {
      const shared = resolveSymbolicIntegralFromLatex(bodyLatex);
      const calculus = evaluateCalculusIndefiniteIntegral({ bodyLatex });

      expect(shared.kind).toBe('success');
      expect(calculus.error).toBeUndefined();
      if (shared.kind === 'success') {
        expect(calculus.exactLatex?.endsWith('+C')).toBe(true);
        expect(calculus.exactLatex?.slice(0, -2)).toBe(shared.exactLatex);
        expect(calculus.integrationStrategy).toBe(shared.strategy);
        expect(calculus.resultOrigin).toBe(shared.origin);
      }
    }
  });

  it('carries COMP1 substitution strategy metadata through Calculus', () => {
    const result = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '2x\\sqrt{x^2+1}',
    });

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.integrationStrategy).toBe('u-substitution');
  });

  it('handles logarithmic derivative forms', () => {
    const result = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '\\frac{2x+3}{x^2+3x+2}',
    });
    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toContain('\\ln');
    expect(result.integrationStrategy).toBe('derivative-ratio');
  });

  it('renders non-elementary certificates for quadratic exponentials after elementary routes miss', () => {
    for (const [bodyLatex, specialFunction] of [
      ['e^{x^2}', 'erfi'],
      ['e^{-x^2}', 'erf'],
      ['e^{2*x^2+3*x+1}', 'erfi'],
    ] as const) {
      const result = evaluateCalculusIndefiniteIntegral({ bodyLatex });

      expect(result.error).toBeUndefined();
      expect(result.resultOrigin).toBe('rule-based-symbolic');
      expect(result.integrationStrategy).toBeUndefined();
      expect(result.antiderivativeBackcheck).toBeUndefined();
      expect(result.exactLatex).toContain(`\\operatorname{${specialFunction}}`);
      expect(result.exactLatex).not.toContain('+C');
      expect(result.detailSections?.map((section) => section.title)).toContain('Proof Scope');
      expect(result.detailSections?.map((section) => section.title)).toContain('Non-Elementary Certificate');
    }

    const symbolic = evaluateCalculusIndefiniteIntegral({
      bodyLatex: 'e^{a*x^2+b*x+c}',
    });
    expect(symbolic.error).toBeUndefined();
    expect(symbolic.exactLatex).toContain('\\begin{cases}');
    expect(symbolic.exactLatex).toContain('\\operatorname{erf}');
    expect(symbolic.exactLatex).toContain('\\operatorname{erfi}');
    expect(symbolic.exactLatex).toContain('a<0');
    expect(symbolic.exactLatex).toContain('a>0');
    expect(symbolic.exactSupplementLatex?.join(' ')).toContain('a\\ne0');
    expect(symbolic.detailSections?.map((section) => section.title)).toContain('Liouville Obstruction');
    expect(symbolic.detailSections?.flatMap((section) => section.lines).join(' ')).toContain(
      'not a condition on the original input',
    );

    const selectedVariable = evaluateCalculusIndefiniteIntegral({
      bodyLatex: 'e^{a*t^2+x*t+b}',
      integrationVariable: 't',
    });
    expect(selectedVariable.error).toBeUndefined();
    expect(selectedVariable.exactLatex).toContain('\\operatorname{erf}');
    expect(selectedVariable.exactLatex).toContain('\\operatorname{erfi}');
    expect(selectedVariable.exactLatex).toContain('t+\\frac{x}{2a}');
    expect(selectedVariable.exactSupplementLatex?.join(' ')).toContain('a\\ne0');
  });

  it('keeps elementary exponential and substitution overlaps ahead of certificates', () => {
    const affine = evaluateCalculusIndefiniteIntegral({
      bodyLatex: 'e^{a*x+b}',
    });
    expect(affine.error).toBeUndefined();
    expect(affine.integrationStrategy).toBe('direct-rule');
    expect(affine.exactLatex).not.toContain('No elementary antiderivative');

    const substitution = evaluateCalculusIndefiniteIntegral({
      bodyLatex: 'x e^{x^2}',
    });
    expect(substitution.error).toBeUndefined();
    expect(substitution.integrationStrategy).toBe('u-substitution');
    expect(substitution.exactLatex).not.toContain('No elementary antiderivative');
  });

  it('renders certificate-backed Si and Ci answers for affine quotient families', () => {
    const sine = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '\\sin(x)/x',
    });
    expect(sine.error).toBeUndefined();
    expect(sine.resultOrigin).toBe('rule-based-symbolic');
    expect(sine.integrationStrategy).toBeUndefined();
    expect(sine.antiderivativeBackcheck).toBeUndefined();
    expect(sine.exactLatex).toContain('\\operatorname{Si}\\left(x\\right)');
    expect(sine.exactSupplementLatex?.join(' ')).toContain('x\\ne0');
    expect(sine.detailSections?.map((section) => section.title)).toContain('Non-Elementary Certificate');

    const shiftedSine = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '\\sin(2x+1)/(2x+1)',
    });
    expect(shiftedSine.error).toBeUndefined();
    expect(shiftedSine.exactLatex).toContain('\\frac{1}{2}\\cdot \\operatorname{Si}\\left(2x+1\\right)');

    const derivativePresent = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '2\\sin(2x+1)/(2x+1)',
    });
    expect(derivativePresent.error).toBeUndefined();
    expect(derivativePresent.exactLatex).toBe('\\operatorname{Si}\\left(2x+1\\right)');

    const cosine = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '\\cos(x)/x',
    });
    expect(cosine.error).toBeUndefined();
    expect(cosine.exactLatex).toContain('\\begin{cases}');
    expect(cosine.exactLatex).toContain('\\operatorname{Ci}\\left(x\\right)');
    expect(cosine.exactLatex).toContain('\\operatorname{Ci}\\left(-x\\right)');
    expect(cosine.exactLatex).toContain('x>0');
    expect(cosine.exactLatex).toContain('x<0');
  });

  it('renders certificate-backed Ei and li answers for affine quotient families', () => {
    const exponential = evaluateCalculusIndefiniteIntegral({
      bodyLatex: 'e^x/x',
    });
    expect(exponential.error).toBeUndefined();
    expect(exponential.resultOrigin).toBe('rule-based-symbolic');
    expect(exponential.integrationStrategy).toBeUndefined();
    expect(exponential.antiderivativeBackcheck).toBeUndefined();
    expect(exponential.exactLatex).toContain('\\begin{cases}');
    expect(exponential.exactLatex).toContain('\\operatorname{Ei}\\left(x\\right)');
    expect(exponential.exactLatex).toContain('x>0');
    expect(exponential.exactLatex).toContain('x<0');
    expect(exponential.exactSupplementLatex?.join(' ')).toContain('x\\ne0');

    const shiftedExponential = evaluateCalculusIndefiniteIntegral({
      bodyLatex: 'e^{2x+1}/(2x+1)',
    });
    expect(shiftedExponential.error).toBeUndefined();
    expect(shiftedExponential.exactLatex).toContain('\\frac{1}{2}\\cdot \\operatorname{Ei}\\left(2x+1\\right)');

    const logarithmicIntegral = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '1/\\ln(x)',
    });
    expect(logarithmicIntegral.error).toBeUndefined();
    expect(logarithmicIntegral.exactLatex).toContain('\\begin{cases}');
    expect(logarithmicIntegral.exactLatex).toContain('\\operatorname{li}\\left(x\\right)');
    expect(logarithmicIntegral.exactLatex).toContain('x>1');
    expect(logarithmicIntegral.exactLatex).toContain('0<x<1');
    expect(logarithmicIntegral.exactSupplementLatex?.join(' ')).toContain('\\ln\\left(x\\right)\\ne0');

    const shiftedLogarithmicIntegral = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '1/\\ln(2x+1)',
    });
    expect(shiftedLogarithmicIntegral.error).toBeUndefined();
    expect(shiftedLogarithmicIntegral.exactLatex).toContain('\\frac{1}{2}\\cdot \\operatorname{li}\\left(2x+1\\right)');
  });

  it('renders recurrence-backed special-function answers for quotient powers', () => {
    const sinePower = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '\\sin(x)/x^2',
    });
    expect(sinePower.error).toBeUndefined();
    expect(sinePower.resultOrigin).toBe('rule-based-symbolic');
    expect(sinePower.integrationStrategy).toBeUndefined();
    expect(sinePower.exactLatex).toContain('\\operatorname{Ci}\\left(x\\right)');
    expect(sinePower.exactLatex).toContain('\\frac{\\sin\\left(x\\right)}{x}');
    expect(sinePower.exactSupplementLatex?.join(' ')).toContain('x\\ne0');

    const exponentialPower = evaluateCalculusIndefiniteIntegral({
      bodyLatex: 'e^x/x^2',
    });
    expect(exponentialPower.error).toBeUndefined();
    expect(exponentialPower.exactLatex).toContain('\\operatorname{Ei}\\left(x\\right)');
    expect(exponentialPower.exactLatex).toContain('\\frac{e^{x}}{x}');
  });

  it('canonicalizes typed symbolic quotient products before RN log-derivative routing', () => {
    const result = evaluateCalculusIndefiniteIntegral({
      bodyLatex: 'k*(2a*x+b)/(a*x^2+b*x+c)',
    });

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.integrationStrategy).toBe('partial-fractions');
    expect(result.exactLatex).toContain('k\\cdot \\ln');
    expect(result.exactLatex).toContain('ax^2+bx+c');
  });

  it('handles bounded rational partial-fraction primitives', () => {
    const result = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '\\frac{1}{x^2-1}',
    });
    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.integrationStrategy).toBe('partial-fractions');
    expect(result.exactLatex).toContain('\\ln');
    expect(result.exactLatex).toContain('x-1');
    expect(result.exactLatex).toContain('x+1');
    expect(result.detailSections?.[0]?.title).toBe('Partial Fractions');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('shared polynomial/rational core');

    const repeated = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '\\frac{1}{(x-1)^2}',
    });
    expect(repeated.error).toBeUndefined();
    expect(repeated.resultOrigin).toBe('rule-based-symbolic');
    expect(repeated.integrationStrategy).toBe('partial-fractions');
    expect(repeated.exactLatex).toBe('-\\frac{1}{x-1}+C');
    expect(repeated.detailSections?.[0]?.title).toBe('Partial Fractions');

    const quadratic = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '\\frac{x+1}{x^2+1}',
    });
    expect(quadratic.error).toBeUndefined();
    expect(quadratic.resultOrigin).toBe('rule-based-symbolic');
    expect(quadratic.integrationStrategy).toBe('partial-fractions');
    expect(quadratic.exactLatex).toBe('\\frac{1}{2}\\ln\\left(x^2+1\\right)+\\arctan\\left(x\\right)+C');
    expect(quadratic.detailSections?.[0]?.lines.join(' ')).toContain('irreducible quadratic');
  });

  it('presents verified indefinite integral answers as one parseable antiderivative expression', () => {
    const rootSum = evaluateCalculusIndefiniteIntegral({
      bodyLatex: String.raw`\sqrt{x}+x^{1/3}`,
    });
    expect(rootSum.error).toBeUndefined();
    expect(rootSum.exactLatex).toBe(
      String.raw`\frac{2}{3}x^{\frac{3}{2}}+\frac{3}{4}x^{\frac{4}{3}}+C`,
    );
    expect(rootSum.exactLatex).not.toContain(String.raw`\sqrt{x}^{3}`);
    expect(rootSum.exactLatex).not.toMatch(/\d+\\frac/u);
    expect(rootSum.exactLatex?.endsWith('+C')).toBe(true);
    expect(rootSum.answerRows?.rows).toEqual([
      { latex: rootSum.exactLatex },
    ]);
    expectParseableLatex(rootSum.exactLatex);

    const rational = evaluateCalculusIndefiniteIntegral({
      bodyLatex: String.raw`\frac{2x^3-3x^2+1}{x^2-3x+1}`,
    });
    expect(rational.error).toBeUndefined();
    expect(rational.exactLatex).toContain('x^{2}+3x');
    expect(rational.exactLatex).not.toContain(String.raw`2\left(\frac{x^{2}}{2}\right)`);
    expect(rational.exactLatex).toContain(String.raw`\frac{17}{2\sqrt{5}}\ln`);
    expect(rational.answerRows?.rows).toEqual([
      { latex: rational.exactLatex },
    ]);
    expect(rational.detailSections?.map((section) => section.title))
      .toContain('Integration Presentation');
    expectParseableLatex(rational.exactLatex);
  });

  it('keeps textbook radical and hyperbolic presentation parseable without redundant wrappers', () => {
    const differenceRadical = evaluateCalculusIndefiniteIntegral({
      bodyLatex: String.raw`\frac{1}{(4-x^2)^{3/2}}`,
    });
    expect(differenceRadical.error).toBeUndefined();
    expect(differenceRadical.exactLatex).toBe(String.raw`\frac{x}{4\sqrt{4-x^{2}}}+C`);
    expect(differenceRadical.answerRows?.rows).toEqual([
      { latex: String.raw`\frac{x}{4\sqrt{4-x^{2}}}+C` },
    ]);
    expectParseableLatex(differenceRadical.exactLatex);

    const sumRadical = evaluateCalculusIndefiniteIntegral({
      bodyLatex: String.raw`\frac{1}{(x^2+4)^{3/2}}`,
    });
    expect(sumRadical.error).toBeUndefined();
    expect(sumRadical.exactLatex).toBe(String.raw`\frac{x}{4\sqrt{4+x^{2}}}+C`);
    expectParseableLatex(sumRadical.exactLatex);

    const sinh = evaluateCalculusIndefiniteIntegral({
      bodyLatex: String.raw`\sinh^2(x)`,
    });
    expect(sinh.error).toBeUndefined();
    expect(sinh.exactLatex).toBe(String.raw`\frac{1}{4}\sinh\left(2x\right)-\frac{1}{2}x+C`);
    expectParseableLatex(sinh.exactLatex);

    const cosh = evaluateCalculusIndefiniteIntegral({
      bodyLatex: String.raw`\cosh^2(2x+1)`,
    });
    expect(cosh.error).toBeUndefined();
    expect(cosh.exactLatex).not.toContain(String.raw`2\left(\left(2x+1\right)\right)`);
    expect(cosh.exactLatex).toContain(String.raw`\sinh\left(2\left(2x+1\right)\right)`);
    expect(cosh.exactLatex?.endsWith('+C')).toBe(true);
    expectParseableLatex(cosh.exactLatex);

    const affineCarrierRadical = evaluateCalculusIndefiniteIntegral({
      bodyLatex: String.raw`\frac{(2x+1)^2}{\sqrt{(2x+1)^2+9}}`,
    });
    expect(affineCarrierRadical.error).toBeUndefined();
    expect(affineCarrierRadical.exactLatex).toContain(String.raw`\ln`);
    expect(affineCarrierRadical.exactLatex?.endsWith('+C')).toBe(true);
    expect(affineCarrierRadical.detailSections?.map((section) => section.title))
      .toContain('Integration Presentation');
    expectParseableLatex(affineCarrierRadical.exactLatex);
  });

  it('fails cleanly for unsupported antiderivatives', () => {
    const result = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '\\sin(x^3)',
    });
    expect(result.error).toBe('This antiderivative could not be determined symbolically in Calculus.');
  });

  it('keeps guarded Compute Engine fallback for simple single-variable indefinite integrals', () => {
    const result = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '\\sec(x)',
    });
    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.integrationStrategy).toBe('compute-engine');
  });

  it('supports improper convergent integrals', () => {
    const result = evaluateCalculusImproperIntegral({
      bodyLatex: '\\frac{1}{1+x^2}',
      lowerKind: 'finite',
      lower: '0',
      upperKind: 'posInfinity',
      upper: '1',
    });
    expect(result.error).toBeUndefined();
    expect(Number(result.approxText)).toBeCloseTo(Math.PI / 2, 2);
  });

  it('supports finite definite fallback', () => {
    const result = evaluateCalculusDefiniteIntegral({
      bodyLatex: '\\sin(x^2)',
      lower: '0',
      upper: '1',
    });
    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('numeric-fallback');

    const rewriteOnly = evaluateCalculusDefiniteIntegral({
      bodyLatex: '(\\sin(x)-\\cos(x))^2',
      lower: '0',
      upper: '1',
    });
    expect(rewriteOnly.error).toBeUndefined();
    expect(rewriteOnly.resultOrigin).toBe('numeric-fallback');
    expect(rewriteOnly.detailSections?.map((section) => section.title))
      .not.toContain('Integration Trig Rewrite');
  });

  it('uses the shared exact definite-integral trust path when interval-safe', () => {
    const result = evaluateCalculusDefiniteIntegral({
      bodyLatex: '2x',
      lower: '0',
      upper: '1',
    });

    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toBe('1');
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.detailSections?.[0]?.title).toBe('Integral Method');
    expect(result.detailSections?.[1]?.title).toBe('Interval Safety');

    const rational = evaluateCalculusDefiniteIntegral({
      bodyLatex: '\\frac{1}{x^2-1}',
      lower: '2',
      upper: '3',
    });

    expect(rational.error).toBeUndefined();
    expect(rational.resultOrigin).toBe('rule-based-symbolic');
    expect(rational.integrationStrategy).toBe('partial-fractions');
    expect(Number(rational.approxText)).toBeCloseTo(0.202732, 5);

    const repeated = evaluateCalculusDefiniteIntegral({
      bodyLatex: '\\frac{1}{(x-1)^2}',
      lower: '2',
      upper: '3',
    });

    expect(repeated.error).toBeUndefined();
    expect(repeated.resultOrigin).toBe('rule-based-symbolic');
    expect(repeated.integrationStrategy).toBe('partial-fractions');
    expect(Number(repeated.approxText)).toBeCloseTo(0.5, 5);
    expect(repeated.detailSections?.map((section) => section.title)).toContain('Partial Fractions');
  });

  it('blocks unsafe finite definite intervals before numeric fallback', () => {
    const result = evaluateCalculusDefiniteIntegral({
      bodyLatex: '\\frac{1}{x}',
      lower: '-1',
      upper: '1',
    });

    expect(result.error).toContain('outside the real domain');
    expect(result.detailSections?.[0]?.title).toBe('Interval Safety');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Trust: blocked via domain/range core');
  });

  it('stops improper endpoint singularities instead of trusting numeric tails', () => {
    const result = evaluateCalculusImproperIntegral({
      bodyLatex: '\\frac{1}{x}',
      lowerKind: 'finite',
      lower: '0',
      upperKind: 'posInfinity',
      upper: '1',
    });

    expect(result.error).toContain('real-domain boundary');
    expect(result.detailSections?.[0]?.title).toBe('Interval Safety');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Trust: blocked via domain/range core');
  });
});
