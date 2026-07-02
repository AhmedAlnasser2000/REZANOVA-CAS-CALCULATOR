import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { profileAlgebraicGenus1RootPullbackBasis } from './integration/algebraic-genus1/root-pullback-basis-profile';

const ce = new ComputeEngine();

function profile(latex: string, variable = 'x') {
  return profileAlgebraicGenus1RootPullbackBasis(ce.parse(latex).json, variable);
}

function success(latex: string, variable = 'x') {
  const result = profile(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected root pullback basis profile for ${latex}`);
  }
  return result;
}

function text(result: ReturnType<typeof success>) {
  return [
    result.pullbackLatex,
    ...result.requiredBasisKinds,
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

describe('algebraic genus-1 root pullback basis profile', () => {
  it('marks reciprocal radicals as first-kind-ready', () => {
    const result = success('\\frac{1}{\\sqrt{x^3-x}}');

    expect(result.integrandShape).toBe('reciprocal-radical');
    expect(result.status).toBe('first-kind-ready');
    expect(result.requiredBasisKinds).toEqual(['first-kind']);
    expect(result.pullbackLatex).toContain('C_F');
    expect(result.pullbackLatex).toContain('\\frac{d\\phi}');
    expect(result.rootLegendreData.firstKindPrototypeLatex).toContain('EllipticF');
    expect(text(result)).toContain('The reciprocal-radical shape is already');
    expect(text(result)).not.toMatch(/RootOf|rootof/i);
  });

  it('marks radical integrands as coefficient-solve-required', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.integrandShape).toBe('radical');
    expect(result.status).toBe('coefficient-solve-required');
    expect(result.requiredBasisKinds).toEqual([
      'first-kind',
      'second-kind',
      'third-kind',
    ]);
    expect(result.pullbackLatex).toContain('A\\left(\\sin^2\\phi\\right)');
    expect(result.pullbackLatex).toContain('B\\left(\\sin^2\\phi\\right)');
    expect(result.pullbackLatex).toContain('\\sum_p C_p');
    expect(text(result)).toContain('coefficient solving is required');
  });

  it('marks rational-in-radical integrands as Hermite-reduction-required', () => {
    const result = success('\\frac{x+1}{\\sqrt{x^3-x}}');

    expect(result.integrandShape).toBe('rational-in-radical');
    expect(result.status).toBe('hermite-reduction-required');
    expect(result.requiredBasisKinds).toEqual([
      'first-kind',
      'second-kind',
      'third-kind',
      'rational-log-residual',
    ]);
    expect(result.pullbackLatex).toContain('dS+L');
    expect(result.pullbackLatex).toContain('K_{\\Pi}');
  });

  it('threads the selected variable into pullback evidence', () => {
    const result = success('\\sqrt{t^3-t}', 't');

    expect(result.variable).toBe('t');
    expect(result.pullbackLatex).toContain('dt');
    expect(result.rootLegendreData.variable).toBe('t');
  });

  it('profiles complex-pair cubic charts without claiming live elliptic adoption', () => {
    const result = success('\\sqrt{x^3+x+1}');

    expect(result.dataKind).toBe('cubic-one-real-root-complex-pair');
    expect(result.integrandShape).toBe('radical');
    expect(result.status).toBe('coefficient-solve-required');
    expect(result.requiredBasisKinds).toEqual([
      'first-kind',
      'second-kind',
      'third-kind',
    ]);
    expect(result.rootLegendreData.firstKindPrototypeLatex).toContain('EllipticF');
    expect(text(result)).toContain('cubic-one-real-root-complex-pair');
    expect(text(result)).not.toMatch(/RootOf|rootof/i);
  });
});
