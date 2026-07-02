import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { solveAlgebraicGenus1RootBasisCoefficients } from './integration/algebraic-genus1/root-basis-coefficient-solver';

const ce = new ComputeEngine();

function solve(latex: string, variable = 'x') {
  return solveAlgebraicGenus1RootBasisCoefficients(ce.parse(latex).json, variable);
}

function success(latex: string, variable = 'x') {
  const result = solve(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected root-basis coefficient solve evidence for ${latex}`);
  }
  return result;
}

function text(result: ReturnType<typeof success>) {
  return [
    result.status,
    String(result.canAdoptLive),
    result.rationalCoefficientLatex,
    result.coefficientFieldLatex,
    ...result.solvedBasisCoefficients.flatMap((entry) => [
      entry.basisKind,
      entry.coefficientLatex,
    ]),
    ...result.unresolvedBasisKinds,
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

describe('algebraic genus-1 root-basis coefficient solver evidence', () => {
  it('solves the constant first-kind coefficient for reciprocal radicals', () => {
    const result = success('\\frac{1}{\\sqrt{x^3-x}}');

    expect(result.status).toBe('solved-first-kind');
    expect(result.canAdoptLive).toBe(true);
    expect(result.solvedBasisCoefficients).toHaveLength(1);
    expect(result.solvedBasisCoefficients[0]?.basisKind).toBe('first-kind');
    expect(result.solvedBasisCoefficients[0]?.coefficientLatex).toContain('\\sqrt{\\alpha_{3}-\\alpha_{1}}');
    expect(result.unresolvedBasisKinds).toEqual([]);
    expect(text(result)).toContain('first-kind basis coefficient is solved directly');
  });

  it('blocks radical pullbacks until elliptic-basis reduction is solved', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.status).toBe('elliptic-basis-reduction-required');
    expect(result.canAdoptLive).toBe(false);
    expect(result.solvedBasisCoefficients).toEqual([]);
    expect(result.unresolvedBasisKinds).toEqual(['first-kind', 'second-kind', 'third-kind']);
    expect(result.rationalCoefficientLatex).toContain('\\sqrt{\\alpha_{3}-\\alpha_{1}}');
    expect(result.rationalCoefficientLatex).not.toContain('C_F');
    expect(text(result)).toContain('Adoption remains blocked');
  });

  it('blocks rational-in-radical pullbacks until Hermite residual splitting is solved', () => {
    const result = success('\\frac{x+1}{\\sqrt{x^3-x}}');

    expect(result.status).toBe('hermite-reduction-required');
    expect(result.canAdoptLive).toBe(false);
    expect(result.unresolvedBasisKinds).toEqual([
      'rational-log-residual',
      'first-kind',
      'second-kind',
      'third-kind',
    ]);
    expect(result.rationalCoefficientLatex).toContain('R\\left(');
    expect(text(result)).toContain('rational derivative correction');
  });

  it('threads selected variables through coefficient evidence', () => {
    const result = success('\\sqrt{t^3-t}', 't');

    expect(result.variable).toBe('t');
    expect(result.status).toBe('elliptic-basis-reduction-required');
    expect(result.rationalCoefficientLatex).toContain('\\alpha_{3}');
  });

  it('blocks complex-pair radical charts until elliptic-basis reduction is solved', () => {
    const result = success('\\sqrt{x^3+x+1}');

    expect(result.status).toBe('elliptic-basis-reduction-required');
    expect(result.canAdoptLive).toBe(false);
    expect(result.unresolvedBasisKinds).toEqual(['first-kind', 'second-kind', 'third-kind']);
    expect(result.rationalCoefficientLatex).toContain('A_{\\alpha_{1}}');
    expect(text(result)).toContain('\\beta_{\\alpha_{1}}');
  });
});
