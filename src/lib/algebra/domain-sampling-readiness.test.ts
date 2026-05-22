import { describe, expect, it } from 'vitest';
import { buildDomainSamplingReadiness } from './domain-sampling-readiness';

describe('buildDomainSamplingReadiness', () => {
  it('reports safe sampling for unconstrained expressions', () => {
    const readiness = buildDomainSamplingReadiness({
      expressions: [{ latex: 'x^2' }],
      sampledPoints: [
        { value: -1 },
        { value: 0 },
        { value: 1 },
      ],
    });

    expect(readiness.status).toBe('safe');
    expect(readiness.constraints).toEqual([]);
    expect(readiness.sampledPoints.map((point) => point.status)).toEqual(['safe', 'safe', 'safe']);
    expect(readiness.assumptionFacts).toEqual([]);
  });

  it('preserves real-domain constraints and sampled hazards', () => {
    const readiness = buildDomainSamplingReadiness({
      expressions: [{ latex: '\\sqrt{x}' }],
      sampledPoints: [
        { value: -1, undefined: true },
        { value: 0 },
        { value: 1 },
      ],
      hasDomainWarning: true,
    });

    expect(readiness.status).toBe('hazard');
    expect(readiness.undefinedSampleCount).toBe(1);
    expect(readiness.constraints.map((constraint) => constraint.kind)).toContain('nonnegative');
    expect(readiness.assumptionFacts.map((fact) => fact.kind)).toEqual([
      'domain-constraint',
      'interval-hazard',
    ]);
    expect(readiness.assumptionFacts.at(-1)?.message).toContain('1 sampled table row');
  });

  it('checks explicit sampled values against collected constraints', () => {
    const readiness = buildDomainSamplingReadiness({
      expressions: [{ latex: '\\ln(x-2)' }],
      sampledPoints: [
        { value: 1 },
        { value: 3 },
      ],
    });

    expect(readiness.status).toBe('hazard');
    expect(readiness.sampledPoints[0]).toMatchObject({
      value: 1,
      status: 'hazard',
      expressionLatex: '\\ln(x-2)',
    });
    expect(readiness.sampledPoints[1]).toMatchObject({ value: 3, status: 'safe' });
  });

  it('returns unknown when an expression cannot be parsed and no sampled hazard is known', () => {
    const readiness = buildDomainSamplingReadiness({
      expressions: [{ latex: '\\notacommand{' }],
    });

    expect(readiness.status).toBe('unknown');
    expect(readiness.assumptionFacts).toEqual([]);
  });
});
