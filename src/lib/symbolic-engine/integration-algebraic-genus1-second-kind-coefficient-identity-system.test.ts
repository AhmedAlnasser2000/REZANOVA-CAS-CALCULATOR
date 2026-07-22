import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { buildAlgebraicGenus1SecondKindCoefficientIdentitySystem } from './integration/algebraic-genus1/second-kind-coefficient-identity-system';

const ce = new ComputeEngine();

function identitySystem(latex: string, variable = 'x') {
  return buildAlgebraicGenus1SecondKindCoefficientIdentitySystem(
    ce.parse(latex).json,
    variable,
  );
}

function success(latex: string, variable = 'x') {
  const result = identitySystem(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected second-kind identity system for ${latex}`);
  }
  return result;
}

function text(result: ReturnType<typeof success>) {
  return [
    result.status,
    result.rootChartKind,
    result.chartVariableLatex,
    result.rationalCoefficientLatex,
    result.coefficientFieldLatex,
    result.identityLatex,
    result.coefficientComparisonLatex,
    ...result.basisUnknownsLatex,
    ...result.correctionUnknownsLatex,
    ...result.proofObligations,
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

describe('algebraic genus-1 second-kind coefficient identity system', () => {
  it('builds a finite coefficient identity for three-real-root cubic raw radicals', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.status).toBe('finite-identity-system-ready');
    expect(result.canAdoptLive).toBe(false);
    expect(result.rootChartKind).toBe('cubic-three-real-roots');
    expect(result.chartVariableLatex).toBe('z=\\sin^2\\phi');
    expect(result.correctionDegreeCap).toBe(2);
    expect(result.basisUnknownsLatex).toContain('C_E');
    expect(result.correctionUnknownsLatex).toContain('s_2');
    expect(text(result)).toContain('coefficient-comparison identity');
    expect(text(result)).not.toMatch(/RootOf|rootof/i);
  });

  it('builds a finite identity for one-real-root complex-pair cubic raw radicals', () => {
    const result = success('\\sqrt{x^3+x+1}');

    expect(result.rootChartKind).toBe('cubic-one-real-root-complex-pair');
    expect(result.chartVariableLatex).toContain('\\tan^2');
    expect(result.correctionDegreeCap).toBe(3);
    expect(result.rationalCoefficientLatex).toContain('A_{\\alpha_{1}}');
    expect(text(result)).toContain('\\beta_{\\alpha_{1}}');
  });

  it('threads selected variables through the identity system', () => {
    const result = success('\\sqrt{t^3-t}', 't');

    expect(result.variable).toBe('t');
    expect(result.preferredBranchLatex).toContain('t>\\alpha_{3}');
    expect(result.identityLatex).toContain('K_E');
  });

  it('does not repurpose reciprocal radicals or live integration before solving', () => {
    expect(identitySystem('\\frac{1}{\\sqrt{x^3-x}}')).toMatchObject({
      kind: 'stop',
      reason: 'second-kind-readiness-stop',
    });

    const live = resolveSymbolicIntegralFromLatex('\\sqrt{x^3-x}');
    expect(live.kind).toBe('error');
    if (live.kind === 'error') {
      expect(live.error).toContain('genus-1');
    }
  });
});
