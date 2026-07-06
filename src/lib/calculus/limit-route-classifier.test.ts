import { describe, expect, it } from 'vitest';
import { classifyNaturalLimitRoute } from './limit-route-classifier';

describe('natural limit route classifier', () => {
  it('classifies direct substitution and removable rational forms', () => {
    expect(classifyNaturalLimitRoute('lim x -> 2 x^2+1')).toMatchObject({
      kind: 'direct-substitution',
    });
    expect(classifyNaturalLimitRoute('lim x -> 1 (x^2-1)/(x-1)')).toMatchObject({
      kind: 'removable-rational',
    });
  });

  it('classifies finite poles and infinite-target asymptotic routes', () => {
    expect(classifyNaturalLimitRoute('lim x -> 0+ 1/x')).toMatchObject({
      kind: 'finite-pole',
    });
    expect(classifyNaturalLimitRoute('lim x -> infinity (3x^2+1)/(2x^2-5)')).toMatchObject({
      kind: 'infinity-asymptotic',
    });
    expect(classifyNaturalLimitRoute('lim x -> infinity a*x')).toMatchObject({
      kind: 'infinity-asymptotic',
      reason: expect.stringContaining('symbolic leading coefficient'),
    });
  });

  it('classifies local-equivalent, Taylor, and L’Hospital candidates', () => {
    expect(classifyNaturalLimitRoute('lim x -> 0 sin(x)/x')).toMatchObject({
      kind: 'local-equivalent',
    });
    expect(classifyNaturalLimitRoute('lim x -> 0 a*sin(x)/x')).toMatchObject({
      kind: 'local-equivalent',
    });
    expect(classifyNaturalLimitRoute('lim x -> 0 (sin(x)-x)/x^3')).toMatchObject({
      kind: 'taylor-series-candidate',
    });
    expect(classifyNaturalLimitRoute('lim x -> infinity x/e^x')).toMatchObject({
      kind: 'infinity-asymptotic',
    });
    expect(classifyNaturalLimitRoute('lim x -> infinity log(x)/x')).toMatchObject({
      kind: 'infinity-asymptotic',
    });
  });

  it('classifies exact local algebra routes', () => {
    expect(classifyNaturalLimitRoute('lim x -> 0 1/x - 1/sin(x)')).toMatchObject({
      kind: 'exact-local-algebra',
    });
    expect(classifyNaturalLimitRoute('lim x -> infinity sqrt(x^2+x)-x')).toMatchObject({
      kind: 'exact-local-algebra',
    });
  });

  it('classifies safe indeterminate transform routes', () => {
    expect(classifyNaturalLimitRoute('lim x -> 0+ x ln(x)')).toMatchObject({
      kind: 'indeterminate-transform',
    });
    expect(classifyNaturalLimitRoute('lim x -> infinity (1+1/x)^x')).toMatchObject({
      kind: 'indeterminate-transform',
    });
  });

  it('classifies bounded oscillation and squeeze routes', () => {
    expect(classifyNaturalLimitRoute('lim x -> 0 x sin(1/x)')).toMatchObject({
      kind: 'squeeze-oscillation',
    });
    expect(classifyNaturalLimitRoute('lim x -> 0 sin(1/x)')).toMatchObject({
      kind: 'squeeze-oscillation',
    });
  });

  it('classifies Piecewise branch routes before general body parsing', () => {
    expect(classifyNaturalLimitRoute('lim x -> 0 piecewise(x if x<0, x^2 otherwise)')).toMatchObject({
      kind: 'piecewise',
      reason: expect.stringContaining('Piecewise'),
    });
    expect(classifyNaturalLimitRoute(
      '\\lim_{x\\to0}\\begin{cases}x&x<0\\\\x^2&\\text{otherwise}\\end{cases}',
    )).toMatchObject({
      kind: 'piecewise',
    });
  });

  it('classifies absolute-value side behavior before generic quotient routes', () => {
    expect(classifyNaturalLimitRoute('lim x -> 0 |x|/x')).toMatchObject({
      kind: 'abs-side-behavior',
    });
    expect(classifyNaturalLimitRoute('lim x -> 2 |x-2|/(x-2)')).toMatchObject({
      kind: 'abs-side-behavior',
    });
  });

  it('classifies capped MRV-lite exponential scale routes', () => {
    expect(classifyNaturalLimitRoute('\\lim_{x\\to\\infty}\\frac{e^{\\sqrt{x}}}{e^x}')).toMatchObject({
      kind: 'mrv-lite',
    });
    expect(classifyNaturalLimitRoute('\\lim_{x\\to\\infty}\\frac{e^{\\sqrt{x}}}{x^5}')).toMatchObject({
      kind: 'mrv-lite',
    });
    expect(classifyNaturalLimitRoute(
      'lim x -> infinity (e^{sqrt(x)}+x^5)/(e^{sqrt(x)}-log(x))',
    )).toMatchObject({
      kind: 'mrv-lite',
    });
  });

  it('classifies finite-target Gruntz bridge routes after exact finite routes', () => {
    expect(classifyNaturalLimitRoute('lim x -> 0+ e^{1/x}')).toMatchObject({
      kind: 'gruntz',
      reason: expect.stringContaining('Gruntz bridge'),
    });
    expect(classifyNaturalLimitRoute('lim x -> 0 exp(1/x)')).toMatchObject({
      kind: 'gruntz',
    });
  });

  it('returns controlled unsupported and malformed routes', () => {
    expect(classifyNaturalLimitRoute('lim x -> 0 floor(1/x)')).toMatchObject({
      kind: 'unsupported',
    });
    expect(classifyNaturalLimitRoute('sin(x)/x')).toMatchObject({
      kind: 'malformed',
    });
  });

  it('guards over-budget requests', () => {
    const nested = Array.from({ length: 40 }, () => 'sin(').join('') + 'x' + ')'.repeat(40);
    expect(classifyNaturalLimitRoute(`lim x -> 0 ${nested}`)).toMatchObject({
      kind: 'too-complex',
    });
  });
});
