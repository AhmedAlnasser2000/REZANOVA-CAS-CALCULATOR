import { describe, expect, it } from 'vitest';
import { classifyNaturalLimitRoute } from './limit-route-classifier';
import { planNaturalLimitRoute } from './limit-route-orchestrator';
import { evaluateCalculusLimit } from './workspace/limits';

function expectRoute(input: string, routeKind: string) {
  const classification = classifyNaturalLimitRoute(input);
  const plan = planNaturalLimitRoute(classification);

  expect(classification.kind).toBe(routeKind);
  expect(plan).toMatchObject({
    kind: 'ready',
    routeKind,
    allowNumericFallback: false,
  });
}

function routeLines(result: ReturnType<typeof evaluateCalculusLimit>) {
  return result.detailSections
    ?.find((section) => section.title === 'Limit Route')
    ?.lines
    .join(' ');
}

describe('frontier limit route corpus', () => {
  it('prefers exact symbolic routes across the finite frontier corpus', () => {
    const symbolicCoefficient = evaluateCalculusLimit({
      requestLatex: 'lim x -> 0 a*sin(x)/x',
    });
    const rewriteCancellation = evaluateCalculusLimit({
      requestLatex: 'lim x -> 0 1/x - 1/sin(x)',
    });
    const piecewise = evaluateCalculusLimit({
      requestLatex: 'lim x -> 0 piecewise(x if x<0, x^2 otherwise)',
    });
    const absSide = evaluateCalculusLimit({
      requestLatex: 'lim x -> 0+ |x|/x',
    });

    expectRoute('lim x -> 0 a*sin(x)/x', 'local-equivalent');
    expect(symbolicCoefficient.error).toBeUndefined();
    expect(symbolicCoefficient.exactLatex).toBe('a');
    expect(routeLines(symbolicCoefficient)).toContain('numeric fallback was skipped');

    expectRoute('lim x -> 0 1/x - 1/sin(x)', 'exact-local-algebra');
    expect(rewriteCancellation.error).toBeUndefined();
    expect(rewriteCancellation.exactLatex).toBe('0');
    expect(routeLines(rewriteCancellation)).toContain('exact local algebra');

    expectRoute('lim x -> 0 piecewise(x if x<0, x^2 otherwise)', 'piecewise');
    expect(piecewise.error).toBeUndefined();
    expect(piecewise.exactLatex).toBe('0');
    expect(routeLines(piecewise)).toContain('piecewise branch analysis');

    expectRoute('lim x -> 0+ |x|/x', 'abs-side-behavior');
    expect(absSide.error).toBeUndefined();
    expect(absSide.exactLatex).toBe('1');
    expect(routeLines(absSide)).toContain('absolute-value side behavior');
  });

  it('prefers exact symbolic routes across the infinity and MRV-lite corpus', () => {
    const logOverPower = evaluateCalculusLimit({
      requestLatex: 'lim x -> infinity log(x)/x',
    });
    const powerOverExp = evaluateCalculusLimit({
      requestLatex: 'lim x -> infinity x^5/e^x',
    });
    const expRatio = evaluateCalculusLimit({
      requestLatex: 'lim x -> infinity (e^x+x^3)/(e^x-1)',
    });
    const symbolicCases = evaluateCalculusLimit({
      requestLatex: 'lim x -> infinity a*x',
    });
    const mrvQuotient = evaluateCalculusLimit({
      requestLatex: '\\lim_{x\\to\\infty}\\frac{e^{\\sqrt{x}}}{e^x}',
    });

    expectRoute('lim x -> infinity log(x)/x', 'infinity-asymptotic');
    expect(logOverPower.error).toBeUndefined();
    expect(logOverPower.exactLatex).toBe('0');

    expectRoute('lim x -> infinity x^5/e^x', 'infinity-asymptotic');
    expect(powerOverExp.error).toBeUndefined();
    expect(powerOverExp.exactLatex).toBe('0');

    expectRoute('lim x -> infinity (e^x+x^3)/(e^x-1)', 'infinity-asymptotic');
    expect(expRatio.error).toBeUndefined();
    expect(expRatio.exactLatex).toBe('1');

    expectRoute('lim x -> infinity a*x', 'infinity-asymptotic');
    expect(symbolicCases.error).toBeUndefined();
    expect(symbolicCases.exactLatex).toContain('\\substack{a>0}');
    expect(routeLines(symbolicCases)).toContain('infinity asymptotic comparison');

    expectRoute('\\lim_{x\\to\\infty}\\frac{e^{\\sqrt{x}}}{e^x}', 'mrv-lite');
    expect(mrvQuotient.error).toBeUndefined();
    expect(mrvQuotient.exactLatex).toBe('0');
    expect(routeLines(mrvQuotient)).toContain('MRV-lite asymptotic comparison');
  });

  it('keeps proof routes controlled when the two-sided limit fails', () => {
    const piecewiseMismatch = evaluateCalculusLimit({
      requestLatex: 'lim x -> 0 piecewise(-1 if x<0, 1 otherwise)',
    });
    const absMismatch = evaluateCalculusLimit({
      requestLatex: 'lim x -> 0 |x|/x',
    });
    const oscillation = evaluateCalculusLimit({
      requestLatex: 'lim x -> 0 sin(1/x)',
    });

    expect(piecewiseMismatch.error).toContain('do not agree');
    expect(piecewiseMismatch.detailSections?.[0]?.title).toBe('Why This Limit Fails');
    expect(routeLines(piecewiseMismatch)).toContain('numeric fallback was skipped');

    expect(absMismatch.error).toContain('do not agree');
    expect(absMismatch.detailSections?.[0]?.title).toBe('Why This Limit Fails');
    expect(routeLines(absMismatch)).toContain('absolute-value side behavior');

    expect(oscillation.error).toContain('oscillates near the target');
    expect(oscillation.detailSections?.[0]?.title).toBe('Why This Limit Fails');
    expect(routeLines(oscillation)).toContain('squeeze or oscillation');
  });

  it('keeps complex proof handling narrow and route-explained', () => {
    const realMode = evaluateCalculusLimit({
      requestLatex: '\\lim_{x\\to0}\\sqrt{x}',
    });
    const complexMode = evaluateCalculusLimit({
      requestLatex: '\\lim_{x\\to0}\\sqrt{x}',
      equationDomainIntent: 'complex',
    });

    expect(realMode.error).toContain('outside the real domain');
    expect(complexMode.error).toBeUndefined();
    expect(complexMode.exactLatex).toBe('0');
    expect(complexMode.detailSections?.[0]?.title).toBe('Complex Domain');
    expect(routeLines(complexMode)).toContain('direct substitution');
  });
});
