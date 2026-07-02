import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { buildAlgebraicGenus1ComplexPairRootChart } from './integration/algebraic-genus1/complex-pair-root-chart';

const ce = new ComputeEngine();

function chart(latex: string, variable = 'x') {
  return buildAlgebraicGenus1ComplexPairRootChart(ce.parse(latex).json, variable);
}

function success(latex: string, variable = 'x') {
  const result = chart(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected complex-pair chart readiness for ${latex}`);
  }
  return result;
}

function text(result: ReturnType<typeof success>) {
  return [
    result.realRootLatex,
    result.radicandLatex,
    result.quadraticCofactorLatex,
    result.realBranchLatex,
    ...result.requiredLegendreDataLatex,
    ...result.readinessNotes,
    ...result.detailSections.flatMap((section) => [
      section.title,
      ...section.lines,
      ...((section as { lineParts?: unknown[][] }).lineParts ?? [])
        .flat()
        .map(String),
    ]),
  ].join('\n');
}

describe('algebraic genus-1 complex-pair root chart readiness', () => {
  it('records readiness for one-real-root cubic radicals', () => {
    const result = success('\\sqrt{x^3+x+1}');

    expect(result.chartKind).toBe('one-real-root-cubic-complex-pair');
    expect(result.realRootLatex).toBe('\\alpha_{1}');
    expect(result.quadraticCofactorLatex).toContain('\\frac{P\\left(x\\right)}{x-\\alpha_{1}}');
    expect(result.realBranchLatex).toBe('x>\\alpha_{1}');
    expect(text(result)).toContain('\\rho_{\\alpha_{1}}^2>0');
    expect(text(result)).not.toMatch(/RootOf|rootof/i);
  });

  it('records reciprocal-radical endpoint readiness for one-real-root cubics', () => {
    const result = success('\\frac{1}{\\sqrt{x^3+x+1}}');

    expect(result.realBranchLatex).toBe('x>\\alpha_{1}');
    expect(text(result)).toContain('Endpoint Exclusions');
    expect(text(result)).toContain('x-\\alpha_{1}\\ne0');
  });

  it('threads selected variables through complex-pair readiness', () => {
    const result = success('\\sqrt{t^3+t+1}', 't');

    expect(result.variable).toBe('t');
    expect(result.quadraticCofactorLatex).toContain('P\\left(t\\right)');
    expect(result.realBranchLatex).toBe('t>\\alpha_{1}');
  });

  it('stops three-real-root cubics because the existing root chart owns them', () => {
    const result = chart('\\sqrt{x^3-x}');

    expect(result).toMatchObject({
      kind: 'stop',
      reason: 'not-one-real-root-cubic',
    });
  });

  it('keeps live integration behavior unchanged for one-real-root cubic radicals', () => {
    const result = resolveSymbolicIntegralFromLatex('\\sqrt{x^3+x+1}');

    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error).toContain('elliptic');
    }
  });
});
