import { describe, expect, it } from 'vitest';
import { classifyNaturalLimitRoute } from './limit-route-classifier';
import { planNaturalLimitRoute } from './limit-route-orchestrator';

describe('natural limit route orchestrator', () => {
  it('turns supported classifications into ready plans', () => {
    const plan = planNaturalLimitRoute(classifyNaturalLimitRoute('lim x -> 0 sin(x)/x'));
    const squeezePlan = planNaturalLimitRoute(classifyNaturalLimitRoute('lim x -> 0 x sin(1/x)'));

    expect(plan).toMatchObject({
      kind: 'ready',
      routeKind: 'local-equivalent',
      allowNumericFallback: false,
    });
    expect(squeezePlan).toMatchObject({
      kind: 'ready',
      routeKind: 'squeeze-oscillation',
      allowNumericFallback: false,
    });
  });

  it('allows numeric fallback only for direct substitution and finite-pole routes in the natural screen', () => {
    const plan = planNaturalLimitRoute(classifyNaturalLimitRoute('lim x -> 2 x^2+1'));
    const polePlan = planNaturalLimitRoute(classifyNaturalLimitRoute('lim x -> 0 1/x'));

    expect(plan).toMatchObject({
      kind: 'ready',
      routeKind: 'direct-substitution',
      allowNumericFallback: true,
    });
    expect(polePlan).toMatchObject({
      kind: 'ready',
      routeKind: 'finite-pole',
      allowNumericFallback: true,
    });
  });

  it('blocks unsupported, malformed, and over-budget routes with diagnostics', () => {
    const unsupported = planNaturalLimitRoute(classifyNaturalLimitRoute('lim x -> 0 floor(1/x)'));
    const malformed = planNaturalLimitRoute(classifyNaturalLimitRoute('sin(x)/x'));
    const nested = Array.from({ length: 40 }, () => 'sin(').join('') + 'x' + ')'.repeat(40);
    const tooComplex = planNaturalLimitRoute(classifyNaturalLimitRoute(`lim x -> 0 ${nested}`));

    expect(unsupported.kind).toBe('blocked');
    expect(malformed.kind).toBe('blocked');
    expect(tooComplex.kind).toBe('blocked');

    if (unsupported.kind === 'blocked') {
      expect(unsupported.error).toContain('outside the supported');
      expect(unsupported.detailSections[0]?.title).toBe('Limit Route');
      expect(unsupported.detailSections[0]?.lines.join(' ')).toContain('Route chosen: unsupported route');
      expect(unsupported.detailSections[0]?.lines.join(' ')).toContain('Fallback policy');
      expect(unsupported.detailSections[1]?.title).toBe('Limit Diagnostic');
    }
  });
});
