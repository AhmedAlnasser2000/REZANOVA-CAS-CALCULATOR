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
